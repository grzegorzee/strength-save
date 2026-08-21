import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AllTimeStatsSheet } from '@/components/AllTimeStatsSheet';
import { ProUpsellBanner } from '@/components/ProUpsellBanner';
import { Weight, Trophy, Flame, ChevronRight, BarChart3, Sun, Moon, TrendingUp, TrendingDown, Minus, Route, CheckCircle, Play, CloudOff, X, RefreshCw, Loader2, ShieldCheck, Zap, HeartPulse, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useToday } from '@/hooks/useToday';
import { useToast } from '@/hooks/use-toast';
import { repeatPlanSource, startCycleWithPlan } from '@/lib/cycle-actions';
import { buildPlanEventEmitter } from '@/lib/user-events';
import { type TrainingDay } from '@/data/trainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useActivities } from '@/hooks/useActivities';
import { AddCardioDialog } from '@/components/AddCardioDialog';
import { WeekCard } from '@/components/WeekCard';
import { WeekCardioCard } from '@/components/WeekCardioCard';
import { LapseTray } from '@/components/LapseTray';
import { LapseStatusCard } from '@/components/LapseStatusCard';
import { collectLapsedDates, detectLapse } from '@/lib/lapse-detection';
import { ReducedModeDialog } from '@/components/ReducedModeDialog';
import { buildReducedMode, isReducedModeActive, type ReducedModeLevel } from '@/lib/reduced-mode';
import { VacationDialog } from '@/components/VacationDialog';
import { buildVacationMode, isVacationActive, resolveDeloadWeek, type VacationActivity } from '@/lib/vacation-mode';
import { DashboardStatusSlot, type StatusEntry } from '@/components/DashboardStatusSlot';
import { buildWeekCardModel } from '@/lib/week-card';
import { isDeloadWeek } from '@/lib/progression-engine';
import { recoveryTipKeys } from '@/lib/recovery-tips';
import { WeekReportCard } from '@/components/WeekReportCard';
import { unifiedToManual, type ManualActivity } from '@/lib/manual-activity';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { calculateStreakDetails, calculateTonnage, getWeekBounds } from '@/lib/summary-utils';
import { RescheduleSheet } from '@/components/RescheduleSheet';
import { MissedWorkoutBanner } from '@/components/MissedWorkoutBanner';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getNextScheduledTraining, getScheduledTrainingForDate, getScheduledTrainingWeek, getStartOfPlanWeek, weekdayOfDate, type ScheduledTrainingDay } from '@/lib/plan-schedule';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { continuableDraftTarget, isDraftContinuableToday, shouldResumeWorkoutDraft } from '@/lib/workout-resume';
import { useWatchPlanPreview } from '@/hooks/useWatchPlanPreview';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';
import { buildActiveCyclePreview, withLiveCompletedStats } from '@/lib/cycle-insights';
import { buildPlanNextStep } from '@/lib/plan-next-step';
import { PlanNextStepCard } from '@/components/PlanNextStepCard';
import { buildWorkoutRoute, findWorkoutForRoute } from '@/lib/workout-lookup';
import { countCompletedWorkingSets } from '@/lib/workout-day-view';
import { createAdhocDay } from '@/lib/adhoc-workout';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';
import { isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import { useSubscription } from '@/hooks/useSubscription';
import { buildWatchCapabilitySnapshot } from '@/lib/device-management';
import { markStartup } from '@/lib/startup-performance';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Confetti tylko po ukończeniu onboardingu (?welcome=1). Po treningu
  // (?celebrate=1) zostaje highlight karty + „+1" w headerze — confetti należy
  // do sekwencji completion i tylko dla PR/kamieni milowych (PRO-C T3).
  // X17D Z139.4: drugie wejście do „Twoich liczb" (pierwsze to licznik w nagłówku).
  const [statsOpen, setStatsOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(
    () => searchParams.get('welcome') === '1',
  );
  // Powrót z completion (spec A1 Runna p.1): podświetl kartę dnia z "co dalej".
  // Osobny stan, bo showConfetti gaśnie po onDone, a podświetlenie ma zostać.
  const [completionHighlight] = useState(() => searchParams.get('celebrate') === '1');
  // T4 (feedback 2026-08-20): po onboardingu (?welcome=1, oba wejścia: web
  // i iOS-po-paywallu) zaproponuj pomiary startowe. Ref czyta param ZANIM
  // effect wyczyści URL (ten sam trick co showConfetti); decyzja "brak
  // pomiarów" zapada JEDNORAZOWO przy isLoaded, żeby napływ snapshotu nie
  // zamykał otwartego dialogu (pułapka Radix z CLAUDE.md).
  const wantsMeasurePrompt = useRef(searchParams.get('welcome') === '1');
  const [measurePromptOpen, setMeasurePromptOpen] = useState(false);
  useEffect(() => {
    if (searchParams.get('welcome') === '1' || searchParams.get('celebrate') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('welcome');
      next.delete('celebrate');
      setSearchParams(next, { replace: true }); // czyść URL, żeby odświeżenie nie powtarzało confetti
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { t, lang } = useTranslation();
  const { unit, fmt, toDisplay, fmtTonnage } = useUnit();
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const subscription = useSubscription();
  const watchCapability = subscription.loading
    ? undefined
    : buildWatchCapabilitySnapshot(subscription);
  const {
    workouts,
    getTotalWeight,
    getCompletedWorkoutsCount,
    getLatestMeasurement,
    isLoaded,
    error,
    backfillHistoricalWorkouts
  } = useFirebaseWorkouts(uid, { measurements: 'latest', workouts: 'recent' });
  const { plan: trainingPlan, isLoaded: planIsLoaded, isPlanExpired, currentWeek, planDurationWeeks, weeksRemaining, planStartDate, planStarted, savePlan, progression, saveDeloadDecision, scheduleOverrides, moveScheduledDay, skippedDates, setDaySkipped, skipPastDates, reducedMode, setReducedMode, vacation, setVacation } = useTrainingPlan(uid);
  useEffect(() => {
    if (isLoaded && planIsLoaded) markStartup('dashboard-interactive');
  }, [isLoaded, planIsLoaded]);
  // T4: popup pomiarów tylko dla usera BEZ żadnego pomiaru (stały user wracający
  // przez redirect /onboarding -> /?welcome=1 go nie zobaczy).
  useEffect(() => {
    if (!wantsMeasurePrompt.current || !isLoaded) return;
    wantsMeasurePrompt.current = false;
    if (!getLatestMeasurement()) setMeasurePromptOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);
  // Z112: strumień zunifikowany (Strava + ręczne cardio); karty
  // czysto-Stravowe dalej liczą ze stravaActivities.
  // Z173: świeże "dzisiaj" (rollover doby, powrót z tła) zamiast daty zamrożonej
  // przy mouncie — wszystkie pochodne (thisWeek, todayTraining, draftResume,
  // kafle) przeliczają się same przez zależność od `today`.
  const today = useToday();
  // Z214: karty Dashboardu liczą wyłącznie bieżący tydzień planu, więc listener
  // aktywności dostaje okno od poniedziałku zamiast pełnych 500 rekordów.
  const activityWindowStart = formatLocalDate(getStartOfPlanWeek(today));
  // T5: koniec bieżącego tygodnia (Mon-Sun) dla karty cardio tygodnia.
  const activityWindowEnd = useMemo(() => {
    const end = parseLocalDate(activityWindowStart);
    end.setDate(end.getDate() + 6);
    return formatLocalDate(end);
  }, [activityWindowStart]);
  const {
    activities: unifiedActivities,
    stravaActivities,
    connection: stravaConnection,
    addActivity,
    updateActivity,
    deleteActivity,
  } = useActivities(uid, canUseStrava, activityWindowStart);
  const { cycles, isLoaded: cyclesLoaded, archiveCurrentPlan, createActiveCycle } = usePlanCycles(uid);
  const { toast } = useToast();
  const [isRepeating, setIsRepeating] = useState(false);
  const [cardioDialog, setCardioDialog] = useState<{ open: boolean; edit: ManualActivity | null }>({ open: false, edit: null });

  const handleRepeatPlan = async () => {
    const active = cycles.find((c) => c.status === 'active') || null;
    // Z86: dni zawsze z bieżącego planu; snapshot cyklu bywał stale i wskrzeszał stary plan.
    const source = repeatPlanSource(trainingPlan, planDurationWeeks, active);
    if (source.days.length === 0) return;
    setIsRepeating(true);
    const res = await startCycleWithPlan(source.days, source.durationWeeks, {
      lang,
      uid, currentPlan: trainingPlan, planStartDate, planDurationWeeks, workouts,
      archiveCurrentPlan, savePlan, createActiveCycle, backfillHistoricalWorkouts,
      emitPlanEvent: buildPlanEventEmitter(uid),
    });
    setIsRepeating(false);
    toast(res.success
      ? { title: t('cycles.repeatStarted') }
      : { title: t('cycles.repeatFailed'), variant: 'destructive' });
  };

  const [localDraft, setLocalDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Z217: kafle all-time z agregatu backendu (poprawne też przy >500 treningach);
  // brak/uszkodzony dokument = fallback na dotychczasowe liczenie z okna listenera.
  const aggregate = useWorkoutAggregate(uid);
  const completedCount = useMemo(
    () => aggregate?.totals.workoutCount ?? workouts.filter(w => w.completed).length,
    [aggregate, workouts],
  );
  const latestMeasurement = getLatestMeasurement();
  const totalWeight = aggregate?.totals.totalTonnageKg ?? getTotalWeight();

  const thisWeek = useMemo(() => {
    if (!planStartDate) return getScheduledTrainingWeek(trainingPlan, today, scheduleOverrides);
    const start = parseLocalDate(planStartDate);
    // Plan jeszcze nie wystartował → pokaż PIERWSZY tydzień planu (daty od startu) jako zapowiedź,
    // zamiast dat bieżącego tygodnia (które myliły jako "plan tygodnia").
    if (!planStarted) return getScheduledTrainingWeek(trainingPlan, start, scheduleOverrides);
    const week = getScheduledTrainingWeek(trainingPlan, today, scheduleOverrides);
    return week.filter(e => e.date >= start);
  }, [trainingPlan, today, planStartDate, planStarted, scheduleOverrides]);

  // Z216: streak z dat agregatu (pełna historia) TĄ SAMĄ funkcją co dotąd —
  // okno recent 120 przycinałoby długie serie; fallback z okna dla kont bez agregatu.
  const streakDetails = useMemo(() => {
    if (aggregate) {
      const dateWorkouts = aggregate.completedDates.map((date, i) => ({
        id: `agg-${i}`, userId: uid, dayId: '', date, completed: true, exercises: [],
      }));
      return calculateStreakDetails(dateWorkouts as typeof workouts);
    }
    return calculateStreakDetails(workouts);
  }, [aggregate, workouts, uid]);
  const streak = streakDetails.streak;
  // Tarcza uratowała poprzedni tydzień — pokaż to userowi, żeby wiedział, że seria wisi na włosku.
  const visibleCycles = useMemo(() => cycles
    .map(c => c.status === 'completed' ? withLiveCompletedStats(c, workouts) : c)
    .filter(isCycleVisibleWithData), [cycles, workouts]);
  const activeCycle = useMemo(() => visibleCycles.find(cycle => cycle.status === 'active') ?? null, [visibleCycles]);
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);
  const workoutToDay = useMemo(() => (workout: typeof workouts[number]): TrainingDay => {
    const label = resolver.resolveDayLabel(workout);
    return {
      id: workout.dayId,
      dayName: label.dayName,
      weekday: 'monday',
      focus: label.focus,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.exerciseId,
        name: resolver.resolveExerciseName(workout, exercise.exerciseId),
        sets: t('dash.setsCount', { n: exercise.sets.filter(set => !set.isWarmup).length }),
        instructions: [],
      })),
    };
  }, [resolver, t]);
  const previousCompletedCycle = useMemo(() => (
    visibleCycles
      .filter(cycle => cycle.status === 'completed')
      .sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ?? null
  ), [visibleCycles]);
  const currentPlanArchived = useMemo(() => (
    !activeCycle && !!planStartDate && visibleCycles.some(cycle => cycle.status === 'completed' && cycle.startDate === planStartDate)
  ), [activeCycle, visibleCycles, planStartDate]);
  // Jeden jawny stan "plan się skończył": wygasł czasowo LUB user zakończył go wcześniej.
  const planEnded = isPlanExpired || currentPlanArchived;

  // Karta przedłużenia ZAMIAST cichego auto-startu cyklu: plan wygasł >=7 dni temu,
  // user nic nie wybrał i nie zakończył planu jawnie — pytamy o zgodę.
  const [extendOfferDismissed, setExtendOfferDismissed] = useState(false);
  const extendOffer = useMemo(() => {
    // Z86: czekaj na ZAŁADOWANY plan i cykle. Oferta liczona na stale stanie
    // (iOS po wybudzeniu z tła) potrafiła wystartować cykl ze starymi danymi.
    if (!isLoaded || !planIsLoaded || !cyclesLoaded) return null;
    if (trainingPlan.length === 0 || !planStartDate || !uid || currentPlanArchived) return null;
    const plannedEnd = parseLocalDate(planStartDate).getTime() + planDurationWeeks * 7 * 86_400_000;
    const daysSinceEnd = Math.floor((Date.now() - plannedEnd) / 86_400_000);
    if (daysSinceEnd < 7) return null;
    const guardKey = `auto-extend:${uid}:${planStartDate}`;
    try {
      if (localStorage.getItem(guardKey)) return null;
    } catch {
      return null;
    }
    return { daysSinceEnd, guardKey };
  }, [isLoaded, planIsLoaded, cyclesLoaded, trainingPlan.length, planStartDate, uid, currentPlanArchived, planDurationWeeks]);

  const handleExtendPlan = async () => {
    if (!extendOffer) return;
    try { localStorage.setItem(extendOffer.guardKey, '1'); } catch { /* nieistotne */ }
    setExtendOfferDismissed(true);
    await handleRepeatPlan();
  };

  const dismissExtendOffer = () => {
    if (extendOffer) {
      try { localStorage.setItem(extendOffer.guardKey, '1'); } catch { /* nieistotne */ }
    }
    setExtendOfferDismissed(true);
  };
  const liveActiveCycle = useMemo(() => buildActiveCyclePreview(activeCycle, workouts, today), [activeCycle, today, workouts]);
  const planNextStep = useMemo(() => buildPlanNextStep({
    hasPlan: trainingPlan.length > 0,
    isPlanExpired: isPlanExpired || currentPlanArchived,
    weeksRemaining,
    currentWeek,
    planDurationWeeks,
    activeCycle: liveActiveCycle,
    previousCompletedCycle,
    today,
    lang,
    hasPendingFinalSync: !!localDraft?.finalSyncPending
      || pendingSyncCount > 0,
  }), [
    currentPlanArchived,
    currentWeek,
    isPlanExpired,
    lang,
    liveActiveCycle,
    localDraft?.finalSyncPending,
    pendingSyncCount,
    planDurationWeeks,
    previousCompletedCycle,
    today,
    trainingPlan.length,
    weeksRemaining,
  ]);

  // Dismissable "co dalej z planem?" card — hidden per plan (reappears when a new plan starts).
  const NEXT_STEP_DISMISS_KEY = 'fittracker_nextstep_dismissed';
  const planSignature = `${planStartDate || 'no-plan'}:${planNextStep?.primaryPath || 'none'}:${planNextStep?.title || 'none'}`;
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(() => {
    try { return localStorage.getItem(NEXT_STEP_DISMISS_KEY); } catch { return null; }
  });
  const showNextStep = !!planNextStep && dismissedSignature !== planSignature;
  const dismissNextStep = () => {
    setDismissedSignature(planSignature);
    try { localStorage.setItem(NEXT_STEP_DISMISS_KEY, planSignature); } catch { /* ignore */ }
  };

  // Z49: żywy draft = trening w toku. Decyzja wspólna z auto-resume (workout-resume.ts).
  const draftResume = useMemo(
    () => shouldResumeWorkoutDraft(localDraft, formatLocalDate(today), Date.now()),
    [localDraft, today],
  );

  // Determine today's training context
  // Runna p.1 (spec B2): partia z wczorajszej sesji dla tipów regeneracji.
  const yesterdayFocus = useMemo(() => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const key = formatLocalDate(yesterday);
    const workout = workouts.find(w => w.completed && w.date === key);
    return workout?.dayFocus ?? workout?.dayName ?? null;
  }, [workouts, today]);

  // Karta tygodnia (Runna p.1, spec B1): dzień/tydzień jako domykane jednostki
  // nad istniejącym odhaczaniem serii. Ad-hoc dokłada się do tonażu.
  const weekCardModel = useMemo(() => buildWeekCardModel({
    planDays: trainingPlan,
    today,
    scheduleOverrides,
    workouts,
    currentWeek,
    planDurationWeeks,
    planStarted,
    skippedDates,
  }), [trainingPlan, today, scheduleOverrides, workouts, currentWeek, planDurationWeeks, planStarted, skippedDates]);

  const todayTraining = useMemo(() => {
    const todayKey = formatLocalDate(today);
    const completedToday = findWorkoutForRoute(workouts, {
      date: todayKey,
      allowDateFallback: true,
    });
    if (completedToday?.completed) {
      return {
        type: 'completed' as const,
        day: workoutToDay(completedToday),
        workout: completedToday,
        dateStr: todayKey,
        // Naprawa r1 (2026-08-21): pełny wpis (day + dateKey) — hero najbliższej
        // sesji potrzebuje daty do otwarcia podglądu i przełożenia.
        next: getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides }),
      };
    }

    // T3 (feedback 2026-08-20): plan startuje w przyszłości — jawna karta pre-start
    // z datą startu i pierwszym treningiem. Szukamy OD dnia startu (dzień przed
    // startem + offset 1 w getNextScheduledTraining obejmuje sam dzień startu),
    // co naprawia też stary bug: nextDay liczony od DZIŚ wskazywał dzień sprzed startu.
    if (planStartDate && today < parseLocalDate(planStartDate)) {
      const dayBeforeStart = parseLocalDate(planStartDate);
      dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
      const firstEntry = getNextScheduledTraining(trainingPlan, dayBeforeStart, { overrides: scheduleOverrides });
      return { type: 'preStart' as const, startDateISO: planStartDate, firstEntry };
    }

    const todayEntry = getScheduledTrainingForDate(trainingPlan, today, scheduleOverrides);

    if (!todayEntry) {
      const nextEntry = getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides });
      return { type: 'rest' as const, next: nextEntry };
    }

    const day = todayEntry.day;
    // Primary match by dayId+date; fall back to ANY completed workout on today's date so a
    // session logged under a prior plan (different day.id / cycle) still counts as done today.
    const todayWorkout = findWorkoutForRoute(workouts, {
      dayId: day.id,
      date: todayEntry.dateKey,
      allowDateFallback: true,
      // Z173: guard daty jak w WorkoutDay — cross-day fallback tylko dla przeszłości.
      today: todayKey,
    });
    if (todayWorkout?.completed) {
      return {
        type: 'completed' as const,
        day,
        workout: todayWorkout,
        dateStr: todayEntry.dateKey,
        next: getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides }),
      };
    }
    return { type: 'training' as const, day, dayId: day.id, dateStr: todayEntry.dateKey };
  }, [trainingPlan, today, workouts, planStartDate, workoutToDay, scheduleOverrides]);

  // Przełożenie treningu (spec 2026-08-11): stan sheeta + handlery. Blokada
  // żywego draftu dnia źródłowego — komunikat zamiast otwarcia (spec, brzeg 2).
  const [rescheduleFrom, setRescheduleFrom] = useState<string | null>(null);
  const todayISO = formatLocalDate(today);
  const openReschedule = (fromDateISO: string, dayId: string) => {
    if (isDraftContinuableToday(localDraft, fromDateISO) && localDraft.dayId === dayId) {
      toast({ title: t('reschedule.draftBlocked'), variant: 'destructive' });
      return;
    }
    setRescheduleFrom(fromDateISO);
  };
  // Naprawa r1 (2026-08-21, sędzia struktury): hero najbliższej sesji dla stanów
  // rest/completed — mockup dashboard-simplified pokazuje kartę NEXT SESSION
  // z CTA i przełożeniem także, gdy dziś nie ma treningu do zrobienia.
  const renderNextSessionHero = (entry: ScheduledTrainingDay) => (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-container p-5" data-testid="next-session-hero">
      <span className="eyebrow-mono text-primary">
        {t('dash.hero.next')} · {parseLocalDate(entry.dateKey).toLocaleDateString(dateLocale(lang), { weekday: 'long' })}
      </span>
      <h2 className="min-w-0 font-heading text-[27px] font-bold leading-none tracking-tight">
        {localizeDayName(entry.day.dayName, lang)}
      </h2>
      <p className="text-sm text-muted-foreground">
        {localizeFocus(entry.day.focus, lang)} · {t('dash.exercisesCount', { n: entry.day.exercises.length })}
      </p>
      <Button
        size="lg"
        className="mt-0.5 h-14 w-full gap-1.5 rounded-2xl text-base font-semibold"
        onClick={() => navigate(`/workout/${entry.day.id}?date=${entry.dateKey}`)}
      >
        <Play className="h-4 w-4" />
        {t('dash.hero.openSession')}
      </Button>
      <div className="flex items-center justify-center">
        <button
          type="button"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => openReschedule(entry.dateKey, entry.day.id)}
        >
          {t('reschedule.action')}
        </button>
      </div>
    </div>
  );

  // Runna p.1 (spec C1): jawne Pomiń/Przywróć — odwracalne, ton neutralny.
  const handleToggleSkip = async (dateISO: string) => {
    const skipped = skippedDates.includes(dateISO);
    const result = await setDaySkipped(dateISO, !skipped);
    if (result.success) {
      toast({ title: skipped ? t('skipday.toastRestored') : t('skipday.toastSkipped') });
    }
  };

  // Tray zaległości (Runna p.1, spec C2): odrzucenie zapamiętane per zaległość,
  // detekcja milczy przy żywym drafcie (user jest w trakcie sesji).
  const [lapseDismissed, setLapseDismissed] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('fittracker_lapse_dismissed_v1');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const lapse = useMemo(() => {
    if (!planStarted || !isLoaded || !planIsLoaded || localDraft) return null;
    return detectLapse({
      planDays: trainingPlan,
      overrides: scheduleOverrides,
      workouts,
      todayISO,
      skippedDates,
      planStartDate,
      dismissed: lapseDismissed,
      reducedMode,
      vacation,
    });
  }, [planStarted, isLoaded, planIsLoaded, localDraft, trainingPlan, scheduleOverrides, workouts, todayISO, skippedDates, planStartDate, lapseDismissed, reducedMode, vacation]);
  const [lapseOpen, setLapseOpen] = useState(false);
  const rememberLapseDismiss = (key: string) => {
    const next = [...lapseDismissed, key].slice(-50);
    setLapseDismissed(next);
    try { window.localStorage.setItem('fittracker_lapse_dismissed_v1', JSON.stringify(next)); } catch { /* noop */ }
  };
  // Zamknięcie (X albo po akcji) = odrzucenie zapamiętane; po akcji trigger
  // i tak znika, więc wpis jest nieszkodliwy. Sheet domykamy PRZED mutacją.
  const handleLapseOpenChange = (open: boolean) => {
    if (!open && lapse) rememberLapseDismiss(lapse.dismissKey);
    setLapseOpen(open);
  };
  const handleLapseSkip = (dateISO: string) => {
    handleLapseOpenChange(false);
    void handleToggleSkip(dateISO);
  };
  const handleLapseMove = (dateISO: string) => {
    handleLapseOpenChange(false);
    setRescheduleFrom(dateISO);
  };
  const handleLapseContinue = () => {
    handleLapseOpenChange(false);
    const dates = collectLapsedDates({
      planDays: trainingPlan,
      overrides: scheduleOverrides,
      workouts,
      todayISO,
      skippedDates,
      planStartDate,
      reducedMode,
    });
    void (async () => {
      const result = await skipPastDates(dates);
      if (result.success) toast({ title: t('lapse.toastContinued') });
    })();
  };

  // Tryb "nie na 100%" (spec C3): dialog + badge; wejścia z traya i badge'a.
  const [reducedModeOpen, setReducedModeOpen] = useState(false);
  const handleLapseReducedMode = () => {
    handleLapseOpenChange(false);
    setReducedModeOpen(true);
  };
  const handleReducedModeEnable = (level: ReducedModeLevel, days: number) => {
    setReducedModeOpen(false);
    const mode = buildReducedMode(level, days, todayISO);
    void (async () => {
      const result = await setReducedMode(mode);
      if (result.success) {
        const endLabel = parseLocalDate(mode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });
        toast({ title: t('rmode.toastOn', { date: endLabel }) });
      }
    })();
  };
  const handleReducedModeDisable = () => {
    setReducedModeOpen(false);
    void (async () => {
      const result = await setReducedMode(null);
      if (result.success) toast({ title: t('rmode.toastOff') });
    })();
  };

  // Tryb urlopu (spec C4): dialog + badge; kolizja z C3 rozstrzygana w dialogach.
  const [vacationOpen, setVacationOpen] = useState(false);
  const handleVacationEnable = (startISO: string, days: number, activity: VacationActivity) => {
    setVacationOpen(false);
    const mode = buildVacationMode(startISO, days, activity);
    void (async () => {
      const result = await setVacation(mode);
      if (result.success) {
        const fmtDate = (iso: string) => parseLocalDate(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });
        toast({ title: t('vac.toastOn', { from: fmtDate(mode.startDate), to: fmtDate(mode.endDate), weeks: mode.extendedWeeks }) });
      }
    })();
  };
  const handleVacationCancel = () => {
    setVacationOpen(false);
    void (async () => {
      const result = await setVacation(null);
      if (result.success) toast({ title: t('vac.toastOff') });
    })();
  };
  const handleRescheduleSelect = async (toDateISO: string) => {
    const fromDateISO = rescheduleFrom;
    if (!fromDateISO) return;
    // NAJPIERW kontrolowane zamknięcie sheeta, POTEM zapis — zapis podmienia
    // overrides i dzień źródłowy znika z resolvera, a otwarty Radix Sheet nie
    // może być odmontowany w stanie open (wiszący scroll-lock, regresja b.92).
    setRescheduleFrom(null);
    const result = await moveScheduledDay(fromDateISO, toDateISO);
    toast(result.success
      ? { title: t(result.swapped ? 'reschedule.swapped' : 'reschedule.moved') }
      : { title: t('reschedule.failed'), variant: 'destructive' });
  };
  const handleMissedDoToday = async (fromDateISO: string) => {
    const result = await moveScheduledDay(fromDateISO, todayISO);
    toast(result.success
      ? { title: t(result.swapped ? 'reschedule.swapped' : 'reschedule.moved') }
      : { title: t('reschedule.failed'), variant: 'destructive' });
  };

  // Z174: JEDNA prawda o aktywnej sesji. Gdy karta dnia pokazuje CTA kontynuacji,
  // baner sync degraduje się do wiersza informacyjnego (bez drugiego przycisku).
  // Licznik serii wspólny z ekranem treningu (bez rozgrzewki).
  const todayContinueDraft = useMemo(() => (
    todayTraining.type === 'training'
    && isDraftContinuableToday(localDraft, todayTraining.dateStr)
    && localDraft.dayId === todayTraining.dayId
      ? {
        target: continuableDraftTarget(localDraft),
        completedSets: countCompletedWorkingSets(localDraft.exerciseSets),
      }
      : null
  ), [todayTraining, localDraft]);

  // Apple Watch: podgląd dzisiejszego planu na zegarku zanim sesja wystartuje.
  useWatchPlanPreview({
    uid,
    type: todayTraining.type,
    day: todayTraining.type === 'training' ? todayTraining.day : null,
    dateStr: todayTraining.type === 'training' ? todayTraining.dateStr : undefined,
    workouts,
    capability: watchCapability,
  });

  // Calculate trends (last 4 weeks vs previous 4 weeks)

  // Weekly Strava km counter (Mon-Sun) — logika w activity-window (Z214, test fixture >500).

  // Greeting
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? t('dash.greeting.morning') : hour < 18 ? t('dash.greeting.day') : t('dash.greeting.evening');
  const GreetingIcon = hour < 18 ? Sun : Moon;
  const displayName = profile?.displayName?.split(' ')[0] || t('dash.defaultName');
  const formattedDate = new Date().toLocaleDateString(dateLocale(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleFocus);
    };
  }, [uid]);

  // Day focus descriptions

  // Z172: czekamy TAKŻE na plan usera — bez tego Dashboard renderował wbudowany
  // defaultPlan ("Klatka / Przysiad / Środek Pleców") zanim doszedł snapshot planu.
  // Spinner nie zawiśnie: oba isLoaded są ustawiane również w error-handlerach
  // (workout-read-store.ts:156 i useTrainingPlan — handler błędu snapshotu).
  if (!isLoaded || !planIsLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{t('dash.error')}: {error}</p>
      </div>
    );
  }

  // PRO-E T2: banery stanu w jednym slocie priorytetowym. Warunki i JSX 1:1
  // z dotychczasowych bloków — zmienia się wyłącznie miejsce renderu.
  const statusEntries: StatusEntry[] = [];
  if ((localDraft && (localDraft.dirty || localDraft.finalSyncPending || localDraft.sessionOrigin === 'provisional')) || pendingSyncCount > 0) {
    statusEntries.push({
      id: 'offline-sync', priority: 100, node: (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CloudOff className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">
                  {localDraft?.finalSyncPending
                    ? t('dash.sync.finishedLocally')
                    : localDraft?.sessionOrigin === 'provisional'
                      ? t('dash.sync.startedOffline')
                      : pendingSyncCount > 0
                        ? t('dash.sync.queued', { n: pendingSyncCount })
                        : t('dash.sync.localChanges')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {localDraft?.finalSyncPending
                    ? t('dash.sync.finishedLocally.desc')
                    : localDraft?.sessionOrigin === 'provisional'
                      ? t('dash.sync.startedOffline.desc')
                      : pendingSyncCount > 0
                        ? t('dash.sync.queued.desc')
                        : t('dash.sync.localChanges.desc')}
                </p>
              </div>
            </div>
            {/* Z174: gdy karta dnia ma CTA kontynuacji, baner nie dubluje przycisku
                (zostaje sam status); wariant "Otwórz Sync Center" zawsze zostaje. */}
            {todayContinueDraft && draftResume.resume ? null : (
              <Button
                variant="outline"
                onClick={() => navigate(draftResume.resume ? draftResume.target : '/settings')}
              >
                {draftResume.resume ? t('dash.today.continue') : t('dash.sync.openCenter')}
              </Button>
            )}
          </CardContent>
        </Card>
      ),
    });
  }
  if (lapse) {
    statusEntries.push({
      id: 'lapse', priority: 90, node: (
        <LapseStatusCard
          lapse={lapse}
          onOpen={() => setLapseOpen(true)}
          onDismiss={() => rememberLapseDismiss(lapse.dismissKey)}
        />
      ),
    });
  }
  if (isVacationActive(vacation, todayISO) && vacation) {
    statusEntries.push({
      id: 'vacation', priority: 80, node: (
        <button
          type="button"
          data-testid="vacation-badge"
          onClick={() => setVacationOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-left text-sm font-semibold text-primary"
        >
          <span>
            {t('vac.badge', {
              date: parseLocalDate(vacation.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' }),
            })}
          </span>
          <span className="text-xs font-normal underline underline-offset-2">{t('vac.cancel')}</span>
        </button>
      ),
    });
  }
  if (isReducedModeActive(reducedMode, todayISO) && reducedMode) {
    statusEntries.push({
      id: 'reduced', priority: 70, node: (
        <button
          type="button"
          data-testid="rmode-badge"
          onClick={() => setReducedModeOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-fitness-warning bg-fitness-warning/10 px-4 py-2.5 text-left text-sm font-semibold text-fitness-warning"
        >
          <span>
            {t('rmode.badge', {
              date: parseLocalDate(reducedMode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' }),
            })}
          </span>
          <span className="text-xs font-normal underline underline-offset-2">{t('rmode.disable')}</span>
        </button>
      ),
    });
  }
  if (extendOffer && !extendOfferDismissed) {
    statusEntries.push({
      id: 'plan-ended', priority: 60, node: (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-heading font-bold">{t('dash.extend.title')}</p>
              <p className="text-sm text-muted-foreground">{t('dash.extend.desc', { n: extendOffer.daysSinceEnd })}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button onClick={handleExtendPlan} disabled={isRepeating}>
                {isRepeating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('dash.extend.confirm')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/new-plan')}>{t('dash.extend.newPlan')}</Button>
              <Button variant="ghost" size="icon" onClick={dismissExtendOffer} aria-label={t('common.cancel')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ),
    });
  }

  return (
    <div className="space-y-6">
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
      {/* T4: zawsze zamontowany — widoczność wyłącznie przez open (pułapka Radix:
          unmount otwartego dialogu zostawia scroll-lock na body). */}
      <ConfirmDialog
        open={measurePromptOpen}
        onOpenChange={setMeasurePromptOpen}
        title={t('dash.measurePrompt.title')}
        description={t('dash.measurePrompt.desc')}
        confirmLabel={t('dash.measurePrompt.confirm')}
        cancelLabel={t('dash.measurePrompt.decline')}
        onConfirm={() => navigate('/measurements')}
      />
      <AllTimeStatsSheet open={statsOpen} onOpenChange={setStatsOpen} workouts={workouts} uid={uid} />
      {/* Greeting (fala 2): ikona pory dnia w akcencie (warning był ozdobny,
          nie semantyczny — reguła "jeden akcent") + chip streaka przy dacie.
          Naprawa r2 (2026-08-21): bez italica (Space Grotesk nie ma kroju italic,
          tokens.md ryzyko 4 — silnik syntezował faux oblique); "!" w spanie
          imienia, bo gap-2 flexa robił szczelinę przed wykrzyknikiem. */}
      <div data-testid="dash-greeting">
        <h1 className="text-2xl font-heading font-bold uppercase flex items-center gap-2 tracking-tight">
          <GreetingIcon className="h-6 w-6 text-primary" />
          {greetingText}, <span className="text-primary">{displayName}!</span>
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
          {streak > 0 && (
            <span
              data-testid="dash-streak-chip"
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-primary"
            >
              <Flame className="h-3 w-3" aria-hidden />
              {t('dash.streakChip', { n: streak })}
            </span>
          )}
        </div>
      </div>

      {/* Fala 2: baner decyzji planu NAD hero (mockup "Plan ends / Decide");
          wariant banner rozwija komplet akcji inline, emisja eventu bez zmian. */}
      {showNextStep && planNextStep && (
        <PlanNextStepCard
          step={planNextStep}
          uid={uid}
          planStartDate={planStartDate}
          canRepeat={trainingPlan.length > 0}
          isRepeating={isRepeating}
          onRepeat={handleRepeatPlan}
          onDismiss={dismissNextStep}
          testId="dash-next-step"
          variant="banner"
        />
      )}

      {/* Today's training card (PRO-E T3: hero zaraz pod powitaniem; typ zawsze
          jednym z training/completed/rest/preStart, więc wrapper nigdy nie jest pusty) */}
      <div data-testid="dash-hero">
      {todayTraining.type === 'training' && (() => {
        // Z88: KAŻDY nieukończony dzisiejszy szkic = "Kontynuuj trening", także w pełni
        // zsynchronizowany (dirty=false). Auto-nawigacja (Z49) celowo zostaje ostrzejsza.
        // Z174: decyzja i licznik we wspólnym memo (todayContinueDraft) — koniec
        // rozjazdu banera, karty dnia i ekranu treningu.
        const continueDraft = todayContinueDraft;
        return (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-container p-5">
          <span className="eyebrow-mono text-primary">
            {t('dash.hero.today')} · {today.toLocaleDateString(dateLocale(lang), { weekday: 'long' })}
          </span>
          <h2 className="min-w-0 font-heading text-[27px] font-bold leading-none tracking-tight">
            {localizeDayName(todayTraining.day.dayName, lang)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {continueDraft
              ? t('dash.today.continueSets', { n: continueDraft.completedSets })
              : `${localizeFocus(todayTraining.day.focus, lang)} · ${t('dash.exercisesCount', { n: todayTraining.day.exercises.length })}`}
          </p>
          <Button
            size="lg"
            className="mt-0.5 h-14 w-full gap-1.5 rounded-2xl text-base font-semibold"
            onClick={() => navigate(continueDraft
              ? continueDraft.target
              : `/workout/${todayTraining.dayId}?date=${todayTraining.dateStr}&autostart=true`)}
          >
            <Play className="h-4 w-4" />
            {continueDraft ? t('dash.today.continue') : t('dash.startWorkout')}
          </Button>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => navigate('/day')}
            >
              {t('dash.details')}
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => openReschedule(todayTraining.dateStr, todayTraining.dayId)}
            >
              {t('reschedule.action')}
            </button>
          </div>
        </div>
        );
      })()}

      {todayTraining.type === 'completed' && (
        <>
        <div
          data-testid="today-completed-card"
          className={cn(
            'flex flex-col gap-2 rounded-xl border border-fitness-success/40 bg-fitness-success/10 p-5',
            completionHighlight && 'ring-2 ring-fitness-success/50',
          )}
        >
          <div className="flex items-center gap-2 text-fitness-success">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{t('dash.workoutCompleted')}</p>
          </div>
          <h2 className="min-w-0 font-heading text-[27px] font-bold leading-none tracking-tight">
            {localizeDayName(todayTraining.day.dayName, lang)}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => navigate(buildWorkoutRoute(todayTraining.workout, todayTraining.day.id))}
          >
            {t('dash.view')}
          </Button>
        </div>
        {/* Naprawa r1 (2026-08-21, sędzia struktury): mockup dashboard-simplified
            pokazuje hero NEXT SESSION także po zrobionym treningu — karta
            najbliższej sesji z CTA podglądu i przełożeniem. */}
        {todayTraining.next && renderNextSessionHero(todayTraining.next)}
        </>
      )}

      {/* T3 (feedback 2026-08-20): cykl jeszcze nie wystartował — karta z datą
          startu (z dniem tygodnia) i pierwszym treningiem zamiast pustej regeneracji. */}
      {todayTraining.type === 'preStart' && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-container p-5" data-testid="prestart-card">
          <span className="eyebrow-mono text-primary">{t('dash.hero.planStarts')}</span>
          <p className="min-w-0 font-heading text-xl font-bold leading-tight tracking-tight">
            {t('dash.preStart.title', {
              date: parseLocalDate(todayTraining.startDateISO).toLocaleDateString(dateLocale(lang), {
                weekday: 'long', day: 'numeric', month: 'long',
              }),
            })}
          </p>
          {todayTraining.firstEntry && (
            <p className="text-sm text-muted-foreground">
              {t('dash.preStart.firstWorkout', {
                day: `${localizeDayName(todayTraining.firstEntry.day.dayName, lang)} (${localizeFocus(todayTraining.firstEntry.day.focus, lang)}) · ${parseLocalDate(todayTraining.firstEntry.dateKey).toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}`,
              })}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-1 self-start" onClick={() => navigate('/plan')}>
            {t('dash.preStart.viewPlan')}
          </Button>
        </div>
      )}

      {/* Runna p.1 (spec B2): dzień wolny to karta regeneracji z treścią,
          nie pusty ekran — tip pod partię z WCZORAJSZEJ sesji + tip ogólny.
          Naprawa r1 (2026-08-21): nad regeneracją hero najbliższej sesji
          (mockup: NEXT SESSION z CTA nawet w dzień wolny). */}
      {todayTraining.type === 'rest' && (
        <>
        {todayTraining.next && renderNextSessionHero(todayTraining.next)}
        <div className="rounded-xl bg-surface-low p-5" data-testid="recovery-card">
          <p className="flex items-center gap-1.5 font-heading text-base font-bold tracking-tight">
            {t('dash.recovery.title')}
            <Leaf className="h-4 w-4 text-muted-foreground" aria-hidden />
          </p>
          <ul className="mt-1.5 space-y-1">
            {recoveryTipKeys(yesterdayFocus).map((key) => (
              <li key={key} className="text-xs text-muted-foreground">{t(key)}</li>
            ))}
          </ul>
        </div>
        </>
      )}

      </div>

      {/* PRO-E T2/T3: slot stanu za kartą dnia */}
      <DashboardStatusSlot entries={statusEntries} />

      {/* D-T2: kontekstowe banery AKCJI (samo-ukrywające) zaraz pod slotem statusu. */}
      {planStarted && (
        <MissedWorkoutBanner
          planDays={trainingPlan}
          overrides={scheduleOverrides}
          workouts={workouts}
          todayISO={todayISO}
          planStartDate={planStartDate}
          skippedDates={skippedDates}
          onDoToday={handleMissedDoToday}
          onReschedule={(fromDateISO) => setRescheduleFrom(fromDateISO)}
        />
      )}

      {/* Karta tygodnia (Runna p.1, spec B1): checkmarki dni + pasek sesji + tonaż.
          Spec C4: przerwa urlopowa pełni rolę deloadu (nie dubluje się). */}
      <WeekCard
        model={weekCardModel}
        isDeloadWeek={progression ? resolveDeloadWeek(currentWeek, progression, vacation, planStartDate) : false}
        todayDoneDayName={todayTraining.type === 'completed'
          ? localizeDayName(todayTraining.day.dayName, lang)
          : undefined}
      />

      {/* T5: cardio bieżącego tygodnia (Strava + manual) POZA warunkiem
          planStarted — biegi widać także zanim cykl wystartuje. */}
      <WeekCardioCard
        activities={unifiedActivities}
        stravaConnected={stravaConnection.connected}
        weekStartStr={activityWindowStart}
        weekEndStr={activityWindowEnd}
        maxHR={stravaConnection.estimatedMaxHR}
        onEditManual={(activity) => setCardioDialog({ open: true, edit: activity })}
      />


      {/* Z104 szybki trening + Z112 ręczne cardio + fala 2: grid 2x2 szybkich
          akcji (mockup "tray"). Kafle 3-4 przywracają wejścia: "Twoje liczby"
          (X17D Z139.4) i Analitykę (dawny pełnowymiarowy przycisk). Ochrona
          niezmiennika reguły #5: ad-hoc DOKŁADA, nie podmienia. */}
      <div data-testid="dash-actions" className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-surface-low px-3.5 py-3 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-surface-high"
          onClick={() => {
            const adhocDay = createAdhocDay(formatLocalDate(today), (key) => t(key as Parameters<typeof t>[0]));
            navigate(`/workout/${adhocDay.id}?date=${formatLocalDate(today)}&autostart=true`);
          }}
          data-testid="quick-workout-start"
        >
          <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
          {t('adhoc.start')}
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-surface-low px-3.5 py-3 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-surface-high"
          onClick={() => setCardioDialog({ open: true, edit: null })}
          data-testid="add-cardio-open"
        >
          <HeartPulse className="h-4 w-4 shrink-0 text-muted-foreground" />
          {t('cardio.addButton')}
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-surface-low px-3.5 py-3 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-surface-high"
          onClick={() => setStatsOpen(true)}
          data-testid="dash-your-numbers"
        >
          <Weight className="h-4 w-4 shrink-0 text-muted-foreground" />
          {t('stats.title')}
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-surface-low px-3.5 py-3 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-surface-high"
          onClick={() => navigate('/achievements?view=analytics&tab=summary')}
          data-testid="dash-analytics"
        >
          <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
          {t('layout.title.analytics')}
        </button>
      </div>

      {/* PRO-E T3: upsell zepchnięty pod szybkie akcje */}
      <ProUpsellBanner />

      {/* D-T2: dokładnie JEDEN insight — raport tygodnia (target vs actual). */}
      {planStarted && (
        <WeekReportCard
          planDays={trainingPlan}
          workouts={workouts}
          currentWeek={currentWeek}
          planStartDate={planStartDate}
          progression={progression}
        />
      )}

      <AddCardioDialog
        open={cardioDialog.open}
        onOpenChange={(open) => setCardioDialog((prev) => ({ ...prev, open }))}
        editActivity={cardioDialog.edit}
        onAdd={addActivity}
        onUpdate={updateActivity}
        onDelete={deleteActivity}
      />

      <RescheduleSheet
        open={rescheduleFrom !== null}
        onOpenChange={(open) => { if (!open) setRescheduleFrom(null); }}
        fromDateISO={rescheduleFrom}
        planDays={trainingPlan}
        overrides={scheduleOverrides}
        onSelect={handleRescheduleSelect}
        todayISO={todayISO}
      />

      {/* Tray zaległości (Runna p.1, spec C2) */}
      <LapseTray
        open={lapseOpen && lapse !== null}
        onOpenChange={handleLapseOpenChange}
        lapse={lapse}
        onSkip={handleLapseSkip}
        onMove={handleLapseMove}
        onContinueToday={handleLapseContinue}
        onReducedMode={handleLapseReducedMode}
      />

      {/* Tryb "nie na 100%" (Runna p.1, spec C3) */}
      <ReducedModeDialog
        open={reducedModeOpen}
        onOpenChange={setReducedModeOpen}
        mode={reducedMode}
        todayISO={todayISO}
        onEnable={handleReducedModeEnable}
        onDisable={handleReducedModeDisable}
        blockedLabel={vacation ? t('rmode.blockedByVacation') : undefined}
      />

      {/* Tryb urlopu (Runna p.1, spec C4) */}
      <VacationDialog
        open={vacationOpen}
        onOpenChange={setVacationOpen}
        vacation={vacation}
        reducedModeActive={isReducedModeActive(reducedMode, todayISO)}
        todayISO={todayISO}
        onEnable={handleVacationEnable}
        onCancel={handleVacationCancel}
      />
    </div>
  );
};

export default Dashboard;
