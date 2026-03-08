import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { useCurrentUser } from '@/contexts/UserContext';
import { calculateStreak, calculateLongestStreak, getWeekBounds } from '@/lib/summary-utils';
import type { WorkoutSession } from '@/types';
import { cn } from '@/lib/utils';

type StatsTab = 'workouts' | 'tonnage' | 'weight' | 'streak';

const VALID_TABS: StatsTab[] = ['workouts', 'tonnage', 'weight', 'streak'];

// --- Utility functions ---

const workoutTonnage = (workout: WorkoutSession): number => {
  return workout.exercises.reduce((sum, ex) => {
    return sum + ex.sets
      .filter(s => s.completed && !s.isWarmup)
      .reduce((s, set) => s + set.reps * set.weight, 0);
  }, 0);
};

const getWeekLabel = (weekIndex: number, totalWeeks: number): string => {
  if (weekIndex === totalWeeks - 1) return 'Ten tydz.';
  if (weekIndex === totalWeeks - 2) return 'Ost. tydz.';
  return `${totalWeeks - weekIndex} tyg. temu`;
};

const formatDateShort = (date: string): string => {
  return new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};

// --- Stat summary component ---

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

// --- Tooltip styles ---

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

// --- Workouts Tab ---

const WorkoutsTab = ({ workouts }: { workouts: WorkoutSession[] }) => {
  const data = useMemo(() => {
    const completed = workouts.filter(w => w.completed);
    const now = new Date();
    const weeks: { label: string; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - i * 7);
      const { start, end } = getWeekBounds(weekDate);

      const count = completed.filter(w => {
        const d = new Date(w.date);
        return d >= start && d <= end;
      }).length;

      weeks.push({
        label: getWeekLabel(11 - i, 12),
        count,
      });
    }

    const totalCompleted = completed.length;
    const avgPerWeek = weeks.length > 0
      ? (weeks.reduce((s, w) => s + w.count, 0) / weeks.length).toFixed(1)
      : '0';
    const bestWeek = Math.max(...weeks.map(w => w.count), 0);

    return { weeks, totalCompleted, avgPerWeek, bestWeek };
  }, [workouts]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.weeks}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                allowDecimals={false}
                domain={[0, 'auto']}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine
                y={3}
                stroke="hsl(var(--chart-2))"
                strokeDasharray="4 4"
                label={{ value: 'Cel: 3', position: 'right', fontSize: 10, fill: 'hsl(var(--chart-2))' }}
              />
              <Bar
                dataKey="count"
                name="Treningi"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <StatSummary items={[
            { label: 'Łącznie ukończonych', value: data.totalCompleted },
            { label: 'Średnia/tydzień', value: data.avgPerWeek },
            { label: 'Najlepszy tydzień', value: data.bestWeek },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
};

// --- Tonnage Tab ---

const TonnageTab = ({ workouts }: { workouts: WorkoutSession[] }) => {
  const data = useMemo(() => {
    const completed = workouts
      .filter(w => w.completed)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const chartData = completed.map(w => ({
      date: formatDateShort(w.date),
      tonnage: Math.round(workoutTonnage(w)),
    }));

    const totalTonnage = chartData.reduce((s, d) => s + d.tonnage, 0);
    const avgPerWorkout = chartData.length > 0 ? Math.round(totalTonnage / chartData.length) : 0;

    // Trend: last 4 weeks vs previous 4 weeks
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 56);

    const recent = completed.filter(w => new Date(w.date) >= fourWeeksAgo);
    const previous = completed.filter(w => {
      const d = new Date(w.date);
      return d >= eightWeeksAgo && d < fourWeeksAgo;
    });

    const recentTonnage = recent.reduce((s, w) => s + workoutTonnage(w), 0);
    const previousTonnage = previous.reduce((s, w) => s + workoutTonnage(w), 0);

    let trend = '--';
    if (previousTonnage > 0) {
      const change = ((recentTonnage - previousTonnage) / previousTonnage * 100).toFixed(0);
      trend = `${Number(change) >= 0 ? '+' : ''}${change}%`;
    }

    return { chartData, totalTonnage, avgPerWorkout, trend };
  }, [workouts]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {data.chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Brak ukończonych treningów do wyświetlenia
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  interval={Math.max(0, Math.floor(data.chartData.length / 6) - 1)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  unit=" kg"
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kg`, 'Tonaż']} />
                <Area
                  type="monotone"
                  dataKey="tonnage"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <StatSummary items={[
            { label: 'Tonaż łączny', value: `${(data.totalTonnage / 1000).toFixed(1)}t` },
            { label: 'Średni/trening', value: `${data.avgPerWorkout} kg` },
            { label: 'Trend (4 tyg.)', value: data.trend },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
};

// --- Weight Tab ---

const WeightTab = ({ measurements }: { measurements: { date: string; weight?: number }[] }) => {
  const data = useMemo(() => {
    const withWeight = measurements
      .filter(m => m.weight && m.weight > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const chartData = withWeight.map(m => ({
      date: formatDateShort(m.date),
      weight: m.weight!,
    }));

    if (chartData.length === 0) return { chartData, current: '--', change: '--', minMax: '--' };

    const current = chartData[chartData.length - 1].weight;
    const first = chartData[0].weight;
    const diff = current - first;
    const change = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg`;

    const weights = chartData.map(d => d.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const minMax = `${min}–${max} kg`;

    return {
      chartData,
      current: `${current} kg`,
      change,
      minMax,
    };
  }, [measurements]);

  if (data.chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Brak pomiarów wagi. Dodaj pomiar w sekcji Pomiary.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                interval={Math.max(0, Math.floor(data.chartData.length / 6) - 1)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                unit=" kg"
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kg`, 'Waga']} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <StatSummary items={[
            { label: 'Aktualna waga', value: data.current },
            { label: 'Zmiana od startu', value: data.change },
            { label: 'Min / Max', value: data.minMax },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
};

// --- Streak Tab (Calendar Heatmap) ---

const StreakTab = ({ workouts }: { workouts: WorkoutSession[] }) => {
  const data = useMemo(() => {
    const completed = workouts.filter(w => w.completed);
    const completedDates = new Set(completed.map(w => w.date));

    // Build 12 weeks of calendar data
    const now = new Date();
    const { start: currentWeekStart } = getWeekBounds(now);

    const startDate = new Date(currentWeekStart);
    startDate.setDate(startDate.getDate() - 11 * 7); // 12 weeks back

    const days: { date: string; dayOfWeek: number; weekIndex: number; hasWorkout: boolean; isPlanned: boolean }[] = [];

    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + week * 7 + day);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...

        // Planned training days: Mon(1), Wed(3), Fri(5)
        const isPlanned = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
        const isFuture = d > now;

        days.push({
          date: dateStr,
          dayOfWeek,
          weekIndex: week,
          hasWorkout: !isFuture && completedDates.has(dateStr),
          isPlanned: !isFuture && isPlanned,
        });
      }
    }

    const streak = calculateStreak(workouts);
    const longestStreak = calculateLongestStreak(workouts);

    // Attendance: completed / planned in last 12 weeks
    const plannedCount = days.filter(d => d.isPlanned).length;
    const completedCount = days.filter(d => d.hasWorkout).length;
    const attendance = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0;

    return { days, streak, longestStreak, attendance };
  }, [workouts]);

  const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  // Reorder: Mon=0, Tue=1, ... Sun=6 (JS: Mon=1 → index 0)
  const reorderDay = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1">
              {dayLabels.map(label => (
                <div key={label} className="h-7 flex items-center">
                  <span className="text-[10px] text-muted-foreground w-5">{label}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {Array.from({ length: 12 }, (_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const cell = data.days.find(
                      d => d.weekIndex === weekIdx && reorderDay(d.dayOfWeek) === dayIdx
                    );

                    if (!cell) {
                      return <div key={dayIdx} className="h-7 w-7 rounded-sm bg-muted/10" />;
                    }

                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          'h-7 w-7 rounded-sm transition-colors',
                          cell.hasWorkout
                            ? 'bg-fitness-success'
                            : cell.isPlanned
                              ? 'bg-muted/30 border-2 border-primary/30'
                              : 'bg-muted/20'
                        )}
                        title={`${cell.date}${cell.hasWorkout ? ' - Trening' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-fitness-success" />
              <span>Trening</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-muted/30 border border-primary/30" />
              <span>Zaplanowany</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-muted/20" />
              <span>Brak</span>
            </div>
          </div>

          <StatSummary items={[
            { label: 'Aktualna seria', value: `${data.streak} tyg.` },
            { label: 'Najdłuższa seria', value: `${data.longestStreak} tyg.` },
            { label: 'Frekwencja', value: `${data.attendance}%` },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
};

// --- Main Page ---

const StatsDetail = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as StatsTab | null;
  const defaultTab: StatsTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'workouts';

  const { uid } = useCurrentUser();
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue={defaultTab}
        onValueChange={(value) => setSearchParams({ tab: value })}
      >
        <TabsList className="w-full">
          <TabsTrigger value="workouts" className="flex-1 text-xs">Treningi</TabsTrigger>
          <TabsTrigger value="tonnage" className="flex-1 text-xs">Tonaż</TabsTrigger>
          <TabsTrigger value="weight" className="flex-1 text-xs">Waga</TabsTrigger>
          <TabsTrigger value="streak" className="flex-1 text-xs">Seria</TabsTrigger>
        </TabsList>

        <TabsContent value="workouts">
          <WorkoutsTab workouts={workouts} />
        </TabsContent>

        <TabsContent value="tonnage">
          <TonnageTab workouts={workouts} />
        </TabsContent>

        <TabsContent value="weight">
          <WeightTab measurements={measurements} />
        </TabsContent>

        <TabsContent value="streak">
          <StreakTab workouts={workouts} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatsDetail;
