import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Weight, Trophy, Flame, ChevronRight, BarChart3, Sun, Moon, Calendar, Pencil, TrendingUp, TrendingDown, Minus, Route, CheckCircle, Play, CloudOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
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

// Trend component
const TrendIndicator = ({ value, suffix = '' }: { value: number | null; suffix?: string }) => {
  if (value === null || value === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> stabilnie
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
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const {
    workouts,
    getTotalWeight,
    getCompletedWorkoutsCount,
    getLatestMeasurement,
    isLoaded,
    error
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, isPlanExpired, currentWeek, planDurationWeeks, weeksRemaining } = useTrainingPlan(uid);
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid, canUseStrava);
  const { cycles } = usePlanCycles(uid);
  const [localDraft, setLocalDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const completedCount = useMemo(() => workouts.filter(w => w.completed).length, [workouts]);
  const latestMeasurement = getLatestMeasurement();
  const totalWeight = getTotalWeight();

  const today = useMemo(() => new Date(), []);
  const thisWeek = useMemo(() => getScheduledTrainingWeek(trainingPlan, today), [trainingPlan, today]);

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);
  const activeCycle = useMemo(() => cycles.find(cycle => cycle.status === 'active') ?? null, [cycles]);
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

  // Determine today's training context
  const todayTraining = useMemo(() => {
    const todayEntry = getScheduledTrainingForDate(trainingPlan, today);

    if (!todayEntry) {
      const nextEntry = getNextScheduledTraining(trainingPlan, today);
      return { type: 'rest' as const, nextDay: nextEntry?.day ?? null };
    }

    const day = todayEntry.day;
    const todayWorkout = workouts.find(w => w.dayId === day.id && w.date === todayEntry.dateKey);
    if (todayWorkout?.completed) {
      return { type: 'completed' as const, day, dayId: day.id, dateStr: todayEntry.dateKey };
    }
    return { type: 'training' as const, day, dayId: day.id, dateStr: todayEntry.dateKey };
  }, [trainingPlan, today, workouts]);

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
    const allNames = new Map(trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name])));
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
  const greetingText = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór';
  const GreetingIcon = hour < 18 ? Sun : Moon;
  const displayName = profile?.displayName?.split(' ')[0] || 'Trener';
  const formattedDate = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Plan progress
  const planProgress = Math.min(100, Math.round((currentWeek / planDurationWeeks) * 100));

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
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Błąd: {error}</p>
      </div>
    );
  }

  const formatPRDate = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'dziś';
    if (diffDays === 1) return 'wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2 tracking-tight">
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
                    ? 'Masz trening zakończony lokalnie'
                    : localDraft?.sessionOrigin === 'provisional'
                      ? 'Masz trening rozpoczęty offline'
                      : pendingSyncCount > 0
                        ? `Masz ${pendingSyncCount} ${pendingSyncCount === 1 ? 'sesję' : 'sesje'} w kolejce synchronizacji`
                        : 'Masz lokalne zmiany do synchronizacji'}
                </p>
                <p className="text-sm text-sky-900/80">
                  {localDraft?.finalSyncPending
                    ? 'Dane czekają na finalny zapis w chmurze.'
                    : localDraft?.sessionOrigin === 'provisional'
                      ? 'Sesja istnieje tylko na urządzeniu i zostanie utworzona w Firebase po odzyskaniu internetu.'
                      : pendingSyncCount > 0
                        ? 'Otwórz Sync Center, aby sprawdzić wszystkie oczekujące treningi i uruchomić retry all.'
                        : 'Otwórz Sync Center, aby sprawdzić status i wymusić synchronizację.'}
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-sky-300 bg-white hover:bg-sky-100" onClick={() => navigate('/settings')}>
              Otwórz Sync Center
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Today's training card */}
      {todayTraining.type === 'training' && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Dumbbell className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{todayTraining.day.dayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{todayTraining.day.focus} · {todayTraining.day.exercises.length} ćwiczeń</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => navigate('/day')}>Szczegóły</Button>
                <Button size="sm" className="gap-1.5" onClick={() => navigate(`/workout/${todayTraining.dayId}?date=${todayTraining.dateStr}&autostart=true`)}>
                  <Play className="h-3.5 w-3.5" />
                  Rozpocznij trening
                </Button>
              </div>
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
                <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">Trening ukończony!</p>
                <p className="text-xs text-muted-foreground">{todayTraining.day.dayName}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/workout/${todayTraining.dayId}?date=${todayTraining.dateStr}`)}>
              Zobacz
            </Button>
          </CardContent>
        </Card>
      )}

      {todayTraining.type === 'rest' && (
        <Card className="bg-muted/30">
          <CardContent className="py-4 px-5">
            <p className="text-sm font-medium">Dzisiaj wolne 🧘</p>
            {todayTraining.nextDay && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Następny trening: {todayTraining.nextDay.dayName} ({todayTraining.nextDay.focus})
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={planNextStepTone[planNextStep.tone]}>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Co dalej z planem?
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{planNextStep.title}</h2>
              <p className="text-sm text-muted-foreground">{planNextStep.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {planNextStep.badges.map((badge) => (
                <Badge key={badge} variant="outline" className="bg-white/80">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate(planNextStep.primaryPath)}>
              {planNextStep.primaryLabel}
            </Button>
            {planNextStep.secondaryPath && planNextStep.secondaryLabel ? (
              <Button variant="outline" onClick={() => navigate(planNextStep.secondaryPath)}>
                {planNextStep.secondaryLabel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Stats - 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          title="Treningi"
          value={completedCount}
          icon={Trophy}
          trend={trends.workouts}
          iconColor="bg-emerald-500/15 text-emerald-500"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title="Tonaż"
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          icon={Dumbbell}
          trend={trends.tonnage}
          trendSuffix="t"
          iconColor="bg-primary/15 text-primary"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title="Waga"
          value={latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : '--'}
          icon={Weight}
          trend={trends.weight}
          trendSuffix=" kg"
          iconColor="bg-muted text-muted-foreground"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title="Streak"
          value={`${streak} tyg.`}
          icon={Flame}
          trend={trends.streak}
          trendSuffix=" tyg."
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
                <p className="text-xs text-muted-foreground">Ten tydzień (Strava)</p>
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
                <h2 className="font-heading font-semibold text-base">Twój Plan Treningowy</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7 gap-1"
                onClick={() => navigate('/plan/edit')}
              >
                <Pencil className="h-3 w-3" />
                Edytuj
              </Button>
            </div>

            {/* Plan meta */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
              <span>{trainingPlan.length}x/tydzień</span>
              <span>·</span>
              <span>Tydzień {Math.min(currentWeek, planDurationWeeks)} z {planDurationWeeks}</span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${planProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{planProgress}% ukończone</p>
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
                  <p className="font-medium text-sm">Ostatni rekord</p>
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
        <h2 className="font-heading font-semibold text-base tracking-tight">Plan tygodnia</h2>
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
                const workoutForDate = workouts.find(w => w.dayId === item.dayId && w.date === item.dateStr);
                return (
                  <TrainingDayCard
                    key={`training-${item.dayId}-${item.dateStr}`}
                    day={trainingPlan.find(d => d.id === item.dayId)!}
                    latestWorkout={workoutForDate}
                    trainingDate={item.date}
                    onClick={() => navigate(`/workout/${item.dayId}?date=${item.dateStr}${!workoutForDate?.completed ? '&autostart=true' : ''}`)}
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
        Zobacz analitykę
      </Button>
    </div>
  );
};

export default Dashboard;
