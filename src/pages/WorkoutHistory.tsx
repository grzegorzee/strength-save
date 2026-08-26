import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRightLeft, CalendarRange, ChevronDown, ChevronRight, Download, History,
  Loader2, Search, SlidersHorizontal, Trash2,
} from 'lucide-react';
import { EmailWorkoutDialog } from '@/components/EmailWorkoutDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RangeCalendar } from '@/components/ui/range-calendar';
import { DateRangeField } from '@/components/DateRangeField';
import { Chip } from '@/components/kinetic/Chip';
import { HeaderActions } from '@/components/HeaderActions';
import { HistorySessionRow } from '@/components/history/HistorySessionRow';
import { CycleTile } from '@/components/history/CycleTile';
import { CycleDetailView, type CycleDetailStats } from '@/components/history/CycleDetailView';
import { HistoryExportSheet } from '@/components/history/HistoryExportSheet';
import { useCurrentUser } from '@/contexts/UserContext';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';
import { useWorkoutHistoryPage } from '@/hooks/useWorkoutHistoryPage';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import { useCycleSessions } from '@/hooks/useCycleSessions';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { buildHistoryRowMeta } from '@/lib/history-stats';
import { calculateTonnage, countWorkoutCompletedWorkingSets } from '@/lib/summary-utils';
import {
  assignWorkoutsToCycles, buildCycleSparkline, weekNoFor, windowCoversCycleStart,
} from '@/lib/history-cycles';
import { buildActiveCyclePreview, withLiveCompletedStats } from '@/lib/cycle-insights';
import { isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { formatTonnage } from '@/lib/units';
import { EmptyState } from '@/components/EmptyState';
import { getEmptyStateImageUrl } from '@/lib/exercise-media';
import { cn, formatLocalDate, formatLocalDateLabel, parseLocalDate } from '@/lib/utils';
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

// WP-H (X28), design-history-tiles.md: Historia v2 "tiles".
// Poziom 1 (bez paramów): kafle cykli (sparkline, tag, PR) + PERIOD + jeden
// Export + LATEST SESSIONS. Poziom 2 (?cycle=<id>|outside): CycleDetailView.
// Pełna płaska lista (?list=all): wyszukiwarka + dotychczasowe filtry +
// grupowanie miesiącami + paginacja. Dialogi (mail, delete, export sheet)
// zamontowane ZAWSZE na poziomie strony — Radix zamyka się tylko przez
// open=false, widoki przełączają się pod spodem.

const WorkoutHistory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const { uid, profile } = useCurrentUser();
  // F-T3: wysyłka całej historii mailem (np. do trenera).
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  // J-T2: wysyłka POJEDYNCZEGO treningu z wiersza Historii (mode='workout').
  const [emailWorkoutId, setEmailWorkoutId] = useState<string | null>(null);
  // WP-H: jeden Export (bottom sheet 2c) zamiast osobnych przycisków CSV/mail.
  const [showExportSheet, setShowExportSheet] = useState(false);
  const { plan: trainingPlan, scheduleOverrides } = useTrainingPlan(uid);
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

  // ── Cykle jako poziom nadrzędny (Fala 2) — w v2 jako kafle ────────────────
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

  // Przypisanie sesji do cykli: liczniki z listy PRZEFILTROWANEJ, sparkline z pełnej.
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
    () => buildActiveCyclePreview(activeCycle, liveSessions, undefined, { scheduleOverrides }),
    [activeCycle, liveSessions, scheduleOverrides],
  );

  const filtersActive = searchQuery.trim() !== '' || selectedDay !== 'all'
    || selectedStatus !== 'all' || onlyPRs || fromDate !== '' || toDate !== '';

  const cycleFilteredSessions = (cycleId: string) => filteredAssignment.perCycle.get(cycleId) ?? [];
  const cycleLiveSessions = (cycleId: string) => liveAssignment.perCycle.get(cycleId) ?? [];
  // Kafel cyklu z 0 sesji po filtrach: widoczny tylko bez aktywnych filtrów.
  const isCycleTileVisible = (cycleId: string) =>
    !filtersActive || cycleFilteredSessions(cycleId).length > 0;

  const formatShortDate = (date: string) =>
    formatLocalDateLabel(date, dateLocale(lang), { day: 'numeric', month: 'short' }).replace('.', '');

  // Aktywny cykl ma endDate '' aż do archiwizacji (usePlanCycles) — guard E-8UE4S:
  // zakres kończy się na "teraz", formatery safe, zero crasha.
  const cycleRangeOnly = (cycle: PlanCycle) =>
    `${formatShortDate(cycle.startDate)} - ${cycle.endDate ? formatShortDate(cycle.endDate) : t('cycles.now')}`;
  const cycleRangeLabel = (cycle: PlanCycle) =>
    `${cycleRangeOnly(cycle)} · ${t('history.weeksShort', { n: cycle.durationWeeks })}`;

  // Tonaż w linii licznika: bez filtrów agregat all-time (backend), inaczej suma
  // z załadowanej przefiltrowanej listy. Nigdy dane zmyślone.
  const summaryTonnageKg = useMemo(() => {
    if (!filtersActive && aggregate) return aggregate.totals.totalTonnageKg;
    return calculateTonnage(filteredWorkouts);
  }, [aggregate, filteredWorkouts, filtersActive]);

  // Licznik nagłówka = realna liczba sesji: bez filtrów agregat all-time,
  // z filtrami długość przefiltrowanej listy.
  const headerSessionCount = !filtersActive && aggregate
    ? aggregate.totals.workoutCount
    : filteredWorkouts.length;

  // ── Widoki: kafle (default) / ?cycle= / ?list=all ─────────────────────────
  const rawCycleParam = searchParams.get('cycle');
  const detailCycle = rawCycleParam && rawCycleParam !== 'outside'
    ? visibleCycles.find((cycle) => cycle.id === rawCycleParam) ?? null
    : null;
  const outsideSessions = useMemo(
    () => [...liveAssignment.outside].sort((a, b) => b.date.localeCompare(a.date)),
    [liveAssignment.outside],
  );
  // Nieznany ?cycle= => poziom 1 (edge 3).
  const view: 'cycle' | 'outside' | 'list' | 'tiles' = detailCycle
    ? 'cycle'
    : rawCycleParam === 'outside'
      ? 'outside'
      : searchParams.get('list') === 'all' ? 'list' : 'tiles';

  // Wejście/wyjście z poziomu 2 resetuje scroll (wzorzec /exercises).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, rawCycleParam]);

  // WP-C (X38): sesje zakończone lokalnie, które czekają na zapis w chmurze
  // (draft finalSyncPending) dostają pasywną chmurkę przy wierszu. Odświeżane
  // po każdym biegu AutoSync (WORKOUT_SYNC_STATE_CHANGED_EVENT) i focusie.
  const [pendingCloudIds, setPendingCloudIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const load = async () => {
      try {
        const drafts = await workoutDraftDb.listDrafts(uid);
        if (cancelled) return;
        setPendingCloudIds(new Set(drafts.filter((draft) => draft.finalSyncPending).map((draft) => draft.sessionId)));
      } catch {
        // Brak IDB (np. tryb prywatny): bez wskaźnika, lista działa dalej.
      }
    };
    void load();
    const handle = () => { void load(); };
    window.addEventListener('focus', handle);
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handle);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', handle);
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handle);
    };
  }, [uid]);

  // Edge 4: wejście w przeszły cykl dociąga jego sesje (istniejący mechanizm).
  useEffect(() => {
    if (!detailCycle || detailCycle.status !== 'completed') return;
    if (!windowCoversCycleStart(oldestLoadedDate, detailCycle, hasMore)) {
      loadCycleSessions(detailCycle);
    }
  }, [detailCycle, oldestLoadedDate, hasMore, loadCycleSessions]);

  const openTilesView = () => setSearchParams({});
  const openListView = () => setSearchParams({ list: 'all' });
  const openCycleView = (cycleId: string) => setSearchParams({ cycle: cycleId });

  const renderSessionRow = (workout: WorkoutSession, surface: 'low' | 'container', options?: { highlight?: boolean }) => {
    const dayLabel = resolver.resolveDayLabel(workout);
    const focusLabel = localizeFocus(dayLabel.focus, lang);
    const title = `${localizeDayName(dayLabel.dayName, lang)} · ${focusLabel || t('history.noFocus')}`;
    return (
      <HistorySessionRow
        key={workout.id}
        workout={workout}
        title={title}
        focusLabel={focusLabel || undefined}
        meta={rowMeta.get(workout.id)}
        tonnage={calculateTonnage([workout])}
        totalSets={countWorkoutCompletedWorkingSets(workout)}
        isSelected={compareIds.includes(workout.id)}
        isExpanded={expandedIds.includes(workout.id)}
        compareMode={compareMode}
        surface={surface}
        highlight={options?.highlight}
        pendingCloud={pendingCloudIds.has(workout.id)}
        resolveExerciseName={(w, exerciseId) => resolver.resolveExerciseName(w, exerciseId)}
        onOpen={() => navigate(`/workout/${workout.dayId}?date=${workout.date}&session=${workout.id}`)}
        onToggleCompare={() => toggleCompare(workout.id)}
        onToggleExpanded={() => toggleExpanded(workout.id)}
        onEmail={() => setEmailWorkoutId(workout.id)}
        onDelete={() => setPendingDelete(workout)}
      />
    );
  };

  // Grupowanie pełnej listy miesiącami (dotychczasowy widok miesięczny).
  const listByMonth = useMemo(() => {
    const groups: { key: string; label: string; workouts: WorkoutSession[]; tonnage: number }[] = [];
    const indexByKey = new Map<string, number>();
    filteredWorkouts.forEach(workout => {
      const key = workout.date.slice(0, 7);
      let gi = indexByKey.get(key);
      if (gi === undefined) {
        const label = formatLocalDateLabel(workout.date, dateLocale(lang), { month: 'long', year: 'numeric' });
        groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), workouts: [], tonnage: 0 });
        gi = groups.length - 1;
        indexByKey.set(key, gi);
      }
      groups[gi].workouts.push(workout);
      groups[gi].tonnage += calculateTonnage([workout]);
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

  const activeCoversStart = activeCycle
    ? windowCoversCycleStart(oldestLoadedDate, activeCycle, hasMore)
    : false;
  const currentWeekNo = activeCycle && todayStr >= activeCycle.startDate
    ? weekNoFor(todayStr, activeCycle)
    : null;

  // Sparkline = kształt CAŁEGO cyklu (edge 2): tylko gdy okno danych pokrywa
  // cykl, a PERIOD/status nie wycinają sesji z fetchu — inaczej wykres kłamie.
  const periodCoversRange = (startDate: string, endDate: string) =>
    (!fromDate || fromDate <= startDate) && (!toDate || toDate >= endDate);
  const activeSparkline = activeCycle && activeCoversStart && selectedStatus === 'all'
    && periodCoversRange(activeCycle.startDate, todayStr)
    ? buildCycleSparkline(activeCycle, cycleLiveSessions(activeCycle.id))
    : null;
  const pastSparkline = (cycle: PlanCycle) => {
    const covered = windowCoversCycleStart(oldestLoadedDate, cycle, hasMore)
      || cycleSessionEntries[cycle.id]?.status === 'loaded';
    if (!covered || selectedStatus !== 'all' || !periodCoversRange(cycle.startDate, cycle.endDate)) return null;
    return buildCycleSparkline(cycle, cycleLiveSessions(cycle.id));
  };

  // Liczniki kafla: bez filtrów staty all-time cyklu, z filtrami (PERIOD itd.)
  // uczciwa suma z przefiltrowanej załadowanej listy.
  const tileStats = (cycleId: string, allTime: { sessions: number; tonnageKg: number; prs: number }) => {
    if (!filtersActive) return allTime;
    const sessions = cycleFilteredSessions(cycleId);
    return {
      sessions: sessions.length,
      tonnageKg: calculateTonnage(sessions),
      prs: sessions.reduce((acc, workout) => acc + (rowMeta.get(workout.id)?.prCount ?? 0), 0),
    };
  };
  const tileMetaLabel = (stats: { sessions: number; tonnageKg: number }) =>
    `${stats.sessions} · ${formatTonnage(stats.tonnageKg, unit)}`;

  const pastAllTimeStats = (cycle: PlanCycle) => {
    const covered = windowCoversCycleStart(oldestLoadedDate, cycle, hasMore)
      || cycleSessionEntries[cycle.id]?.status === 'loaded';
    const stats = covered ? withLiveCompletedStats(cycle, liveSessions, { scheduleOverrides }).stats : cycle.stats;
    return { sessions: stats.totalWorkouts, tonnageKg: stats.totalTonnage, prs: stats.prs.length };
  };

  const outsideFiltered = filteredAssignment.outside;
  const outsideStats = {
    sessions: outsideFiltered.length,
    tonnageKg: calculateTonnage(outsideFiltered),
    prs: outsideFiltered.reduce((acc, workout) => acc + (rowMeta.get(workout.id)?.prCount ?? 0), 0),
  };

  const latestSessions = filteredWorkouts.slice(0, 3);

  const periodSet = fromDate !== '' || toDate !== '';
  const periodLabel = periodSet
    ? `${fromDate ? formatShortDate(fromDate) : '…'} - ${toDate ? formatShortDate(toDate) : t('cycles.now')}`
    : t('history.scopeAll');

  // ── Widok cyklu (poziom 2): dane dla CycleDetailView ──────────────────────
  const detailSessions = view === 'cycle' && detailCycle
    ? [...cycleLiveSessions(detailCycle.id)].sort((a, b) => b.date.localeCompare(a.date))
    : outsideSessions;
  const detailStats: CycleDetailStats = (() => {
    if (view === 'cycle' && detailCycle) {
      if (detailCycle.status === 'active' && liveActiveCycle) {
        return {
          sessions: liveActiveCycle.stats.totalWorkouts,
          tonnageKg: liveActiveCycle.stats.totalTonnage,
          prs: liveActiveCycle.stats.prs.length,
          attendance: liveActiveCycle.stats.completionRate,
        };
      }
      const covered = windowCoversCycleStart(oldestLoadedDate, detailCycle, hasMore)
        || cycleSessionEntries[detailCycle.id]?.status === 'loaded';
      const stats = covered ? withLiveCompletedStats(detailCycle, liveSessions, { scheduleOverrides }).stats : detailCycle.stats;
      return {
        sessions: stats.totalWorkouts,
        tonnageKg: stats.totalTonnage,
        prs: stats.prs.length,
        attendance: stats.completionRate,
      };
    }
    return {
      sessions: outsideSessions.length,
      tonnageKg: calculateTonnage(outsideSessions),
      prs: outsideSessions.reduce((acc, workout) => acc + (rowMeta.get(workout.id)?.prCount ?? 0), 0),
      attendance: null,
    };
  })();

  const comparisonCard = comparison && (
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
  );

  const hasAnyTile = (activeCycle !== null && isCycleTileVisible(activeCycle.id))
    || pastCycles.some((cycle) => isCycleTileVisible(cycle.id))
    || outsideStats.sessions > 0;

  return (
    <div className="space-y-6">
      {/* Header (design 2a): na poziomie 1 licznik sesji zamiast lupy; lupa i
          filtry żyją w pełnej liście (?list=all). */}
      {view === 'tiles' && (
        <HeaderActions>
          <span className="eyebrow-mono text-muted-foreground">
            {headerSessionCount} {sessionWord(headerSessionCount)}
          </span>
        </HeaderActions>
      )}
      {view === 'list' && (
        <HeaderActions>
          <button
            type="button"
            aria-label={t('history.filters')}
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-container text-foreground/80"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </HeaderActions>
      )}

      {/* ═══ POZIOM 1: kafle cykli ═══ */}
      {view === 'tiles' && (
        <>
          <div className="flex gap-2">
            {/* PERIOD: zakres dat poziomu 1 (filtruje liczniki kafli i LATEST). */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="history-period"
                  className="flex h-[46px] min-w-0 flex-1 items-center gap-2.5 rounded-[14px] bg-surface-high px-3 text-left"
                >
                  <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {t('history.period')}
                    </span>
                    <span className="block truncate text-[13px]">{periodLabel}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <RangeCalendar
                  value={{ from: fromDate || null, to: toDate || null }}
                  onChange={(next) => {
                    setFromDate(next.from ?? '');
                    setToDate(next.to ?? '');
                  }}
                  testId="history-period-calendar"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="history-period-clear"
                  className="mt-1 w-full"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                >
                  {t('range.clear')}
                </Button>
              </PopoverContent>
            </Popover>
            {/* Jeden Export: bottom sheet 2c (PDF / CSV / do trenera). */}
            <button
              type="button"
              data-testid="history-export"
              onClick={() => setShowExportSheet(true)}
              className="flex h-[46px] shrink-0 items-center gap-2 rounded-[14px] bg-primary/15 px-4 text-[13px] font-semibold text-primary"
            >
              <Download className="h-4 w-4" />
              {t('history.export')}
            </button>
          </div>

          {comparisonCard}

          {hasAnyTile && (
            <div className="grid grid-cols-2 gap-2.5">
              {activeCycle && liveActiveCycle && isCycleTileVisible(activeCycle.id) && (
                <CycleTile
                  name={t('history.cycleN', { n: cycleNumberById.get(activeCycle.id) ?? 1 })}
                  tag={currentWeekNo !== null
                    ? t('history.tileActiveTag', { n: currentWeekNo })
                    : t('history.activeBadge')}
                  tagAccent
                  prCount={tileStats(activeCycle.id, {
                    sessions: liveActiveCycle.stats.totalWorkouts,
                    tonnageKg: liveActiveCycle.stats.totalTonnage,
                    prs: liveActiveCycle.stats.prs.length,
                  }).prs}
                  prLabel={t('history.tilePRs', {
                    n: tileStats(activeCycle.id, {
                      sessions: liveActiveCycle.stats.totalWorkouts,
                      tonnageKg: liveActiveCycle.stats.totalTonnage,
                      prs: liveActiveCycle.stats.prs.length,
                    }).prs,
                  })}
                  sparkline={activeSparkline}
                  currentWeekNo={currentWeekNo}
                  metaLabel={tileMetaLabel(tileStats(activeCycle.id, {
                    sessions: liveActiveCycle.stats.totalWorkouts,
                    tonnageKg: liveActiveCycle.stats.totalTonnage,
                    prs: liveActiveCycle.stats.prs.length,
                  }))}
                  rangeLabel={cycleRangeOnly(activeCycle)}
                  variant="active"
                  onOpen={() => openCycleView(activeCycle.id)}
                />
              )}
              {pastCycles.filter((cycle) => isCycleTileVisible(cycle.id)).map((cycle) => {
                const stats = tileStats(cycle.id, pastAllTimeStats(cycle));
                return (
                  <CycleTile
                    key={cycle.id}
                    name={t('history.cycleN', { n: cycleNumberById.get(cycle.id) ?? 1 })}
                    tag={t('history.weeksShort', { n: cycle.durationWeeks })}
                    prCount={stats.prs}
                    prLabel={t('history.tilePRs', { n: stats.prs })}
                    sparkline={pastSparkline(cycle)}
                    metaLabel={tileMetaLabel(stats)}
                    rangeLabel={cycleRangeOnly(cycle)}
                    variant="past"
                    onOpen={() => openCycleView(cycle.id)}
                  />
                );
              })}
              {/* Niezmiennik: KAŻDA sesja osiągalna — sesje bez cyklu mają kafel. */}
              {outsideStats.sessions > 0 && (
                <CycleTile
                  name={t('history.outsideCycles')}
                  tag={null}
                  prCount={outsideStats.prs}
                  prLabel={t('history.tilePRs', { n: outsideStats.prs })}
                  sparkline={null}
                  metaLabel={tileMetaLabel(outsideStats)}
                  rangeLabel={null}
                  variant="outside"
                  onOpen={() => openCycleView('outside')}
                />
              )}
            </div>
          )}

          {/* LATEST SESSIONS: 3 najnowsze + wejście do pełnej listy. */}
          {latestSessions.length > 0 && (
            <div className="space-y-2" data-testid="history-latest">
              <p className="eyebrow-mono text-muted-foreground">{t('history.latestSessions')}</p>
              <div className="space-y-2 rounded-[20px] bg-surface-low p-3">
                {latestSessions.map((workout) => renderSessionRow(workout, 'container'))}
                <button
                  type="button"
                  data-testid="history-all-sessions-link"
                  onClick={openListView}
                  className="flex w-full items-center justify-center gap-1 py-2 text-[12.5px] font-semibold text-primary"
                >
                  {t('history.allSessionsNewest', { n: headerSessionCount })}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {filteredWorkouts.length === 0 && (
            workouts.length === 0 && visibleCycles.length === 0 ? (
              // Z82: zero sesji w ogóle = zaproszenie do pierwszego treningu.
              <EmptyState
                icon={History}
                imageUrl={getEmptyStateImageUrl('history')}
                title={t('history.emptyNoWorkouts')}
                ctaLabel={t('empty.startFirstWorkout')}
                onCta={() => navigate('/')}
              />
            ) : workouts.length === 0 ? null : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {t('history.empty')}
                </CardContent>
              </Card>
            )
          )}
        </>
      )}

      {/* ═══ POZIOM 2: widok cyklu / poza cyklami ═══ */}
      {(view === 'cycle' || view === 'outside') && (
        <>
          {comparisonCard}
          {(compareMode || compareIds.length > 0) && (
            <p className="text-xs text-muted-foreground">{t('history.compareHint')}</p>
          )}
          <CycleDetailView
            title={view === 'cycle' && detailCycle
              ? t('history.cycleN', { n: cycleNumberById.get(detailCycle.id) ?? 1 })
              : t('history.outsideCycles')}
            isActive={view === 'cycle' && detailCycle?.status === 'active'}
            rangeLabel={view === 'cycle' && detailCycle ? cycleRangeLabel(detailCycle) : ''}
            stats={detailStats}
            cycle={view === 'cycle' ? detailCycle : null}
            sessions={detailSessions}
            todayStr={todayStr}
            prCountOf={(id) => rowMeta.get(id)?.prCount ?? 0}
            compareMode={compareMode}
            lazyStatus={view === 'cycle' && detailCycle
              ? cycleSessionEntries[detailCycle.id]?.status ?? 'idle'
              : 'idle'}
            canLoadOlder={view === 'cycle' && detailCycle?.status === 'active' && hasMore && !activeCoversStart}
            isLoadingMore={isLoadingMore}
            onLoadOlder={loadMore}
            onRetryLazy={() => { if (detailCycle) loadCycleSessions(detailCycle, { force: true }); }}
            onBack={openTilesView}
            onToggleCompareMode={() => setCompareMode((prev) => !prev)}
            onEmailHistory={() => setShowEmailDialog(true)}
            onAllSessions={openListView}
            renderRow={(workout, options) => renderSessionRow(workout, 'low', options)}
          />
        </>
      )}

      {/* ═══ Pełna płaska lista (?list=all): wyszukiwarka + filtry + miesiące ═══ */}
      {view === 'list' && (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t('history.backToHistory')}
              data-testid="history-list-back"
              onClick={openTilesView}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface-high text-foreground/80"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <h2 className="font-heading text-lg font-bold uppercase tracking-tight">
              {t('history.allSessionsTitle')}
            </h2>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('history.searchPlaceholder')}
                className="pl-9"
              />
            </div>

            {/* Status — chipy zawijane, wszystkie widoczne (X35a WP-A). */}
            <div className="flex flex-wrap gap-2" data-testid="history-status-chips">
              <Chip className="touch-manipulation select-none" active={selectedStatus === 'all'} onClick={() => setSelectedStatus('all')}>{t('history.allShort')}</Chip>
              <Chip className="touch-manipulation select-none" active={selectedStatus === 'completed'} onClick={() => setSelectedStatus('completed')}>{t('history.completed')}</Chip>
              <Chip className="touch-manipulation select-none" active={selectedStatus === 'draft'} onClick={() => setSelectedStatus('draft')}>{t('history.drafts')}</Chip>
              <Chip className="touch-manipulation select-none" active={onlyPRs} onClick={() => setOnlyPRs((prev) => !prev)}>{t('history.onlyPRs')}</Chip>
            </div>

            {/* Dzień planu — chipy zawijane (X35a WP-A). */}
            {trainingPlan.length > 0 && (
              <div className="flex flex-wrap gap-2" data-testid="history-day-chips">
                <Chip className="touch-manipulation select-none" active={selectedDay === 'all'} onClick={() => setSelectedDay('all')}>{t('history.allDays')}</Chip>
                {trainingPlan.map(day => (
                  <Chip key={day.id} className="touch-manipulation select-none" active={selectedDay === day.id} onClick={() => setSelectedDay(day.id)}>
                    {localizeDayName(day.dayName, lang)}
                  </Chip>
                ))}
              </div>
            )}

            {/* X35a WP-A#5: "Porównaj" to TRYB, nie filtr — osobny przycisk poza rzędem chipów. */}
            <button
              type="button"
              aria-pressed={compareMode}
              data-testid="history-compare-toggle"
              onClick={() => setCompareMode((prev) => !prev)}
              className={cn(
                'inline-flex touch-manipulation select-none items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors',
                compareMode ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-transparent text-foreground/80',
              )}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {t('history.compare')}
            </button>

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

            {(compareMode || compareIds.length > 0) && (
              <p className="text-xs text-muted-foreground">{t('history.compareHint')}</p>
            )}
          </div>

          {comparisonCard}

          {/* Linia licznika: sesje + tonaż (bez filtrów = agregat backendowy). */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow-mono text-muted-foreground">
              {headerSessionCount} {sessionWord(headerSessionCount)}
            </span>
            <span className="eyebrow-mono text-muted-foreground">
              {/* Tonaż małymi literami ("13.7 t"), wersaliki tylko w etykiecie. */}
              {t('history.tonnage')} <span className="normal-case">{formatTonnage(summaryTonnageKg, unit)}</span>
            </span>
          </div>

          <div className="space-y-4">
            {listByMonth.map((group) => (
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
                <EmptyState
                  icon={History}
                  imageUrl={getEmptyStateImageUrl('history')}
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
        </>
      )}

      {/* ═══ Dialogi i sheet — zamontowane ZAWSZE (Radix: open=false) ═══ */}
      <EmailWorkoutDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        mode="history"
        uid={uid}
        initialEmail={profile?.preferences?.trainerEmail}
        savedTrainerEmail={profile?.preferences?.trainerEmail}
        savedTrainerName={profile?.preferences?.trainerName}
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
        savedTrainerEmail={profile?.preferences?.trainerEmail}
        savedTrainerName={profile?.preferences?.trainerName}
      />
      <HistoryExportSheet
        open={showExportSheet}
        onOpenChange={setShowExportSheet}
        uid={uid}
        displayName={profile?.displayName || ''}
        period={periodSet ? { from: fromDate, to: toDate } : null}
        periodLabel={periodSet ? periodLabel : null}
        cycles={visibleCycles}
        workouts={liveSessions}
        trainerEmail={profile?.preferences?.trainerEmail}
        trainerName={profile?.preferences?.trainerName}
        onSendToCoach={() => setShowEmailDialog(true)}
      />

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
