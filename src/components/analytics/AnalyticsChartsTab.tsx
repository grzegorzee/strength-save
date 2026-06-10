import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChipButton } from '@/components/ui/chip-button';
import { RzaMetricsCard } from '@/components/RzaMetricsCard';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { localizeDayName } from '@/lib/plan-i18n';
import {
  calculateStreak,
  calculateLongestStreak,
  getWeekBounds,
} from '@/lib/summary-utils';
import { calculate1RM } from '@/lib/pr-utils';
import type { WorkoutSession } from '@/types';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { tooltipStyle, axisProps } from '@/lib/chart-config';
import { getTrainingDayForDate, startOfLocalDay } from '@/lib/plan-schedule';
import { Dumbbell, Flame, Scale, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import { dateLocale } from '@/i18n';
import type { LanguageCode, TranslationKey } from '@/i18n';

type ChartsSubTab = 'workouts' | 'tonnage' | 'weight' | 'streak' | 'progression';
type WeightMode = 'max' | '1rm';

const StatSummary = ({ items }: { items: { label: string; value: string | number }[] }) => (
  <div className="grid grid-cols-3 gap-3 mt-4">
    {items.map(item => (
      <div key={item.label} className="text-center p-3 bg-muted/30 rounded-xl">
        <p className="text-lg font-heading font-bold tracking-tight">{item.value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
      </div>
    ))}
  </div>
);

// Nagłówek karty wykresu — ikona w neonowym kółku (wzorzec StatsCard) + tytuł.
const ChartHeader = ({ icon: Icon, title }: { icon: LucideIcon; title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
      <Icon className="h-4.5 w-4.5 text-primary-foreground" />
    </div>
    <h3 className="font-heading font-bold uppercase tracking-tight text-base">{title}</h3>
  </div>
);

// Gradient pod liniami/słupkami — definicja per wykres (unikalne id).
const ChartGradient = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
    </linearGradient>
  </defs>
);

const workoutTonnage = (workout: WorkoutSession): number =>
  workout.exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed && !s.isWarmup).reduce((s, set) => s + set.reps * set.weight, 0),
  0);

const getWeekLabel = (weekIndex: number, totalWeeks: number, t: (key: TranslationKey, params?: Record<string, string | number>) => string): string => {
  if (weekIndex === totalWeeks - 1) return t('analytics.weekLabel.this');
  if (weekIndex === totalWeeks - 2) return t('analytics.weekLabel.last');
  return t('analytics.weekLabel.ago', { n: totalWeeks - weekIndex });
};

const formatDateShort = (date: string, lang: LanguageCode): string =>
  parseLocalDate(date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' });

const AnalyticsChartsTab = () => {
  const { uid } = useCurrentUser();
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);
  const [subTab, setSubTab] = useState<ChartsSubTab>('workouts');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [weightMode, setWeightMode] = useState<WeightMode>('max');

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

  const tonnageData = useMemo(() => {
    const completed = workouts
      .filter(w => w.completed)
      .slice()
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const chartData = completed.map(w => ({ date: formatDateShort(w.date, lang), tonnage: Math.round(toDisplay(workoutTonnage(w))) }));
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
    if (previousTonnage > 0) {
      const change = ((recentTonnage - previousTonnage) / previousTonnage * 100).toFixed(0);
      trend = `${Number(change) >= 0 ? '+' : ''}${change}%`;
    }
    return { chartData, totalTonnage, avgPerWorkout, trend };
  }, [workouts, lang, toDisplay]);

  const weightData = useMemo(() => {
    const withWeight = measurements
      .filter(m => m.weight && m.weight > 0)
      .slice()
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const chartData = withWeight.map(m => ({ date: formatDateShort(m.date, lang), weight: Number(toDisplay(m.weight!).toFixed(1)) }));
    if (chartData.length === 0) return { chartData, current: '--', change: '--', minMax: '--' };
    const current = chartData[chartData.length - 1].weight;
    const first = chartData[0].weight;
    const diff = current - first;
    const change = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} ${unit}`;
    const weights = chartData.map(d => d.weight);
    return { chartData, current: `${current} ${unit}`, change, minMax: `${Math.min(...weights)}-${Math.max(...weights)} ${unit}` };
  }, [measurements, lang, unit, toDisplay]);

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

  const perExerciseData = useMemo(() => {
    const completedWorkouts = workouts
      .filter(w => w.completed && w.exercises.length > 0 && (selectedDay === 'all' || w.dayId === selectedDay))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    if (completedWorkouts.length === 0) return [];

    const byExercise = new Map<string, { id: string; name: string; chartData: { date: string; value: number }[]; isBodyweight: boolean }>();

    completedWorkouts.forEach(w => {
      w.exercises.forEach(ex => {
        const name = byExercise.get(ex.exerciseId)?.name ?? resolver.resolveExerciseName(w, ex.exerciseId);
        const workingSets = ex.sets.filter(s => !s.isWarmup && s.completed);
        if (workingSets.length === 0) return;

        const weightedSets = workingSets.filter(s => s.weight > 0);
        const value = weightedSets.length > 0
          ? weightMode === '1rm'
            ? Math.max(...weightedSets.map(s => calculate1RM(s.weight, s.reps)))
            : Math.max(...weightedSets.map(s => s.weight))
          : Math.max(...workingSets.map(s => s.reps));

        const entry = byExercise.get(ex.exerciseId) ?? {
          id: ex.exerciseId,
          name,
          chartData: [],
          isBodyweight: isBodyweightExercise(name),
        };

        entry.chartData.push({
          date: parseLocalDate(w.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
          value: weightedSets.length > 0 ? Math.round(toDisplay(value)) : value,
        });
        byExercise.set(ex.exerciseId, entry);
      });
    });

    return Array.from(byExercise.values())
      .filter(ex => ex.chartData.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, selectedDay, weightMode, resolver, lang, toDisplay]);

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
      <div className="flex gap-1.5 flex-wrap">
        {([
          { id: 'workouts', label: t('analytics.subtab.workouts') },
          { id: 'tonnage', label: t('analytics.subtab.tonnage') },
          { id: 'weight', label: t('analytics.subtab.weight') },
          { id: 'streak', label: t('analytics.subtab.streak') },
          { id: 'progression', label: t('analytics.subtab.progression') },
        ] as const).map(item => (
          <ChipButton
            key={item.id}
            variant={subTab === item.id ? 'default' : 'outline'}
            pressed={subTab === item.id}
            onClick={() => setSubTab(item.id)}
          >
            {item.label}
          </ChipButton>
        ))}
      </div>

      <RzaMetricsCard workouts={workouts} />

      {subTab === 'workouts' && (
        <Card>
          <CardContent className="pt-6">
            <ChartHeader icon={Dumbbell} title={t('analytics.subtab.workouts')} />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workoutsData.weeks}>
                <ChartGradient id="grad-workouts" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={2} {...axisProps} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} domain={[0, 'auto']} width={28} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--primary) / 0.08)' }} />
                <ReferenceLine y={3} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" label={{ value: t('analytics.chart.goal3'), position: 'right', fontSize: 10, fill: 'hsl(var(--chart-2))' }} />
                <Bar dataKey="count" name={t('analytics.subtab.workouts')} fill="url(#grad-workouts)" stroke="hsl(var(--primary))" strokeWidth={1} radius={[6, 6, 0, 0]} />
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

      {subTab === 'tonnage' && (
        <Card>
          <CardContent className="pt-6">
            <ChartHeader icon={Trophy} title={t('analytics.subtab.tonnage')} />
            {tonnageData.chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('analytics.noCompletedToShow')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tonnageData.chartData}>
                  <ChartGradient id="grad-tonnage" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(tonnageData.chartData.length / 6) - 1)} {...axisProps} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit={` ${unit}`} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} ${unit}`, t('analytics.stat.tonnage')]} />
                  <Area type="monotone" dataKey="tonnage" stroke="hsl(var(--primary))" fill="url(#grad-tonnage)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <StatSummary items={[
              { label: t('analytics.stat.totalTonnage'), value: `${(tonnageData.totalTonnage / 1000).toFixed(1)}${unit === 'lbs' ? ' k lbs' : 't'}` },
              { label: t('analytics.stat.avgPerWorkout'), value: `${tonnageData.avgPerWorkout} ${unit}` },
              { label: t('analytics.stat.trend4w'), value: tonnageData.trend },
            ]} />
          </CardContent>
        </Card>
      )}

      {subTab === 'weight' && (
        weightData.chartData.length === 0 ? (
          <Card><CardContent className="py-12"><p className="text-center text-muted-foreground">{t('analytics.noWeightData')}</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ChartHeader icon={Scale} title={t('analytics.subtab.weight')} />
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weightData.chartData}>
                  <ChartGradient id="grad-weight" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(weightData.chartData.length / 6) - 1)} {...axisProps} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit={` ${unit}`} domain={['dataMin - 1', 'dataMax + 1']} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} ${unit}`, t('analytics.subtab.weight')]} />
                  <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill="url(#grad-weight)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
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

      {subTab === 'streak' && (
        <Card>
          <CardContent className="pt-6">
            <ChartHeader icon={Flame} title={t('analytics.subtab.streak')} />
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

      {subTab === 'progression' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />{t('analytics.weightProgression')}
              </CardTitle>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                <div className="flex gap-1.5 flex-wrap">
                  <ChipButton variant={selectedDay === 'all' ? 'default' : 'outline'} pressed={selectedDay === 'all'} onClick={() => setSelectedDay('all')}>{t('analytics.allDays')}</ChipButton>
                  {trainingPlan.map(day => (
                    <ChipButton key={day.id} variant={selectedDay === day.id ? 'default' : 'outline'} pressed={selectedDay === day.id} onClick={() => setSelectedDay(day.id)}>{localizeDayName(day.dayName, lang)}</ChipButton>
                  ))}
                </div>
                <div className="flex gap-1">
                  <ChipButton variant={weightMode === 'max' ? 'default' : 'outline'} pressed={weightMode === 'max'} className="text-xs" onClick={() => setWeightMode('max')}>{t('analytics.maxWeight')}</ChipButton>
                  <ChipButton variant={weightMode === '1rm' ? 'default' : 'outline'} pressed={weightMode === '1rm'} className="text-xs" onClick={() => setWeightMode('1rm')}>{t('analytics.est1rm')}</ChipButton>
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
                        <AreaChart data={ex.chartData}>
                          <ChartGradient id={`grad-ex-${ex.id}`} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" {...axisProps} />
                          <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" unit={ex.isBodyweight ? ' rp' : ` ${unit}`} width={45} {...axisProps} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill={`url(#grad-ex-${ex.id})`} strokeWidth={2} dot={{ r: 2, fill: 'hsl(var(--primary))', strokeWidth: 0 }} connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">
                        {t('analytics.needMin2Sessions')}
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{t('analytics.sessionsCount', { n: ex.chartData.length })}</span>
                      {ex.chartData.length > 0 && (
                        <span>{ex.chartData[ex.chartData.length - 1].value} {ex.isBodyweight ? t('analytics.unit.reps') : unit}</span>
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

export default AnalyticsChartsTab;
