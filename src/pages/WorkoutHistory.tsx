import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Download, History, Loader2, Mail, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { EmailWorkoutDialog } from '@/components/EmailWorkoutDialog';
import { ExportWorkoutsDialog } from '@/components/ExportWorkoutsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DateRangeField } from '@/components/DateRangeField';
import { Chip } from '@/components/kinetic/Chip';
import { HeaderActions } from '@/components/HeaderActions';
import { HistorySessionRow } from '@/components/history/HistorySessionRow';
import { CycleCard } from '@/components/history/CycleCard';
import { useCurrentUser } from '@/contexts/UserContext';
import { useWorkoutHistoryPage } from '@/hooks/useWorkoutHistoryPage';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import { useCycleSessions } from '@/hooks/useCycleSessions';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { buildHistoryRowMeta } from '@/lib/history-stats';
import { calculateTonnage, countWorkoutCompletedWorkingSets } from '@/lib/summary-utils';
import {
  assignWorkoutsToCycles, buildCycleSparkline, groupCycleWorkoutsByWeek, weekNoFor, windowCoversCycleStart,
} from '@/lib/history-cycles';
import { buildActiveCyclePreview, withLiveCompletedStats } from '@/lib/cycle-insights';
import { isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { formatTonnage } from '@/lib/units';
import { EmptyState } from '@/components/EmptyState';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { deleteWorkoutEverywhere } from '@/lib/workout-delete';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUnit } from '@/contexts/UnitContext';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

const WorkoutHistory = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const { uid, profile } = useCurrentUser();
  // F-T3: wysyłka całej historii mailem (np. do trenera).
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  // J-T2: wysyłka POJEDYNCZEGO treningu z wiersza Historii (mode='workout').
  const [emailWorkoutId, setEmailWorkoutId] = useState<string | null>(null);
  // J-T5: eksport CSV z wyborem zakresu (ten sam dialog co w Ustawieniach).
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const aggregate = useWorkoutAggregate(uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'draft'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [onlyPRs, setOnlyPRs] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkoutSession | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  // Fala 2: zwijane pola szukania/zakresu dat + tryb porównania (tap w wiersz = zaznacz).
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const { toast } = useToast();
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const { workouts, isLoaded, isLoadingMore, hasMore, loadMore } = useWorkoutHistoryPage(uid, {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    completed: selectedStatus === 'all' ? undefined : selectedStatus === 'completed',
  });
  // Fala 2: sesje przeszłego cyklu spoza paginowanego okna (lazy, cache per cykl).
  const { entries: cycleSessionEntries, load: loadCycleSessions } = useCycleSessions(uid);

  // Resolver radzi sobie z treningami ze starych planów (snapshot → cykl → plan → id).
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  // Okno historii + sesje dociągnięte lazy dla przeszłych cykli (dedupe po id).
  const allSessions = useMemo(() => {
    const seen = new Set(workouts.map((workout) => workout.id));
    const extras: WorkoutSession[] = [];
    Object.values(cycleSessionEntries).forEach((entry) => {
      entry.sessions.forEach((session) => {
        if (seen.has(session.id)) return;
        seen.add(session.id);
        extras.push(session);
      });
    });
    return extras.length > 0 ? [...workouts, ...extras] : workouts;
  }, [workouts, cycleSessionEntries]);

  // Czas trwania + PR per sesja liczone RAZ dla listy (Z80), nie per wiersz w renderze.
  const rowMeta = useMemo(() => buildHistoryRowMeta(allSessions), [allSessions]);

  // Jedno źródło filtra deletedIds — obejmuje też sesje dociągnięte lazy.
  const liveSessions = useMemo(
    () => allSessions.filter((workout) => !deletedIds.includes(workout.id)),
    [allSessions, deletedIds],
  );

  const filteredWorkouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return liveSessions
      .filter((workout) => {
        if (selectedDay !== 'all' && workout.dayId !== selectedDay) return false;
        if (selectedStatus === 'completed' && !workout.completed) return false;
        if (selectedStatus === 'draft' && workout.completed) return false;
        if (onlyPRs && (rowMeta.get(workout.id)?.prCount ?? 0) === 0) return false;
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
  }, [liveSessions, resolver, fromDate, onlyPRs, rowMeta, searchQuery, selectedDay, selectedStatus, toDate]);

  const comparison = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const selected = compareIds
      .map(id => allSessions.find(workout => workout.id === id))
      .filter((workout): workout is WorkoutSession => !!workout);
    if (selected.length !== 2) return null;

    const [first, second] = selected;
    // B-T1: kanoniczne metryki serii roboczych (bez rozgrzewek).
    const tonnage = (workout: typeof first) => calculateTonnage([workout]);
    const completedSets = (workout: typeof first) => countWorkoutCompletedWorkingSets(workout);

    return {
      first,
      second,
      tonnageDelta: tonnage(second) - tonnage(first),
      setDelta: completedSets(second) - completedSets(first),
      exerciseDelta: second.exercises.length - first.exercises.length,
    };
  }, [compareIds, allSessions]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const result = await deleteWorkoutEverywhere(uid, pendingDelete.id);
    setIsDeleting(false);
    if (result.success) {
      setDeletedIds((prev) => [...prev, pendingDelete.id]);
      setCompareIds((prev) => prev.filter((id) => id !== pendingDelete.id));
      toast({ title: t('history.deleted') });
    } else {
      toast({ title: t('history.deleteFailed'), description: result.error, variant: 'destructive' });
    }
    setPendingDelete(null);
  };

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

  const cycleWord = (n: number) =>
    t(n === 1
      ? 'history.cycleOne'
      : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
        ? 'history.cycleFew'
        : 'history.cycleMany');

  // ── Fala 2: cykle jako poziom nadrzędny listy ────────────────────────────────
  const visibleCycles = useMemo(() => cycles.filter(isCycleVisibleWithData), [cycles]);
  const activeCycle = useMemo(
    () => visibleCycles.find((cycle) => cycle.status === 'active') ?? null,
    [visibleCycles],
  );
  const pastCycles = useMemo(
    () => visibleCycles
      .filter((cycle) => cycle.status === 'completed')
      .sort((a, b) => b.endDate.localeCompare(a.endDate)),
    [visibleCycles],
  );
  // Numeracja "Cykl {n}" od najstarszego (cykle nie mają pola nazwy — nie zmyślamy).
  const cycleNumberById = useMemo(() => {
    const sorted = [...visibleCycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    return new Map(sorted.map((cycle, index) => [cycle.id, index + 1]));
  }, [visibleCycles]);

  // Przypisanie sesji do cykli: wiersze z listy PRZEFILTROWANEJ, staty/sparkline z pełnej.
  const filteredAssignment = useMemo(
    () => assignWorkoutsToCycles(filteredWorkouts, visibleCycles),
    [filteredWorkouts, visibleCycles],
  );
  const liveAssignment = useMemo(
    () => assignWorkoutsToCycles(liveSessions, visibleCycles),
    [liveSessions, visibleCycles],
  );

  const oldestLoadedDate = useMemo(
    () => workouts.reduce<string | null>(
      (oldest, workout) => (oldest === null || workout.date < oldest ? workout.date : oldest),
      null,
    ),
    [workouts],
  );

  const todayStr = formatLocalDate(new Date());
  // Staty aktywnego cyklu LIVE — ten sam mechanizm co Dashboard/Cykle (realne dane).
  const liveActiveCycle = useMemo(
    () => buildActiveCyclePreview(activeCycle, liveSessions),
    [activeCycle, liveSessions],
  );

  const filtersActive = searchQuery.trim() !== '' || selectedDay !== 'all'
    || selectedStatus !== 'all' || onlyPRs || fromDate !== '' || toDate !== '';

  const cycleFilteredSessions = (cycleId: string) => filteredAssignment.perCycle.get(cycleId) ?? [];
  const cycleLiveSessions = (cycleId: string) => liveAssignment.perCycle.get(cycleId) ?? [];
  // Cykl z 0 sesji po filtrach: karta widoczna tylko bez aktywnych filtrów (mniej szumu).
  const isCycleCardVisible = (cycleId: string) =>
    !filtersActive || cycleFilteredSessions(cycleId).length > 0;

  const outsideByMonth = useMemo(() => {
    const groups: { key: string; label: string; workouts: WorkoutSession[]; tonnage: number }[] = [];
    const indexByKey = new Map<string, number>();
    filteredAssignment.outside.forEach(workout => {
      const key = workout.date.slice(0, 7);
      let gi = indexByKey.get(key);
      if (gi === undefined) {
        const label = parseLocalDate(workout.date).toLocaleDateString(dateLocale(lang), { month: 'long', year: 'numeric' });
        groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), workouts: [], tonnage: 0 });
        gi = groups.length - 1;
        indexByKey.set(key, gi);
      }
      groups[gi].workouts.push(workout);
      groups[gi].tonnage += calculateTonnage([workout]);
    });
    return groups;
  }, [filteredAssignment.outside, lang]);

  const formatShortDate = (date: string) =>
    parseLocalDate(date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }).replace('.', '');

  const cycleRangeLabel = (cycle: PlanCycle) =>
    `${formatShortDate(cycle.startDate)} – ${formatShortDate(cycle.endDate)} · ${t('history.weeksShort', { n: cycle.durationWeeks })}`;

  // Tonaż w linii licznika: bez filtrów agregat all-time (backend), inaczej suma
  // z załadowanej przefiltrowanej listy. Nigdy dane zmyślone.
  const summaryTonnageKg = useMemo(() => {
    if (!filtersActive && aggregate) return aggregate.totals.totalTonnageKg;
    return calculateTonnage(filteredWorkouts);
  }, [aggregate, filteredWorkouts, filtersActive]);

  const renderSessionRow = (workout: WorkoutSession, surface: 'low' | 'container', options?: { highlight?: boolean }) => {
    const dayLabel = resolver.resolveDayLabel(workout);
    const title = `${localizeDayName(dayLabel.dayName, lang)} · ${localizeFocus(dayLabel.focus, lang) || t('history.noFocus')}`;
    return (
      <HistorySessionRow
        key={workout.id}
        workout={workout}
        title={title}
        meta={rowMeta.get(workout.id)}
        tonnage={calculateTonnage([workout])}
        totalSets={countWorkoutCompletedWorkingSets(workout)}
        isSelected={compareIds.includes(workout.id)}
        isExpanded={expandedIds.includes(workout.id)}
        compareMode={compareMode}
        surface={surface}
        highlight={options?.highlight}
        resolveExerciseName={(w, exerciseId) => resolver.resolveExerciseName(w, exerciseId)}
        onOpen={() => navigate(`/workout/${workout.dayId}?date=${workout.date}&session=${workout.id}`)}
        onToggleCompare={() => toggleCompare(workout.id)}
        onToggleExpanded={() => toggleExpanded(workout.id)}
        onEmail={() => setEmailWorkoutId(workout.id)}
        onDelete={() => setPendingDelete(workout)}
      />
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const activeCoversStart = activeCycle
    ? windowCoversCycleStart(oldestLoadedDate, activeCycle, hasMore)
    : false;
  const hasCycleCards = (activeCycle !== null && isCycleCardVisible(activeCycle.id))
    || pastCycles.some((cycle) => isCycleCardVisible(cycle.id));

  return (
    <div className="space-y-6">
      {/* Naprawa r2 (2026-08-21, sędzia struktury): kafle lupy i filtrów wracają
          do RZĘDU HEADERA (artboard 1a: avatar + HISTORY + lupa + filtr w jednej
          linii) — osobny rząd zostawiał pusty pas pod headerem. */}
      <HeaderActions>
        <button
          type="button"
          aria-label={t('history.search')}
          onClick={() => setSearchOpen((prev) => !prev)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-container text-foreground/80"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={t('history.filters')}
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-container text-foreground/80"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </HeaderActions>

      <div className="space-y-2">
        {(searchOpen || searchQuery !== '') && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        )}

        {/* Status — chipy */}
        <div className="flex flex-wrap gap-2">
          <Chip active={selectedStatus === 'all'} onClick={() => setSelectedStatus('all')}>{t('history.allShort')}</Chip>
          <Chip active={selectedStatus === 'completed'} onClick={() => setSelectedStatus('completed')}>{t('history.completed')}</Chip>
          <Chip active={selectedStatus === 'draft'} onClick={() => setSelectedStatus('draft')}>{t('history.drafts')}</Chip>
          <Chip active={onlyPRs} onClick={() => setOnlyPRs((prev) => !prev)}>{t('history.onlyPRs')}</Chip>
        </div>

        {/* Dzień planu — chipy (scroll wewnątrz kontenera, strona bez h-scrolla) */}
        {trainingPlan.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip className="shrink-0" active={selectedDay === 'all'} onClick={() => setSelectedDay('all')}>{t('history.allDays')}</Chip>
            {trainingPlan.map(day => (
              <Chip key={day.id} className="shrink-0" active={selectedDay === day.id} onClick={() => setSelectedDay(day.id)}>
                {localizeDayName(day.dayName, lang)}
              </Chip>
            ))}
          </div>
        )}

        {/* Zakres dat — T20.5: kalendarz booking-style; zwijany pod ikoną filtrów */}
        {(filtersOpen || fromDate !== '' || toDate !== '') && (
          <DateRangeField
            value={{ from: fromDate || null, to: toDate || null }}
            onChange={(next) => {
              setFromDate(next.from ?? '');
              setToDate(next.to ?? '');
            }}
            testId="history-date-range"
          />
        )}

        {/* Rząd akcji: tryb porównania + wysyłka historii; eksport CSV w drugiej linii
            (oba pille naraz nie mieszczą się przy 390px obok chipa). */}
        <div className="flex items-center gap-2 pt-1">
          <Chip active={compareMode} onClick={() => setCompareMode((prev) => !prev)}>
            {t('history.compare')}
          </Chip>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowEmailDialog(true)}
            data-testid="history-email"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {t('email.sendToCoach')}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowExportDialog(true)}
            data-testid="history-export-csv"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t('exportCsv.historyButton')}
          </Button>
        </div>
        {(compareMode || compareIds.length > 0) && (
          <p className="text-xs text-muted-foreground">{t('history.compareHint')}</p>
        )}
      </div>

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
              <p className="mt-1 text-xl font-heading font-bold tabular-nums">{comparison.tonnageDelta >= 0 ? '+' : '−'}{Math.abs(Math.round(toDisplay(comparison.tonnageDelta))).toLocaleString(dateLocale(lang))} {unit}</p>
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

      <EmailWorkoutDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        mode="history"
        uid={uid}
        initialEmail={profile?.preferences?.trainerEmail}
      />
      {/* J-T2: dialog pojedynczego treningu — zawsze zamontowany, zamykanie
          wyłącznie przez open=false (pułapka Radix: nie unmountować w open). */}
      <EmailWorkoutDialog
        open={emailWorkoutId !== null}
        onOpenChange={(open) => { if (!open) setEmailWorkoutId(null); }}
        mode="workout"
        uid={uid}
        workoutId={emailWorkoutId ?? undefined}
        initialEmail={profile?.preferences?.trainerEmail}
      />
      {/* J-T5: eksport CSV z wyborem zakresu. */}
      <ExportWorkoutsDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        uid={uid}
        cycles={cycles}
      />

      {/* Linia licznika: cykle · sesje + tonaż */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow-mono text-muted-foreground">
          {visibleCycles.length > 0 && `${visibleCycles.length} ${cycleWord(visibleCycles.length)} · `}
          {filteredWorkouts.length} {sessionWord(filteredWorkouts.length)}
        </span>
        <span className="eyebrow-mono text-muted-foreground">
          {/* Tonaż małymi literami ("13.7 t"), wersaliki tylko w etykiecie — lekcja Dashboardu. */}
          {t('history.tonnage')} <span className="normal-case">{formatTonnage(summaryTonnageKg, unit)}</span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Karta AKTYWNEGO cyklu */}
        {activeCycle && liveActiveCycle && isCycleCardVisible(activeCycle.id) && (
          <CycleCard
            title={t('history.cycleN', { n: cycleNumberById.get(activeCycle.id) ?? 1 })}
            rangeLabel={cycleRangeLabel(activeCycle)}
            variant="active"
            stats={{
              sessions: liveActiveCycle.stats.totalWorkouts,
              tonnageKg: liveActiveCycle.stats.totalTonnage,
              prs: liveActiveCycle.stats.prs.length,
              attendance: liveActiveCycle.stats.completionRate,
            }}
            sparkline={activeCoversStart
              ? buildCycleSparkline(activeCycle, cycleLiveSessions(activeCycle.id))
              : null}
            currentWeekNo={todayStr >= activeCycle.startDate ? weekNoFor(todayStr, activeCycle) : null}
            weeks={groupCycleWorkoutsByWeek(activeCycle, cycleFilteredSessions(activeCycle.id), todayStr)}
            totalSessions={cycleLiveSessions(activeCycle.id).length}
            renderRow={(workout, options) => renderSessionRow(workout, 'low', options)}
            canLoadOlder={hasMore && !activeCoversStart}
            onLoadOlder={loadMore}
          />
        )}

        {/* Karty PRZESZŁYCH cykli (zwinięte; rozwinięcie dociąga sesje spoza okna) */}
        {pastCycles.filter((cycle) => isCycleCardVisible(cycle.id)).map((cycle) => {
          const covered = windowCoversCycleStart(oldestLoadedDate, cycle, hasMore)
            || cycleSessionEntries[cycle.id]?.status === 'loaded';
          const stats = covered ? withLiveCompletedStats(cycle, liveSessions).stats : cycle.stats;
          return (
            <CycleCard
              key={cycle.id}
              title={t('history.cycleN', { n: cycleNumberById.get(cycle.id) ?? 1 })}
              rangeLabel={cycleRangeLabel(cycle)}
              variant="past"
              stats={{
                sessions: stats.totalWorkouts,
                tonnageKg: stats.totalTonnage,
                prs: stats.prs.length,
                attendance: stats.completionRate,
              }}
              sparkline={null}
              currentWeekNo={null}
              weeks={groupCycleWorkoutsByWeek(cycle, cycleFilteredSessions(cycle.id), todayStr)}
              totalSessions={cycleLiveSessions(cycle.id).length}
              renderRow={(workout, options) => renderSessionRow(workout, 'container', options)}
              lazyStatus={cycleSessionEntries[cycle.id]?.status ?? 'idle'}
              onExpand={() => {
                if (!windowCoversCycleStart(oldestLoadedDate, cycle, hasMore)) loadCycleSessions(cycle);
              }}
              onRetryLazy={() => loadCycleSessions(cycle, { force: true })}
            />
          );
        })}

        {/* Sesje poza cyklami: grupowanie miesięczne (fallback = cała lista bez cykli) */}
        {outsideByMonth.length > 0 && hasCycleCards && (
          <p className="eyebrow-mono pt-2 text-muted-foreground">{t('history.outsideCycles')}</p>
        )}
        {outsideByMonth.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading font-bold uppercase tracking-tight">{group.label}</h2>
              <span className="eyebrow-mono text-muted-foreground">
                {group.workouts.length} {sessionWord(group.workouts.length)} ·{' '}
                <span className="normal-case">{formatTonnage(group.tonnage, unit)}</span>
              </span>
            </div>
            {group.workouts.map((workout) => renderSessionRow(workout, 'low'))}
          </div>
        ))}

        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" className="rounded-full" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? t('common.loading') : t('common.loadMore')}
            </Button>
          </div>
        )}

        {filteredWorkouts.length === 0 && (
          workouts.length === 0 ? (
            // Z82: zero sesji w ogóle = zaproszenie do pierwszego treningu, nie komunikat o filtrach.
            <EmptyState
              icon={History}
              title={t('history.emptyNoWorkouts')}
              ctaLabel={t('empty.startFirstWorkout')}
              onCta={() => navigate('/')}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('history.empty')}
              </CardContent>
            </Card>
          )
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent data-testid="history-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('history.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('history.deleteDesc', {
                day: pendingDelete ? localizeDayName(resolver.resolveDayLabel(pendingDelete).dayName, lang) : '',
                date: pendingDelete?.date ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="history-delete-confirm"
              disabled={isDeleting}
              onClick={(event) => { event.preventDefault(); void handleConfirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('history.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkoutHistory;
