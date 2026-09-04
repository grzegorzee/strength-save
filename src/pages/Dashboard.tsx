import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProUpsellBanner } from '@/components/ProUpsellBanner';
import { Flame, Sun, Moon, CheckCircle, Play, CloudOff, X, RefreshCw, Loader2, Zap, HeartPulse, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useToday } from '@/hooks/useToday';
import { useToast } from '@/hooks/use-toast';
import { endPlan, repeatPlanSource, runCycleAutoRepair, shouldAutoEndPlan, startCycleWithPlan } from '@/lib/cycle-actions';
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
import { isCompletedWorkout, selectCompletedWorkouts } from '@/lib/completed-workouts';
import { calculateStreakDetails, calculateTonnage, getWeekBounds, streakDetailsFromDates } from '@/lib/summary-utils';
import { RescheduleSheet } from '@/components/RescheduleSheet';
import { cn, formatLocalDate, formatLocalDateLabel, parseLocalDate } from '@/lib/utils';
import { getNextScheduledTraining, getScheduledTrainingForDate, getScheduledTrainingWeek, getStartOfPlanWeek, weekdayOfDate, type ScheduledTrainingDay } from '@/lib/plan-schedule';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { continuableDraftTarget, isDraftContinuableToday, shouldResumeWorkoutDraft } from '@/lib/workout-resume';
import { useWatchPlanPreview } from '@/hooks/useWatchPlanPreview';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';
import { isRevisionConflictError } from '@/lib/workout-sync-conflict';
import { CloudPendingIndicator } from '@/components/CloudPendingIndicator';
import { buildActiveCyclePreview, withLiveCompletedStats } from '@/lib/cycle-insights';
import { buildPlanNextStep } from '@/lib/plan-next-step';
import { PlanNextStepCard } from '@/components/PlanNextStepCard';
import { PreStartCard } from '@/components/PreStartCard';
import { buildPreStartInfo } from '@/lib/plan-prestart';
import { buildWorkoutRoute, findWorkoutForRoute } from '@/lib/workout-lookup';
import { countCompletedWorkingSets } from '@/lib/workout-day-view';
import { createAdhocDay } from '@/lib/adhoc-workout';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { displayDayNameForDate, localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';
import { isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import { useSubscription } from '@/hooks/useSubscription';
import { buildWatchCapabilitySnapshot } from '@/lib/device-management';
import { markStartup } from '@/lib/startup-performance';
import { PostPlanGuide } from '@/components/PostPlanGuide';
import { isPostPlanGuideSeen } from '@/lib/post-plan-guide';
import { useHealthConsent } from '@/hooks/useHealthConsent';

// WP-B (X28): before-start z silnika przełożeń to NIE blokada ukończonym
// treningiem — toast generyczny zamiast mylącego completedBlocked.
const isCompletedMoveReason = (reason?: string) => reason === 'completed-source' || reason === 'completed-target';

const Dashboard = () => {
  const navigate = useNavigate();
  const healthConsent = useHealthConsent();
  const [searchParams, setSearchParams] = useSearchParams();
  // Confetti tylko po ukończeniu onboardingu (?welcome=1). Po treningu
  // (?celebrate=1) zostaje highlight karty + „+1" w headerze — confetti należy
  // do sekwencji completion i tylko dla PR/kamieni milowych (PRO-C T3).
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
    if (searchParams.get('welcome') === '1' || searchParams.get('celebrate') === '1' || searchParams.get('guide') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('welcome');
      next.delete('celebrate');
      next.delete('guide');
      setSearchParams(next, { replace: true }); // czyść URL, żeby odświeżenie nie powtarzało confetti
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { t, lang } = useTranslation();
  const { uid, profile, isAdmin, canUseStrava } = useCurrentUser();
  const [postPlanGuideMode, setPostPlanGuideMode] = useState<'welcome' | 'replay' | null>(() => {
    if (searchParams.get('guide') === '1') return 'replay';
    if (searchParams.get('welcome') === '1' && !isPostPlanGuideSeen(uid)) return 'welcome';
    return null;
  });
  const subscription = useSubscription();
  const watchCapability = subscription.loading
    ? undefined
    : buildWatchCapabilitySnapshot(subscription);
  const {
    workouts,
    getLatestMeasurement,
    isLoaded,
    error,
    backfillHistoricalWorkouts
  } = useFirebaseWorkouts(uid, { measurements: 'latest', workouts: 'recent' });
  const { plan: trainingPlan, planName, isLoaded: planIsLoaded, isCustom: hasCustomPlan, planError, hasServerSnapshot: planFromServer, isPlanExpired, currentWeek, planDurationWeeks, weeksRemaining, planStartDate, planStarted, savePlan, progression, saveDeloadDecision, scheduleOverrides, moveScheduledDay, skippedDates, setDaySkipped, skipPastDates, reducedMode, setReducedMode, vacation, setVacation, planStatus, setPlanStatus } = useTrainingPlan(uid);
  // WP-PLANS-1 (X27): jawny stan "plan zakończony" z dokumentu — Dashboard nie
  // planuje niczego z martwego planu.
  const planEndedByStatus = planStatus === 'ended';
  useEffect(() => {
    if (isLoaded && planIsLoaded) markStartup('dashboard-interactive');
  }, [isLoaded, planIsLoaded]);
  // T4: popup pomiarów tylko dla usera BEZ żadnego pomiaru (stały user wracający
  // przez redirect /onboarding -> /?welcome=1 go nie zobaczy).
  useEffect(() => {
    if (!wantsMeasurePrompt.current || !isLoaded || postPlanGuideMode !== null) return;
    wantsMeasurePrompt.current = false;
    if (!getLatestMeasurement()) setMeasurePromptOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, postPlanGuideMode]);
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
  const { cycles, isLoaded: cyclesLoaded, hasServerSnapshot: cyclesFromServer, archiveCurrentPlan, createActiveCycle } = usePlanCycles(uid);
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
      ...(planStatus !== 'none' ? { planStatus } : {}),
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
  // WP-C (X38): kolejka ma wpis trwały (permission/not-found) albo konflikt.
  const [syncNeedsAttention, setSyncNeedsAttention] = useState(false);
  // Dismiss dotyczy dokładnego zestawu wpisów, nie samej ich liczby. Inaczej
  // nowy permanent error przy count=1 mógł zostać ukryty przez dismiss starego.
  const [syncQueueSignature, setSyncQueueSignature] = useState('empty');

  // Pełny agregat jest nadal potrzebny do obliczenia streaka poza oknem
  // ostatnio załadowanych treningów.
  const aggregate = useWorkoutAggregate(uid);

  const thisWeek = useMemo(() => {
    if (!planStartDate) return getScheduledTrainingWeek(trainingPlan, today, scheduleOverrides);
    const start = parseLocalDate(planStartDate);
    // Plan jeszcze nie wystartował → pokaż PIERWSZY tydzień planu (daty od startu) jako zapowiedź,
    // zamiast dat bieżącego tygodnia (które myliły jako "plan tygodnia").
    // WP-B (X28): startDateISO w resolverze tygodnia — dni sprzed startu nie istnieją.
    if (!planStarted) return getScheduledTrainingWeek(trainingPlan, start, scheduleOverrides, planStartDate);
    return getScheduledTrainingWeek(trainingPlan, today, scheduleOverrides, planStartDate);
  }, [trainingPlan, today, planStartDate, planStarted, scheduleOverrides]);

  // Z216: streak z dat agregatu (pełna historia) TĄ SAMĄ funkcją co dotąd —
  // okno recent 120 przycinałoby długie serie; fallback z okna dla kont bez agregatu.
  const streakDetails = useMemo(() => {
    if (aggregate) {
      return streakDetailsFromDates(aggregate.completedDates);
    }
    return calculateStreakDetails(selectCompletedWorkouts(workouts));
  }, [aggregate, workouts]);
  const streak = streakDetails.streak;
  // Tarcza uratowała poprzedni tydzień — pokaż to userowi, żeby wiedział, że seria wisi na włosku.
  const visibleCycles = useMemo(() => cycles
    .map(c => c.status === 'completed' ? withLiveCompletedStats(c, workouts, { scheduleOverrides }) : c)
    .filter(isCycleVisibleWithData), [cycles, workouts, scheduleOverrides]);
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
    // WP-PLANS-1 (X27): plan zakończony (status ended) nie dostaje oferty przedłużenia.
    if (trainingPlan.length === 0 || !planStartDate || !uid || currentPlanArchived || planEndedByStatus) return null;
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
  }, [isLoaded, planIsLoaded, cyclesLoaded, trainingPlan.length, planStartDate, uid, currentPlanArchived, planEndedByStatus, planDurationWeeks]);

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
  const liveActiveCycle = useMemo(
    () => buildActiveCyclePreview(activeCycle, workouts, today, { scheduleOverrides }),
    [activeCycle, today, workouts, scheduleOverrides],
  );
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
    planStatus,
  }), [
    currentPlanArchived,
    currentWeek,
    isPlanExpired,
    lang,
    liveActiveCycle,
    localDraft?.finalSyncPending,
    pendingSyncCount,
    planDurationWeeks,
    planStatus,
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

  // WP-B (X28): zamykany baner "Trening ukończony" — X chowa go do końca dnia
  // (wartość = ostatnio zamknięta data), nowy dzień z nowym ukończonym treningiem
  // pokazuje go znowu. localStorage niedostępny => działa bez zapamiętania.
  const COMPLETED_DISMISS_KEY = 'fittracker_completed_dismissed_v1';
  const [completedDismissedDate, setCompletedDismissedDate] = useState<string | null>(() => {
    try { return localStorage.getItem(COMPLETED_DISMISS_KEY); } catch { return null; }
  });
  const completedBannerDismissed = completedDismissedDate === formatLocalDate(today);
  const dismissCompletedBanner = () => {
    const key = formatLocalDate(today);
    setCompletedDismissedDate(key);
    try { localStorage.setItem(COMPLETED_DISMISS_KEY, key); } catch { /* nieistotne */ }
  };

  // Dismiss dotyczy konkretnego komunikatu, a nie danych ani kolejki. Zmiana
  // sesji/stanu/pending count tworzy nową sygnaturę i ważny status wraca.
  const SYNC_NOTICE_DISMISS_KEY = 'fittracker_sync_notice_dismissed_v1';
  const [dismissedSyncNotice, setDismissedSyncNotice] = useState<string | null>(() => {
    try { return localStorage.getItem(SYNC_NOTICE_DISMISS_KEY); } catch { return null; }
  });

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
    // WP-PLANS-1 (X27): plan zakończony — żadnego planowania z martwego planu
    // (hero NEXT SESSION znika, watch preview dostaje noWorkout przez type rest).
    if (planEndedByStatus) {
      return { type: 'rest' as const, next: null };
    }
    const todayKey = formatLocalDate(today);

    // T3 (feedback 2026-08-20) + WP-B (X28): plan startuje w przyszłości — jawna
    // karta pre-start z datą startu i pierwszym treningiem. Guard STOI PRZED
    // branchem completed: dzisiejszy ukończony trening przy przyszłym planie to
    // sesja ad-hoc/stary plan i nie ma prawa pokazać "next session" sprzed startu
    // (zgłoszenie: "NEXT SESSION · AUG 24" przy starcie 7 września).
    // WP-F (X35a): wyliczenie wspólne z zakładką Plan (lib/plan-prestart).
    const preStart = buildPreStartInfo({ planDays: trainingPlan, planStartDate, today, scheduleOverrides });
    if (preStart) {
      return { type: 'preStart' as const, ...preStart };
    }

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
        next: getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides, startDateISO: planStartDate }),
      };
    }

    const todayEntry = getScheduledTrainingForDate(trainingPlan, today, scheduleOverrides, planStartDate);

    if (!todayEntry) {
      const nextEntry = getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides, startDateISO: planStartDate });
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
    if (isCompletedWorkout(todayWorkout)) {
      return {
        type: 'completed' as const,
        day,
        workout: todayWorkout,
        dateStr: todayEntry.dateKey,
        next: getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides, startDateISO: planStartDate }),
      };
    }
    return { type: 'training' as const, day, dayId: day.id, dateStr: todayEntry.dateKey };
  }, [trainingPlan, today, workouts, planStartDate, workoutToDay, scheduleOverrides, planEndedByStatus]);

  const postPlanFirstEntry = todayTraining.type === 'training'
    ? { day: todayTraining.day, dateKey: todayTraining.dateStr, date: today }
    : todayTraining.type === 'preStart'
      ? todayTraining.firstEntry
      : todayTraining.next;

  // Przełożenie treningu (spec 2026-08-11): stan sheeta + handlery. Blokada
  // żywego draftu dnia źródłowego — komunikat zamiast otwarcia (spec, brzeg 2).
  const [rescheduleFrom, setRescheduleFrom] = useState<string | null>(null);
  const todayISO = formatLocalDate(today);
  // WP-A (X27): daty z ukończoną sesją (TYLKO completed === true) — guard
  // przełożeń na obu poziomach: disabled targety w sheecie + silnik mutacji.
  const completedWorkoutDates = useMemo(
    () => new Set(selectCompletedWorkouts(workouts).map((w) => w.date)),
    [workouts],
  );
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
  const renderNextSessionHero = (entry: ScheduledTrainingDay) => {
    // WP-A (X27, A4b): sesja dalej niż jutro dostaje datę w eyebrow — sam dzień
    // tygodnia sugerował "najbliższy poniedziałek", mylące przy starcie planu
    // z przyszłą datą. Dziś/jutro bez zmian (dzień tygodnia wystarcza).
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const showDate = entry.dateKey > formatLocalDate(tomorrow);
    // WP-A (X29): nagłówek = dzień tygodnia REALNEJ daty sesji (przełożenie
    // widoczne od progu), eyebrow = nazwa dnia PLANU; gdy nazwa dnia planu
    // pokrywa się z weekday nagłówka (case-insensitive), wypada z eyebrow.
    const weekdayLabel = formatLocalDateLabel(entry.dateKey, dateLocale(lang), { weekday: 'long' });
    // WP-L (X30): domyslna nazwa weekday podaza za realna data sesji (przy
    // przelozeniu wypada z eyebrow, bo pokrywa sie z naglowkiem); wlasna
    // nazwa usera zostaje.
    const planDayName = displayDayNameForDate(entry.day.dayName, entry.day.weekday, entry.date, lang);
    const showPlanDayName = planDayName.toLocaleLowerCase(dateLocale(lang)) !== weekdayLabel.toLocaleLowerCase(dateLocale(lang));
    return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-container p-5" data-testid="next-session-hero">
      <span className="eyebrow-mono text-primary">
        {t('dash.hero.next')}
        {showPlanDayName && ` · ${planDayName}`}
        {showDate && ` · ${formatLocalDateLabel(entry.dateKey, dateLocale(lang), { day: 'numeric', month: 'short' })}`}
      </span>
      <h2 className="min-w-0 font-heading text-[27px] font-bold capitalize leading-none tracking-tight">
        {weekdayLabel}
      </h2>
      <p className="text-sm text-muted-foreground">
        {localizeFocus(entry.day.focus, lang)} · {t('dash.exercisesCount', { n: entry.day.exercises.length })}
      </p>
      {/* Naprawa r2 (2026-08-21): ten sam jezyk kinetic co CTA dnia treningowego. */}
      <Button
        data-testid="dashboard-primary-action"
        size="lg"
        className="kinetic-primary-button mt-0.5 h-14 w-full gap-1.5 text-base hover:brightness-105"
        onClick={() => navigate(`/workout/${entry.day.id}?date=${entry.dateKey}`)}
      >
        <Play className="h-4 w-4" />
        {t('dash.hero.openSession')}
      </Button>
      <div className="flex items-center justify-center">
        <button
          type="button"
          className="-mx-2 inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => openReschedule(entry.dateKey, entry.day.id)}
        >
          {t('reschedule.action')}
        </button>
      </div>
    </div>
    );
  };

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
    if (!planStarted || !isLoaded || !planIsLoaded || localDraft || planEndedByStatus) return null;
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
  }, [planStarted, isLoaded, planIsLoaded, localDraft, planEndedByStatus, trainingPlan, scheduleOverrides, workouts, todayISO, skippedDates, planStartDate, lapseDismissed, reducedMode, vacation]);
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
        const endLabel = formatLocalDateLabel(mode.endDate, dateLocale(lang), { day: 'numeric', month: 'long' });
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
        const fmtDate = (iso: string) => formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'long' });
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
    const result = await moveScheduledDay(fromDateISO, toDateISO, { completedDates: completedWorkoutDates, planStartDateISO: planStartDate });
    toast(result.success
      ? { title: t(result.swapped ? 'reschedule.swapped' : 'reschedule.moved') }
      : { title: t(isCompletedMoveReason(result.reason) ? 'reschedule.completedBlocked' : 'reschedule.failed'), variant: 'destructive' });
  };
  // Bug 4 (X30): hero dnia szuka draftu WŁASNEGO dnia planu, nie tylko globalnego
  // picku — porzucony szybki trening (nowszy, dirty) nie odbiera żywej sesji planu
  // jedynej ścieżki powrotu z Dashboardu.
  const [todayPlanDraft, setTodayPlanDraft] = useState<ActiveWorkoutDraft | null>(null);
  useEffect(() => {
    if (!uid || todayTraining.type !== 'training') {
      setTodayPlanDraft(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const draft = await workoutDraftDb.loadDraftForDay(uid, todayTraining.dayId, todayTraining.dateStr);
      if (!cancelled) setTodayPlanDraft(draft);
    };
    void load();
    const handleRefresh = () => { void load(); };
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('online', handleRefresh);
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('online', handleRefresh);
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleRefresh);
    };
  }, [uid, todayTraining]);

  // Z174: JEDNA prawda o aktywnej sesji. Gdy karta dnia pokazuje CTA kontynuacji,
  // baner sync degraduje się do wiersza informacyjnego (bez drugiego przycisku).
  // Licznik serii wspólny z ekranem treningu (bez rozgrzewki).
  const todayContinueDraft = useMemo(() => {
    if (todayTraining.type !== 'training') return null;
    // Niezmiennik: globalny pick (localDraft) ma pierwszeństwo jak dotąd; draft
    // dnia planu (bug 4, X30) jest fallbackiem, gdy globalny pick wskazuje inną
    // sesję (np. porzucony szybki trening).
    const candidate = isDraftContinuableToday(localDraft, todayTraining.dateStr)
      && localDraft.dayId === todayTraining.dayId
      ? localDraft
      : todayPlanDraft
          && todayPlanDraft.dayId === todayTraining.dayId
          && isDraftContinuableToday(todayPlanDraft, todayTraining.dateStr)
        ? todayPlanDraft
        : null;
    return candidate
      ? {
        target: continuableDraftTarget(candidate),
        completedSets: countCompletedWorkingSets(candidate.exerciseSets),
      }
      : null;
  }, [todayTraining, localDraft, todayPlanDraft]);

  // Apple Watch: podgląd dzisiejszego planu na zegarku zanim sesja wystartuje.
  useWatchPlanPreview({
    uid,
    type: todayTraining.type,
    day: todayTraining.type === 'training' ? todayTraining.day : null,
    dateStr: todayTraining.type === 'training' ? todayTraining.dateStr : undefined,
    workouts,
    capability: watchCapability,
    healthFeaturesEnabled: healthConsent,
  });

  // Calculate trends (last 4 weeks vs previous 4 weeks)

  // Weekly Strava km counter (Mon-Sun) — logika w activity-window (Z214, test fixture >500).

  // Greeting
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? t('dash.greeting.morning') : hour < 18 ? t('dash.greeting.day') : t('dash.greeting.evening');
  const GreetingIcon = hour < 18 ? Sun : Moon;
  // A4 (X70): księżyc w powitaniu = dekoracja w kolorze wspierającym B
  // (fallback tokenu = primary, bez palety wygląda jak dotąd); słońce zostaje primary.
  const greetingIconClass = hour < 18 ? 'h-6 w-6 text-primary' : 'h-6 w-6 text-support-b';
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
        const queueEntries = workoutSyncQueue.list(uid);
        setPendingSyncCount(queueEntries.length);
        setSyncNeedsAttention(queueEntries.some((entry) => entry.permanent || isRevisionConflictError(entry.lastError)));
        setSyncQueueSignature(queueEntries
          .map((entry) => [entry.queueId, entry.sessionId, entry.lastError ?? '', entry.permanent ? '1' : '0'].join(','))
          .sort()
          .join('|') || 'empty');
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

  // WP-PLANS-1 (X27, Task P4): auto-koniec planu po upływie durationWeeks — TA SAMA
  // ścieżka co ręczne "Zakończ plan" (archive + backfill + status 'ended'), bez
  // nawigacji; po sukcesie user widzi closeout/CTA ze stanu 'ended'. Idempotentne:
  // status 'ended' blokuje warunek, flaga sesyjna chroni okno async (wzorzec R2-27).
  // Aktywna sesja (draft) wstrzymuje auto-end do następnego wejścia.
  // H1 (X31): wyłącznie na danych Z SERWERA (incydent 2026-08-24: cache'owy
  // snapshot starego planu zakończył plan, który na serwerze był już nowy).
  useEffect(() => {
    if (!uid || !planStartDate) return;
    if (!shouldAutoEndPlan({
      planLoaded: isLoaded && planIsLoaded,
      cyclesLoaded,
      planFromServer,
      cyclesFromServer,
      planStatus,
      isPlanExpired,
      hasActiveCycle: !!activeCycle,
      hasBlockingDraft: !!localDraft && !localDraft.completedLocally && !localDraft.finalSyncPending,
    })) return;
    const guardKey = `plan-auto-end:${uid}:${planStartDate}`;
    const guard = {
      get: () => {
        try { return !!sessionStorage.getItem(guardKey); } catch { return false; }
      },
      set: () => {
        try { sessionStorage.setItem(guardKey, '1'); } catch { /* noop */ }
      },
      clear: () => {
        try { sessionStorage.removeItem(guardKey); } catch { /* noop */ }
      },
    };
    void runCycleAutoRepair({
      guard,
      create: async () => {
        const res = await endPlan({ chooseNew: false }, {
          uid, lang, currentPlan: trainingPlan, planStartDate, planDurationWeeks, workouts,
          archiveCurrentPlan, backfillHistoricalWorkouts, setPlanStatus,
          emitPlanEvent: buildPlanEventEmitter(uid),
        });
        return res.success ? (res.archivedCycleId ?? 'ended') : null;
      },
    });
  }, [uid, planStartDate, isLoaded, planIsLoaded, cyclesLoaded, planFromServer, cyclesFromServer, planStatus, isPlanExpired, activeCycle, localDraft, lang, trainingPlan, planDurationWeeks, workouts, archiveCurrentPlan, backfillHistoricalWorkouts, setPlanStatus]);

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

  if (planError && !hasCustomPlan && !planFromServer) {
    return (
      <div role="alert" className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-destructive">{t('trainingplan.loadError')}</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {t('gate.retry')}
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-destructive">{t('dash.error')}</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {t('gate.retry')}
        </Button>
      </div>
    );
  }

  // PRO-E T2: banery stanu w jednym slocie priorytetowym. Warunki i JSX 1:1
  // z dotychczasowych bloków — zmienia się wyłącznie miejsce renderu.
  const statusEntries: StatusEntry[] = [];
  const hasPendingCloudWork = (localDraft && (localDraft.dirty || localDraft.finalSyncPending || localDraft.sessionOrigin === 'provisional')) || pendingSyncCount > 0;
  const syncNoticeSignature = [
    localDraft?.sessionId ?? 'queue',
    localDraft?.finalSyncPending ? 'final' : localDraft?.sessionOrigin ?? 'remote',
    syncNeedsAttention ? 'attention' : 'normal',
    pendingSyncCount,
    syncQueueSignature,
  ].join(':');
  const dismissSyncNotice = () => {
    setDismissedSyncNotice(syncNoticeSignature);
    try { localStorage.setItem(SYNC_NOTICE_DISMISS_KEY, syncNoticeSignature); } catch { /* widok nadal znika */ }
  };
  // WP-C (X38): zwykłe "czeka na sieć" = pasywna chmurka z kropką, zero CTA
  // (AutoSync domknie sam). Karta z "Otwórz Sync Center"/"Kontynuuj" zostaje
  // TYLKO gdy user ma coś do zrobienia: wpis trwały/konflikt albo żywy draft
  // do wznowienia.
  if (hasPendingCloudWork && !syncNeedsAttention && !draftResume.resume) {
    statusEntries.push({
      id: 'cloud-pending', priority: 100, node: (
        <div className="flex justify-end px-1">
          <CloudPendingIndicator />
        </div>
      ),
    });
  } else if (hasPendingCloudWork && dismissedSyncNotice !== syncNoticeSignature) {
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
            <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
              {todayContinueDraft && draftResume.resume ? null : (
                <Button
                  variant="outline"
                  onClick={() => navigate(draftResume.resume ? draftResume.target : '/profile?section=data')}
                >
                  {draftResume.resume ? t('dash.today.continue') : t('dash.sync.openCenter')}
                </Button>
              )}
              <button
                type="button"
                aria-label={t('dash.sync.dismiss')}
                onClick={dismissSyncNotice}
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
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
              date: formatLocalDateLabel(vacation.endDate, dateLocale(lang), { day: 'numeric', month: 'long' }),
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
              date: formatLocalDateLabel(reducedMode.endDate, dateLocale(lang), { day: 'numeric', month: 'long' }),
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
      {postPlanGuideMode && planIsLoaded && (
        <PostPlanGuide
          userId={uid}
          mode={postPlanGuideMode}
          planName={planName}
          nextWorkoutName={postPlanFirstEntry
            ? displayDayNameForDate(
              postPlanFirstEntry.day.dayName,
              postPlanFirstEntry.day.weekday,
              postPlanFirstEntry.date,
              lang,
            )
            : null}
          firstWorkoutPath={todayTraining.type === 'training'
            ? `/workout/${todayTraining.day.id}?date=${todayTraining.dateStr}`
            : null}
          onDismiss={() => setPostPlanGuideMode(null)}
          onNavigate={(path) => {
            wantsMeasurePrompt.current = false;
            setPostPlanGuideMode(null);
            navigate(path);
          }}
        />
      )}
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
      {/* Greeting (fala 2): ikona pory dnia w akcencie (warning był ozdobny,
          nie semantyczny — reguła "jeden akcent") + chip streaka przy dacie.
          Naprawa r2 (2026-08-21): bez italica (Space Grotesk nie ma kroju italic,
          tokens.md ryzyko 4 — silnik syntezował faux oblique); "!" w spanie
          imienia, bo gap-2 flexa robił szczelinę przed wykrzyknikiem. */}
      <div data-testid="dash-greeting">
        <h1 className="text-2xl font-heading font-bold uppercase flex items-center gap-2 tracking-tight">
          <GreetingIcon className={greetingIconClass} />
          {greetingText}, <span className="text-primary">{displayName}!</span>
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
          {streak > 0 && (
            <span
              data-testid="dash-streak-chip"
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-primary"
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
      <div data-testid="dash-hero" className="space-y-3">
      {todayTraining.type === 'training' && (() => {
        // Z88: KAŻDY nieukończony dzisiejszy szkic = "Kontynuuj trening", także w pełni
        // zsynchronizowany (dirty=false). Auto-nawigacja (Z49) celowo zostaje ostrzejsza.
        // Z174: decyzja i licznik we wspólnym memo (todayContinueDraft) — koniec
        // rozjazdu banera, karty dnia i ekranu treningu.
        const continueDraft = todayContinueDraft;
        // WP-A (X29): analogicznie do hero NEXT SESSION — nagłówek = weekday
        // dzisiejszej daty, eyebrow = nazwa dnia planu (bez duplikacji).
        const todayWeekdayLabel = today.toLocaleDateString(dateLocale(lang), { weekday: 'long' });
        // WP-L (X30): nazwa dnia podaza za dzisiejsza data (przelozenie).
        const todayPlanDayName = displayDayNameForDate(todayTraining.day.dayName, todayTraining.day.weekday, today, lang);
        const showTodayPlanDayName = todayPlanDayName.toLocaleLowerCase(dateLocale(lang)) !== todayWeekdayLabel.toLocaleLowerCase(dateLocale(lang));
        return (
        // A4 (X70): hero-support-glow = poświata w kolorze wspierającym B,
        // aktywna wyłącznie przy palecie (index.css, :root[data-palette]).
        <div className="hero-support-glow flex flex-col gap-3 rounded-xl bg-surface-container p-5">
          <span className="eyebrow-mono text-primary">
            {t('dash.hero.today')}
            {showTodayPlanDayName && ` · ${todayPlanDayName}`}
          </span>
          {/* X70b (korekta wlasciciela): powrot do ukladu sprzed toru 4 X70.
              h2 = weekday (krotki, jedna linia), focus zyje w podtytule razem
              z liczba cwiczen. Focus jako tytul zawijal sie na 2 linie i
              rozciagal karte. */}
          <h2 className="min-w-0 font-heading text-[27px] font-bold capitalize leading-none tracking-tight">
            {todayWeekdayLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            {continueDraft
              ? t('dash.today.continueSets', { n: continueDraft.completedSets })
              : `${localizeFocus(todayTraining.day.focus, lang)} · ${t('dash.exercisesCount', { n: todayTraining.day.exercises.length })}`}
          </p>
          {/* Naprawa r2 (2026-08-21): CTA hero w klasie kinetic jak FINISH WORKOUT
              i BACK TO DASHBOARD (tokens.md par. 2.8: jeden jezyk dla CTA hero). */}
          <Button
            data-testid="dashboard-primary-action"
            size="lg"
            className="kinetic-primary-button mt-0.5 h-14 w-full gap-1.5 text-base hover:brightness-105"
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
              className="-mx-2 inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => navigate('/day')}
            >
              {t('dash.details')}
            </button>
            <button
              type="button"
              className="-mx-2 inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
        {/* WP-A (X27, A4): baner kompaktowy — jeden wiersz z nazwą dnia inline,
            tło statusowe z przezroczystością (zasada /10), "Zobacz" po prawej.
            WP-B (X28): X zamyka baner do końca dnia; hero NEXT SESSION niżej
            renderuje się niezależnie od dismissu. */}
        {!completedBannerDismissed && (
        <div
          data-testid="today-completed-card"
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border border-fitness-success/40 bg-fitness-success/10 px-4 py-2.5',
            completionHighlight && 'ring-2 ring-fitness-success/50',
          )}
        >
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fitness-success">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {t('dash.workoutCompleted')} · {displayDayNameForDate(todayTraining.day.dayName, todayTraining.day.weekday, today, lang)}
            </span>
          </p>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => navigate(buildWorkoutRoute(todayTraining.workout, todayTraining.day.id))}
            >
              {t('dash.view')}
            </Button>
            <button
              type="button"
              aria-label={t('dash.dismissCompleted')}
              className="-my-1.5 -mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center text-fitness-success/70 transition-colors hover:text-fitness-success"
              onClick={dismissCompletedBanner}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        )}
        {/* Naprawa r1 (2026-08-21, sędzia struktury): mockup dashboard-simplified
            pokazuje hero NEXT SESSION także po zrobionym treningu — karta
            najbliższej sesji z CTA podglądu i przełożeniem. */}
        {todayTraining.next && renderNextSessionHero(todayTraining.next)}
        </>
      )}

      {/* T3 (feedback 2026-08-20): cykl jeszcze nie wystartował — karta z datą
          startu (z dniem tygodnia) i pierwszym treningiem zamiast pustej regeneracji. */}
      {todayTraining.type === 'preStart' && (
        // WP-F (X35a): wspólna karta z zakładką Plan (PreStartCard), CTA jak dotąd -> /plan.
        <PreStartCard
          info={todayTraining}
          ctaLabel={t('dash.preStart.viewPlan')}
          onCta={() => navigate('/plan')}
        />
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

      {/* Karta tygodnia (Runna p.1, spec B1): checkmarki dni + pasek sesji + tonaż.
          Spec C4: przerwa urlopowa pełni rolę deloadu (nie dubluje się).
          WP-PLANS-1 (X27): martwy plan nie renderuje planu tygodnia. */}
      {!planEndedByStatus && (
        <WeekCard
          model={weekCardModel}
          isDeloadWeek={progression ? resolveDeloadWeek(currentWeek, progression, vacation, planStartDate) : false}
          todayDoneDayName={todayTraining.type === 'completed'
            ? displayDayNameForDate(todayTraining.day.dayName, todayTraining.day.weekday, today, lang)
            : undefined}
        />
      )}

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


      {/* Operacyjne wyjątki zostają bezpośrednio na Dzisiaj. Dane i analityka
          mają jeden dom w głównej zakładce Postępy, więc nie dublujemy ich tutaj.
          Ochrona niezmiennika reguły #5: ad-hoc DOKŁADA, nie podmienia. */}
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
      </div>

      {/* PRO-E T3: upsell zepchnięty pod szybkie akcje */}
      <ProUpsellBanner />

      {/* D-T2: dokładnie JEDEN insight — raport tygodnia (target vs actual). */}
      {planStarted && !planEndedByStatus && (
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
        completedDates={completedWorkoutDates}
        planStartDateISO={planStartDate}
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
