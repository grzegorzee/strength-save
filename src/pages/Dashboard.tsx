import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Weight, Trophy, Flame, ChevronRight, BarChart3, Sun, Moon, Calendar, Pencil, TrendingUp, TrendingDown, Minus, Route, CheckCircle, Play, CloudOff, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { trainingPlan as defaultPlanData, type TrainingDay } from '@/data/trainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { calculateStreak } from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getNextScheduledTraining, getScheduledTrainingForDate, getScheduledTrainingWeek, getStartOfPlanWeek } from '@/lib/plan-schedule';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { buildActiveCyclePreview } from '@/lib/cycle-insights';
import { buildPlanNextStep } from '@/lib/plan-next-step';
import { buildWorkoutRoute, findWorkoutForRoute } from '@/lib/workout-lookup';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';

// Trend component
const TrendIndicator = ({ value, suffix = '' }: { value: number | null; suffix?: string }) => {
  const { t } = useTranslation();
  if (value === null || value === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> {t('dash.trend.stable')}
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-emerald-500">
        <TrendingUp className="h-3 w-3" /> +{value}{suffix}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-red-400">
      <TrendingDown className="h-3 w-3" /> {value}{suffix}
    </span>
  );
};

// Stats Card (inline, premium)
const DashboardStatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendSuffix = '',
  iconColor,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: number | null;
  trendSuffix?: string;
  iconColor: string;
  onClick?: () => void;
}) => (
  <Card
    className={cn(
      "hover:border-primary/30 transition-all duration-200",
      onClick && 'cursor-pointer'
    )}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-heading font-bold tracking-tight">{value}</p>
      <TrendIndicator value={trend} suffix={trendSuffix} />
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const {
    workouts,
    getTotalWeight,
    getCompletedWorkoutsCount,
    getLatestMeasurement,
    isLoaded,
    error
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, isPlanExpired, currentWeek, planDurationWeeks, weeksRemaining, planStartDate, planStarted } = useTrainingPlan(uid);
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid, canUseStrava);
  const { cycles } = usePlanCycles(uid);
  const [localDraft, setLocalDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const completedCount = useMemo(() => workouts.filter(w => w.completed).length, [workouts]);
  const latestMeasurement = getLatestMeasurement();
  const totalWeight = getTotalWeight();

  const today = useMemo(() => new Date(), []);
  const thisWeek = useMemo(() => {
    if (!planStartDate) return getScheduledTrainingWeek(trainingPlan, today);
    const start = parseLocalDate(planStartDate);
    // Plan jeszcze nie wystartował → pokaż PIERWSZY tydzień planu (daty od startu) jako zapowiedź,
    // zamiast dat bieżącego tygodnia (które myliły jako "plan tygodnia").
    if (!planStarted) return getScheduledTrainingWeek(trainingPlan, start);
    const week = getScheduledTrainingWeek(trainingPlan, today);
    return week.filter(e => e.date >= start);
  }, [trainingPlan, today, planStartDate, planStarted]);

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);
  const activeCycle = useMemo(() => cycles.find(cycle => cycle.status === 'active') ?? null, [cycles]);
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);
  const workoutToDay = useMemo(() => (workout: typeof workouts[number]): TrainingDay => {
    const label = resolver.resolveDayLabel(workout);
    return {
      id: workout.dayId,
      dayName: label.dayName,
      weekday: 'monday',
      focus: label.focus,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.exerciseId,
        name: resolver.resolveExerciseName(workout, exercise.exerciseId),
        sets: t('dash.setsCount', { n: exercise.sets.filter(set => !set.isWarmup).length }),
        instructions: [],
      })),
    };
  }, [resolver, t]);
  const previousCompletedCycle = useMemo(() => (
    cycles
      .filter(cycle => cycle.status === 'completed')
      .sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ?? null
  ), [cycles]);
  const liveActiveCycle = useMemo(() => buildActiveCyclePreview(activeCycle, workouts, today), [activeCycle, today, workouts]);
  const planNextStep = useMemo(() => buildPlanNextStep({
    hasPlan: trainingPlan.length > 0,
    isPlanExpired,
    weeksRemaining,
    currentWeek,
    planDurationWeeks,
    activeCycle: liveActiveCycle,
    previousCompletedCycle,
    today,
  }), [currentWeek, isPlanExpired, liveActiveCycle, planDurationWeeks, previousCompletedCycle, today, trainingPlan.length, weeksRemaining]);

  // Dismissable "co dalej z planem?" card — hidden per plan (reappears when a new plan starts).
  const NEXT_STEP_DISMISS_KEY = 'fittracker_nextstep_dismissed';
  const planSignature = planStartDate || 'no-plan';
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(() => {
    try { return localStorage.getItem(NEXT_STEP_DISMISS_KEY); } catch { return null; }
  });
  const showNextStep = dismissedSignature !== planSignature;
  const dismissNextStep = () => {
    setDismissedSignature(planSignature);
    try { localStorage.setItem(NEXT_STEP_DISMISS_KEY, planSignature); } catch { /* ignore */ }
  };

  // Determine today's training context
  const todayTraining = useMemo(() => {
    const todayKey = formatLocalDate(today);
    const completedToday = findWorkoutForRoute(workouts, {
      date: todayKey,
      allowDateFallback: true,
    });
    if (completedToday?.completed) {
      return {
        type: 'completed' as const,
        day: workoutToDay(completedToday),
        workout: completedToday,
        dateStr: todayKey,
      };
    }

    // Plan hasn't started yet — don't push a training for today; point to the first session.
    if (planStartDate && today < parseLocalDate(planStartDate)) {
      const nextEntry = getNextScheduledTraining(trainingPlan, today);
      return { type: 'rest' as const, nextDay: nextEntry?.day ?? null };
    }

    const todayEntry = getScheduledTrainingForDate(trainingPlan, today);

    if (!todayEntry) {
      const nextEntry = getNextScheduledTraining(trainingPlan, today);
      return { type: 'rest' as const, nextDay: nextEntry?.day ?? null };
    }

    const day = todayEntry.day;
    // Primary match by dayId+date; fall back to ANY completed workout on today's date so a
    // session logged under a prior plan (different day.id / cycle) still counts as done today.
    const todayWorkout = findWorkoutForRoute(workouts, {
      dayId: day.id,
      date: todayEntry.dateKey,
      allowDateFallback: true,
    });
    if (todayWorkout?.completed) {
      return { type: 'completed' as const, day, workout: todayWorkout, dateStr: todayEntry.dateKey };
    }
    return { type: 'training' as const, day, dayId: day.id, dateStr: todayEntry.dateKey };
  }, [trainingPlan, today, workouts, planStartDate, workoutToDay]);

  // Calculate trends (last 4 weeks vs previous 4 weeks)
  const trends = useMemo(() => {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentWorkouts = workouts.filter(w => w.completed && parseLocalDate(w.date) >= fourWeeksAgo);
    const olderWorkouts = workouts.filter(w => {
      const workoutDate = parseLocalDate(w.date);
      return w.completed && workoutDate >= eightWeeksAgo && workoutDate < fourWeeksAgo;
    });

    const recentCount = recentWorkouts.length;
    const olderCount = olderWorkouts.length;

    const recentTonnage = recentWorkouts.reduce((sum, w) => {
      return sum + Object.values(w.exercises || {}).reduce((exSum, ex) => {
        return exSum + (ex.sets || []).reduce((setSum, s) => setSum + ((s.weight || 0) * (s.reps || 0)), 0);
      }, 0);
    }, 0);
    const olderTonnage = olderWorkouts.reduce((sum, w) => {
      return sum + Object.values(w.exercises || {}).reduce((exSum, ex) => {
        return exSum + (ex.sets || []).reduce((setSum, s) => setSum + ((s.weight || 0) * (s.reps || 0)), 0);
      }, 0);
    }, 0);

    return {
      workouts: olderCount > 0 ? recentCount - olderCount : null,
      tonnage: olderTonnage > 0 ? Math.round((recentTonnage - olderTonnage) / 1000 * 10) / 10 : null,
      weight: null as number | null,
      streak: streak > 0 ? streak : null,
    };
  }, [workouts, streak]);

  // Find most recent PR
  const latestPR = useMemo(() => {
    const allNames = new Map<string, string>([
      ...defaultPlanData.flatMap(d => d.exercises.map(e => [e.id, e.name] as [string, string])),
      ...trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name] as [string, string])),
    ]);
    const completedSorted = workouts
      .filter(w => w.completed)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

    let checked = 0;
    for (const workout of completedSorted) {
      if (checked >= 10) break;
      checked++;
      const olderWorkouts = completedSorted.filter(
        w => w.id !== workout.id && parseLocalDate(w.date) < parseLocalDate(workout.date),
      );
      if (olderWorkouts.length === 0) continue;
      const prs = detectNewPRs(workout, olderWorkouts, allNames);
      if (prs.length > 0) {
        return {
          exerciseName: prs[0].exerciseName,
          value: prs[0].newValue,
          type: prs[0].type,
          date: workout.date,
        };
      }
    }
    return null;
  }, [workouts, trainingPlan]);

  // Weekly Strava km counter (Mon-Sun)
  const weeklyKm = useMemo(() => {
    if (!stravaConnection.connected) return 0;
    const monday = getStartOfPlanWeek(today);
    const mondayStr = formatLocalDate(monday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = formatLocalDate(sunday);

    return stravaActivities
      .filter(a => a.date >= mondayStr && a.date <= sundayStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit')
      .reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;
  }, [stravaActivities, stravaConnection.connected, today]);

  // Greeting
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? t('dash.greeting.morning') : hour < 18 ? t('dash.greeting.day') : t('dash.greeting.evening');
  const GreetingIcon = hour < 18 ? Sun : Moon;
  const displayName = profile?.displayName?.split(' ')[0] || t('dash.defaultName');
  const formattedDate = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Time progress through the plan (0 until the plan actually starts).
  const planProgress = planStarted ? Math.min(100, Math.round((currentWeek / planDurationWeeks) * 100)) : 0;

  useEffect(() => {
    let cancelled = false;
    if (!uid) return;

    const loadDraft = async () => {
      const draft = await workoutDraftDb.loadActiveDraft(uid);
      if (!cancelled) {
        setLocalDraft(draft);
        setPendingSyncCount(workoutSyncQueue.pendingCount(uid));
      }
    };

    void loadDraft();

    const handleFocus = () => {
      void loadDraft();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [uid]);

  // Day focus descriptions
  const dayColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500'];
  const planNextStepTone = {
    primary: 'border-primary/40 bg-primary/5',
    warning: 'border-amber-500/40 bg-amber-500/5',
    success: 'border-emerald-500/40 bg-emerald-500/5',
    info: 'border-sky-500/40 bg-sky-500/5',
  } as const;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{t('dash.error')}: {error}</p>
      </div>
    );
  }

  const formatPRDate = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('dash.date.today');
    if (diffDays === 1) return t('dash.date.yesterday');
    if (diffDays < 7) return t('dash.date.daysAgo', { n: diffDays });
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase flex items-center gap-2 tracking-tight">
          <GreetingIcon className="h-6 w-6 text-yellow-500" />
          {greetingText}, {displayName}!
        </h1>
        <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
      </div>

      {(localDraft && (localDraft.dirty || localDraft.finalSyncPending || localDraft.sessionOrigin === 'provisional')) || pendingSyncCount > 0 ? (
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CloudOff className="h-5 w-5 text-sky-700 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sky-950">
                  {localDraft?.finalSyncPending
                    ? t('dash.sync.finishedLocally')
                    : localDraft?.sessionOrigin === 'provisional'
                      ? t('dash.sync.startedOffline')
                      : pendingSyncCount > 0
                        ? t('dash.sync.queued', { n: pendingSyncCount })
                        : t('dash.sync.localChanges')}
                </p>
                <p className="text-sm text-sky-900/80">
                  {localDraft?.finalSyncPending
                    ? t('dash.sync.finishedLocally.desc')
                    : localDraft?.sessionOrigin === 'provisional'
                      ? t('dash.sync.startedOffline.desc')
                      : pendingSyncCount > 0
                        ? t('dash.sync.queued.desc')
                        : t('dash.sync.localChanges.desc')}
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-sky-300 bg-white hover:bg-sky-100" onClick={() => navigate('/settings')}>
              {t('dash.sync.openCenter')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Today's training card */}
      {todayTraining.type === 'training' && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Dumbbell className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{todayTraining.day.dayName}</p>
                <p className="text-xs text-muted-foreground truncate">{todayTraining.day.focus} · {t('dash.exercisesCount', { n: todayTraining.day.exercises.length })}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/day')}>{t('dash.details')}</Button>
              <Button size="sm" className="gap-1.5 flex-1" onClick={() => navigate(`/workout/${todayTraining.dayId}?date=${todayTraining.dateStr}&autostart=true`)}>
                <Play className="h-3.5 w-3.5" />
                {t('dash.startWorkout')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {todayTraining.type === 'completed' && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="py-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{t('dash.workoutCompleted')}</p>
                <p className="text-xs text-muted-foreground">{todayTraining.day.dayName}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(buildWorkoutRoute(todayTraining.workout, todayTraining.day.id))}>
              {t('dash.view')}
            </Button>
          </CardContent>
        </Card>
      )}

      {todayTraining.type === 'rest' && (
        <Card className="bg-muted/30">
          <CardContent className="py-4 px-5">
            <p className="text-sm font-medium">{t('dash.restDay')} 🧘</p>
            {todayTraining.nextDay && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dash.nextTraining')}: {todayTraining.nextDay.dayName} ({todayTraining.nextDay.focus})
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {showNextStep && (
      <Card className={planNextStepTone[planNextStep.tone]}>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('dash.whatNext')}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{planNextStep.title}</h2>
              <p className="text-sm text-muted-foreground">{planNextStep.description}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex flex-wrap gap-2">
                {planNextStep.badges.map((badge) => (
                  <Badge key={badge} variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold">
                    {badge}
                  </Badge>
                ))}
              </div>
              <button
                onClick={dismissNextStep}
                aria-label={t('dash.dismissHint')}
                className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate(planNextStep.primaryPath)}>
              {planNextStep.primaryLabel}
            </Button>
            {planNextStep.secondaryPath && planNextStep.secondaryLabel ? (
              <Button variant="outline" onClick={() => navigate(planNextStep.secondaryPath!)}>
                {planNextStep.secondaryLabel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Stats - 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          title={t('dash.stat.workouts')}
          value={completedCount}
          icon={Trophy}
          trend={trends.workouts}
          iconColor="bg-emerald-500/15 text-emerald-500"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title={t('dash.stat.tonnage')}
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          icon={Dumbbell}
          trend={trends.tonnage}
          trendSuffix="t"
          iconColor="bg-primary/15 text-primary"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title={t('dash.stat.weight')}
          value={latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : '--'}
          icon={Weight}
          trend={trends.weight}
          trendSuffix=" kg"
          iconColor="bg-muted text-muted-foreground"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title={t('dash.stat.streak')}
          value={t('dash.weeksShort', { n: streak })}
          icon={Flame}
          trend={trends.streak}
          trendSuffix={` ${t('dash.weeksUnit')}`}
          iconColor="bg-amber-500/15 text-amber-500"
          onClick={() => navigate('/analytics?tab=charts')}
        />
      </div>

      {/* Weekly km counter (Strava) */}
      {weeklyKm > 0 && (
        <Card
          className="bg-orange-500/5 border-orange-500/20 cursor-pointer hover:bg-orange-500/10 transition-colors"
          onClick={() => navigate('/analytics?tab=strava')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Route className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold tracking-tight">{weeklyKm.toFixed(1)} km</p>
                <p className="text-xs text-muted-foreground">{t('dash.thisWeekStrava')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Plan Card */}
      {!isPlanExpired && trainingPlan.length > 0 && (
        <Card className="hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="font-heading font-semibold text-base">{t('dash.yourPlan')}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7 gap-1"
                onClick={() => navigate('/plan/edit')}
              >
                <Pencil className="h-3 w-3" />
                {t('dash.edit')}
              </Button>
            </div>

            {/* Plan meta */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
              <span>{t('dash.timesPerWeek', { n: trainingPlan.length })}</span>
              <span>·</span>
              {planStarted ? (
                <span>{t('dash.weekOf', { current: Math.min(currentWeek, planDurationWeeks), total: planDurationWeeks })}</span>
              ) : (
                <span>{t('dash.startDate')}: {parseLocalDate(planStartDate!).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${planProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{t('dash.planProgress', { percent: planProgress })}</p>
            </div>

            {/* Days overview */}
            <div className="space-y-2">
              {trainingPlan.map((day, i) => (
                <div key={day.id} className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full shrink-0", dayColors[i % dayColors.length])} />
                  <span className="text-sm">
                    <span className="font-medium">{day.dayName}:</span>{' '}
                    <span className="text-muted-foreground">{day.focus}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest PR */}
      {latestPR && (
        <Card
          className="cursor-pointer hover:border-amber-500/40 transition-all duration-200 border-amber-500/20"
          onClick={() => navigate('/achievements')}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('dash.lastPR')}</p>
                  <p className="text-xs text-muted-foreground">
                    {latestPR.exerciseName} — <span className="font-heading font-semibold text-foreground">{latestPR.value} kg</span>
                    {' '}
                    <span className="text-muted-foreground">({formatPRDate(latestPR.date)})</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* This week's training — merged timeline */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-base tracking-tight">{t('dash.weekPlan')}</h2>
        <div className="grid gap-3">
          {(() => {
            // Build unified timeline: training days + Strava activities
            type TimelineItem =
              | { type: 'training'; dayId: string; date: Date; dateStr: string }
              | { type: 'strava'; activity: typeof stravaActivities[number]; dateStr: string };

            const items: TimelineItem[] = [];

            // Add training days
            thisWeek.forEach(({ day, date, dateKey }) => {
              items.push({ type: 'training', dayId: day.id, date, dateStr: dateKey });
            });

            // Add Strava activities for this week
            if (stravaConnection.connected && thisWeek.length > 0) {
              const mondayDate = getStartOfPlanWeek(today);
              const mondayStr = formatLocalDate(mondayDate);
              const sundayDate = new Date(mondayDate);
              sundayDate.setDate(sundayDate.getDate() + 6);
              const sundayStr = formatLocalDate(sundayDate);

              stravaActivities
                .filter(a => a.date >= mondayStr && a.date <= sundayStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit')
                .forEach(activity => {
                  items.push({ type: 'strava', activity, dateStr: activity.date });
                });
            }

            // Sort by date string
            items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

            return items.map((item) => {
              if (item.type === 'training') {
                const workoutForDate = findWorkoutForRoute(workouts, {
                  dayId: item.dayId,
                  date: item.dateStr,
                  allowDateFallback: true,
                });
                return (
                  <TrainingDayCard
                    key={`training-${item.dayId}-${item.dateStr}`}
                    day={trainingPlan.find(d => d.id === item.dayId)!}
                    latestWorkout={workoutForDate}
                    trainingDate={item.date}
                    onClick={() => navigate(workoutForDate?.completed
                      ? buildWorkoutRoute(workoutForDate, item.dayId)
                      : `/workout/${item.dayId}?date=${item.dateStr}&autostart=true`
                    )}
                  />
                );
              }
              return (
                <StravaActivityCard key={`strava-${item.activity.id}`} activity={item.activity} maxHR={stravaConnection.estimatedMaxHR} />
              );
            });
          })()}
        </div>
      </div>

      {/* Analytics link */}
      <Button
        variant="outline"
        className="w-full py-5 hover:border-primary/30 transition-all duration-200"
        onClick={() => navigate('/analytics')}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        {t('dash.seeAnalytics')}
      </Button>
    </div>
  );
};

export default Dashboard;
