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
  Legend,
} from 'recharts';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
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
import { StravaActivityCard } from '@/components/StravaActivityCard';
import type { WorkoutSession } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dumbbell, Trophy, Flame, Copy, Check, Calendar, BarChart3,
  TrendingUp, TrendingDown, Minus, Scale, RefreshCw, Loader2, ChevronRight,
  Sparkles, Clock, Route,
} from 'lucide-react';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';

type AnalyticsTab = 'summary' | 'charts' | 'measurements' | 'strava' | 'weekly';

// ========================
// Shared utilities
// ========================

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

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

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
];

const workoutTonnage = (workout: WorkoutSession): number =>
  workout.exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed && !s.isWarmup).reduce((s, set) => s + set.reps * set.weight, 0),
  0);

const getWeekLabel = (weekIndex: number, totalWeeks: number): string => {
  if (weekIndex === totalWeeks - 1) return 'Ten tydz.';
  if (weekIndex === totalWeeks - 2) return 'Ost. tydz.';
  return `${totalWeeks - weekIndex} tyg. temu`;
};

const formatDateShort = (date: string): string =>
  new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

// ========================
// TAB: Podsumowanie
// ========================

type Period = 'week' | 'month';

const SummaryTab = () => {
  const { uid, isAdmin } = useCurrentUser();
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid, isAdmin);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('week');
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const bounds = period === 'week' ? getWeekBounds(now) : getMonthBounds(now);
  const previousBounds = period === 'week'
    ? getWeekBounds(new Date(bounds.start.getTime() - 7 * 24 * 60 * 60 * 1000))
    : getMonthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const currentWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, bounds),
    [workouts, bounds.start.getTime(), bounds.end.getTime()],
  );

  const previousWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, previousBounds),
    [workouts, previousBounds.start.getTime(), previousBounds.end.getTime()],
  );

  const expectedWorkouts = period === 'week' ? 3 : 12;
  const frequency = currentWorkouts.length;

  const currentTonnage = calculateTonnage(currentWorkouts);
  const previousTonnage = calculateTonnage(previousWorkouts);
  const tonnageChange = previousTonnage > 0
    ? Math.round(((currentTonnage - previousTonnage) / previousTonnage) * 100)
    : 0;

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);

  const periodPRs = useMemo(() => {
    const allNames = new Map(trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name])));
    const allPRs: Array<{ exerciseName: string; type: string }> = [];
    const historicalWorkouts = workouts.filter(w => w.completed && new Date(w.date) < bounds.start);

    currentWorkouts.forEach(cw => {
      const prs = detectNewPRs(cw, historicalWorkouts, allNames);
      prs.forEach(pr => allPRs.push({ exerciseName: pr.exerciseName, type: pr.type }));
    });

    return allPRs;
  }, [currentWorkouts, workouts, bounds.start.getTime()]);

  const periodMeasurements = measurements.filter(m => {
    const d = new Date(m.date);
    return d >= bounds.start && d <= bounds.end && m.weight;
  });
  const latestWeight = periodMeasurements[0]?.weight;

  const handleCopy = async () => {
    const periodLabel = period === 'week' ? 'Tydzień' : 'Miesiąc';
    const dateRange = `${bounds.start.toLocaleDateString('pl-PL')} - ${bounds.end.toLocaleDateString('pl-PL')}`;
    const lines = [
      `📊 Podsumowanie: ${periodLabel}`,
      `📅 ${dateRange}`,
      ``,
      `🏋️ Frekwencja: ${frequency}/${expectedWorkouts} treningów`,
      `💪 Tonaż: ${currentTonnage.toLocaleString('pl-PL')} kg${tonnageChange !== 0 ? ` (${tonnageChange > 0 ? '+' : ''}${tonnageChange}%)` : ''}`,
      `🔥 Seria treningowa: ${streak} tyg.`,
    ];
    if (periodPRs.length > 0) lines.push(`🏆 Nowe PRy: ${periodPRs.map(p => p.exerciseName).join(', ')}`);
    if (latestWeight) lines.push(`⚖️ Waga: ${latestWeight} kg`);

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({ title: 'Skopiowano!', description: 'Podsumowanie w schowku.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={period === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('week')}>
            <Calendar className="h-4 w-4 mr-2" />Tydzień
          </Button>
          <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}>
            <BarChart3 className="h-4 w-4 mr-2" />Miesiąc
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Skopiowano' : 'Kopiuj'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {bounds.start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {bounds.end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Dumbbell className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{frequency}/{expectedWorkouts}</p><p className="text-xs text-muted-foreground">Frekwencja</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{(currentTonnage / 1000).toFixed(1)}t</p>
              <p className="text-xs text-muted-foreground">
                Tonaż
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
            <div><p className="text-2xl font-bold">{streak}</p><p className="text-xs text-muted-foreground">Seria (tyg.)</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{latestWeight ? `${latestWeight} kg` : '--'}</p><p className="text-xs text-muted-foreground">Waga ciała</p></div>
          </div>
        </CardContent></Card>
      </div>

      {periodPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Nowe rekordy w tym {period === 'week' ? 'tygodniu' : 'miesiącu'}
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Ukończone treningi</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {currentWorkouts.map(w => {
              const day = trainingPlan.find(d => d.id === w.dayId);
              return (
                <button
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 w-full text-left hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/workout/${w.dayId}?date=${w.date}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{day?.dayName || w.dayId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{w.exercises.length} ćw.</Badge>
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
            <p className="text-muted-foreground">Brak ukończonych treningów w tym {period === 'week' ? 'tygodniu' : 'miesiącu'}</p>
          </CardContent>
        </Card>
      )}

      {/* Strava activities for period */}
      {stravaConnection.connected && (() => {
        const startStr = bounds.start.toISOString().split('T')[0];
        const endStr = bounds.end.toISOString().split('T')[0];
        const periodStrava = stravaActivities.filter(
          a => a.date >= startStr && a.date <= endStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit'
        );
        if (periodStrava.length === 0) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aktywności Strava</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {periodStrava.map(a => (
                <StravaActivityCard key={a.id} activity={a} />
              ))}
            </CardContent>
          </Card>
        );
      })()}
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
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
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
      const count = completed.filter(w => { const d = new Date(w.date); return d >= start && d <= end; }).length;
      weeks.push({ label: getWeekLabel(11 - i, 12), count });
    }
    const totalCompleted = completed.length;
    const avgPerWeek = weeks.length > 0 ? (weeks.reduce((s, w) => s + w.count, 0) / weeks.length).toFixed(1) : '0';
    const bestWeek = Math.max(...weeks.map(w => w.count), 0);
    return { weeks, totalCompleted, avgPerWeek, bestWeek };
  }, [workouts]);

  // Tonnage chart data
  const tonnageData = useMemo(() => {
    const completed = workouts.filter(w => w.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const chartData = completed.map(w => ({ date: formatDateShort(w.date), tonnage: Math.round(workoutTonnage(w)) }));
    const totalTonnage = chartData.reduce((s, d) => s + d.tonnage, 0);
    const avgPerWorkout = chartData.length > 0 ? Math.round(totalTonnage / chartData.length) : 0;
    const now = new Date();
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28);
    const eightWeeksAgo = new Date(now); eightWeeksAgo.setDate(now.getDate() - 56);
    const recent = completed.filter(w => new Date(w.date) >= fourWeeksAgo);
    const previous = completed.filter(w => { const d = new Date(w.date); return d >= eightWeeksAgo && d < fourWeeksAgo; });
    const recentTonnage = recent.reduce((s, w) => s + workoutTonnage(w), 0);
    const previousTonnage = previous.reduce((s, w) => s + workoutTonnage(w), 0);
    let trend = '--';
    if (previousTonnage > 0) { const change = ((recentTonnage - previousTonnage) / previousTonnage * 100).toFixed(0); trend = `${Number(change) >= 0 ? '+' : ''}${change}%`; }
    return { chartData, totalTonnage, avgPerWorkout, trend };
  }, [workouts]);

  // Weight chart data
  const weightData = useMemo(() => {
    const withWeight = measurements.filter(m => m.weight && m.weight > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        const isPlanned = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
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
  }, [workouts]);

  // Weight progression data
  const progressionData = useMemo(() => {
    const completedWorkouts = workouts.filter(w => w.completed && w.exercises.length > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (completedWorkouts.length === 0) return { chartData: [], exercises: [] };
    const exerciseIds = new Set<string>();
    completedWorkouts.forEach(w => { if (selectedDay !== 'all' && w.dayId !== selectedDay) return; w.exercises.forEach(ex => exerciseIds.add(ex.exerciseId)); });
    const allExercises = trainingPlan.flatMap(d => d.exercises);
    const exerciseNames = new Map<string, string>();
    allExercises.forEach(ex => { exerciseNames.set(ex.id, ex.name.length > 20 ? ex.name.substring(0, 20) + '…' : ex.name); });
    const chartData = completedWorkouts.filter(w => selectedDay === 'all' || w.dayId === selectedDay).map(w => {
      const point: Record<string, string | number> = { date: new Date(w.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }), fullDate: w.date };
      w.exercises.forEach(ex => {
        const workingSets = ex.sets.filter(s => !s.isWarmup && s.completed && s.weight > 0);
        if (workingSets.length > 0) {
          point[ex.exerciseId] = weightMode === '1rm'
            ? Math.max(...workingSets.map(s => calculate1RM(s.weight, s.reps)))
            : Math.max(...workingSets.map(s => s.weight));
        }
      });
      return point;
    });
    const exercises = Array.from(exerciseIds).map(id => ({ id, name: exerciseNames.get(id) || id }));
    return { chartData, exercises };
  }, [workouts, selectedDay, weightMode]);

  const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  const reorderDay = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Ładowanie...</div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { id: 'workouts', label: 'Treningi' },
          { id: 'tonnage', label: 'Tonaż' },
          { id: 'weight', label: 'Waga' },
          { id: 'streak', label: 'Seria' },
          { id: 'progression', label: 'Progresja' },
        ] as const).map(t => (
          <Badge
            key={t.id}
            variant={subTab === t.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
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
                <ReferenceLine y={3} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" label={{ value: 'Cel: 3', position: 'right', fontSize: 10, fill: 'hsl(var(--chart-2))' }} />
                <Bar dataKey="count" name="Treningi" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <StatSummary items={[
              { label: 'Łącznie ukończonych', value: workoutsData.totalCompleted },
              { label: 'Średnia/tydzień', value: workoutsData.avgPerWeek },
              { label: 'Najlepszy tydzień', value: workoutsData.bestWeek },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Tonnage chart */}
      {subTab === 'tonnage' && (
        <Card>
          <CardContent className="pt-6">
            {tonnageData.chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Brak ukończonych treningów do wyświetlenia</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tonnageData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(tonnageData.chartData.length / 6) - 1)} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" kg" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kg`, 'Tonaż']} />
                  <Area type="monotone" dataKey="tonnage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <StatSummary items={[
              { label: 'Tonaż łączny', value: `${(tonnageData.totalTonnage / 1000).toFixed(1)}t` },
              { label: 'Średni/trening', value: `${tonnageData.avgPerWorkout} kg` },
              { label: 'Trend (4 tyg.)', value: tonnageData.trend },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Weight chart */}
      {subTab === 'weight' && (
        weightData.chartData.length === 0 ? (
          <Card><CardContent className="py-12"><p className="text-center text-muted-foreground">Brak pomiarów wagi. Dodaj pomiar w zakładce Pomiary.</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weightData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(weightData.chartData.length / 6) - 1)} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" kg" domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kg`, 'Waga']} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
              <StatSummary items={[
                { label: 'Aktualna waga', value: weightData.current },
                { label: 'Zmiana od startu', value: weightData.change },
                { label: 'Min / Max', value: weightData.minMax },
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
                        )} title={`${cell.date}${cell.hasWorkout ? ' - Trening' : ''}`} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-fitness-success" /><span>Trening</span></div>
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/30 border border-primary/30" /><span>Zaplanowany</span></div>
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/20" /><span>Brak</span></div>
            </div>
            <StatSummary items={[
              { label: 'Aktualna seria', value: `${streakData.streak} tyg.` },
              { label: 'Najdłuższa seria', value: `${streakData.longestStreak} tyg.` },
              { label: 'Frekwencja', value: `${streakData.attendance}%` },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Weight progression */}
      {subTab === 'progression' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />Progresja ciężarów
            </CardTitle>
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant={selectedDay === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedDay('all')}>Wszystkie</Badge>
                {trainingPlan.map(day => (
                  <Badge key={day.id} variant={selectedDay === day.id ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedDay(day.id)}>{day.dayName}</Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Badge variant={weightMode === 'max' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setWeightMode('max')}>Max ciężar</Badge>
                <Badge variant={weightMode === '1rm' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setWeightMode('1rm')}>Est. 1RM</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {progressionData.chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Brak ukończonych treningów do wyświetlenia</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressionData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" kg" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {progressionData.exercises.map((ex, i) => (
                    <Line key={ex.id} type="monotone" dataKey={ex.id} name={ex.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ========================
// TAB: Pomiary
// ========================

const MeasurementsTab = () => {
  const { uid } = useCurrentUser();
  const { measurements, addMeasurement, getLatestMeasurement, exportData, importData, cleanupEmptyWorkouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();

  const latestMeasurement = getLatestMeasurement();

  const handleSave = async (measurement: Parameters<typeof addMeasurement>[0]) => {
    const result = await addMeasurement(measurement);
    if (result.error || !result.measurement) {
      toast({ title: "Błąd zapisu!", description: result.error || "Nie udało się zapisać pomiarów.", variant: "destructive" });
      return;
    }
    toast({ title: "Pomiary zapisane!", description: `Dane z dnia ${measurement.date} zostały zapisane.` });
  };

  const getWeightTrend = () => {
    if (measurements.length < 2) return null;
    const sorted = [...measurements].filter(m => m.weight).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sorted.length < 2) return null;
    const diff = (sorted[0].weight || 0) - (sorted[1].weight || 0);
    if (diff > 0) return { direction: 'up' as const, value: diff };
    if (diff < 0) return { direction: 'down' as const, value: Math.abs(diff) };
    return { direction: 'same' as const, value: 0 };
  };

  const weightTrend = getWeightTrend();

  return (
    <div className="space-y-6">
      <MeasurementsForm latestMeasurement={latestMeasurement} onSave={handleSave} />
      <DataManagement onExport={exportData} onImport={importData} onCleanup={cleanupEmptyWorkouts} />

      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Historia pomiarów
              {weightTrend && (
                <Badge variant="outline" className="font-normal">
                  {weightTrend.direction === 'up' && <TrendingUp className="h-4 w-4 text-destructive mr-1" />}
                  {weightTrend.direction === 'down' && <TrendingDown className="h-4 w-4 text-fitness-success mr-1" />}
                  {weightTrend.direction === 'same' && <Minus className="h-4 w-4 mr-1" />}
                  {weightTrend.value > 0 && `${weightTrend.value.toFixed(1)} kg`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {measurements
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">
                      {new Date(m.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      {m.weight && <span>Waga: <strong>{m.weight} kg</strong></span>}
                      {m.chest && <span className="hidden sm:inline">Klatka: <strong>{m.chest} cm</strong></span>}
                      {m.waist && <span className="hidden sm:inline">Talia: <strong>{m.waist} cm</strong></span>}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ========================
// TAB: Strava
// ========================

const StravaTab = () => {
  const { uid, isAdmin } = useCurrentUser();
  const { activities, connection, isSyncing, error, connectStrava, syncActivities, disconnectStrava } = useStrava(uid, isAdmin);

  // Filter out weight training activities
  const nonStrengthActivities = activities.filter(
    a => a.type !== 'WeightTraining' && a.type !== 'Crossfit'
  );

  if (!connection.connected) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center text-2xl">🏃</div>
            <p className="font-medium text-sm">Połącz ze Stravą</p>
            <p className="text-sm text-muted-foreground">Synchronizuj aktywności cardio, biegi, rowery i inne ze Stravą.</p>
            <Button onClick={connectStrava} className="mt-2 bg-orange-500 hover:bg-orange-600">Połącz Stravę</Button>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Strava połączona</p>
              {connection.athleteName && <p className="text-xs text-muted-foreground">{connection.athleteName}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={syncActivities} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sync
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={disconnectStrava}>Rozłącz</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive"><CardContent className="py-3"><p className="text-sm text-destructive">{error}</p></CardContent></Card>}

      {nonStrengthActivities.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Brak aktywności Strava (bez treningów siłowych)</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nonStrengthActivities.slice(0, 20).map(activity => (
            <StravaActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
};

// ========================
// TAB: Podsumowania tygodniowe
// ========================

const WeeklyTab = () => {
  const { uid, isAdmin } = useCurrentUser();
  const { summaries, isGenerating, error, generateSummary } = useWeeklySummary(uid, isAdmin);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-base">Podsumowania tygodniowe</h3>
        <Button
          size="sm"
          onClick={() => generateSummary()}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generuj teraz
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
            <p className="text-muted-foreground">Brak podsumowań. Kliknij "Generuj teraz" aby stworzyć pierwsze.</p>
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
              <span className="text-[10px] text-muted-foreground">
                {new Date(s.generatedAt).toLocaleDateString('pl-PL')}
              </span>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Dumbbell className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{s.stats.workoutCount}</p>
                <p className="text-[10px] text-muted-foreground">Treningi</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{(s.stats.tonnageKg / 1000).toFixed(1)}t</p>
                <p className="text-[10px] text-muted-foreground">Tonaż</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Route className="h-3 w-3 text-orange-500" />
                </div>
                <p className="text-sm font-bold">{s.stats.runKm} km</p>
                <p className="text-[10px] text-muted-foreground">Bieg</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-3 w-3 text-amber-500" />
                </div>
                <p className="text-sm font-bold">{s.stats.prs.length}</p>
                <p className="text-[10px] text-muted-foreground">PRy</p>
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
  const { isAdmin } = useCurrentUser();
  const tabParam = searchParams.get('tab') as AnalyticsTab | null;
  const validTabs: AnalyticsTab[] = isAdmin
    ? ['summary', 'charts', 'measurements', 'strava', 'weekly']
    : ['summary', 'charts', 'measurements', 'weekly'];
  const currentTab: AnalyticsTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'summary';

  return (
    <div className="space-y-4">
      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList className="w-full">
          <TabsTrigger value="summary" className="flex-1 text-xs">Podsumowanie</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1 text-xs">Wykresy</TabsTrigger>
          <TabsTrigger value="measurements" className="flex-1 text-xs">Pomiary</TabsTrigger>
          {isAdmin && <TabsTrigger value="strava" className="flex-1 text-xs">Strava</TabsTrigger>}
          <TabsTrigger value="weekly" className="flex-1 text-xs">Tygodnie</TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><SummaryTab /></TabsContent>
        <TabsContent value="charts"><ChartsTab /></TabsContent>
        <TabsContent value="measurements"><MeasurementsTab /></TabsContent>
        {isAdmin && <TabsContent value="strava"><StravaTab /></TabsContent>}
        <TabsContent value="weekly"><WeeklyTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
