import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { useStrava } from '@/hooks/useStrava';
import { useCurrentUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  calculateStreak,
  calculateLongestStreak,
  getWeekBounds,
  getMonthBounds,
  calculateTonnage,
  filterWorkoutsByPeriod,
} from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { calculate1RM } from '@/lib/pr-utils';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import { DataManagement } from '@/components/DataManagement';
import { StravaTab } from '@/components/strava/StravaTab';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { TrainingHeatmap } from '@/components/TrainingHeatmap';
import type { WorkoutSession } from '@/types';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { tooltipStyle } from '@/lib/chart-config';
import { countScheduledTrainingsInRange, getTrainingDayForDate, startOfLocalDay } from '@/lib/plan-schedule';
import {
  Dumbbell, Trophy, Flame, Copy, Check, Calendar, BarChart3,
  TrendingUp, TrendingDown, Minus, Scale, Loader2, ChevronRight,
  Sparkles, Clock, Route,
} from 'lucide-react';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { useTranslation } from '@/contexts/LanguageContext';

type AnalyticsTab = 'summary' | 'charts' | 'strava' | 'weekly';

// ========================
// Shared utilities
// ========================

const StatSummary = ({ items }: { items: { label: string; value: string | number }[] }) => (
  <div className="grid grid-cols-3 gap-3 mt-4">
    {items.map(item => (
      <div key={item.label} className="text-center p-3 bg-muted/30 rounded-lg">
        <p className="text-lg font-bold">{item.value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
      </div>
    ))}
  </div>
);

const workoutTonnage = (workout: WorkoutSession): number =>
  workout.exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed && !s.isWarmup).reduce((s, set) => s + set.reps * set.weight, 0),
  0);

const getWeekLabel = (weekIndex: number, totalWeeks: number, t: (key: string, params?: Record<string, string | number>) => string): string => {
  if (weekIndex === totalWeeks - 1) return t('analytics.weekLabel.this');
  if (weekIndex === totalWeeks - 2) return t('analytics.weekLabel.last');
  return t('analytics.weekLabel.ago', { n: totalWeeks - weekIndex });
};

const formatDateShort = (date: string): string =>
  parseLocalDate(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

// ========================
// TAB: Podsumowanie
// ========================

type Period = 'week' | 'month';

const SummaryTab = () => {
  const { uid, canUseStrava } = useCurrentUser();
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, planStartDate } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid, canUseStrava);
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('week');
  const [copied, setCopied] = useState(false);

  const bounds = useMemo(() => {
    const now = new Date();
    return period === 'week' ? getWeekBounds(now) : getMonthBounds(now);
  }, [period]);
  const previousBounds = useMemo(() => (
    period === 'week'
      ? getWeekBounds(new Date(bounds.start.getTime() - 7 * 24 * 60 * 60 * 1000))
      : getMonthBounds(new Date(bounds.start.getFullYear(), bounds.start.getMonth() - 1, 1))
  ), [bounds, period]);
  const boundsStartMs = bounds.start.getTime();

  const currentWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, bounds),
    [bounds, workouts],
  );

  const previousWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, previousBounds),
    [previousBounds, workouts],
  );

  const expectedWorkouts = useMemo(
    () => {
      if (!planStartDate) {
        return countScheduledTrainingsInRange(trainingPlan, bounds.start, bounds.end);
      }

      const startDate = parseLocalDate(planStartDate);
      if (bounds.end < startDate) {
        return currentWorkouts.length;
      }

      const effectiveStart = bounds.start < startDate ? startDate : bounds.start;
      return countScheduledTrainingsInRange(trainingPlan, effectiveStart, bounds.end);
    },
    [bounds.end, bounds.start, currentWorkouts.length, planStartDate, trainingPlan],
  );
  const frequency = currentWorkouts.length;

  const currentTonnage = calculateTonnage(currentWorkouts);
  const previousTonnage = calculateTonnage(previousWorkouts);
  const tonnageChange = previousTonnage > 0
    ? Math.round(((currentTonnage - previousTonnage) / previousTonnage) * 100)
    : 0;

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);

  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles), [trainingPlan, cycles]);

  const periodPRs = useMemo(() => {
    // Nazwy ze wszystkich wykonanych ćwiczeń (snapshot/cykl/plan), nie tylko z aktualnego planu.
    const allNames = new Map<string, string>();
    workouts.forEach(w => w.exercises.forEach(ex => {
      if (!allNames.has(ex.exerciseId)) allNames.set(ex.exerciseId, resolver.resolveExerciseName(w, ex.exerciseId));
    }));
    const allPRs: Array<{ exerciseName: string; type: string }> = [];
    const historicalWorkouts = workouts.filter(w => w.completed && parseLocalDate(w.date).getTime() < boundsStartMs);

    currentWorkouts.forEach(cw => {
      const prs = detectNewPRs(cw, historicalWorkouts, allNames);
      prs.forEach(pr => allPRs.push({ exerciseName: pr.exerciseName, type: pr.type }));
    });

    return allPRs;
  }, [boundsStartMs, currentWorkouts, resolver, workouts]);

  const periodMeasurements = measurements.filter(m => {
    const d = parseLocalDate(m.date);
    return d >= bounds.start && d <= bounds.end && m.weight;
  });
  const latestMeasurement = periodMeasurements[0] || measurements.find(m => m.weight);
  const latestWeight = latestMeasurement?.weight;

  const handleCopy = async () => {
    const periodLabel = period === 'week' ? t('analytics.period.week') : t('analytics.period.month');
    const dateRange = `${bounds.start.toLocaleDateString('pl-PL')} - ${bounds.end.toLocaleDateString('pl-PL')}`;
    const lines = [
      `📊 ${t('analytics.copy.summary', { period: periodLabel })}`,
      `📅 ${dateRange}`,
      ``,
      `🏋️ ${t('analytics.copy.frequency', { done: frequency, expected: expectedWorkouts })}`,
      `💪 ${t('analytics.copy.tonnage', { value: currentTonnage.toLocaleString('pl-PL') })}${tonnageChange !== 0 ? ` (${tonnageChange > 0 ? '+' : ''}${tonnageChange}%)` : ''}`,
      `🔥 ${t('analytics.copy.streak', { n: streak })}`,
    ];
    if (periodPRs.length > 0) lines.push(`🏆 ${t('analytics.copy.newPRs', { list: periodPRs.map(p => p.exerciseName).join(', ') })}`);
    if (latestWeight) lines.push(`⚖️ ${t('analytics.copy.weight', { value: latestWeight })}`);

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({ title: t('analytics.toast.copied'), description: t('analytics.toast.copiedDesc') });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={period === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('week')}>
            <Calendar className="h-4 w-4 mr-2" />{t('analytics.period.week')}
          </Button>
          <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}>
            <BarChart3 className="h-4 w-4 mr-2" />{t('analytics.period.month')}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? t('analytics.copied') : t('analytics.copy')}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {bounds.start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {bounds.end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Dumbbell className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{frequency}/{expectedWorkouts}</p><p className="text-xs text-muted-foreground">{t('analytics.stat.frequency')}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{(currentTonnage / 1000).toFixed(1)}t</p>
              <p className="text-xs text-muted-foreground">
                {t('analytics.stat.tonnage')}
                {tonnageChange !== 0 && (
                  <span className={tonnageChange > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {tonnageChange > 0 ? '+' : ''}{tonnageChange}%
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Flame className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">{streak}</p><p className="text-xs text-muted-foreground">{t('analytics.stat.streakWeeks')}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{latestWeight ? `${latestWeight} kg` : '--'}</p><p className="text-xs text-muted-foreground">{t('analytics.stat.bodyWeight')}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {periodPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {period === 'week' ? t('analytics.newPRs.week') : t('analytics.newPRs.month')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {periodPRs.map((pr, i) => (
                <Badge key={i} className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">🏆 {pr.exerciseName}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentWorkouts.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{t('analytics.completedWorkouts')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {currentWorkouts.map(w => {
              const dayLabel = resolver.resolveDayLabel(w);
              return (
                <button
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 w-full text-left hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/workout/${w.dayId}?date=${w.date}&session=${w.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{dayLabel.dayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {parseLocalDate(w.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{t('analytics.exercisesCount', { n: w.exercises.length })}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {currentWorkouts.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{period === 'week' ? t('analytics.noWorkouts.week') : t('analytics.noWorkouts.month')}</p>
          </CardContent>
        </Card>
      )}

      {/* Strava activities for period */}
      {stravaConnection.connected && (() => {
        const startStr = formatLocalDate(bounds.start);
        const endStr = formatLocalDate(bounds.end);
        const periodStrava = stravaActivities.filter(
          a => a.date >= startStr && a.date <= endStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit'
        );
        if (periodStrava.length === 0) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('analytics.stravaActivities')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {periodStrava.map(a => (
                <StravaActivityCard key={a.id} activity={a} maxHR={stravaConnection.estimatedMaxHR} />
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {/* Training Heatmap */}
      <TrainingHeatmap workouts={workouts} stravaActivities={stravaActivities} />
    </div>
  );
};

// ========================
// TAB: Wykresy
// ========================

type ChartsSubTab = 'workouts' | 'tonnage' | 'weight' | 'streak' | 'progression';
type WeightMode = 'max' | '1rm';

const ChartsTab = () => {
  const { uid } = useCurrentUser();
  const { t } = useTranslation();
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles), [trainingPlan, cycles]);
  const [subTab, setSubTab] = useState<ChartsSubTab>('workouts');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [weightMode, setWeightMode] = useState<WeightMode>('max');

  // Workouts chart data
  const workoutsData = useMemo(() => {
    const completed = workouts.filter(w => w.completed);
    const now = new Date();
    const weeks: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - i * 7);
      const { start, end } = getWeekBounds(weekDate);
      const count = completed.filter(w => { const d = parseLocalDate(w.date); return d >= start && d <= end; }).length;
      weeks.push({ label: getWeekLabel(11 - i, 12, t), count });
    }
    const totalCompleted = completed.length;
    const avgPerWeek = weeks.length > 0 ? (weeks.reduce((s, w) => s + w.count, 0) / weeks.length).toFixed(1) : '0';
    const bestWeek = Math.max(...weeks.map(w => w.count), 0);
    return { weeks, totalCompleted, avgPerWeek, bestWeek };
  }, [workouts, t]);

  // Tonnage chart data
  const tonnageData = useMemo(() => {
    const completed = workouts.filter(w => w.completed).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const chartData = completed.map(w => ({ date: formatDateShort(w.date), tonnage: Math.round(workoutTonnage(w)) }));
    const totalTonnage = chartData.reduce((s, d) => s + d.tonnage, 0);
    const avgPerWorkout = chartData.length > 0 ? Math.round(totalTonnage / chartData.length) : 0;
    const now = new Date();
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28);
    const eightWeeksAgo = new Date(now); eightWeeksAgo.setDate(now.getDate() - 56);
    const recent = completed.filter(w => parseLocalDate(w.date) >= fourWeeksAgo);
    const previous = completed.filter(w => { const d = parseLocalDate(w.date); return d >= eightWeeksAgo && d < fourWeeksAgo; });
    const recentTonnage = recent.reduce((s, w) => s + workoutTonnage(w), 0);
    const previousTonnage = previous.reduce((s, w) => s + workoutTonnage(w), 0);
    let trend = '--';
    if (previousTonnage > 0) { const change = ((recentTonnage - previousTonnage) / previousTonnage * 100).toFixed(0); trend = `${Number(change) >= 0 ? '+' : ''}${change}%`; }
    return { chartData, totalTonnage, avgPerWorkout, trend };
  }, [workouts]);

  // Weight chart data
  const weightData = useMemo(() => {
    const withWeight = measurements.filter(m => m.weight && m.weight > 0).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const chartData = withWeight.map(m => ({ date: formatDateShort(m.date), weight: m.weight! }));
    if (chartData.length === 0) return { chartData, current: '--', change: '--', minMax: '--' };
    const current = chartData[chartData.length - 1].weight;
    const first = chartData[0].weight;
    const diff = current - first;
    const change = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg`;
    const weights = chartData.map(d => d.weight);
    return { chartData, current: `${current} kg`, change, minMax: `${Math.min(...weights)}–${Math.max(...weights)} kg` };
  }, [measurements]);

  // Streak data
  const streakData = useMemo(() => {
    const completed = workouts.filter(w => w.completed);
    const completedDates = new Set(completed.map(w => w.date));
    const now = new Date();
    const { start: currentWeekStart } = getWeekBounds(now);
    const startDate = new Date(currentWeekStart);
    startDate.setDate(startDate.getDate() - 11 * 7);
    const days: { date: string; dayOfWeek: number; weekIndex: number; hasWorkout: boolean; isPlanned: boolean }[] = [];
    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + week * 7 + day);
        const localDate = startOfLocalDay(d);
        const dateStr = formatLocalDate(localDate);
        const dayOfWeek = localDate.getDay();
        const isPlanned = getTrainingDayForDate(trainingPlan, localDate) !== null;
        const isFuture = d > now;
        days.push({ date: dateStr, dayOfWeek, weekIndex: week, hasWorkout: !isFuture && completedDates.has(dateStr), isPlanned: !isFuture && isPlanned });
      }
    }
    const streak = calculateStreak(workouts);
    const longestStreak = calculateLongestStreak(workouts);
    const plannedCount = days.filter(d => d.isPlanned).length;
    const completedCount = days.filter(d => d.hasWorkout).length;
    const attendance = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0;
    return { days, streak, longestStreak, attendance };
  }, [trainingPlan, workouts]);

  // Per-exercise progression data
  const perExerciseData = useMemo(() => {
    const completedWorkouts = workouts.filter(w => w.completed && w.exercises.length > 0);
    if (completedWorkouts.length === 0) return [];

    const exerciseIds = new Set<string>();
    const exerciseNames = new Map<string, string>();
    completedWorkouts.forEach(w => {
      if (selectedDay !== 'all' && w.dayId !== selectedDay) return;
      w.exercises.forEach(ex => {
        exerciseIds.add(ex.exerciseId);
        if (!exerciseNames.has(ex.exerciseId)) exerciseNames.set(ex.exerciseId, resolver.resolveExerciseName(w, ex.exerciseId));
      });
    });

    const filteredWorkouts = selectedDay === 'all'
      ? completedWorkouts
      : completedWorkouts.filter(w => w.dayId === selectedDay);

    return Array.from(exerciseIds).map(id => {
      const history: { date: string; value: number }[] = [];
      filteredWorkouts
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach(w => {
          const ex = w.exercises.find(e => e.exerciseId === id);
          if (!ex) return;
          const workingSets = ex.sets.filter(s => !s.isWarmup && s.completed);
          const weightedSets = workingSets.filter(s => s.weight > 0);
          if (weightedSets.length > 0) {
            const value = weightMode === '1rm'
              ? Math.max(...weightedSets.map(s => calculate1RM(s.weight, s.reps)))
              : Math.max(...weightedSets.map(s => s.weight));
            history.push({
              date: parseLocalDate(w.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
              value,
            });
          } else if (workingSets.length > 0) {
            // Bodyweight exercise — track max reps
            const maxReps = Math.max(...workingSets.map(s => s.reps));
            history.push({
              date: parseLocalDate(w.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
              value: maxReps,
            });
          }
        });
      return { id, name: exerciseNames.get(id) || id, chartData: history, isBodyweight: isBodyweightExercise(exerciseNames.get(id) || '') };
    }).filter(ex => ex.chartData.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, selectedDay, weightMode, resolver]);

  const dayLabels = [
    t('analytics.day.mon'), t('analytics.day.tue'), t('analytics.day.wed'),
    t('analytics.day.thu'), t('analytics.day.fri'), t('analytics.day.sat'), t('analytics.day.sun'),
  ];
  const reorderDay = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { id: 'workouts', label: t('analytics.subtab.workouts') },
          { id: 'tonnage', label: t('analytics.subtab.tonnage') },
          { id: 'weight', label: t('analytics.subtab.weight') },
          { id: 'streak', label: t('analytics.subtab.streak') },
          { id: 'progression', label: t('analytics.subtab.progression') },
        ] as const).map(item => (
          <Badge
            key={item.id}
            variant={subTab === item.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSubTab(item.id)}
          >
            {item.label}
          </Badge>
        ))}
      </div>

      {/* Workouts chart */}
      {subTab === 'workouts' && (
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workoutsData.weeks}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={2} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={3} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" label={{ value: t('analytics.chart.goal3'), position: 'right', fontSize: 10, fill: 'hsl(var(--chart-2))' }} />
                <Bar dataKey="count" name={t('analytics.subtab.workouts')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <StatSummary items={[
              { label: t('analytics.stat.totalCompleted'), value: workoutsData.totalCompleted },
              { label: t('analytics.stat.avgPerWeek'), value: workoutsData.avgPerWeek },
              { label: t('analytics.stat.bestWeek'), value: workoutsData.bestWeek },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Tonnage chart */}
      {subTab === 'tonnage' && (
        <Card>
          <CardContent className="pt-6">
            {tonnageData.chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('analytics.noCompletedToShow')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tonnageData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(tonnageData.chartData.length / 6) - 1)} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" kg" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kg`, t('analytics.stat.tonnage')]} />
                  <Area type="monotone" dataKey="tonnage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <StatSummary items={[
              { label: t('analytics.stat.totalTonnage'), value: `${(tonnageData.totalTonnage / 1000).toFixed(1)}t` },
              { label: t('analytics.stat.avgPerWorkout'), value: `${tonnageData.avgPerWorkout} kg` },
              { label: t('analytics.stat.trend4w'), value: tonnageData.trend },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Weight chart */}
      {subTab === 'weight' && (
        weightData.chartData.length === 0 ? (
          <Card><CardContent className="py-12"><p className="text-center text-muted-foreground">{t('analytics.noWeightData')}</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weightData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(weightData.chartData.length / 6) - 1)} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" kg" domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kg`, t('analytics.subtab.weight')]} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
              <StatSummary items={[
                { label: t('analytics.stat.currentWeight'), value: weightData.current },
                { label: t('analytics.stat.changeFromStart'), value: weightData.change },
                { label: t('analytics.stat.minMax'), value: weightData.minMax },
              ]} />
            </CardContent>
          </Card>
        )
      )}

      {/* Streak heatmap */}
      {subTab === 'streak' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 mr-1">
                {dayLabels.map(label => (
                  <div key={label} className="h-7 flex items-center"><span className="text-[10px] text-muted-foreground w-5">{label}</span></div>
                ))}
              </div>
              <div className="flex gap-1 flex-1 overflow-x-auto">
                {Array.from({ length: 12 }, (_, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const cell = streakData.days.find(d => d.weekIndex === weekIdx && reorderDay(d.dayOfWeek) === dayIdx);
                      if (!cell) return <div key={dayIdx} className="h-7 w-7 rounded-sm bg-muted/10" />;
                      return (
                        <div key={dayIdx} className={cn('h-7 w-7 rounded-sm transition-colors',
                          cell.hasWorkout ? 'bg-fitness-success' : cell.isPlanned ? 'bg-muted/30 border-2 border-primary/30' : 'bg-muted/20'
                        )} title={`${cell.date}${cell.hasWorkout ? ` - ${t('analytics.legend.workout')}` : ''}`} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-fitness-success" /><span>{t('analytics.legend.workout')}</span></div>
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/30 border border-primary/30" /><span>{t('analytics.legend.planned')}</span></div>
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/20" /><span>{t('analytics.legend.none')}</span></div>
            </div>
            <StatSummary items={[
              { label: t('analytics.stat.currentStreak'), value: t('analytics.weeksValue', { n: streakData.streak }) },
              { label: t('analytics.stat.longestStreak'), value: t('analytics.weeksValue', { n: streakData.longestStreak }) },
              { label: t('analytics.stat.frequency'), value: `${streakData.attendance}%` },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Weight progression — per-exercise charts */}
      {subTab === 'progression' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />{t('analytics.weightProgression')}
              </CardTitle>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={selectedDay === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedDay('all')}>{t('analytics.allDays')}</Badge>
                  {trainingPlan.map(day => (
                    <Badge key={day.id} variant={selectedDay === day.id ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedDay(day.id)}>{day.dayName}</Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Badge variant={weightMode === 'max' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setWeightMode('max')}>{t('analytics.maxWeight')}</Badge>
                  <Badge variant={weightMode === '1rm' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setWeightMode('1rm')}>{t('analytics.est1rm')}</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {perExerciseData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('analytics.noCompletedToShow')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {perExerciseData.map(ex => (
                <Card key={ex.id}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <p className="text-sm font-medium mb-2 truncate">{ex.name}</p>
                    {ex.chartData.length >= 2 ? (
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={ex.chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                          <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" unit={ex.isBodyweight ? ' rp' : ' kg'} width={45} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">
                        {t('analytics.needMin2Sessions')}
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{t('analytics.sessionsCount', { n: ex.chartData.length })}</span>
                      {ex.chartData.length > 0 && (
                        <span>{ex.chartData[ex.chartData.length - 1].value} {ex.isBodyweight ? t('analytics.unit.reps') : 'kg'}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ========================
// TAB: Podsumowania tygodniowe
// ========================

const WeeklyTab = () => {
  const { uid, canUseStrava } = useCurrentUser();
  const { t } = useTranslation();
  const { summaries, isGenerating, error, generateSummary } = useWeeklySummary(uid, canUseStrava);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-base">{t('analytics.weeklySummaries')}</h3>
        <Button
          size="sm"
          onClick={() => generateSummary(new Date())}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {t('analytics.generateNow')}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {summaries.length === 0 && !isGenerating && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('analytics.noSummaries')}</p>
          </CardContent>
        </Card>
      )}

      {summaries.map(s => (
        <Card key={s.id} className="hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-xs">
                {new Date(s.weekStart).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} - {new Date(s.weekEnd).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(s.generatedAt).toLocaleDateString('pl-PL')}
              </span>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Dumbbell className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{s.stats.workoutCount}</p>
                <p className="text-xs text-muted-foreground">{t('analytics.subtab.workouts')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{(s.stats.tonnageKg / 1000).toFixed(1)}t</p>
                <p className="text-xs text-muted-foreground">{t('analytics.stat.tonnage')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Route className="h-3 w-3 text-orange-500" />
                </div>
                <p className="text-sm font-bold">{s.stats.runKm} km</p>
                <p className="text-xs text-muted-foreground">{t('analytics.stat.run')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-3 w-3 text-amber-500" />
                </div>
                <p className="text-sm font-bold">{s.stats.prs.length}</p>
                <p className="text-xs text-muted-foreground">PRy</p>
              </div>
            </div>

            {/* AI summary text */}
            <p className="text-sm text-muted-foreground leading-relaxed">{s.summary}</p>

            {/* PRs badges */}
            {s.stats.prs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.stats.prs.map((pr, i) => (
                  <Badge key={i} className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                    {pr.exerciseName} — {pr.newValue} kg
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ========================
// MAIN PAGE
// ========================

const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canUseStrava } = useCurrentUser();
  const tabParam = searchParams.get('tab') as AnalyticsTab | null;
  const validTabs: AnalyticsTab[] = canUseStrava
    ? ['summary', 'charts', 'strava', 'weekly']
    : ['summary', 'charts', 'weekly'];
  const currentTab: AnalyticsTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'summary';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Analityka</h1>
        <p className="text-sm text-muted-foreground">Podsumowania, wykresy, pomiary i tygodniowe statystyki treningów.</p>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="summary" className="flex-1 text-xs min-w-0">Podsum.</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1 text-xs min-w-0">Wykresy</TabsTrigger>
          {canUseStrava && <TabsTrigger value="strava" className="flex-1 text-xs min-w-0">Strava</TabsTrigger>}
          <TabsTrigger value="weekly" className="flex-1 text-xs min-w-0">Tygodnie</TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><SummaryTab /></TabsContent>
        <TabsContent value="charts"><ChartsTab /></TabsContent>
        {canUseStrava && <TabsContent value="strava"><StravaTab /></TabsContent>}
        <TabsContent value="weekly"><WeeklyTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
