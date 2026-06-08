import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CalendarRange, History, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { parseLocalDate } from '@/lib/utils';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { cn } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import type { WorkoutSession } from '@/types';

const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
      active ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground hover:text-foreground',
    )}
  >
    {children}
  </button>
);

const WorkoutHistory = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const { workouts, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'draft'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Resolver radzi sobie z treningami ze starych planów (snapshot → cykl → plan → id).
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const filteredWorkouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return workouts
      .filter((workout) => {
        if (selectedDay !== 'all' && workout.dayId !== selectedDay) return false;
        if (selectedStatus === 'completed' && !workout.completed) return false;
        if (selectedStatus === 'draft' && workout.completed) return false;
        if (fromDate && workout.date < fromDate) return false;
        if (toDate && workout.date > toDate) return false;
        if (!query) return true;

        const { dayName, focus } = resolver.resolveDayLabel(workout);
        const haystack = [
          workout.date,
          workout.dayId,
          dayName,
          focus,
          ...(workout.exercises.map(exercise => resolver.resolveExerciseName(workout, exercise.exerciseId))),
        ].join(' ').toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  }, [resolver, fromDate, searchQuery, selectedDay, selectedStatus, toDate, workouts]);

  const comparison = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const selected = compareIds
      .map(id => workouts.find(workout => workout.id === id))
      .filter((workout): workout is WorkoutSession => !!workout);
    if (selected.length !== 2) return null;

    const [first, second] = selected;
    const tonnage = (workout: typeof first) => workout.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0),
      0,
    );
    const completedSets = (workout: typeof first) => workout.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.filter(set => set.completed).length,
      0,
    );

    return {
      first,
      second,
      tonnageDelta: tonnage(second) - tonnage(first),
      setDelta: completedSets(second) - completedSets(first),
      exerciseDelta: second.exercises.length - first.exercises.length,
    };
  }, [compareIds, workouts]);

  const toggleCompare = (workoutId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(workoutId)) {
        return prev.filter(id => id !== workoutId);
      }
      if (prev.length === 2) {
        return [prev[1], workoutId];
      }
      return [...prev, workoutId];
    });
  };

  const sessionWord = (n: number) =>
    t(n === 1
      ? 'history.sessionOne'
      : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
        ? 'history.sessionFew'
        : 'history.sessionMany');

  // Grupowanie chronologiczne po miesiącach (filteredWorkouts już posortowane malejąco).
  const groupedByMonth = useMemo(() => {
    const groups: { key: string; label: string; workouts: WorkoutSession[]; tonnage: number }[] = [];
    const indexByKey = new Map<string, number>();
    filteredWorkouts.forEach(workout => {
      const key = workout.date.slice(0, 7);
      let gi = indexByKey.get(key);
      if (gi === undefined) {
        const label = parseLocalDate(workout.date).toLocaleDateString(dateLocale(lang), { month: 'long', year: 'numeric' });
        groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), workouts: [], tonnage: 0 });
        gi = groups.length - 1;
        indexByKey.set(key, gi);
      }
      groups[gi].workouts.push(workout);
      groups[gi].tonnage += workout.exercises.reduce(
        (sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0),
        0,
      );
    });
    return groups;
  }, [filteredWorkouts, lang]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase italic tracking-tight flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {t('history.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('history.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('history.filters')}</CardTitle>
          <CardDescription>{t('history.filtersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="pl-9"
            />
          </div>

          {/* Status — chipy */}
          <div className="flex flex-wrap gap-2">
            <FilterChip active={selectedStatus === 'all'} onClick={() => setSelectedStatus('all')}>{t('history.allShort')}</FilterChip>
            <FilterChip active={selectedStatus === 'completed'} onClick={() => setSelectedStatus('completed')}>{t('history.completed')}</FilterChip>
            <FilterChip active={selectedStatus === 'draft'} onClick={() => setSelectedStatus('draft')}>{t('history.drafts')}</FilterChip>
          </div>

          {/* Dzień planu — chipy */}
          {trainingPlan.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <FilterChip active={selectedDay === 'all'} onClick={() => setSelectedDay('all')}>{t('history.allDays')}</FilterChip>
              {trainingPlan.map(day => (
                <FilterChip key={day.id} active={selectedDay === day.id} onClick={() => setSelectedDay(day.id)}>
                  {localizeDayName(day.dayName, lang)}
                </FilterChip>
              ))}
            </div>
          )}

          {/* Zakres dat */}
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label={t('history.dateRange')} />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label={t('history.dateRange')} />
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              {t('history.compareTwo')}
            </CardTitle>
            <CardDescription>
              {comparison.first.date} vs {comparison.second.date}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('history.tonnage')}</p>
              <p className="mt-1 text-xl font-heading font-bold tabular-nums">{comparison.tonnageDelta >= 0 ? '+' : '−'}{Math.abs(Math.round(comparison.tonnageDelta)).toLocaleString(dateLocale(lang))} kg</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('history.completedSets')}</p>
              <p className="mt-1 text-xl font-heading font-bold tabular-nums">{comparison.setDelta >= 0 ? '+' : ''}{comparison.setDelta}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('history.exercises')}</p>
              <p className="mt-1 text-xl font-heading font-bold tabular-nums">{comparison.exerciseDelta >= 0 ? '+' : ''}{comparison.exerciseDelta}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4" />
          {filteredWorkouts.length} {sessionWord(filteredWorkouts.length)}
        </div>
        <div>{t('history.compareHint')}</div>
      </div>

      <div className="space-y-6">
        {groupedByMonth.map((group) => (
          <div key={group.key} className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-surface-high pb-2">
              <h2 className="font-heading font-bold uppercase italic tracking-tight">{group.label}</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {group.workouts.length} {sessionWord(group.workouts.length)} · {Math.round(group.tonnage).toLocaleString(dateLocale(lang))} kg
              </span>
            </div>

            {group.workouts.map((workout) => {
              const dayLabel = resolver.resolveDayLabel(workout);
              const tonnage = workout.exercises.reduce(
                (sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0),
                0,
              );
              const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
              const isSelected = compareIds.includes(workout.id);
              return (
                <div
                  key={workout.id}
                  className={cn(
                    "rounded-xl bg-surface-low p-4 space-y-3",
                    isSelected && "ring-2 ring-inset ring-primary/50",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-bold tabular-nums">{workout.date}</p>
                      <Badge variant={workout.completed ? 'default' : 'secondary'}>
                        {workout.completed ? t('history.badgeCompleted') : t('history.badgeDraft')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {localizeDayName(dayLabel.dayName, lang)} · {localizeFocus(dayLabel.focus, lang) || t('history.noFocus')}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 rounded-xl bg-surface-lowest">
                    {[
                      { v: workout.exercises.length.toString(), l: t('history.exercisesShort') },
                      { v: Math.round(tonnage).toLocaleString(dateLocale(lang)), l: 'kg' },
                      { v: totalSets.toString(), l: t('history.setsShort') },
                    ].map((s, i) => (
                      <div key={i} className="text-center py-2.5">
                        <p className="font-heading font-bold text-xl tabular-nums leading-none">{s.v}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/workout/${workout.dayId}?date=${workout.date}&session=${workout.id}`)}>
                      {t('history.openWorkout')}
                    </Button>
                    <Button variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => toggleCompare(workout.id)}>
                      {isSelected ? t('history.removeFromCompare') : t('history.compare')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {filteredWorkouts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {t('history.empty')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WorkoutHistory;
