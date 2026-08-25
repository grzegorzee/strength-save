import { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { Trophy, Dumbbell, Target, TrendingUp, TrendingDown, ChevronRight, Zap, Sunrise, RotateCcw, Swords, CalendarCheck, Medal, BarChart3, CalendarRange, type LucideIcon } from 'lucide-react';
import { AchievementBadge } from '@/components/kinetic/AchievementBadge';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getExerciseBest1RM } from '@/lib/pr-utils';
import {
  buildExerciseRecords,
  getExercise1RMProgress,
  detectPlateaus,
  computeMilestones,
  computeSpecialBadges,
  tierForIndex,
  type ExerciseRecord,
  type Milestone,
  type SpecialBadgeId,
} from '@/lib/achievements-utils';
import { GroupHeader } from '@/components/exercises/GroupHeader';
import { getProgressTileImageUrl } from '@/lib/progress-media';
import { medalForCompletionRate } from '@/lib/season-medals';
import { isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { withLiveCompletedStats } from '@/lib/cycle-insights';
import { ExerciseProgressionDialog } from '@/components/ExerciseProgressionDialog';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { useTranslation } from '@/contexts/LanguageContext';

const AnalyticsEmbedded = lazyWithRetry(() => import('@/pages/Analytics'), 'lazy-retry:analytics-embedded');
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale, type TranslationKey } from '@/i18n';
import { cn, formatLocalDateLabel } from '@/lib/utils';

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

// D-T4: jeden ekran Postępy — segment widoku (rekordy/odznaki | analityka).
const ProgressHeader = ({ view }: { view: 'records' | 'analytics' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase italic tracking-tight">{t('progress.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('progress.subtitle')}</p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-low p-1" role="tablist" aria-label={t('progress.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'records'}
          data-testid="progress-view-records"
          onClick={() => navigate('/achievements', { replace: true })}
          className={view === 'records'
            ? 'rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-background'
            : 'rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground'}
        >
          {t('progress.viewRecords')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'analytics'}
          data-testid="progress-view-analytics"
          onClick={() => navigate('/achievements?view=analytics', { replace: true })}
          className={view === 'analytics'
            ? 'rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-background'
            : 'rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground'}
        >
          {t('progress.viewAnalytics')}
        </button>
      </div>
    </div>
  );
};

// Fix 2026-08-21 (zgłoszenie TestFlight): kafel sekcji poziomu 1 z ikoną lucide
// w akcencie zamiast medalionu webp (czarne kwadraty 512x512 odcinały się od tła
// kafla). Kontener i strefa nagłówka jak w GroupTile (rounded-[20px], surface,
// strefa 78 px); medaliony webp zostają w hero sekcji poziomu 2 (GroupHeader).
const SectionTile = ({ label, count, icon: Icon, onClick }: {
  label: string;
  count: number | string;
  icon: LucideIcon;
  onClick: () => void;
}) => (
  <button
    type="button"
    data-testid="progress-section-tile"
    onClick={onClick}
    className="overflow-hidden rounded-[20px] bg-surface-low text-left transition-colors hover:bg-surface-high"
  >
    <span aria-hidden="true" className="flex h-[78px] w-full items-center justify-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </span>
    </span>
    <span className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-2">
      <span className="truncate font-heading text-[15px] font-bold uppercase leading-tight tracking-tight">
        {label}
      </span>
      <span className="eyebrow-mono shrink-0 font-bold text-primary">{count}</span>
    </span>
  </button>
);

// X28 WP-D: sekcje poziomu 2 (?section=records|badges); ?view=analytics ma
// pierwszeństwo (edge case 1), nieznany param = poziom 1.
type ProgressSection = 'records' | 'badges';

const Achievements = () => {
  // D-T4: ?view=analytics renderuje osadzoną Analitykę pod wspólnym nagłówkiem.
  const [achSearchParams, setAchSearchParams] = useSearchParams();
  const progressView = achSearchParams.get('view') === 'analytics' ? 'analytics' : 'records';
  const rawSection = achSearchParams.get('section');
  const activeSection: ProgressSection | null =
    rawSection === 'records' || rawSection === 'badges' ? rawSection : null;

  // Wejście/wyjście z sekcji zaczyna od góry (wzorzec ExerciseLibrary).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { unit, fmt, toDisplay, fmtTonnage } = useUnit();
  const { uid } = useCurrentUser();
  const { workouts, getTotalWeight, getCompletedWorkoutsCount, isLoaded } = useFirebaseWorkouts(uid, { measurements: 'none' });
  const { plan: trainingPlan, scheduleOverrides } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRecord | null>(null);
  const [progressionExercise, setProgressionExercise] = useState<{ id: string; name: string } | null>(null);

  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const formatShortDate = (date: string) =>
    formatLocalDateLabel(date, dateLocale(lang), { day: 'numeric', month: 'short' });

  // Rekordy budujemy z SAMYCH treningów (nie z aktualnego planu), żeby ćwiczenia ze starych
  // planów nie znikały po zmianie planu. Nazwy resolwuje resolver (snapshot → cykl → plan).
  const exerciseRecords = useMemo(
    // B-T1: kanoniczny kontrakt serii roboczej (bez rozgrzewek i draftów).
    (): ExerciseRecord[] => buildExerciseRecords(
      workouts,
      (workout, exerciseId) => resolver.resolveExerciseName(workout, exerciseId),
    ),
    [resolver, workouts],
  );

  // Rekordy 1RM (szacowane) — wspólne źródło dla "życiowych rekordów" i pełnej listy 1RM.
  const oneRMRecords = useMemo(() => {
    const seen = new Map<string, { name: string; canonicalName: string }>();
    workouts.forEach(w => w.exercises.forEach(ex => {
      if (!seen.has(ex.exerciseId)) {
        seen.set(ex.exerciseId, {
          name: resolver.resolveExerciseName(w, ex.exerciseId),
          // Z156: kanoniczna PL do lookupów (dialog progresji, isBodyweightExercise).
          canonicalName: resolver.resolveCanonicalExerciseName(w, ex.exerciseId),
        });
      }
    }));
    const sorted = Array.from(seen.entries())
      .map(([id, names]) => ({ ...getExerciseBest1RM(workouts, id), ...names }))
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

  const exerciseCanonicalNames = useMemo(() => {
    const m = new Map<string, string>();
    oneRMRecords.forEach(r => m.set(r.exerciseId, r.canonicalName));
    return m;
  }, [oneRMRecords]);

  // Top 3 życiowe rekordy 1RM z przyrostem względem poprzedniego najlepszego.
  const lifePRs = useMemo(
    () => oneRMRecords.slice(0, 3).map(r => ({ id: r.exerciseId, name: r.name, ...getExercise1RMProgress(workouts, r.exerciseId) })),
    [oneRMRecords, workouts],
  );

  const plateaus = useMemo(() => detectPlateaus(workouts, exerciseNames).slice(0, 3), [workouts, exerciseNames]);

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
      .filter(c => c.status === 'completed')
      .map(c => withLiveCompletedStats(c, workouts, { scheduleOverrides }))
      .filter(isCycleVisibleWithData)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))
      .map(c => ({ cycle: c, medal: medalForCompletionRate(c.stats.completionRate) })),
    [cycles, workouts, scheduleOverrides],
  );

  // X28 WP-D: licznik kafla "Odznaki i sezony" = zdobyte/(milestones+special+sezony);
  // każdy sezon na półce jest zdobyty z definicji (ukończony cykl).
  const earnedBadges = milestones.filter(m => m.achieved).length
    + specialBadges.filter(b => b.achieved).length
    + seasonShelf.length;
  const totalBadges = milestones.length + specialBadges.length + seasonShelf.length;

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

  // D-T4: ?view=analytics — analityka osadzona pod wspólnym nagłówkiem Postępy.
  if (progressView === 'analytics') {
    return (
      <div className="space-y-6">
        <ProgressHeader view="analytics" />
        <Suspense fallback={(
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
          </div>
        )}
        >
          <AnalyticsEmbedded embedded />
        </Suspense>
      </div>
    );
  }

  // Z82: bez treningów strona pokazywała same zera i pustkę — zaproszenie zamiast tego.
  if (completedWorkouts === 0) {
    return (
      <div className="space-y-6">
        <ProgressHeader view="records" />
        <EmptyState
          icon={Trophy}
          title={t('achievements.emptyTitle')}
          ctaLabel={t('empty.startFirstWorkout')}
          onCta={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* X28 WP-D: poziom 1 — rzut oka (staty, Life PRs, heatmapa) + kafle sekcji. */}
      {activeSection === null && <>
      <ProgressHeader view="records" />

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

      {/* X35a W1 (decyzja właściciela): roczna heatmapa (52 tyg.) USUNIĘTA — nieczytelna
          na telefonie i wymagała przewijania w bok; konsekwencję pokazuje siatka
          12 tygodni w Analityce + streak. X28 WP-D: trend 6-mies. tonażu w wykresach. */}

      {/* Fix 2026-08-21: kafle sekcji — standardowe ikony lucide zamiast webp */}
      <div className="grid grid-cols-2 gap-2.5">
        <SectionTile
          label={t('progress.tile.records')}
          count={exerciseRecords.length}
          icon={Trophy}
          onClick={() => setAchSearchParams({ section: 'records' })}
        />
        <SectionTile
          label={t('progress.tile.badges')}
          count={`${earnedBadges}/${totalBadges}`}
          icon={Medal}
          onClick={() => setAchSearchParams({ section: 'badges' })}
        />
        <SectionTile
          label={t('progress.tile.analytics')}
          count=""
          icon={BarChart3}
          onClick={() => setAchSearchParams({ view: 'analytics' })}
        />
        <SectionTile
          label={t('progress.tile.weeks')}
          count=""
          icon={CalendarRange}
          onClick={() => setAchSearchParams({ view: 'analytics', tab: 'weekly' })}
        />
      </div>
      </>}

      {/* X28 WP-D: poziom 2 — Odznaki i sezony (sekcje przeniesione żywcem) */}
      {activeSection === 'badges' && <>
      <GroupHeader
        title={t('progress.tile.badges')}
        countLabel={t('progress.badges.count', { earned: earnedBadges, total: totalBadges })}
        imageUrl={getProgressTileImageUrl('badges')}
        imageFit="contain"
        onBack={() => setAchSearchParams({})}
        backLabel={t('common.back')}
      />

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
          {/* PRO-D T2: jeden kształt odznaki (heksagon), tier przez materiał, ghost bez kłódki. */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
            {milestones.map(m => {
              const catItems = milestones.filter(x => x.category === m.category);
              const catIdx = catItems.indexOf(m);
              return (
                <AchievementBadge
                  key={m.id}
                  label={milestoneLabel(m)}
                  sublabel={m.achieved ? undefined : `${m.progress}%`}
                  earned={m.achieved}
                  tier={tierForIndex(catIdx, catItems.length)}
                  icon={milestoneIcon(m.category)}
                  progress={m.achieved ? undefined : m.progress / 100}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Special badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('achievements.special.title')}
          </CardTitle>
          <CardDescription>{t('achievements.special.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* PRO-D T2: specjalne w jednolitym srebrze, opis w sublabel + title. */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-4">
            {specialBadges.map(badge => (
              <div key={badge.id} title={t(specialBadgeDescKey[badge.id])}>
                <AchievementBadge
                  label={t(specialBadgeLabelKey[badge.id])}
                  sublabel={t(specialBadgeDescKey[badge.id])}
                  earned={badge.achieved}
                  tier="silver"
                  icon={specialBadgeIcon[badge.id]}
                />
              </div>
            ))}
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
                        {formatShortDate(cycle.startDate)} - {formatShortDate(cycle.endDate)}
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
      </>}

      {/* X28 WP-D: poziom 2 — Rekordy (plateau + wszystkie rekordy + 1RM) */}
      {activeSection === 'records' && <>
      <GroupHeader
        title={t('progress.tile.records')}
        countLabel={t('progress.records.count', { n: exerciseRecords.length })}
        imageUrl={getProgressTileImageUrl('records')}
        imageFit="contain"
        onBack={() => setAchSearchParams({})}
        backLabel={t('common.back')}
      />

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
                    onClick={() => setProgressionExercise({ id: p.exerciseId, name: exerciseCanonicalNames.get(p.exerciseId) ?? p.name })}
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
                      onClick={() => setProgressionExercise({ id: record.exerciseId, name: record.canonicalName })}
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
      </>}

      {/* Dialogi wspólne dla poziomów — zawsze w drzewie strony: powrót z sekcji
          nie unmountuje Radixa w stanie open (pułapka builda 92). */}
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
                      {formatLocalDateLabel(date, dateLocale(lang), {
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
