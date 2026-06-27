import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { Trophy, Dumbbell, Target, TrendingUp, TrendingDown, ChevronRight, Zap, Lock, Sunrise, RotateCcw, Swords, CalendarCheck, Medal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getExerciseBest1RM } from '@/lib/pr-utils';
import {
  getExercise1RMProgress,
  getMonthlyTonnage,
  detectPlateaus,
  computeMilestones,
  computeSpecialBadges,
  type Milestone,
  type SpecialBadgeId,
} from '@/lib/achievements-utils';
import { medalForCompletionRate } from '@/lib/season-medals';
import { isCycleVisible } from '@/lib/cycle-visibility';
import { tooltipStyle } from '@/lib/chart-config';
import { ExerciseProgressionDialog } from '@/components/ExerciseProgressionDialog';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { cn, parseLocalDate } from '@/lib/utils';

interface ExerciseRecord {
  exerciseId: string;
  name: string;
  maxWeight: number;
  maxReps: number;
  history: { date: string; weight: number; reps: number }[];
}

const milestoneIcon = (category: Milestone['category']) => {
  if (category === 'workouts') return Trophy;
  if (category === 'tonnage') return Dumbbell;
  return Target;
};

const specialBadgeIcon: Record<SpecialBadgeId, typeof Sunrise> = {
  'early-bird': Sunrise,
  'comeback': RotateCcw,
  'sunday-warrior': Swords,
  'consistent-4': CalendarCheck,
};

const specialBadgeLabelKey: Record<SpecialBadgeId, TranslationKey> = {
  'early-bird': 'achievements.special.earlyBird',
  'comeback': 'achievements.special.comeback',
  'sunday-warrior': 'achievements.special.sundayWarrior',
  'consistent-4': 'achievements.special.consistent',
};

const specialBadgeDescKey: Record<SpecialBadgeId, TranslationKey> = {
  'early-bird': 'achievements.special.earlyBird.desc',
  'comeback': 'achievements.special.comeback.desc',
  'sunday-warrior': 'achievements.special.sundayWarrior.desc',
  'consistent-4': 'achievements.special.consistent.desc',
};

const medalColor: Record<string, string> = {
  gold: 'text-yellow-400',
  silver: 'text-slate-300',
  bronze: 'text-amber-600',
};

const medalLabelKey: Record<'gold' | 'silver' | 'bronze', TranslationKey> = {
  gold: 'achievements.seasons.gold',
  silver: 'achievements.seasons.silver',
  bronze: 'achievements.seasons.bronze',
};

const Achievements = () => {
  const { t, lang } = useTranslation();
  const { unit, fmt, toDisplay, fmtTonnage } = useUnit();
  const { uid } = useCurrentUser();
  const { workouts, getTotalWeight, getCompletedWorkoutsCount, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRecord | null>(null);
  const [progressionExercise, setProgressionExercise] = useState<{ id: string; name: string } | null>(null);

  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const formatShortDate = (date: string) =>
    parseLocalDate(date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' });

  // Rekordy budujemy z SAMYCH treningów (nie z aktualnego planu), żeby ćwiczenia ze starych
  // planów nie znikały po zmianie planu. Nazwy resolwuje resolver (snapshot → cykl → plan).
  const exerciseRecords = useMemo((): ExerciseRecord[] => {
    const exerciseMap = new Map<string, ExerciseRecord>();

    workouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        let record = exerciseMap.get(ex.exerciseId);
        if (!record) {
          record = {
            exerciseId: ex.exerciseId,
            name: resolver.resolveExerciseName(workout, ex.exerciseId),
            maxWeight: 0,
            maxReps: 0,
            history: [],
          };
          exerciseMap.set(ex.exerciseId, record);
        }

        ex.sets.forEach(set => {
          if (set.completed && set.weight > 0) {
            if (set.weight > record.maxWeight) record.maxWeight = set.weight;
            if (set.reps > record.maxReps) record.maxReps = set.reps;
            record.history.push({ date: workout.date, weight: set.weight, reps: set.reps });
          }
        });
      });
    });

    return Array.from(exerciseMap.values())
      .filter(r => r.maxWeight > 0)
      .sort((a, b) => b.maxWeight - a.maxWeight);
  }, [resolver, workouts]);

  // Rekordy 1RM (szacowane) — wspólne źródło dla "życiowych rekordów" i pełnej listy 1RM.
  const oneRMRecords = useMemo(() => {
    const seen = new Map<string, string>();
    workouts.forEach(w => w.exercises.forEach(ex => {
      if (!seen.has(ex.exerciseId)) seen.set(ex.exerciseId, resolver.resolveExerciseName(w, ex.exerciseId));
    }));
    const sorted = Array.from(seen.entries())
      .map(([id, name]) => ({ ...getExerciseBest1RM(workouts, id), name }))
      .filter(r => r.best1RM > 0)
      .sort((a, b) => b.best1RM - a.best1RM);
    // Dedup po nazwie: różne exerciseId mogą mapować na to samo ćwiczenie (np. id
    // z planu vs z biblioteki) i bez tego rekord pokazuje się dwukrotnie. Lista jest
    // posortowana malejąco po 1RM, więc pierwsze wystąpienie = najsilniejsze.
    const seenNames = new Set<string>();
    return sorted.filter(r => {
      const key = r.name.trim().toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
  }, [resolver, workouts]);

  const exerciseNames = useMemo(() => {
    const m = new Map<string, string>();
    oneRMRecords.forEach(r => m.set(r.exerciseId, r.name));
    return m;
  }, [oneRMRecords]);

  // Top 3 życiowe rekordy 1RM z przyrostem względem poprzedniego najlepszego.
  const lifePRs = useMemo(
    () => oneRMRecords.slice(0, 3).map(r => ({ id: r.exerciseId, name: r.name, ...getExercise1RMProgress(workouts, r.exerciseId) })),
    [oneRMRecords, workouts],
  );

  const plateaus = useMemo(() => detectPlateaus(workouts, exerciseNames).slice(0, 3), [workouts, exerciseNames]);

  const monthlyTonnage = useMemo(() => getMonthlyTonnage(workouts, 6, new Date()), [workouts]);
  const trendData = useMemo(() => monthlyTonnage.map(m => {
    const [y, mo] = m.month.split('-').map(Number);
    return {
      label: new Date(y, mo - 1, 1).toLocaleDateString(dateLocale(lang), { month: 'short' }),
      tonnes: Number((toDisplay(m.tonnage) / 1000).toFixed(1)),
    };
  }), [monthlyTonnage, lang, toDisplay]);
  const hasTrendData = monthlyTonnage.some(m => m.tonnage > 0);

  const milestones = useMemo(
    () => computeMilestones({ completedWorkouts, totalTonnage: totalWeight, exercisesWithRecord: exerciseRecords.length }),
    [completedWorkouts, totalWeight, exerciseRecords.length],
  );

  const specialBadges = useMemo(
    () => computeSpecialBadges(workouts, trainingPlan.length),
    [workouts, trainingPlan.length],
  );

  // Półka medali: ukończone cykle (sezony) z medalem wg frekwencji, najnowsze pierwsze.
  const seasonShelf = useMemo(
    () => cycles
      .filter(c => c.status === 'completed' && isCycleVisible(c) && c.stats.totalWorkouts > 0)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))
      .map(c => ({ cycle: c, medal: medalForCompletionRate(c.stats.completionRate) })),
    [cycles],
  );

  const milestoneLabel = (m: Milestone) => {
    if (m.category === 'tonnage') return t('achievements.ms.tonnage', { n: Number((toDisplay(m.threshold) / 1000).toFixed(1)), unit: unit === 'lbs' ? ' k lbs' : 't' });
    if (m.category === 'records') return t('achievements.ms.records', { n: m.threshold });
    return t('achievements.ms.workouts', { n: m.threshold });
  };

  // Group history by date for the dialog
  const getGroupedHistory = (history: { date: string; weight: number; reps: number }[]) => {
    const grouped = new Map<string, { weight: number; reps: number }[]>();
    history.forEach(h => {
      const existing = grouped.get(h.date) || [];
      existing.push({ weight: h.weight, reps: h.reps });
      grouped.set(h.date, existing);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

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
        <h1 className="text-2xl font-heading font-bold uppercase italic tracking-tight">{t('achievements.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('achievements.subtitle')}</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title={t('achievements.completedWorkouts')}
          value={completedWorkouts}
          icon={Trophy}
          variant="primary"
        />
        <StatsCard
          title={t('achievements.totalTonnage')}
          value={fmtTonnage(totalWeight)}
          subtitle={t('achievements.totalTonnageSub', { unit })}
          icon={Dumbbell}
          variant="primary"
        />
        <StatsCard
          title={t('achievements.exercisesWithRecord')}
          value={exerciseRecords.length}
          icon={Target}
          variant="primary"
        />
      </div>

      {/* Life PRs — top 3 z deltą */}
      {lifePRs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {t('achievements.lifePRs')}
            </CardTitle>
            <CardDescription>{t('achievements.lifePRsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {lifePRs.map(pr => (
                <div key={pr.id} className="rounded-xl bg-surface-low p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground truncate">{pr.name}</p>
                  <p className="mt-2 font-heading text-3xl font-bold text-primary leading-none">
                    {Math.round(toDisplay(pr.best1RM))}
                    <span className="text-base font-normal text-muted-foreground"> {unit}</span>
                  </p>
                  {pr.delta > 0 ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-fitness-success">
                      <TrendingUp className="h-3.5 w-3.5" />
                      +{Math.round(toDisplay(pr.delta))} {unit}
                      <span className="font-normal text-muted-foreground">{t('achievements.deltaSince')}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{t('achievements.firstRecord')}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6-month tonnage trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fitness-cyan" />
            {t('achievements.trend6mo')}
          </CardTitle>
          <CardDescription>{t('achievements.trend6moDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" domain={[0, 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}${unit === 'lbs' ? ' k lbs' : ' t'}`, t('achievements.totalTonnage')]} />
                <Bar dataKey="tonnes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('achievements.trendEmpty')}</p>
          )}
        </CardContent>
      </Card>

      {/* Milestones grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t('achievements.milestones')}
          </CardTitle>
          <CardDescription>{t('achievements.milestonesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {milestones.map(m => {
              const Icon = milestoneIcon(m.category);
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl p-3 text-center',
                    m.achieved ? 'bg-primary/10' : 'bg-surface-low',
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    m.achieved ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    {m.achieved ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <p className={cn(
                    'text-[11px] font-bold uppercase tracking-wide leading-tight',
                    m.achieved ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {milestoneLabel(m)}
                  </p>
                  {!m.achieved && m.progress > 0 && (
                    <div className="w-full">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${m.progress}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{m.progress}%</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Special badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-fitness-cyan" />
            {t('achievements.special.title')}
          </CardTitle>
          <CardDescription>{t('achievements.special.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {specialBadges.map(badge => {
              const Icon = specialBadgeIcon[badge.id];
              return (
                <div
                  key={badge.id}
                  title={t(specialBadgeDescKey[badge.id])}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl p-3 text-center',
                    badge.achieved ? 'bg-fitness-cyan/10' : 'bg-surface-low',
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    badge.achieved ? 'bg-fitness-cyan/20 text-fitness-cyan' : 'bg-muted text-muted-foreground',
                  )}>
                    {badge.achieved ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <p className={cn(
                    'text-[11px] font-bold uppercase tracking-wide leading-tight',
                    badge.achieved ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {t(specialBadgeLabelKey[badge.id])}
                  </p>
                  <p className="text-[10px] leading-tight text-muted-foreground">
                    {t(specialBadgeDescKey[badge.id])}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Season medal shelf */}
      {seasonShelf.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-400" />
              {t('achievements.seasons.title')}
            </CardTitle>
            <CardDescription>{t('achievements.seasons.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seasonShelf.map(({ cycle, medal }) => (
                <div key={cycle.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted',
                      medal ? medalColor[medal] : 'text-muted-foreground',
                    )}>
                      <Medal className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {medal ? t(medalLabelKey[medal]) : t('achievements.seasons.none')}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatShortDate(cycle.startDate)} – {formatShortDate(cycle.endDate)}
                        {' · '}{t('achievements.seasons.workouts', { n: cycle.stats.totalWorkouts })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {cycle.stats.completionRate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plateau alert */}
      {plateaus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-fitness-warning" />
              {t('achievements.plateauTitle')}
            </CardTitle>
            <CardDescription>{t('achievements.plateauDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plateaus.map(p => (
                <div key={p.exerciseId} className="flex items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('achievements.plateauSessions', { n: p.sessionCount, date: formatShortDate(p.bestDate) })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-fitness-warning hover:text-fitness-warning"
                    onClick={() => setProgressionExercise({ id: p.exerciseId, name: p.name })}
                  >
                    {t('achievements.plateauCta')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Exercise Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fitness-success" />
            {t('achievements.allRecords')}
          </CardTitle>
          <CardDescription>{t('achievements.allRecordsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {exerciseRecords.length > 0 ? (
            <div className="space-y-2">
              {exerciseRecords.map((record) => (
                <div
                  key={record.exerciseId}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-low hover:bg-surface-high cursor-pointer transition-colors"
                  onClick={() => setSelectedExercise(record)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{record.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('achievements.savedSets', { n: record.history.length })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-fitness-success">{fmt(record.maxWeight)}</p>
                      <p className="text-xs text-muted-foreground">{t('achievements.maxWeight')}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('achievements.noResultsFirst')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estimated 1RM Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('achievements.personalRecords')}
          </CardTitle>
          <CardDescription>{t('achievements.epleyFormula')}</CardDescription>
        </CardHeader>
        <CardContent>
          {oneRMRecords.length > 0 ? (
            <div className="space-y-2">
              {oneRMRecords.map(record => (
                <div
                  key={record.exerciseId}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-low"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{record.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(record.best1RMWeight)} × {record.best1RMReps} {t('achievements.repsShort')}
                      {record.bestDate && (
                        <> · {formatShortDate(record.bestDate)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{fmt(record.best1RM)}</p>
                      <p className="text-xs text-muted-foreground">{t('achievements.est1RM')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setProgressionExercise({ id: record.exerciseId, name: record.name })}
                    >
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('achievements.firstWorkoutFor1RM')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exercise Progression Dialog */}
      {progressionExercise && (
        <ExerciseProgressionDialog
          exerciseId={progressionExercise.id}
          exerciseName={progressionExercise.name}
          open={!!progressionExercise}
          onOpenChange={(open) => { if (!open) setProgressionExercise(null); }}
          isBodyweight={isBodyweightExercise(progressionExercise.name)}
        />
      )}

      {/* Exercise History Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExercise?.name}</DialogTitle>
            <DialogDescription>{t('achievements.dialogDesc')}</DialogDescription>
          </DialogHeader>

          {selectedExercise && (
            <div className="space-y-4">
              {/* Max Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-fitness-success/10 text-center">
                  <p className="text-2xl font-bold text-fitness-success">{fmt(selectedExercise.maxWeight)}</p>
                  <p className="text-xs text-muted-foreground">{t('achievements.weightRecord')}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedExercise.maxReps}</p>
                  <p className="text-xs text-muted-foreground">{t('achievements.maxReps')}</p>
                </div>
              </div>

              {/* History by date */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">{t('achievements.workoutHistory')}</h4>
                {getGroupedHistory(selectedExercise.history).map(([date, sets]) => (
                  <div key={date} className="p-3 rounded-lg bg-surface-low">
                    <p className="text-sm font-medium mb-2">
                      {parseLocalDate(date).toLocaleDateString(dateLocale(lang), {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sets.map((set, idx) => (
                        <Badge key={idx} variant="secondary">
                          {fmt(set.weight)} × {set.reps}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Achievements;
