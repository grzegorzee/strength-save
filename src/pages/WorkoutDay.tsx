import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Play, Pencil, Loader2, Cloud, CloudOff, Smartphone, StickyNote, Flame, Share2, ChevronDown, Plus, Trash2, Mail, Home } from 'lucide-react';
import { EmailWorkoutDialog } from '@/components/EmailWorkoutDialog';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildPreStartWarmup, shouldOfferPreStartWarmup } from '@/lib/prestart-warmup';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';
import { calculateStreak, calculateTonnage } from '@/lib/summary-utils';
import { computeMilestones, diffMilestones } from '@/lib/achievements-utils';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ExercisePicker } from '@/components/ExercisePicker';
import type { TrainingDay, Exercise } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { isPaywallPlatform, useSubscription } from '@/hooks/useSubscription';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { getExerciseNoteHistory } from '@/lib/exercise-notes';
import { hapticSuccess } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import { useHealthConsent } from '@/hooks/useHealthConsent';
import { shouldRequestReview, readLastReviewPromptAt, markReviewPromptShown } from '@/lib/review-prompt';
import { getRzaAdvice } from '@/lib/rza-progression';
import { findWorkoutForRoute } from '@/lib/workout-lookup';
import { deleteWorkoutEverywhere } from '@/lib/workout-delete';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adhocDayFromId, buildAdhocExerciseId, isAdhocDayId, parseWatchQuickExerciseParams } from '@/lib/adhoc-workout';
import { syncWorkoutToHealth } from '@/lib/health-bridge';
import { keepScreenAwake, allowScreenSleep } from '@/lib/keep-awake';
import { exerciseLibrary, type LibraryExercise } from '@/data/exerciseLibrary';
import { formatDurationSec, getTrackingType, type TrackingType } from '@/lib/set-tracking';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import { useExerciseNotes } from '@/hooks/useExerciseNotes';
import { useWorkoutDayNotes } from '@/hooks/useWorkoutDayNotes';
import { WorkoutDayNoteSection } from '@/components/WorkoutDayNoteSection';
import { shouldShowNoWorkoutCard } from '@/lib/workout-day-notes';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { dateLocale } from '@/i18n';
import type { SetData, ExerciseMetrics, WorkoutSessionRating, WorkoutSessionRatingReason } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { formatPRValue, getExerciseBest1RM } from '@/lib/pr-utils';
import { badgeEventKey, emitUserEvent, prEventKey } from '@/lib/user-events';
import { db } from '@/lib/firebase';
import { saveWorkoutSessionRating } from '@/lib/workout-save';
import { computeCompletionSummary } from '@/lib/workout-completion-summary';
import { computeVolumeSplit, primaryMuscleToCategory } from '@/lib/volume-split';
import { WorkoutVolumeSplit } from '@/components/WorkoutVolumeSplit';
import { getExerciseDetails } from '@/data/exercise-details';
import { bestPreviousWeight, detectLiveWeightPR } from '@/lib/live-pr';
import { backfillWeightForExercise } from '@/lib/pr-backfill';
import { computeSessionPRs } from '@/lib/session-prs';
import { vacationToAdviceWindow } from '@/lib/vacation-mode';
import { WorkoutCompletionSequence } from '@/components/WorkoutCompletionSequence';
import { WorkoutDraftStatusNotice, WorkoutErrorNotice } from '@/components/WorkoutDraftStatusNotice';
import { LivePRCelebration, type LivePRCelebrationData } from '@/components/LivePRCelebration';
import { carrySetExtras, createEmptySets, createPrefilledSets, parseSetCount, isBodyweightExercise } from '@/lib/exercise-utils';
import { computeWeeklyTargets } from '@/lib/progression-engine';
import { buildDayFromDraft, hasAnyCompletedSet, sessionStats } from '@/lib/workout-day-view';
import { buildSwappedExerciseId, resetSetsForExerciseSwap } from '@/lib/exercise-swap';
import { DraftSaveTotalFailure, hasDraftContent, workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { setPwaUpdateBlocked } from '@/lib/pwa-update-guard';
import { buildWorkoutDraftSnapshot } from '@/lib/workout-draft-snapshot';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { deriveWorkoutSessionPhase, isActiveTrainingPhase, shouldStartRest } from '@/lib/workout-session-state';
import { cancelRestEndNotification } from '@/lib/rest-notification';
import { resolveWorkoutHydration } from '@/lib/workout-hydration';
import { draftHasLiveContent, shouldAutostartWorkout, stripAutostartParam } from '@/lib/workout-autostart';
import { computeEffectiveDurationSec } from '@/lib/workout-duration';
import { useRestTimerController } from '@/hooks/useRestTimerController';
import { RestBar } from '@/components/RestBar';
import { WorkoutSettingsSheet } from '@/components/WorkoutSettingsSheet';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { buildDraftFinalExpectation, buildWorkoutWriteExpectation, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import { classifyWorkoutSyncError, shouldAutoResolveConflict, workoutSyncErrorDetail, workoutSyncErrorMessageKey } from '@/lib/workout-sync-conflict';
import { reportClientError } from '@/lib/error-telemetry';
import { applySyncMarkers } from '@/lib/workout-sync-markers';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';
import { useWatchWorkoutSync } from '@/hooks/useWatchWorkoutSync';
import { useFirestoreCrashDraftBackup } from '@/hooks/useFirestoreCrashDraftBackup';
import { ackWatchEvents, getOrCreateWatchPhoneDeviceId, sendWorkoutToWatch, type WatchSetLoggedEvent } from '@/lib/watch-bridge';
import { isExerciseFullyCompleted } from '@/lib/workout-sanitizers';
import { mergeWatchSetEvent, stampChangedWatchSets } from '@/lib/watch-set-conflict';
import { mergeDraftWithCloudWorkout } from '@/lib/workout-cross-device-merge';
import {
  areWorkoutStartSourcesReady,
  buildStartDraft,
  buildStartExerciseSets,
  buildWorkoutStartSnapshot,
  findUniqueCycleForDate,
  type StartExerciseLike,
} from '@/lib/workout-start';
import { buildWatchCapabilitySnapshot } from '@/lib/device-management';

const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;
// Z175: sesja provisional dostaje PIERWSZY checkpoint szybko — 5-minutowe okno bez
// próby promocji zostawiało baner "rozpoczęty offline" na Dashboardzie mimo sieci.
const PROVISIONAL_FIRST_CHECKPOINT_MS = 15 * 1000;

const newPhoneSetEventId = (): string => (
  `${getOrCreateWatchPhoneDeviceId()}-${crypto.randomUUID()}`
);

type AutoSaveStatus =
  | 'idle'
  | 'local-saved'
  | 'local-only'
  | 'sync-pending'
  | 'syncing'
  | 'synced'
  | 'final-sync-pending'
  | 'error';

const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

// Zegar sesji w osobnym komponencie: tick co sekundę re-renderuje TYLKO ten kafelek,
// nie cały WorkoutDay z kartami ćwiczeń (R2-07). Liczy od startedAt przy każdym ticku,
// więc po resume z tła (iOS wstrzymuje JS) pokazuje poprawny czas bez dryfu.
const SessionClock = ({ startedAt }: { startedAt: number }) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <>{fmtDuration(elapsedSec)}</>;
};

const WorkoutDay = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { uid, profile } = useCurrentUser();
  // Wycofana zgoda zdrowotna chowa panel metryk RPE/ból/jakość (brak
  // onMetricsChange = ExerciseCard nie renderuje chipa ani inputów).
  const healthConsent = useHealthConsent();
  const subscription = useSubscription();
  const requiresPaywall = isPaywallPlatform() && !subscription.loading && !subscription.isPro;
  const watchCapability = subscription.loading
    ? undefined
    : buildWatchCapabilitySnapshot(subscription);
  const {
    workouts,
    createWorkoutSession,
    createOfflineWorkoutSession,
    batchSaveWorkout,
    getWorkoutSessionFromServer,
    getLatestMeasurement,
    isLoaded: workoutsLoaded,
    workoutsFromCache,
  } = useFirebaseWorkouts(uid, { measurements: 'latest' });
  const { plan: trainingPlan, swapExercise, isLoaded: planLoaded, progression, currentWeek, planDurationWeeks, reducedMode, vacation } = useTrainingPlan(uid);
  const { customExercises, addCustomExercise } = useCustomExercises(uid);
  // Dla własnych ćwiczeń źródłem prawdy o bodyweight jest pole z pickera,
  // nie heurystyka po nazwie (Z71d).
  const resolveIsBodyweight = useCallback((name: string): boolean => {
    const custom = customExercises.find((ex) => ex.name === name);
    return custom ? custom.isBodyweight === true : isBodyweightExercise(name);
  }, [customExercises]);
  // Typ śledzenia serii (Z105): własne ćwiczenie -> jego pole, biblioteka -> jej pole,
  // fallback heurystyka bodyweight. Ten sam priorytet co resolveIsBodyweight.
  const resolveTracking = useCallback((name: string): TrackingType => {
    const custom = customExercises.find((ex) => ex.name === name);
    if (custom) return getTrackingType(custom);
    const lib = exerciseLibrary.find((e) => e.name === name);
    if (lib) return getTrackingType(lib);
    return getTrackingType({ isBodyweight: isBodyweightExercise(name) });
  }, [customExercises]);
  const { cycles, isLoaded: cyclesLoaded } = usePlanCycles(uid);
  // Przypięte notatki per ćwiczenie (Z103): trwałe, klucz = kanoniczna nazwa.
  const { getPinnedNote, savePinnedNote } = useExerciseNotes(uid);
  // T10: notatka przypięta do DNIA treningu (planowanie przyszłej sesji) —
  // OSOBNA kolekcja, nie dayNotes draftu (nie mieszać z notatką PO treningu).
  const { getDayNote, saveDayNote } = useWorkoutDayNotes(uid);
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const today = formatLocalDate(new Date());
  const targetDate = searchParams.get('date') || today;
  const routeSessionId = searchParams.get('session');
  const autostart = searchParams.get('autostart') === 'true';
  const watchStartEventId = searchParams.get('watchEventId');
  // Z122: true gdy zegarek zgłosił aktywną sesję HKWorkout w tym treningu.
  const watchHkSessionRef = useRef(false);
  const isViewingPastWorkout = targetDate !== today;
  // T10: przyszły trening z planu (porównanie stringów ISO = chronologia).
  const isFutureDate = targetDate > today;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [exerciseMetrics, setExerciseMetrics] = useState<Record<string, ExerciseMetrics>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isExplicitSaving, setIsExplicitSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dismissedDraftNoticeSessionId, setDismissedDraftNoticeSessionId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [skippedExercises, setSkippedExercises] = useState<string[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [queuedDraft, setQueuedDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  // Runna p.1 (spec A1): sekwencja completion tylko dla ŚWIEŻO zakończonej sesji.
  // Wejście w ukończony trening z historii NIE dostaje celebracji ani oceny.
  const [justCompleted, setJustCompleted] = useState(false);
  // Runna p.1 (spec A4): PR na żywo — badge per ćwiczenie + jednorazowy toast.
  const [livePRWeights, setLivePRWeights] = useState<Record<string, number>>({});
  const [livePRPending, setLivePRPending] = useState<{ exerciseId: string; weight: number; bestBefore: number } | null>(null);
  // FIX-B T2: pełnoekranowa celebracja live PR (zamiast toastu). Zawsze
  // zamontowana, sterowana danymi (lekcja b.92 dla overlayów).
  const [livePRCelebration, setLivePRCelebration] = useState<LivePRCelebrationData | null>(null);
  const livePRToastedRef = useRef<Set<string>>(new Set());
  // Z161: usuwanie ZAPISANEGO treningu z widoku podsumowania — ta sama ścieżka co
  // Historia (deleteWorkoutEverywhere: dokument + szkic IDB + kolejka syncu, nigdy
  // goły deleteDoc). Trening w toku nie renderuje tej akcji (widok podsumowania
  // istnieje tylko dla isCompleted).
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingWorkout, setIsDeletingWorkout] = useState(false);
  // Cross-device LWW (Z228): konflikt wersji rozwiązujemy per seria, zachowując
  // najnowsze zmiany z obu urządzeń. Limit prób chroni przed aktywną pętlą zapisów.
  const conflictAutoResolveAttemptsRef = useRef(0);
  // FIX-A T4: licznik totalnych failów zapisu draftu z rzędu — czerwony stan
  // dopiero przy drugim (pierwszy dostaje cichy retry po 3 s).
  const draftFailStreakRef = useRef(0);
  const keepLocalOnConflictRef = useRef<null | (() => Promise<void>)>(null);
  const [showWarmup, setShowWarmup] = useState(false);
  // Z162: odhaczenia rozgrzewki (klucze nameKey) żyją w drafcie sesji — zamknięcie
  // dialogu i wyjście z apki ich nie kasuje, nowa sesja startuje z czystą listą.
  const [warmupChecked, setWarmupChecked] = useState<string[]>([]);
  const [showShare, setShowShare] = useState(false);
  // F-T3: dialog wysyłki podsumowania mailem.
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  // Podsumowanie ukończonego treningu: które ćwiczenia mają rozwinięte serie.
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Set<string>>(new Set());
  const { unit, fmt, toDisplay, fmtTonnage } = useUnit();

  // Exercise swap (search library, no AI)
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  // Z104: picker dodawania ćwiczenia w locie (tylko trening ad-hoc).
  const [showAddExercise, setShowAddExercise] = useState(false);
  // Session-only swaps ("tylko dziś") keyed by exerciseId — not persisted to the plan.
  const [sessionSwaps, setSessionSwaps] = useState<Record<string, { id: string; name: string; sets: string; videoUrl?: string }>>({});

  // Z143: jeden timer przerwy na sesję — stan u właściciela (tu), tykanie w RestBar.
  // Z188: kontroler niesie deadline + persystencję localStorage (kill nie gubi przerwy).
  const {
    restState,
    startRest: startRestTimer,
    adjustRest: adjustRestTimer,
    stopRest: stopRestTimer,
    resumeFromStorage: resumeRestFromStorage,
  } = useRestTimerController();
  // Fala 2 (2026-08-20): ustawienia timera z tapnięcia w sticky pasek REST.
  // Stan i sheet żyją TUTAJ, niezależnie od restState — koniec przerwy przy
  // otwartym sheecie nie może go unmountować (lekcja Radix b.92).
  const [restSettingsOpen, setRestSettingsOpen] = useState(false);
  // Zawsze aktualna lista ćwiczeń dnia dla decyzji o przerwie (Z144) — bez
  // wiązania tożsamości handlera z obiektem day (memo kart, R2-07).
  const dayExercisesRef = useRef<ReadonlyArray<{ id: string }>>([]);

  // Z144: ostatnia seria treningu nie startuje przerwy. Koniec treningu = koniec
  // odliczania czegokolwiek: gasimy też biegnącą przerwę i jej notyfikację.
  // Sygnał końca serii (dźwięk/haptyka z odhaczenia) zostaje w karcie bez zmian.
  // Z189: bramka jest fail-open (shouldStartRest) — pusta/nie zasiana lista
  // ćwiczeń dnia startuje timer zamiast go gasić.
  const handleRestStart = useCallback((exerciseId: string, seconds: number) => {
    const workRemains = shouldStartRest(
      exerciseSetsRef.current,
      skippedExercisesRef.current,
      dayExercisesRef.current,
    );
    if (!workRemains) {
      stopRestTimer();
      void cancelRestEndNotification();
      return;
    }
    // Z177: re-apply blokady ekranu przy KAŻDEJ przerwie — iOS potrafi zdjąć
    // idle-timer po powrocie z tła, a przerwa to moment, gdy zgaszony ekran
    // ucina gong (JS wstrzymany).
    void keepScreenAwake();
    startRestTimer(exerciseId, seconds);
  }, [startRestTimer, stopRestTimer]);

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const firstExerciseRef = useRef<HTMLDivElement>(null);
  const autostartDone = useRef(false);
  const draftRecoveryDone = useRef<string | null>(null);
  const completedSessionLockRef = useRef<string | null>(null);
  // Z47: scroll do ostatnio dotykanego ćwiczenia — raz per mount per uid:date
  // (NIE per sessionId: promocja provisional→remote zmienia go w trakcie treningu).
  const lastTouchedScrollDone = useRef<string | null>(null);
  const cycleRepairAttemptRef = useRef<string | null>(null);
  // Znacznik wersji dokumentu w chmurze dla sesji wczytanej z Firestore (bez draftu).
  // Bez tego seeda draft tworzony nad istniejącym workoutem ma cloudRevision=undefined,
  // czyli precondition rewizji byłaby utracona.
  const cloudMetaRef = useRef<{ sessionId: string; updatedAt?: number; revision?: number } | null>(null);

  // Refs that mirror state for stable callback identity
  const exerciseSetsRef = useRef(exerciseSets);
  const exerciseNotesRef = useRef(exerciseNotes);
  const exerciseMetricsRef = useRef(exerciseMetrics);
  const dayNotesRef = useRef(dayNotes);
  const skippedExercisesRef = useRef(skippedExercises);
  const warmupCheckedRef = useRef(warmupChecked);
  const activeDraftRef = useRef(activeDraft);
  const queuedDraftRef = useRef(queuedDraft);

  useEffect(() => { exerciseSetsRef.current = exerciseSets; }, [exerciseSets]);
  useEffect(() => { exerciseNotesRef.current = exerciseNotes; }, [exerciseNotes]);
  useEffect(() => { exerciseMetricsRef.current = exerciseMetrics; }, [exerciseMetrics]);
  useEffect(() => { dayNotesRef.current = dayNotes; }, [dayNotes]);
  useEffect(() => { skippedExercisesRef.current = skippedExercises; }, [skippedExercises]);
  useEffect(() => { warmupCheckedRef.current = warmupChecked; }, [warmupChecked]);
  const warmupCheckedSet = useMemo(() => new Set(warmupChecked), [warmupChecked]);
  useEffect(() => { activeDraftRef.current = activeDraft; }, [activeDraft]);
  useEffect(() => { queuedDraftRef.current = queuedDraft; }, [queuedDraft]);

  // Timer sesji renderuje SessionClock (osobny komponent, Z35) — startedAt tylko
  // z draftu TEJ sesji, bo cudzy draft dawałby absurdalny czas.
  const sessionClockStartedAt = sessionId !== null && !isCompleted && activeDraft?.sessionId === sessionId
    ? activeDraft?.startedAt ?? null
    : null;

  // Blokada wygaszania ekranu na czas aktywnego treningu (zgłoszenie usera: przy
  // zgaszonym ekranie dźwięk zależy wyłącznie od powiadomienia systemowego, przy
  // włączonym gra sama apka). Hook MUSI stać przed wczesnymi returnami tego
  // komponentu — inaczej łamie Rules of Hooks. Blokada zwalniana ZAWSZE przy wyjściu.
  useEffect(() => {
    if (sessionId === null || isCompleted) {
      void allowScreenSleep();
      return;
    }
    void keepScreenAwake();
    return () => { void allowScreenSleep(); };
  }, [sessionId, isCompleted]);

  // Z188: przerwa przeżywa kill — po hydracji sesji (raz per mount) przywróć
  // deadline z localStorage; realny pozostały czas wraca na kartę exerciseId.
  // Ukończony trening niczego nie odlicza: zawsze stopRest.
  const restResumeDone = useRef(false);
  useEffect(() => {
    if (sessionId === null) return;
    if (isCompleted) {
      stopRestTimer();
      return;
    }
    if (restResumeDone.current) return;
    restResumeDone.current = true;
    resumeRestFromStorage();
  }, [sessionId, isCompleted, stopRestTimer, resumeRestFromStorage]);

  // Tonaż i liczba serii bieżącej sesji — ukończone serie robocze, bez rozgrzewki (Z131).
  const { volumeKg: sessionVolumeKg, completedSets: sessionCompletedSets } = useMemo(
    () => sessionStats(exerciseSets),
    [exerciseSets],
  );

  // Snapshot etykiet bieżącego dnia (nazwy ćwiczeń + dnia) zapisywany wraz z treningiem,
  // żeby historia była odporna na przyszłe zmiany planu.
  const daySnapshotRef = useRef<{ dayName: string; focus: string; names: Record<string, string> }>({ dayName: '', focus: '', names: {} });

  // Szybki trening (Z104): syntetyczny dzień ad-hoc nie istnieje w planie — odtwarzamy go z dayId.
  const isAdhocDay = !!dayId && isAdhocDayId(dayId);
  const watchQuickExercise = useMemo(
    () => isAdhocDay ? parseWatchQuickExerciseParams(searchParams) : null,
    [isAdhocDay, searchParams],
  );
  const baseDay = useMemo(() => {
    const fromPlan = trainingPlan.find(d => d.id === dayId);
    if (fromPlan) return fromPlan;
    if (dayId && isAdhocDayId(dayId)) {
      const adhoc = adhocDayFromId(dayId, (key) => t(key as Parameters<typeof t>[0]));
      if (!adhoc || !watchQuickExercise) return adhoc ?? undefined;
      return {
        ...adhoc,
        exercises: [{
          id: watchQuickExercise.id,
          name: watchQuickExercise.name,
          sets: `${watchQuickExercise.setCount} x ${watchQuickExercise.reps}`,
          instructions: [],
        }],
      };
    }
    return undefined;
  }, [trainingPlan, dayId, t, watchQuickExercise]);
  const draftForDaySnapshot = activeDraft && activeDraft.dayId === dayId && activeDraft.date === targetDate
    ? activeDraft
    : queuedDraft && queuedDraft.dayId === dayId && queuedDraft.date === targetDate
      ? queuedDraft
      : null;

  // Zapisany trening dla oglądanej daty (jeśli istnieje).
  const workoutForDate = useMemo(
    () => findWorkoutForRoute(workouts, {
      dayId,
      date: targetDate,
      sessionId: routeSessionId,
      allowDateFallback: true,
      today,
    }),
    [workouts, dayId, targetDate, routeSessionId, today],
  );

  // Apply any session-only ("tylko dziś") swaps over the plan day.
  const day = useMemo(() => {
    // Historię i ukończone treningi renderujemy z ZAPISANEGO treningu, nie z aktualnego
    // planu (plan mógł zostać nadpisany — wtedy baseDay jest pusty lub pokazuje inne ćwiczenia).
    const useSnapshot = workoutForDate
      && workoutForDate.exercises.length > 0
      && (isViewingPastWorkout || workoutForDate.completed);
    if (useSnapshot) {
      const label = resolver.resolveDayLabel(workoutForDate);
      const snapshotDay: TrainingDay = {
        id: workoutForDate.dayId || dayId || '',
        dayName: label.dayName,
        weekday: baseDay?.weekday ?? 'monday',
        focus: label.focus,
        exercises: workoutForDate.exercises.map(ex => ({
          id: ex.exerciseId,
          name: resolver.resolveExerciseName(workoutForDate, ex.exerciseId),
          sets: `${ex.sets.filter(s => !s.isWarmup).length} serii`,
          instructions: [],
        })),
      };
      return snapshotDay;
    }

    if (draftForDaySnapshot && Object.keys(draftForDaySnapshot.exerciseSets).length > 0) {
      // Plan jest BAZĄ, draft tylko dokłada (incydent 2026-07-20: dzień budowany
      // wyłącznie z kluczy draftu gubił ćwiczenia, których user jeszcze nie dotknął).
      return buildDayFromDraft(baseDay, draftForDaySnapshot);
    }

    if (!baseDay || Object.keys(sessionSwaps).length === 0) return baseDay;
    return {
      ...baseDay,
      exercises: baseDay.exercises.map(ex => {
        const ov = sessionSwaps[ex.id];
        return ov ? { ...ex, id: ov.id, name: ov.name, sets: ov.sets, videoUrl: ov.videoUrl, instructions: [] } : ex;
      }),
    };
  }, [baseDay, draftForDaySnapshot, sessionSwaps, workoutForDate, isViewingPastWorkout, resolver, dayId]);

  // C-T2: prompt pre-start + plan rozgrzewki pod pierwsze ćwiczenie dnia.
  const [preStartOpen, setPreStartOpen] = useState(false);
  const preStartPlan = useMemo(() => {
    const first = day?.exercises[0];
    if (!first) return buildPreStartWarmup({ exerciseName: '' });
    const firstSets = exerciseSets[first.id] ?? [];
    const workingWeightKg = firstSets.find((s) => !s.isWarmup && s.weight > 0)?.weight ?? 0;
    return buildPreStartWarmup({
      exerciseName: first.name,
      category: exerciseLibrary.find((e) => e.name === first.name)?.category,
      isBodyweight: resolveIsBodyweight(first.name),
      workingWeightKg,
    });
  }, [day, exerciseSets, resolveIsBodyweight]);

  useEffect(() => {
    daySnapshotRef.current = day
      ? { dayName: day.dayName, focus: day.focus, names: Object.fromEntries(day.exercises.map(e => [e.id, e.name])) }
      : { dayName: '', focus: '', names: {} };
    // Z144: lista ćwiczeń dnia dla decyzji o starcie przerwy (hasRemainingWork).
    dayExercisesRef.current = day?.exercises ?? [];
  }, [day]);

  // Z104: dodanie ćwiczenia w locie do treningu ad-hoc. Serie pre-fillowane z historii
  // po nazwie (previousSetsByName), snapshot nazwy trafia do draftu (historia odporna na plan).
  const handleAddAdhocExercise = (pick: LibraryExercise) => {
    if (!day) return;
    const existingIds = [...Object.keys(exerciseSetsRef.current), ...day.exercises.map((ex) => ex.id)];
    const newId = buildAdhocExerciseId(pick.name, existingIds);
    const prevSets = getPreviousSets(newId, pick.name);
    const sets = createPrefilledSets(3, prevSets, resolveIsBodyweight(pick.name));

    const nextSets = { ...exerciseSetsRef.current, [newId]: sets };
    exerciseSetsRef.current = nextSets;
    setExerciseSets(nextSets);

    saveDraftSnapshot({
      exerciseNames: {
        ...(activeDraftRef.current?.exerciseNames ?? daySnapshotRef.current.names),
        [newId]: pick.name,
      },
      lastTouchedExerciseId: newId,
    });
    setShowAddExercise(false);
  };

  // Apply an exercise swap chosen from the library — either for this session only or permanently.
  const handleApplySwap = async (pick: LibraryExercise, exerciseId: string, currentSets: string, scope: 'today' | 'plan') => {
    if (!day) return;
    const currentExercise = day.exercises.find(ex => ex.id === exerciseId);
    if (!currentExercise) return;

    if (scope === 'plan') {
      await swapExercise(day.id, exerciseId, pick.name, currentSets, pick.videoUrl);
    } else {
      const swappedId = buildSwappedExerciseId(exerciseId, pick.name, day.exercises.map(ex => ex.id));
      const nextExerciseSets = { ...exerciseSetsRef.current };
      nextExerciseSets[swappedId] = resetSetsForExerciseSwap(
        nextExerciseSets[exerciseId] ?? createEmptySets(parseSetCount(currentSets)),
        currentExercise.name,
        pick.name,
      );
      delete nextExerciseSets[exerciseId];
      exerciseSetsRef.current = nextExerciseSets;
      setExerciseSets(nextExerciseSets);

      const nextExerciseNotes = { ...exerciseNotesRef.current };
      if (nextExerciseNotes[exerciseId]) nextExerciseNotes[swappedId] = nextExerciseNotes[exerciseId];
      delete nextExerciseNotes[exerciseId];
      exerciseNotesRef.current = nextExerciseNotes;
      setExerciseNotes(nextExerciseNotes);

      const nextExerciseMetrics = { ...exerciseMetricsRef.current };
      if (nextExerciseMetrics[exerciseId]) nextExerciseMetrics[swappedId] = nextExerciseMetrics[exerciseId];
      delete nextExerciseMetrics[exerciseId];
      exerciseMetricsRef.current = nextExerciseMetrics;
      setExerciseMetrics(nextExerciseMetrics);

      setSkippedExercises(prev => prev.filter(id => id !== exerciseId));
      const nextSessionSwaps = {
        ...sessionSwaps,
        [exerciseId]: { id: swappedId, name: pick.name, sets: currentSets, videoUrl: pick.videoUrl },
      };
      setSessionSwaps(nextSessionSwaps);

      // Utrwal swap w drafcie od razu (istniejąca ścieżka autozapisu, wzorzec handleSkipExercise).
      // Bez tego draft z prefilled exerciseSets pokazywał stare ćwiczenie do następnego odhaczenia,
      // a swap ginął przy odświeżeniu apki. Z185: mapa sessionSwaps idzie do draftu,
      // żeby tożsamość swapu przeżyła restart apki.
      saveDraftSnapshot({
        exerciseNames: {
          ...(activeDraftRef.current?.exerciseNames ?? daySnapshotRef.current.names),
          [swappedId]: pick.name,
        },
        lastTouchedExerciseId: swappedId,
        sessionSwaps: nextSessionSwaps,
      });
    }
    setSwapExerciseId(null);
  };
  const currentPageDraft = (activeDraft && activeDraft.dayId === dayId && activeDraft.date === targetDate
    ? activeDraft
    : queuedDraft && queuedDraft.dayId === dayId && queuedDraft.date === targetDate
      ? queuedDraft
      : null);
  const startSourcesReady = areWorkoutStartSourcesReady({
    workoutsLoaded,
    planLoaded,
    cyclesLoaded,
    draftLoaded: isDraftLoaded,
  });

  // Z244: gdy źródła startu nie wstają (słaba sieć), przycisk startu nie może
  // wisieć martwy bez wyjścia — po 8 s pokazujemy komunikat i opcję odświeżenia.
  const [startSourcesTimedOut, setStartSourcesTimedOut] = useState(false);
  useEffect(() => {
    if (startSourcesReady) {
      setStartSourcesTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setStartSourcesTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [startSourcesReady]);

  // Jawna faza sesji (Z57): jedno źródło prawdy dla renderu zamiast kombinacji flag.
  const sessionPhase = useMemo(() => deriveWorkoutSessionPhase({
    sessionId,
    sessionOrigin: currentPageDraft?.sessionOrigin,
    isCompleted,
    isEditing,
    // Local-wins (Z87): dialog konfliktu nie istnieje, faza 'conflict' nieosiągalna.
    conflictDialogOpen: false,
    finalSyncPending: !!currentPageDraft?.finalSyncPending,
    isExplicitSaving,
  }), [sessionId, currentPageDraft?.sessionOrigin, currentPageDraft?.finalSyncPending, isCompleted, isEditing, isExplicitSaving]);

  // Find previous workout for this day (for weight hints)
  const previousWorkout = workouts.find(w =>
    w.dayId === dayId &&
    w.date < targetDate &&
    w.completed &&
    w.exercises.length > 0
  );

  // Fallback pre-fillu po nazwie ćwiczenia z całej historii — dayId/exerciseId
  // zmieniają się między cyklami, więc po starcie nowego cyklu lookup po id nie trafia.
  const previousSetsByName = useMemo(() => {
    const map = new Map<string, SetData[]>();
    const sorted = workouts
      .filter(w => w.completed && w.date < targetDate && w.exercises.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const w of sorted) {
      for (const ex of w.exercises) {
        if (!ex.name || map.has(ex.name) || !ex.sets || ex.sets.length === 0) continue;
        map.set(ex.name, ex.sets);
      }
    }
    return map;
  }, [workouts, targetDate]);

  // Dane pochodne per ćwiczenie (1RM, porady, poprzednie serie) liczone raz per zmiana
  // danych, nie w każdym renderze — skany historii w renderze co tick zegara sesji
  // były głównym driverem re-render bomby (R2-07).
  const exerciseInsights = useMemo(() => {
    const map = new Map<string, {
      previousSets?: SetData[];
      nextAdvice: ReturnType<typeof getNextSetAdvice>;
      historicalBest: ReturnType<typeof getExerciseBest1RM>;
      rzaAdvice: ReturnType<typeof getRzaAdvice>;
      lastNote?: string;
    }>();
    (day?.exercises ?? []).forEach((exercise, index) => {
      const prev = previousWorkout?.exercises.find(e => e.exerciseId === exercise.id);
      // Z105: coach serii nie ma sensownego celu dla typów czasowych (świadomie nic);
      // asysta = cel powtórzeniowy (jak bodyweight).
      const exTracking = resolveTracking(exercise.name);
      map.set(exercise.id, {
        previousSets: prev?.sets && prev.sets.length > 0
          ? prev.sets
          : (exercise.name ? previousSetsByName.get(exercise.name) : undefined),
        nextAdvice: exTracking === 'duration' || exTracking === 'weight_distance_duration'
          ? null
          : getNextSetAdvice(workouts, exercise.id, exercise.sets, index, {
            isBodyweight: exTracking === 'assisted_bodyweight' ? true : resolveIsBodyweight(exercise.name),
            isSuperset: exercise.isSuperset,
            // Spec C3/C4 (Runna p.1): tryb "nie na 100%" albo urlop obniżają
            // propozycje (jeden naraz — kolizję blokują dialogi).
            reducedMode: reducedMode ?? vacationToAdviceWindow(vacation),
            // Spec C5: snapshot nazwy — propozycje widzą też sesje ad-hoc.
            exerciseName: exercise.name,
          }, lang, unit),
        historicalBest: getExerciseBest1RM(workouts, exercise.id, exercise.name),
        rzaAdvice: getRzaAdvice(workouts, exercise.id, exercise.name),
        // Z74: ostatnia notatka z poprzedniej sesji tego ćwiczenia.
        lastNote: getExerciseNoteHistory(workouts, exercise.id, 1)[0]?.note,
      });
    });
    return map;
  }, [day, workouts, previousWorkout, previousSetsByName, lang, unit, resolveIsBodyweight, resolveTracking, reducedMode, vacation]);

  // Z120: cele tygodnia z silnika progresji — tylko dla planu z włączoną progresją
  // (ad-hoc nie ma tygodnia planu). Czysta kalkulacja, zero zapisów.
  const weeklyTargets = useMemo(() => {
    if (!progression?.enabled || !day || isAdhocDay) return null;
    const week = Math.max(1, currentWeek);
    const trackingByName = Object.fromEntries(day.exercises.map((e) => [e.name, resolveTracking(e.name)]));
    const deloadApplied = progression.deloadDecisions?.[String(week)] === 'applied';
    return computeWeeklyTargets([day], workouts, week, progression, { deloadApplied, trackingByName })[day.id] ?? null;
  }, [progression, day, isAdhocDay, workouts, currentWeek, resolveTracking]);

  const queueAutoSaveStatus = useCallback((status: AutoSaveStatus, nextStatus?: AutoSaveStatus, delay = 1600) => {
    setAutoSaveStatus(status);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (nextStatus) {
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaveStatus(current => current === status ? nextStatus : current);
      }, delay);
    }
  }, []);

  // Nierozpoznany błąd niesie ORYGINALNĄ treść — „Nieznany błąd." bez konkretu
  // nie dawał się powiązać z przyczyną (zgłoszenie usera 2026-07-20).
  const describeSyncError = useCallback((error: unknown): string => {
    const key = workoutSyncErrorMessageKey(error);
    const base = t(key);
    if (key !== 'workout.err.unknown') return base;
    const detail = workoutSyncErrorDetail(error);
    return detail ? `${base} (${detail})` : base;
  }, [t]);

  // Cienki wrapper: logika snapshotu w czystej funkcji (workout-draft-snapshot.ts, Z29).
  const buildDraftSnapshot = useCallback((overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft | null => (
    buildWorkoutDraftSnapshot({
      userId: uid,
      sessionId,
      dayId,
      date: targetDate,
      previousDraft: activeDraftRef.current,
      queuedDraft: queuedDraftRef.current,
      exerciseSets: exerciseSetsRef.current,
      exerciseNotes: exerciseNotesRef.current,
      exerciseMetrics: exerciseMetricsRef.current,
      dayNotes: dayNotesRef.current,
      skippedExercises: skippedExercisesRef.current,
      // Pole tylko gdy sesja realnie ma odhaczenia (albo już je miała) — legacy draft
      // bez rozgrzewki nie dostaje pustej tablicy, a odznaczenie WSZYSTKIEGO nie wraca
      // do starej wartości z previousDraft.
      ...((warmupCheckedRef.current.length > 0 || activeDraftRef.current?.warmupChecked !== undefined)
        && { warmupChecked: warmupCheckedRef.current }),
      dayNames: daySnapshotRef.current.names,
      dayName: daySnapshotRef.current.dayName,
      dayFocus: daySnapshotRef.current.focus,
      cloudMeta: cloudMetaRef.current,
    }, overrides)
  ), [uid, sessionId, dayId, targetDate]);

  useFirestoreCrashDraftBackup(buildDraftSnapshot);

  const persistDraftSnapshot = useCallback(async (
    overrides: Partial<ActiveWorkoutDraft> = {},
    options: { showStatus?: boolean } = {}
  ): Promise<ActiveWorkoutDraft | null> => {
    const draft = buildDraftSnapshot(overrides);
    if (!draft) return null;

    try {
      await workoutDraftDb.saveActiveDraft(draft);
      draftFailStreakRef.current = 0;
      activeDraftRef.current = draft;
      setActiveDraft(draft);
      setSaveError(null);
      if (options.showStatus) {
        if (draft.finalSyncPending) {
          setAutoSaveStatus('final-sync-pending');
        } else if (draft.sessionOrigin === 'provisional') {
          setAutoSaveStatus('local-only');
        } else {
          queueAutoSaveStatus('local-saved', 'sync-pending');
        }
      }
    } catch (error) {
      // Fallback localStorage łapie wszystko poza totalnym failem — nie strasz
      // czerwonym przy pierwszym potknięciu: jeden cichy retry po 3 s, czerwony
      // stan dopiero przy DRUGIM totalnym failu z rzędu (dane wtedy realnie
      // tylko w pamięci Reacta).
      draftFailStreakRef.current += 1;
      if (uid) {
        trackTelemetryEvent(uid, 'local_save_failed');
        // Stage idzie kanałem client_errors (dowolny code w rules), nie nową
        // nazwą eventu telemetrii — whitelist eventów wymagałaby deployu rules.
        void reportClientError(uid, {
          code: 'draft-save-total-failure',
          phase: 'other',
          detail: `stage=${error instanceof DraftSaveTotalFailure ? error.stage : 'unknown'} streak=${draftFailStreakRef.current}`,
        });
      }
      if (draftFailStreakRef.current === 1) {
        window.setTimeout(() => { void persistDraftSnapshot(overrides, options); }, 3000);
      } else {
        setSaveError(t('workout.err.localSaveFailed'));
        setAutoSaveStatus('error');
      }
      return null;
    }

    return draft;
  }, [buildDraftSnapshot, queueAutoSaveStatus, uid, t]);

  const saveDraftSnapshot = useCallback((overrides: Partial<ActiveWorkoutDraft> = {}) => {
    if (!sessionId || !dayId || !uid) return;
    void persistDraftSnapshot(overrides, { showStatus: true });
  }, [sessionId, dayId, uid, persistDraftSnapshot]);

  // Build exercises payload for batchSaveWorkout (reads from refs)
  const buildExercisesPayload = useCallback(() => (
    Object.entries(exerciseSetsRef.current).map(([exerciseId, sets]) => ({
      exerciseId,
      sets,
      ...(exerciseNotesRef.current[exerciseId] && { notes: exerciseNotesRef.current[exerciseId] }),
      ...((activeDraftRef.current?.exerciseNames?.[exerciseId] ?? daySnapshotRef.current.names[exerciseId])
        && { name: activeDraftRef.current?.exerciseNames?.[exerciseId] ?? daySnapshotRef.current.names[exerciseId] }),
      ...(exerciseMetricsRef.current[exerciseId] ?? {}),
    }))
  ), []);

  // Zależności silnika syncu — WorkoutDay jest tylko cienkim adapterem UI.
  const workoutSyncDeps = useMemo<WorkoutSyncDeps>(() => ({
    loadDraft: (ownerId, draftSessionId) => workoutDraftDb.loadDraft(ownerId, draftSessionId),
    saveWorkout: batchSaveWorkout,
    getFromServer: getWorkoutSessionFromServer,
    createSession: createWorkoutSession,
    markPromoted: (ownerId, remoteSessionId, fromSessionId, cloudState) =>
      workoutDraftDb.markPromotedToRemote(ownerId, remoteSessionId, fromSessionId, cloudState),
    markSynced: (ownerId, syncedAt, expectedDraftVersion, draftSessionId, cloudState) =>
      workoutDraftDb.markDraftSynced(ownerId, syncedAt, expectedDraftVersion, draftSessionId, cloudState),
    setCloudBaseline: (ownerId, draftSessionId, cloudState) =>
      workoutDraftDb.setCloudBaseline(ownerId, draftSessionId, cloudState),
    setPendingWrite: (ownerId, draftSessionId, pending) =>
      workoutDraftDb.setPendingWrite(ownerId, draftSessionId, pending),
    clearDraftIfVersion: (ownerId, draftSessionId, expectedVersion) =>
      workoutDraftDb.clearActiveDraftIfVersion(ownerId, draftSessionId, expectedVersion),
    queue: workoutSyncQueue,
  }), [batchSaveWorkout, getWorkoutSessionFromServer, createWorkoutSession]);

  const syncDraftToFirebase = useCallback(async (mode: 'checkpoint' | 'final'): Promise<{ success: boolean; skipped?: boolean; error?: string; draftRetained?: boolean }> => {
    if (!uid || !sessionId) {
      return { success: false, skipped: true };
    }

    const usesActiveDraftStore = activeDraftRef.current?.sessionId === sessionId;
    const currentDraft = usesActiveDraftStore
      ? activeDraftRef.current
      : queuedDraftRef.current?.sessionId === sessionId
        ? queuedDraftRef.current
        : null;
    const hasCurrentContent = hasDraftContent(
      exerciseSetsRef.current,
      exerciseNotesRef.current,
      dayNotesRef.current,
      skippedExercisesRef.current
    );
    const requiresFinalSync = mode === 'final' || !!currentDraft?.finalSyncPending;

    if (!requiresFinalSync) {
      if (!currentDraft?.dirty || !hasCurrentContent) {
        return { success: true, skipped: true };
      }
      // Silnik czyta treść z draftu — najpierw flush stanu React do IndexedDB.
      const persistedDraft = await persistDraftSnapshot({}, { showStatus: false });
      if (!persistedDraft) {
        return { success: false, error: t('workout.err.localSaveBeforeSync') };
      }
    }

    setAutoSaveStatus('syncing');

    const outcome = await syncWorkoutSession(uid, sessionId, mode, workoutSyncDeps);

    // Promocja provisional -> remote: odśwież tożsamość sesji w UI.
    if (outcome.promotedSessionId) {
      const promotedDraft = await workoutDraftDb.loadDraft(uid, outcome.promotedSessionId);
      if (promotedDraft) {
        activeDraftRef.current = promotedDraft;
        setActiveDraft(promotedDraft);
      }
      setSessionId(outcome.promotedSessionId);
      setQueuedDraft(prev => prev?.sessionId === sessionId ? null : prev);
      trackTelemetryEvent(uid, 'provisional_session_promoted');
    }
    const targetSessionId = outcome.sessionId;

    if (!outcome.success) {
      if (outcome.conflict) {
        // Z228: pobierz świeży cloud snapshot, zrób deterministyczny rebase per seria
        // i ponów zapis. Telemetria pozwala obserwować skalę konfliktów.
        void reportClientError(uid, {
          code: 'revision-conflict',
          phase: requiresFinalSync ? 'final' : 'checkpoint',
          detail: outcome.error,
          sessionId: targetSessionId,
        });
        if (shouldAutoResolveConflict(conflictAutoResolveAttemptsRef.current)) {
          conflictAutoResolveAttemptsRef.current += 1;
          trackTelemetryEvent(uid, 'revision_conflict_auto_resolved');
          setSaveError(null);
          setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'syncing');
          void keepLocalOnConflictRef.current?.();
          return { success: false, error: outcome.error };
        }
        // Limit wyczerpany (drugie urządzenie aktywnie pisze): zostajemy przy drafcie
        // po ostatnim rebase; danych nie tracimy, kolejny checkpoint ponowi zapis.
        setSaveError(t('workout.err.conflict'));
        setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'error');
        return { success: false, error: outcome.error };
      }
      if (classifyWorkoutSyncError(outcome.error) === 'offline') {
        setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'local-only');
        return { success: false, error: t('workout.err.offline') };
      }
      if (outcome.error?.startsWith('CLOUD_NOT_CONFIRMED')) {
        trackTelemetryEvent(uid, 'sync_validation_failed');
      } else {
        trackTelemetryEvent(uid, 'sync_failure');
      }
      setSaveError(describeSyncError(outcome.error));
      setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'error');
      void reportClientError(uid, {
        code: classifyWorkoutSyncError(outcome.error),
        phase: requiresFinalSync ? 'final' : 'checkpoint',
        detail: outcome.error,
        sessionId: targetSessionId,
      });
      return { success: false, error: outcome.error || t('workout.err.syncFailed') };
    }

    const syncedAt = Date.now();
    setSaveError(null);
    // Udany sync domyka sesję zapisu: limit auto-resolve liczy się od nowa.
    conflictAutoResolveAttemptsRef.current = 0;

    if (outcome.skipped) {
      // Brak draftu w IndexedDB = nic do zapisania (silnik sprzątnął referencję z kolejki).
      setAutoSaveStatus('idle');
      return { success: true, skipped: true };
    }

    if (requiresFinalSync) {
      if (outcome.draftRetained) {
        // Trening zapisany w chmurze, ale seria odhaczona w trakcie finalnego RTT
        // została w drafcie (dirty). Stan sesji zostaje; nadwyżkę dosyła kolejny
        // checkpoint albo ponowne "Zakończ trening".
        const retainedDraft = await workoutDraftDb.loadDraft(uid, targetSessionId);
        if (retainedDraft) {
          activeDraftRef.current = retainedDraft;
          setActiveDraft(retainedDraft);
          workoutSyncQueue.upsertFromDraft(retainedDraft, { lastError: 'DRAFT_RETAINED' });
        }
        setAutoSaveStatus('sync-pending');
        trackTelemetryEvent(uid, 'sync_success');
        return { success: true, draftRetained: true };
      }
      if (outcome.cleanupFailed) {
        setSaveError(t('workout.err.cloudSavedLocalCleanupFailed'));
      }
      setQueuedDraft(prev => prev?.sessionId === targetSessionId || prev?.sessionId === sessionId ? null : prev);
      setActiveDraft(null);
      setIsCompleted(true);
      completedSessionLockRef.current = targetSessionId;
      queueAutoSaveStatus('synced', 'idle', 2200);
      trackTelemetryEvent(uid, 'sync_success');
      trackTelemetryEvent(uid, 'action_workout_completed');
      return { success: true };
    }

    if (outcome.markSyncedFailed) {
      setSaveError(t('workout.err.cloudSavedStatusStale'));
    }
    if (activeDraftRef.current?.sessionId === targetSessionId || (usesActiveDraftStore && currentDraft)) {
      // Znaczniki nakładamy na BIEŻĄCY draft (edycje w trakcie syncu), nie na
      // snapshot sprzed syncu — inaczej cofnięta wersja cicho blokuje zapisy.
      const base = activeDraftRef.current?.sessionId === targetSessionId
        ? activeDraftRef.current
        : currentDraft!;
      const syncedDraft = applySyncMarkers(
        base,
        outcome.syncedDraftVersion ?? base.version,
        syncedAt,
        { updatedAt: outcome.updatedAt, revision: outcome.revision },
      );
      activeDraftRef.current = syncedDraft;
      setActiveDraft(prev => prev && prev.sessionId === syncedDraft.sessionId ? syncedDraft : prev);
    }
    queueAutoSaveStatus('synced', 'idle', 2200);
    trackTelemetryEvent(uid, 'sync_success');
    return { success: true };
  }, [uid, sessionId, workoutSyncDeps, persistDraftSnapshot, queueAutoSaveStatus, t, describeSyncError]);

  // Konflikt cross-device: rebase per seria według (updatedAt, updatedEventId),
  // następnie ponów zapis na świeżej rewizji. Ani cloud, ani lokalna nadwyżka nie giną.
  const keepLocalOnConflict = useCallback(async () => {
    if (!uid || !sessionId) return;
    try {
      const server = await getWorkoutSessionFromServer(sessionId);
      const current = activeDraftRef.current;
      if (!server || !current || current.sessionId !== sessionId) return;
      const merged = mergeDraftWithCloudWorkout(current, server);
      const saved = await persistDraftSnapshot({
        exerciseSets: merged.exerciseSets,
        exerciseNotes: merged.exerciseNotes,
        exerciseNames: merged.exerciseNames,
        exerciseMetrics: merged.exerciseMetrics,
        ...(server.updatedAt !== undefined ? { cloudUpdatedAt: server.updatedAt } : {}),
        cloudRevision: Math.max(0, Math.floor(server.revision ?? 0)),
      }, { showStatus: false });
      if (!saved) return;
      exerciseSetsRef.current = saved.exerciseSets;
      exerciseNotesRef.current = saved.exerciseNotes;
      exerciseMetricsRef.current = saved.exerciseMetrics;
      setExerciseSets(saved.exerciseSets);
      setExerciseNotes(saved.exerciseNotes);
      setExerciseMetrics(saved.exerciseMetrics);
      await syncDraftToFirebase(activeDraftRef.current?.finalSyncPending ? 'final' : 'checkpoint');
    } catch (err) {
      // Offline/timeout: zostajemy przy lokalnym drafcie, user widzi komunikat,
      // kolejny checkpoint ponowi zapis.
      setSaveError(describeSyncError(err));
      void reportClientError(uid, {
        code: classifyWorkoutSyncError(err),
        phase: 'conflict-resolve',
        detail: err instanceof Error ? err.message : String(err),
        sessionId,
      });
    }
  }, [uid, sessionId, getWorkoutSessionFromServer, persistDraftSnapshot, syncDraftToFirebase, describeSyncError]);
  // Funkcja jest zdefiniowana PO syncDraftToFirebase — gałąź konfliktu woła ją przez ref.
  keepLocalOnConflictRef.current = keepLocalOnConflict;

  const applyWorkoutState = useCallback((next: {
    sessionId: string | null;
    completed: boolean;
    exerciseSets: Record<string, SetData[]>;
    exerciseNotes: Record<string, string>;
    exerciseMetrics?: Record<string, ExerciseMetrics>;
    dayNotes: string;
    skippedExercises: string[];
    warmupChecked?: string[];
    sessionSwaps?: Record<string, { id: string; name: string; sets: string; videoUrl?: string }>;
  }) => {
    setSessionId(next.sessionId);
    setIsCompleted(next.completed);
    setExerciseSets(next.exerciseSets);
    setExerciseNotes(next.exerciseNotes);
    setExerciseMetrics(next.exerciseMetrics ?? {});
    setDayNotes(next.dayNotes);
    setSkippedExercises(next.skippedExercises);
    // Z162: brak pola = nowa/inna sesja → rozgrzewka startuje czysta.
    setWarmupChecked(next.warmupChecked ?? []);
    // Z185: swapy "tylko dziś" wracają z draftu po restarcie (persist w IDB/localStorage).
    setSessionSwaps(next.sessionSwaps ?? {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!uid) {
      setActiveDraft(null);
      setIsDraftLoaded(true);
      return;
    }

    setIsDraftLoaded(false);

    const loadDraft = async () => {
      const draft = routeSessionId
        ? await workoutDraftDb.loadDraft(uid, routeSessionId)
        : await workoutDraftDb.loadActiveDraft(uid);
      const resolvedDraft = draft ?? await workoutDraftDb.migrateFromLocalStorage(uid);
      if (!cancelled) {
        setActiveDraft(resolvedDraft);
        setIsDraftLoaded(true);
      }
    };

    void loadDraft();

    return () => {
      cancelled = true;
    };
  }, [uid, routeSessionId]);

  useEffect(() => {
    if (!uid || !dayId) {
      setQueuedDraft(null);
      return;
    }

    // Kolejka jest referencyjna — treść draftu zawsze z IndexedDB.
    const queueRef = workoutSyncQueue.findByDayDate(uid, dayId, targetDate);
    if (!queueRef) {
      setQueuedDraft(null);
      return;
    }
    let cancelled = false;
    void workoutDraftDb.loadDraft(uid, queueRef.sessionId).then(draftForRef => {
      if (!cancelled) setQueuedDraft(draftForRef);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, dayId, targetDate]);

  useEffect(() => {
    if (!sessionId) return;
    if (!navigator.storage?.persist) return;
    void navigator.storage.persist().catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!startSourcesReady || !dayId) return;

    const workoutForDate = findWorkoutForRoute(workouts, {
      dayId,
      date: targetDate,
      sessionId: routeSessionId,
      allowDateFallback: true,
      today,
    });
    const draftHasData = currentPageDraft
      ? hasDraftContent(
        currentPageDraft.exerciseSets,
        currentPageDraft.exerciseNotes,
        currentPageDraft.dayNotes,
        currentPageDraft.skippedExercises
      )
      : false;

    // Porównanie draft vs chmura obejmuje też notatkę dnia i skipy (R2-22):
    // draft z niedosłaną notatką zostaje jako dirty zamiast zniknąć.
    const completedWorkoutValidation = workoutForDate?.completed && currentPageDraft
      ? validateWorkoutCloudWrite(workoutForDate, buildDraftFinalExpectation(currentPageDraft))
      : null;

    // Decyzja hydracji w czystej funkcji (Z57) — efekt tylko wykonuje skutki.
    const hydration = resolveWorkoutHydration({
      workoutForDate: workoutForDate ?? null,
      draft: currentPageDraft,
      draftHasData,
      completedValidationOk: completedWorkoutValidation ? completedWorkoutValidation.ok : null,
    });

    if (hydration.clearDraft && currentPageDraft) {
      void workoutDraftDb.clearActiveDraft(uid, currentPageDraft.sessionId);
      setActiveDraft(null);
    }

    if (hydration.useDraft && currentPageDraft) {
      applyWorkoutState({
        sessionId: currentPageDraft.sessionId,
        completed: currentPageDraft.completedLocally || !!workoutForDate?.completed,
        exerciseSets: currentPageDraft.exerciseSets,
        exerciseNotes: currentPageDraft.exerciseNotes,
        exerciseMetrics: currentPageDraft.exerciseMetrics,
        dayNotes: currentPageDraft.dayNotes,
        skippedExercises: currentPageDraft.skippedExercises,
        warmupChecked: currentPageDraft.warmupChecked,
        sessionSwaps: currentPageDraft.sessionSwaps,
      });

      if (draftRecoveryDone.current !== currentPageDraft.sessionId && (draftHasData || currentPageDraft.finalSyncPending)) {
        draftRecoveryDone.current = currentPageDraft.sessionId;
        trackTelemetryEvent(uid, 'draft_recovered');
      }

      if (currentPageDraft.finalSyncPending) {
        setAutoSaveStatus('final-sync-pending');
      } else if (currentPageDraft.sessionOrigin === 'provisional') {
        setAutoSaveStatus('local-only');
      } else {
        setAutoSaveStatus(currentPageDraft.dirty ? 'sync-pending' : 'idle');
      }

      // Z47: po hydracji przewiń do ostatnio dotykanego ćwiczenia — ale świeża
      // zapisana pozycja scrolla ma pierwszeństwo (scroll-restore niżej).
      const lastTouched = currentPageDraft.lastTouchedExerciseId;
      const scrollGuardKey = uid ? `${uid}:${targetDate}` : null;
      if (lastTouched && !currentPageDraft.completedLocally && scrollGuardKey
        && lastTouchedScrollDone.current !== scrollGuardKey) {
        lastTouchedScrollDone.current = scrollGuardKey;
        const hasSavedScroll = (() => {
          try {
            const raw = localStorage.getItem(`workout-scroll:${scrollGuardKey}`);
            if (!raw) return false;
            const { y, t: savedAt } = JSON.parse(raw) as { y: number; t: number };
            return typeof y === 'number' && y > 0 && Date.now() - savedAt <= 15 * 60 * 1000;
          } catch { return false; }
        })();
        if (!hasSavedScroll) {
          [300, 900].forEach(delay => {
            setTimeout(() => {
              document.getElementById(`exercise-card-${lastTouched}`)?.scrollIntoView({ block: 'center' });
            }, delay);
          });
        }
      }
      return;
    }

    if (workoutForDate) {
      if (workoutForDate.completed && completedSessionLockRef.current === workoutForDate.id) {
        completedSessionLockRef.current = null;
      }
      if (completedSessionLockRef.current === workoutForDate.id && !workoutForDate.completed) {
        return;
      }

      const sets: Record<string, SetData[]> = {};
      const notes: Record<string, string> = {};
      const metrics: Record<string, ExerciseMetrics> = {};
      workoutForDate.exercises.forEach(ex => {
        sets[ex.exerciseId] = ex.sets.map(s => ({
          reps: s.reps ?? 0,
          weight: s.weight ?? 0,
          completed: s.completed ?? false,
          ...(s.isWarmup && { isWarmup: true }),
        }));
        if (ex.notes) {
          notes[ex.exerciseId] = ex.notes;
        }
        if (ex.rpe !== undefined || ex.pain !== undefined || ex.quality !== undefined) {
          metrics[ex.exerciseId] = {
            ...(ex.rpe !== undefined && { rpe: ex.rpe }),
            ...(ex.pain !== undefined && { pain: ex.pain }),
            ...(ex.quality !== undefined && { quality: ex.quality }),
          };
        }
      });

      if (!workoutsFromCache) {
        // Baseline rewizji TYLKO z serwera — stale cache po zimnym starcie
        // seedowałby konflikt z nowszą rewizją serwera (audyt 3.5).
        cloudMetaRef.current = {
          sessionId: workoutForDate.id,
          updatedAt: workoutForDate.updatedAt,
          revision: workoutForDate.revision,
        };
      }
      applyWorkoutState({
        sessionId: workoutForDate.id,
        completed: workoutForDate.completed,
        exerciseSets: sets,
        exerciseNotes: notes,
        exerciseMetrics: metrics,
        dayNotes: workoutForDate.notes || '',
        skippedExercises: workoutForDate.skippedExercises || [],
      });
      return;
    }

    applyWorkoutState({
      sessionId: null,
      completed: false,
      exerciseSets: {},
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
    });
  }, [startSourcesReady, dayId, workouts, workoutsFromCache, targetDate, routeSessionId, currentPageDraft, applyWorkoutState, uid, today]);

  // Naprawia wyłącznie jednoznaczne osierocenie: dokładnie jeden cykl obejmuje datę
  // istniejącej sesji. Transakcja w createWorkoutSession chroni przed zmianą tożsamości.
  useEffect(() => {
    if (!startSourcesReady || !uid || !dayId || !workoutForDate || workoutForDate.cycleId) return;
    const matchingCycle = findUniqueCycleForDate(cycles, workoutForDate.date);
    if (!matchingCycle) return;
    const repairKey = `${workoutForDate.id}:${matchingCycle.id}`;
    if (cycleRepairAttemptRef.current === repairKey) return;
    cycleRepairAttemptRef.current = repairKey;

    void createWorkoutSession(dayId, workoutForDate.date, matchingCycle.id).then(async (result) => {
      if (!result.session || result.session.cycleId !== matchingCycle.id) return;
      cloudMetaRef.current = {
        sessionId: result.session.id,
        updatedAt: result.session.updatedAt,
        revision: result.session.revision,
      };
      if (activeDraftRef.current?.sessionId === result.session.id) {
        await persistDraftSnapshot({
          cycleId: matchingCycle.id,
          cloudUpdatedAt: result.session.updatedAt,
          cloudRevision: result.session.revision,
        }, { showStatus: false });
      } else if (workoutSyncQueue.findBySessionId(uid, result.session.id)) {
        // Naprawa podbiła revision na serwerze — draft czekający w kolejce
        // musi dostać świeży baseline, inaczej retry rzuci fałszywy konflikt.
        await workoutDraftDb.setCloudBaseline(uid, result.session.id, {
          revision: result.session.revision,
          updatedAt: result.session.updatedAt,
        }).catch(() => undefined);
      }
    }).catch(err => console.error('cycle repair failed', err));
  }, [
    startSourcesReady,
    uid,
    dayId,
    workoutForDate,
    cycles,
    createWorkoutSession,
    persistDraftSnapshot,
  ]);

  // Autostart workout when navigating with ?autostart=true
  useEffect(() => {
    if (!autostart || autostartDone.current || !startSourcesReady || !day) return;
    if (isViewingPastWorkout || isCompleted) return;

    autostartDone.current = true;

    // Z141: parametr znika z URL po konsumpcji — wpis historii z ?autostart=true
    // przestaje restartować żywą sesję przy powrocie (back) z /plan/edit.
    const strippedParams = stripAutostartParam(searchParams);
    if (strippedParams) setSearchParams(strippedParams, { replace: true });

    const decision = shouldAutostartWorkout({ autostart, sessionId, draftForPage: currentPageDraft });

    if (decision === 'scroll-only') {
      // Session already exists, just scroll to first exercise
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    // resume: draft z treścią dla tej strony — hydracja robi swoje, bez handleStartWorkout
    if (decision !== 'start') return;

    // Auto-start the workout and scroll
    handleStartWorkout().then(() => {
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart, startSourcesReady, day, isViewingPastWorkout, isCompleted, sessionId]);

  // Z175: najświeższe wersje callbacków dla cleanupu unmount (efekt z pustymi deps
  // widziałby wersje z PIERWSZEGO renderu).
  const persistDraftSnapshotRef = useRef(persistDraftSnapshot);
  const syncDraftToFirebaseRef = useRef(syncDraftToFirebase);
  useEffect(() => {
    persistDraftSnapshotRef.current = persistDraftSnapshot;
    syncDraftToFirebaseRef.current = syncDraftToFirebase;
  }, [persistDraftSnapshot, syncDraftToFirebase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (periodicSaveTimer.current) clearInterval(periodicSaveTimer.current);
      // Z175: wyjście z ekranu treningu = fire-and-forget flush draftu + checkpoint
      // dla sesji provisional/dirty. Bez tego promocja provisional czekała, aż user
      // WRÓCI do treningu (baner offline wisiał na Dashboardzie mimo sieci).
      const draft = activeDraftRef.current;
      if (draft && !draft.finalSyncPending && (draft.dirty || draft.sessionOrigin === 'provisional')) {
        void persistDraftSnapshotRef.current({}, { showStatus: false })
          .then(() => syncDraftToFirebaseRef.current('checkpoint'))
          .catch(() => { /* best effort — kolejny checkpoint/AutoSync ponowi */ });
      }
    };
  }, []);

  // Periodic Firebase checkpoint — best effort sync, not source of truth
  const periodicSaveTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!sessionId || (!currentPageDraft?.dirty && !currentPageDraft?.finalSyncPending)) {
      if (periodicSaveTimer.current) clearInterval(periodicSaveTimer.current);
      return;
    }

    // Z175: pierwszy checkpoint sesji provisional po 15 s (promocja od razu, gdy
    // jest sieć), potem normalny rytm 5 min. Po promocji sessionOrigin='remote'
    // → efekt się przezbraja i timeout znika.
    let firstProvisionalCheckpoint: NodeJS.Timeout | null = null;
    if (currentPageDraft?.sessionOrigin === 'provisional') {
      firstProvisionalCheckpoint = setTimeout(() => {
        void syncDraftToFirebase('checkpoint');
      }, PROVISIONAL_FIRST_CHECKPOINT_MS);
    }

    periodicSaveTimer.current = setInterval(() => {
      void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
    }, CHECKPOINT_INTERVAL_MS);

    return () => {
      if (firstProvisionalCheckpoint) clearTimeout(firstProvisionalCheckpoint);
      if (periodicSaveTimer.current) clearInterval(periodicSaveTimer.current);
    };
  }, [sessionId, currentPageDraft?.dirty, currentPageDraft?.finalSyncPending, currentPageDraft?.sessionOrigin, syncDraftToFirebase]);

  // Flush local draft and try best-effort sync when app goes to background.
  // Przy okazji zapisujemy pozycję scrolla — iOS WKWebView potrafi przeładować stronę w tle,
  // co bez tego cofa ekran na sam początek listy ćwiczeń.
  // Klucz per user+data (NIE per sessionId): promocja provisional→remote zmienia sessionId
  // w trakcie treningu i zapis pod starym kluczem stawał się nieodnajdywalny.
  const scrollStorageKey = uid ? `workout-scroll:${uid}:${targetDate}` : null;
  useEffect(() => {
    const saveScroll = () => {
      if (!sessionId || !scrollStorageKey) return;
      try {
        localStorage.setItem(scrollStorageKey, JSON.stringify({ y: window.scrollY, t: Date.now() }));
      } catch { /* localStorage niedostępny — pomijamy */ }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionId) {
        saveScroll();
        void persistDraftSnapshot({}, { showStatus: false });
        void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
      }
    };
    const handlePageHide = () => {
      if (!sessionId) return;
      saveScroll();
      void persistDraftSnapshot({}, { showStatus: false });
      void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    // Z48: na natywnym iOS webowe eventy bywają zawodne — appStateChange z @capacitor/app
    // jest źródłem prawdy o tle. Webowe handlery zostają (PWA); duplikat flusha to no-op
    // (saveActiveDraft z tą samą wersją gate'owany przez latestWriteVersions).
    const removeAppStateListener = addAppStateListener((isActive) => {
      if (isActive) {
        // Z177: powrót na pierwszy plan — ponów blokadę ekranu ŻYWEJ sesji
        // (iOS zdejmuje idle-timer w tle; lib dodatkowo pilnuje intencji held).
        if (sessionId && !isCompleted) void keepScreenAwake();
        return;
      }
      if (!sessionId) return;
      saveScroll();
      void persistDraftSnapshot({}, { showStatus: false });
      void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
    });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      removeAppStateListener();
    };
  }, [sessionId, isCompleted, scrollStorageKey, currentPageDraft?.finalSyncPending, persistDraftSnapshot, syncDraftToFirebase]);

  // Po remount/reloadzie (iOS purguje WebView w tle) ORAZ po powrocie z tła przywróć pozycję
  // scrolla — user wraca do ćwiczenia, które robił, a nie na początek. Tylko świeży zapis (<15 min).
  // Pojedynczy scrollTo po 250ms zawodził: lista ćwiczeń po reloadzie jeszcze się renderuje,
  // strona jest za niska i scroll clampuje do zera — dlatego ponawiamy, aż strona urośnie.
  useEffect(() => {
    if (!sessionId || !workoutsLoaded || isCompleted || !scrollStorageKey) return;

    const readSavedY = (): number | null => {
      try {
        const raw = localStorage.getItem(scrollStorageKey);
        if (!raw) return null;
        const { y, t } = JSON.parse(raw) as { y: number; t: number };
        if (typeof y !== 'number' || y <= 0 || Date.now() - t > 15 * 60 * 1000) return null;
        return y;
      } catch { return null; }
    };

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const restoreWithRetry = (y: number) => {
      [250, 700, 1500, 2600].forEach(delay => {
        timeouts.push(setTimeout(() => {
          if (Math.abs(window.scrollY - y) < 24) return;
          const maxY = document.documentElement.scrollHeight - window.innerHeight;
          if (maxY >= y - 24) window.scrollTo({ top: y, behavior: 'auto' });
        }, delay));
      });
    };

    const initialY = readSavedY();
    if (initialY !== null) restoreWithRetry(initialY);

    // Powrót z tła bez remountu: iOS potrafi wyzerować scroll mimo żywej strony.
    const handleVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const y = readSavedY();
      if (y !== null && y > 200 && window.scrollY < 100) restoreWithRetry(y);
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      timeouts.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [sessionId, workoutsLoaded, isCompleted, scrollStorageKey]);

  useEffect(() => {
    const handleOnline = () => {
      const draft = activeDraftRef.current;
      if (!sessionId || !draft) return;
      if (draft.finalSyncPending) {
        void syncDraftToFirebase('final');
        return;
      }
      if (draft.dirty) {
        void syncDraftToFirebase('checkpoint');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sessionId, syncDraftToFirebase]);

  useEffect(() => {
    const shouldBlockPwaUpdate = Boolean(sessionId)
      && (!isCompleted || !!currentPageDraft?.dirty || !!currentPageDraft?.finalSyncPending);

    setPwaUpdateBlocked(shouldBlockPwaUpdate);

    return () => {
      setPwaUpdateBlocked(false);
    };
  }, [sessionId, isCompleted, currentPageDraft?.dirty, currentPageDraft?.finalSyncPending]);

  // Warn before closing with unsaved data
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sessionId && (activeDraftRef.current?.dirty || activeDraftRef.current?.finalSyncPending)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionId, isCompleted]);

  const handleStartWorkout = async () => {
    if (!day || !uid || !startSourcesReady) return;
    // Hard paywall (iOS): start treningu wymaga PRO/trialu; historia zostaje do odczytu.
    if (requiresPaywall) {
      navigate('/paywall');
      return;
    }
    if (isViewingPastWorkout) {
      toast({
        title: t('workout.toast.cantStartTitle'),
        description: t('workout.toast.cantStartPastDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsExplicitSaving(true);
    setSaveError(null);
    trackTelemetryEvent(uid, 'action_workout_started');

    try {
      const startSnapshot = buildWorkoutStartSnapshot(day, targetDate, cycles);
      const shouldStartOffline = !navigator.onLine;
      const createRemoteWorkoutSession = () => Promise.race([
        createWorkoutSession(startSnapshot.day.id, startSnapshot.date, startSnapshot.activeCycleId ?? undefined),
        new Promise<{ session: null; error: string }>(resolve => {
          setTimeout(() => resolve({ session: null, error: 'network-timeout' }), 2000);
        }),
      ]);
      let result = shouldStartOffline
        ? {
          session: createOfflineWorkoutSession(
            startSnapshot.day.id,
            startSnapshot.date,
            startSnapshot.activeCycleId ?? undefined,
          ),
          existing: false,
          provisional: true,
        }
        : await createRemoteWorkoutSession();

      if (!shouldStartOffline && (result.error || !result.session)) {
        const normalizedError = String(result.error || '').toLowerCase();
        const canFallbackToOffline = normalizedError.includes('offline')
          || normalizedError.includes('network')
          || normalizedError.includes('unavailable')
          || normalizedError.includes('failed-precondition');

        if (canFallbackToOffline) {
          result = {
            session: createOfflineWorkoutSession(
              startSnapshot.day.id,
              startSnapshot.date,
              startSnapshot.activeCycleId ?? undefined,
            ),
            existing: false,
            provisional: true,
          };
        }
      }

      if (result.error || !result.session) {
        setSaveError(result.error || t('workout.err.createFailed'));
        toast({
          title: t('workout.toast.errorTitle'),
          description: result.error || t('workout.toast.startFailedDesc'),
          variant: "destructive",
        });
        return;
      }

      const buildStartPrefill = (exercise: StartExerciseLike) => {
        const target = weeklyTargets?.[exercise.id];
        return createPrefilledSets(
          target?.targetSets ?? parseSetCount(exercise.sets),
          getPreviousSets(exercise.id, exercise.name),
          resolveIsBodyweight(exercise.name),
          target ? { weight: target.targetWeight, reps: target.targetReps } : null,
        );
      };

      if (result.existing) {
        cloudMetaRef.current = {
          sessionId: result.session.id,
          updatedAt: result.session.updatedAt,
          revision: result.session.revision,
        };
        setSessionId(result.session.id);
        setIsCompleted(false);
        // Wznowienie istniejącej sesji: uzupełnij ćwiczenia, których jeszcze nie ma
        // w stanie (incydent 2026-07-20 — bez tego draft miał tylko dotknięte
        // ćwiczenie). Istniejących danych NIE ruszamy. Draft z bazy jest źródłem
        // prawdy — ref bywa pusty na świeżym mouncie (Z141.2, wyścig z hydracją).
        const { sets: filled, added } = buildStartExerciseSets({
          exercises: startSnapshot.day.exercises,
          draftSets: currentPageDraft?.exerciseSets ?? null,
          stateSets: exerciseSetsRef.current,
          buildPrefill: buildStartPrefill,
        });
        if (added) {
          setExerciseSets(filled);
          saveDraftSnapshot({ exerciseSets: filled });
        }
        if (watchStartEventId) await ackWatchEvents([watchStartEventId]);
        toast({
          title: t('workout.toast.continueTitle'),
          description: t('workout.toast.continueDesc'),
        });
      } else {
        // Z141.2: żywy draft tej strony NIE jest budowany od zera — adoptujemy go
        // (serie, notatki, startedAt, wersja zostają), aktualizując tylko tożsamość
        // sesji i cloud-meta. Bez tego gałąź existing=false deterministycznie
        // wymazywała odhaczone serie (incydent 2026-07-24).
        const adoptableDraft = currentPageDraft && draftHasLiveContent(currentPageDraft)
          ? currentPageDraft
          : null;
        // Pre-fill with progression from previous workout (Z120: cel tygodnia,
        // deload-week redukuje też liczbę serii) — tylko dla brakujących ćwiczeń.
        const { sets: prefilled } = buildStartExerciseSets({
          exercises: startSnapshot.day.exercises,
          draftSets: adoptableDraft?.exerciseSets ?? null,
          stateSets: {},
          buildPrefill: buildStartPrefill,
        });
        setExerciseSets(prefilled);
        setExerciseNotes(adoptableDraft?.exerciseNotes ?? {});
        setDayNotes(adoptableDraft?.dayNotes ?? '');
        setSkippedExercises(adoptableDraft?.skippedExercises ?? []);
        setWarmupChecked(adoptableDraft?.warmupChecked ?? []);
        if (adoptableDraft) setExerciseMetrics(adoptableDraft.exerciseMetrics);

        const initialDraft = buildStartDraft({
          uid,
          session: {
            sessionId: result.session.id,
            provisional: !!result.provisional,
            cloudUpdatedAt: result.session.updatedAt,
            cloudRevision: result.session.revision,
          },
          snapshot: startSnapshot,
          adoptedDraft: adoptableDraft,
          sets: prefilled,
          now: Date.now(),
        });

        const savedDraft = await persistDraftSnapshot(initialDraft, { showStatus: true });
        if (!savedDraft) {
          setSaveError(t('workout.err.localSaveFailed'));
          toast({
            title: t('workout.toast.errorTitle'),
            description: t('workout.toast.localSecureFailedDesc'),
            variant: "destructive",
          });
          return;
        }

        setSessionId(result.session.id);
        setIsCompleted(false);
        // startWorkout is acknowledged only after the phone owns a durable
        // session/draft. A crash before this point leaves it in the Watch queue.
        if (watchStartEventId) await ackWatchEvents([watchStartEventId]);
        if (result.provisional) {
          trackTelemetryEvent(uid, 'provisional_session_started');
        }
        toast({
          title: result.provisional ? t('workout.toast.startedOfflineTitle') : t('workout.toast.startedTitle'),
          description: result.provisional
            ? t('workout.toast.startedOfflineDesc', {
              day: localizeDayName(startSnapshot.day.dayName, lang),
              focus: localizeFocus(startSnapshot.day.focus, lang),
            })
            : `${localizeDayName(startSnapshot.day.dayName, lang)} - ${localizeFocus(startSnapshot.day.focus, lang)}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('workout.err.unknown');
      setSaveError(errorMessage);
      toast({
        title: t('workout.toast.errorTitle'),
        description: t('workout.toast.startFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsExplicitSaving(false);
    }
  };

  // Handler for EDIT MODE - only local state, no Firebase saves
  const handleSetsChangeLocal = useCallback((exerciseId: string, sets: SetData[], notes?: string) => {
    const sanitizedSets = stampChangedWatchSets(exerciseSetsRef.current[exerciseId], sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
      ...(s.isWarmup && { isWarmup: true }),
      ...carrySetExtras(s),
    })), Date.now(), newPhoneSetEventId());
    const nextExerciseSets = { ...exerciseSetsRef.current, [exerciseId]: sanitizedSets };
    exerciseSetsRef.current = nextExerciseSets;
    setExerciseSets(nextExerciseSets);
    if (notes !== undefined) {
      const nextExerciseNotes = { ...exerciseNotesRef.current, [exerciseId]: notes };
      exerciseNotesRef.current = nextExerciseNotes;
      setExerciseNotes(nextExerciseNotes);
    }
  }, []);

  // Runna p.1 (spec A4): baza do PR na żywo — poprzednie UKOŃCZONE sesje bez
  // bieżącej; ref, żeby handleSetsChange (useCallback) widział świeże dane.
  const livePRSourceWorkouts = useMemo(
    () => workouts.filter(w => w.completed && w.id !== sessionId),
    [workouts, sessionId],
  );
  const livePRSourceRef = useRef(livePRSourceWorkouts);
  livePRSourceRef.current = livePRSourceWorkouts;

  // Spec A5: backfill rekordów sprzed instalacji — baseline detekcji PR
  // (max z historią w apce), zmapowany na id ćwiczeń bieżącego dnia.
  const backfillByExerciseId = useMemo(() => {
    const map = new Map<string, number>();
    const backfill = profile?.prBackfill;
    if (backfill && day) {
      for (const exercise of day.exercises) {
        const weight = backfillWeightForExercise(exercise.name, backfill);
        if (weight > 0) map.set(exercise.id, weight);
      }
    }
    return map;
  }, [profile?.prBackfill, day]);
  const backfillRef = useRef(backfillByExerciseId);
  backfillRef.current = backfillByExerciseId;

  // Handler for ACTIVE WORKOUT - saves locally to IndexedDB, Firebase only on checkpoints/finish
  const handleSetsChange = useCallback((exerciseId: string, sets: SetData[], notes?: string) => {
    const sanitizedSets = stampChangedWatchSets(exerciseSetsRef.current[exerciseId], sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
      ...(s.isWarmup && { isWarmup: true }),
      ...carrySetExtras(s),
    })), Date.now(), newPhoneSetEventId());
    // Runna p.1 (spec A4): PR na żywo — porównanie ze stanem SPRZED tej zmiany
    // (exerciseSetsRef jeszcze nie zaktualizowany).
    // Spec A5: baseline = max(historia w apce, backfill sprzed instalacji).
    const bestBefore = Math.max(
      bestPreviousWeight(livePRSourceRef.current, exerciseId),
      backfillRef.current.get(exerciseId) ?? 0,
    );
    const livePR = detectLiveWeightPR({
      previousSets: exerciseSetsRef.current[exerciseId],
      nextSets: sanitizedSets,
      bestBefore,
    });

    const nextExerciseSets = { ...exerciseSetsRef.current, [exerciseId]: sanitizedSets };
    const nextExerciseNotes = notes !== undefined
      ? { ...exerciseNotesRef.current, [exerciseId]: notes }
      : exerciseNotesRef.current;

    // Z144: ref aktualizowany SYNCHRONICZNIE — onRestStart odpala się w tym samym
    // kliknięciu co onSetsChange i musi widzieć właśnie odhaczoną serię (efekt
    // mirrorujący ref zdąży dopiero po renderze).
    exerciseSetsRef.current = nextExerciseSets;
    setExerciseSets(nextExerciseSets);
    if (notes !== undefined) {
      setExerciseNotes(nextExerciseNotes);
    }

    saveDraftSnapshot({
      exerciseSets: nextExerciseSets,
      exerciseNotes: nextExerciseNotes,
      lastTouchedExerciseId: exerciseId,
    });

    setSaveError(null);

    if (livePR !== null) {
      setLivePRWeights(prev => (prev[exerciseId] ?? 0) >= livePR ? prev : { ...prev, [exerciseId]: livePR });
      setLivePRPending({ exerciseId, weight: livePR, bestBefore });
    }
  }, [saveDraftSnapshot]);

  // Celebracja PR na żywo poza handlerem serii: świeże t/fmt/day bez poszerzania
  // zależności useCallback (wzorzec ref + pending state). Jedna celebracja per
  // ćwiczenie per sesja; badge zostaje do końca treningu.
  useEffect(() => {
    if (!livePRPending) return;
    const { exerciseId, weight, bestBefore } = livePRPending;
    setLivePRPending(null);
    if (livePRToastedRef.current.has(exerciseId)) return;
    livePRToastedRef.current.add(exerciseId);
    const name = day?.exercises.find(e => e.id === exerciseId)?.name ?? '';
    // FIX-B T2: pełnoekranowy overlay z konfetti zamiast toastu; delta jak w PRO-C T4.
    setLivePRCelebration({
      name: localizeExerciseName(name, lang),
      value: fmt(weight),
      delta: `+${fmt(Math.round((weight - bestBefore) * 10) / 10)}`,
    });
    void hapticSuccess();
  }, [livePRPending, day, lang, fmt]);

  // Apple Watch: serie zalogowane na zegarku trafiają do draftu jak ręczne zmiany.
  const handleWatchSetLogged = useCallback(async (event: WatchSetLoggedEvent) => {
    // Z122: zegarek prowadzi sesję HKWorkout (z tętnem) — telefon nie dubluje zapisu Health.
    if (event.hkSession) watchHkSessionRef.current = true;
    const current = exerciseSetsRef.current[event.exerciseId];
    if (!current || event.setIndex < 0 || event.setIndex >= current.length) return;
    const merged = mergeWatchSetEvent(current, event);
    if (!merged.applied) return;
    const next = merged.sets;
    setExerciseSets(nextSets => ({ ...nextSets, [event.exerciseId]: next }));
    const saved = await persistDraftSnapshot({
      exerciseSets: { ...exerciseSetsRef.current, [event.exerciseId]: next },
      lastTouchedExerciseId: event.exerciseId,
    });
    if (!saved) {
      // Seria z zegarka nie może zniknąć po cichu (R2-26): user widzi błąd, telemetria
      // go rejestruje, a rzucony błąd zostawia event w natywnej kolejce do retry.
      toast({
        title: t('workout.toast.watchSetErrorTitle'),
        description: t('workout.toast.watchSetErrorDesc'),
        variant: 'destructive',
      });
      void reportClientError(uid, {
        code: 'watch-set-persist-failed',
        phase: 'other',
        detail: `exercise=${event.exerciseId} setIndex=${event.setIndex}`,
        sessionId: sessionId ?? undefined,
      });
      throw new Error('WATCH_DRAFT_PERSIST_FAILED');
    }
    toast({
      title: t('workout.toast.watchSetLoggedTitle'),
      description: t('workout.toast.watchSetLoggedDesc'),
    });
  }, [persistDraftSnapshot, toast, t, uid, sessionId]);

  // handleCompleteWorkout jest zdefiniowany niżej — ref omija TDZ i exhaustive-deps.
  const completeWorkoutRef = useRef<(() => Promise<void>) | null>(null);
  const handleWatchWorkoutFinished = useCallback(async (event?: { hkSession?: boolean }) => {
    if (event?.hkSession) watchHkSessionRef.current = true;
    toast({
      title: t('workout.toast.watchFinishedTitle'),
      description: t('workout.toast.watchFinishedDesc'),
    });
    // User potwierdził zakończenie na zegarku — finalizujemy bez drugiego dialogu.
    await completeWorkoutRef.current?.();
  }, [toast, t]);

  const handleWatchWorkoutDiscarded = useCallback(async () => {
    if (!sessionId) throw new Error('WATCH_DISCARD_WITHOUT_SESSION');
    const result = await deleteWorkoutEverywhere(uid, sessionId);
    if (!result.success) {
      toast({ title: t('history.deleteFailed'), description: result.error, variant: 'destructive' });
      throw new Error(result.error ?? 'WATCH_DISCARD_FAILED');
    }
    toast({ title: t('history.deleted') });
    navigate('/');
  }, [sessionId, uid, toast, t, navigate]);

  // Z122: etykiety celu tygodnia i przypięte notatki dla zegarka (gotowe stringi,
  // zegarek nie liczy nic sam).
  const watchTargetLabels = useMemo(() => {
    if (!weeklyTargets || !day) return undefined;
    const out: Record<string, string> = {};
    for (const ex of day.exercises) {
      const target = weeklyTargets[ex.id];
      if (!target || target.kind === 'start') continue;
      const head = target.targetSets != null && target.targetReps != null
        ? `${target.targetSets}×${target.targetReps}`
        : target.targetReps != null ? `×${target.targetReps}` : '';
      const value = [
        head,
        target.targetWeight != null && target.targetWeight > 0
          ? `${Math.round(toDisplay(target.targetWeight) * 10) / 10} ${unit}`
          : null,
        target.targetDurationSec != null ? formatDurationSec(target.targetDurationSec) : null,
      ].filter(Boolean).join(' · ');
      if (value) out[ex.id] = `${t('card.weekTarget')}: ${value}`;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [weeklyTargets, day, toDisplay, unit, t]);

  const watchPinnedNotes = useMemo(() => {
    if (!day) return undefined;
    const out: Record<string, string> = {};
    for (const ex of day.exercises) {
      const note = getPinnedNote(ex.name);
      const text = [note?.note, note?.machineSettings].filter(Boolean).join(' · ');
      if (text) out[ex.id] = text;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [day, getPinnedNote]);

  const watchTrackingTypes = useMemo(() => day ? Object.fromEntries(
    day.exercises.map((exercise) => [exercise.id, resolveTracking(exercise.name)]),
  ) : undefined, [day, resolveTracking]);

  useWatchWorkoutSync({
    enabled: isActiveTrainingPhase(sessionPhase) && !isViewingPastWorkout,
    uid,
    ...(sessionId ? { sessionId } : {}),
    date: targetDate,
    dayId: day?.id,
    dayName: day?.dayName,
    focus: day?.focus,
    exercises: day?.exercises,
    exerciseSets,
    targetLabels: watchTargetLabels,
    pinnedNotes: watchPinnedNotes,
    trackingTypes: watchTrackingTypes,
    lang,
    capability: watchCapability,
    onSetLogged: handleWatchSetLogged,
    onWorkoutFinished: handleWatchWorkoutFinished,
    onWorkoutDiscarded: handleWatchWorkoutDiscarded,
  });

  // Metryki (RPE/ból/jakość) — tryb edycji: tylko stan lokalny.
  const handleMetricsChangeLocal = useCallback((exerciseId: string, metrics: ExerciseMetrics) => {
    setExerciseMetrics(prev => ({ ...prev, [exerciseId]: metrics }));
  }, []);

  // Metryki — aktywny trening: stan + draft (Firebase na checkpointach/zakończeniu).
  const handleMetricsChange = useCallback((exerciseId: string, metrics: ExerciseMetrics) => {
    const nextMetrics = { ...exerciseMetricsRef.current, [exerciseId]: metrics };
    setExerciseMetrics(nextMetrics);
    saveDraftSnapshot({ exerciseMetrics: nextMetrics, lastTouchedExerciseId: exerciseId });
    setSaveError(null);
  }, [saveDraftSnapshot]);

  const handleDayNotesChange = useCallback((value: string) => {
    setDayNotes(value);
    saveDraftSnapshot({ dayNotes: value });
  }, [saveDraftSnapshot]);

  // Z129.2: menu ⋯ w karcie. Sygnatura z exerciseId + useCallback — inaczej każda
  // karta dostaje nową lambdę i memo() przestaje działać (re-render bomba R2-07).
  const handleRequestSwap = useCallback((exerciseId: string) => {
    setSwapExerciseId(exerciseId);
  }, []);

  // Z162: odhaczenie pozycji rozgrzewki = zmiana treści draftu (przeżywa zamknięcie
  // dialogu, wyjście z ekranu i powrót z tła).
  const toggleWarmupItem = useCallback((nameKey: string) => {
    setWarmupChecked(prev => {
      const next = prev.includes(nameKey) ? prev.filter(key => key !== nameKey) : [...prev, nameKey];
      warmupCheckedRef.current = next;
      saveDraftSnapshot({ warmupChecked: next });
      return next;
    });
  }, [saveDraftSnapshot]);

  const handleSkipExercise = useCallback((exerciseId: string) => {
    if (isExerciseFullyCompleted(exerciseSetsRef.current[exerciseId])) {
      return;
    }
    setSkippedExercises(prev => {
      if (prev.includes(exerciseId)) return prev;
      const newSkipped = [...prev, exerciseId];
      saveDraftSnapshot({ skippedExercises: newSkipped });
      return newSkipped;
    });

    toast({
      title: t('workout.toast.skippedTitle'),
      description: t('workout.toast.skippedDesc'),
    });
  }, [saveDraftSnapshot, toast, t]);

  const handleRetrySync = async () => {
    if (!currentPageDraft?.finalSyncPending) return;

    setIsExplicitSaving(true);
    trackTelemetryEvent(uid, 'sync_retry_manual');
    const result = await syncDraftToFirebase('final');
    setIsExplicitSaving(false);

    if (result.skipped) {
      // Kontrakt Z23: skipped przychodzi z success:true (nic do zrobienia / inny sync
      // w toku). Bez toastu "zsynchronizowano" — nic nie zostało zapisane (R2-32).
      return;
    }

    if (!result.success) {
      toast({
        title: t('workout.toast.noSyncTitle'),
        description: t('workout.toast.noSyncDesc'),
        variant: "destructive",
      });
      return;
    }

    if (result.draftRetained) {
      // Treść dopisana w trakcie zapisu została w drafcie — dosyłka kolejnym syncem.
      toast({
        title: t('workout.toast.savedLocallyTitle'),
        description: t('workout.toast.savedLocallyDesc'),
      });
      return;
    }

    toast({
      title: t('workout.toast.syncDoneTitle'),
      description: t('workout.toast.syncDoneDesc'),
    });
  };

  const handleRetryLocalSave = async () => {
    setIsExplicitSaving(true);
    const saved = await persistDraftSnapshot({}, { showStatus: true });
    setIsExplicitSaving(false);
    if (saved) setSaveError(null);
  };

  const handleDiscardLocalDraft = async () => {
    const targetSessionId = currentPageDraft?.sessionId ?? sessionId;
    if (!targetSessionId) return;

    try {
      await workoutDraftDb.clearActiveDraft(uid, targetSessionId);
      workoutSyncQueue.remove(uid, targetSessionId);
      if (activeDraftRef.current?.sessionId === targetSessionId) {
        activeDraftRef.current = null;
        setActiveDraft(null);
      }
      setQueuedDraft(current => current?.sessionId === targetSessionId ? null : current);
      setSaveError(null);
      setAutoSaveStatus('idle');
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      toast({
        title: t('strava.toastDraftDiscardedTitle'),
        description: t('strava.toastDraftDiscardedDesc'),
      });
      navigate('/');
    } catch {
      toast({
        title: t('strava.toastDiscardFailTitle'),
        description: t('strava.tryAgainShortly'),
        variant: 'destructive',
      });
    }
  };

  const handleCompleteWorkout = async () => {
    if (!sessionId || !uid || !day) return;
    if (isCompleted || isExplicitSaving) return;

    // Trening bez ANI JEDNEJ odhaczonej serii nie ma czego zapisać: walidacja finalna
    // odrzuci go jako 'empty-final-payload' i draft zawiesi się na zawsze z banerem
    // "czeka na synchronizację" (incydent 2026-07-20 — pusty szybki trening).
    if (!hasAnyCompletedSet(exerciseSets)) {
      setShowCompleteConfirm(false);
      toast({
        title: t('workout.toast.emptyWorkoutTitle'),
        description: t('workout.toast.emptyWorkoutDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsExplicitSaving(true);
    setSaveError(null);

    const finalizedAt = activeDraftRef.current?.finalizedAt ?? Date.now();

    const flushedDraft = await persistDraftSnapshot({ finalizedAt }, { showStatus: false });
    if (!flushedDraft) {
      setIsExplicitSaving(false);
      toast({
        title: t('workout.toast.localSaveErrorTitle'),
        description: t('workout.toast.localSaveErrorDesc'),
        variant: "destructive",
      });
      return;
    }

    const result = await syncDraftToFirebase('final');

    if (result.skipped) {
      // Kontrakt Z23: skipped przychodzi z success:true (nic do zrobienia / inny
      // sync w toku) — to nie błąd; user może ponowić (R2-32).
      setIsExplicitSaving(false);
      return;
    }

    if (result.success && result.draftRetained) {
      // Seria odhaczona w trakcie zapisu końcowego: sesja zostaje aktywna,
      // user domyka trening ponownym "Zakończ trening" (nadwyżka nie ginie).
      setIsExplicitSaving(false);
      setShowCompleteConfirm(false);
      toast({
        title: t('workout.toast.savedLocallyTitle'),
        description: t('workout.toast.savedLocallyDesc'),
      });
      return;
    }

    if (!result.success) {
      const now = Date.now();
      const latestDraft = activeDraftRef.current;
      const pendingDraft = await persistDraftSnapshot({
        ...(latestDraft && {
          sessionId: latestDraft.sessionId,
          sessionOrigin: latestDraft.sessionOrigin,
          remoteSessionId: latestDraft.remoteSessionId,
          cloudUpdatedAt: latestDraft.cloudUpdatedAt,
          cloudRevision: latestDraft.cloudRevision,
        }),
        completedLocally: true,
        finalSyncPending: true,
        finalizedAt,
        dirty: true,
        updatedAt: now,
      }, { showStatus: false });

      if (pendingDraft) {
        workoutSyncQueue.upsertFromDraft(pendingDraft, { lastError: result.error || 'final-sync-pending' });
        trackTelemetryEvent(uid, 'final_sync_pending');
        trackTelemetryEvent(uid, 'sync_queue_enqueued');
        setIsCompleted(true);
        setJustCompleted(true);
        setShowCompleteConfirm(false);
        setAutoSaveStatus('final-sync-pending');
        completedSessionLockRef.current = sessionId;
        setQueuedDraft(pendingDraft);
        setSaveError(null);
        toast({
          title: t('workout.toast.savedLocallyTitle'),
          description: t('workout.toast.savedLocallyDesc'),
        });
      } else {
        setSaveError(t('workout.err.saveAllFailed'));
        toast({
          title: t('workout.toast.localSaveErrorTitle'),
          description: t('workout.toast.bothFailedDesc'),
          variant: "destructive",
        });
      }
      setIsExplicitSaving(false);
      return;
    }

    setIsCompleted(true);
    setJustCompleted(true);
    completedSessionLockRef.current = sessionId;
    setIsExplicitSaving(false);
    setShowCompleteConfirm(false);
    // Z82: notification-success przy ukończeniu treningu (natywnie; web no-op).
    void hapticSuccess();

    // Z116: zapis do Apple Health (fire-and-forget, no-op poza iOS / gdy wyłączone).
    // Z122: gdy sesję HKWorkout prowadził zegarek (tętno, kalorie), telefon nie dubluje wpisu.
    if (!watchHkSessionRef.current) {
      syncWorkoutToHealth(uid, {
        id: sessionId,
        userId: uid,
        dayId: dayId ?? '',
        date: targetDate,
        completed: true,
        exercises: [],
        ...(activeDraftRef.current?.startedAt && { startedAt: activeDraftRef.current.startedAt }),
        completedAt: Date.now(),
      });
    }

    // Z83: natywna prośba o ocenę po kamieniach ukończonych treningów (5., 15., 30. ...),
    // max raz na 60 dni. Fire-and-forget — system i tak sam decyduje, czy pokazać dialog.
    if (Capacitor.isNativePlatform()) {
      const completedCount = workouts.filter(w => w.completed && w.id !== sessionId).length + 1;
      const nowMs = Date.now();
      if (shouldRequestReview(completedCount, readLastReviewPromptAt(), nowMs)) {
        markReviewPromptShown(nowMs);
        void InAppReview.requestReview().catch(() => undefined);
      }
    }

    // Detect new PRs
    const currentWorkoutData = workouts.find(w => w.id === sessionId);
    if (currentWorkoutData && day && sessionId) {
      // Kamienie milowe (niżej) liczą się względem wszystkich pozostałych
      // ukończonych treningów — bez filtra chronologicznego PR-ów.
      const previousWorkoutsForPR = workouts.filter(w => w.id !== sessionId && w.completed);
      // E-T1: ta sama deterministyczna ścieżka co widok ukończony (session-prs).
      const effectivePRs = computeSessionPRs({
        sessionId,
        exerciseSets,
        workouts,
        dayExercises: day.exercises,
        resolveIsBodyweight,
        resolveTracking,
        bodyWeightKg: getLatestMeasurement()?.weight ?? null,
        backfillWeightOf: id => backfillByExerciseId.get(id) ?? 0,
      });
      if (effectivePRs.length > 0) {
        const prNames = effectivePRs.map(pr => pr.exerciseName).join(', ');
        toast({
          title: t('workout.toast.newPRTitle', { n: effectivePRs.length }),
          description: prNames,
        });
        // B-T6: PR-y idą do serwerowego inboxa (user_events). Klucz z dayId+date
        // +exerciseId+typ: Watch/Garmin/drugi telefon/późny sync dają JEDEN wpis.
        effectivePRs.forEach((pr) => {
          void emitUserEvent(uid, {
            type: 'pr',
            key: prEventKey(dayId ?? 'adhoc', targetDate, pr.exerciseId, pr.type),
            payload: { name: pr.exerciseName, prType: pr.type, newValue: pr.newValue },
            deepLink: '/achievements',
          });
        });
      } else {
        toast({
          title: t('workout.toast.savedTitle'),
          description: t('workout.toast.savedSyncedDesc'),
        });
      }

      // PRO-D T5: świeży kamień milowy → wpis 'badge' w inboxie. Statystyki liczone
      // z już załadowanej listy (zero odczytów). Kategorie workouts+tonnage; records
      // wymaga pipeline'u rekordów ekranu Postępów, a PR-y i tak lądują jako 'pr'.
      const sessionForStats = {
        ...currentWorkoutData,
        completed: true,
        exercises: Object.entries(exerciseSets).map(([id, sets]) => ({ exerciseId: id, sets })),
      };
      const statsBefore = {
        completedWorkouts: previousWorkoutsForPR.length,
        totalTonnage: calculateTonnage(previousWorkoutsForPR),
        exercisesWithRecord: 0,
      };
      const statsAfter = {
        completedWorkouts: statsBefore.completedWorkouts + 1,
        totalTonnage: statsBefore.totalTonnage + calculateTonnage([sessionForStats]),
        exercisesWithRecord: 0,
      };
      // B-T6: kamienie milowe są życiowe, więc klucz badge-kategoria-próg jest
      // idempotentny globalnie (drugie urządzenie nie zdubluje odznaki).
      diffMilestones(computeMilestones(statsBefore), computeMilestones(statsAfter))
        .filter((m) => m.category !== 'records')
        .forEach((m) => {
          void emitUserEvent(uid, {
            type: 'badge',
            key: badgeEventKey(m.category, m.threshold),
            payload: { category: m.category, threshold: m.threshold },
            deepLink: '/achievements',
          });
        });
    } else {
      toast({
        title: t('workout.toast.savedTitle'),
        description: t('workout.toast.savedSyncedDesc'),
      });
    }
  };
  completeWorkoutRef.current = handleCompleteWorkout;

  // Po ukończeniu treningu zegarek dostaje noWorkout (pokazuje stan "po treningu"),
  // zamiast wisieć na ostatnim aktywnym payloadzie.
  useEffect(() => {
    if (!isCompleted || isViewingPastWorkout) return;
    void sendWorkoutToWatch({ type: 'noWorkout', date: targetDate, sentAt: Date.now() });
  }, [isCompleted, isViewingPastWorkout, targetDate]);

  const handleFinishEditing = async () => {
    if (!sessionId) {
      toast({
        title: t('workout.toast.errorTitle'),
        description: t('workout.toast.noSessionDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsExplicitSaving(true);
    setSaveError(null);

    // Baseline rewizji z serwera w momencie zapisu (edycja to jawna akcja,
    // +1 RTT akceptowalny; eliminuje stale cache jako źródło konfliktu).
    let expectedRevision = 0;
    try {
      const serverWorkout = await getWorkoutSessionFromServer(sessionId);
      if (!serverWorkout) {
        setIsExplicitSaving(false);
        setSaveError(t(workoutSyncErrorMessageKey('WORKOUT_NOT_FOUND')));
        toast({ title: t('workout.toast.errorTitle'), description: t('workout.toast.saveChangesFailedDesc'), variant: "destructive" });
        return;
      }
      expectedRevision = Math.max(0, Math.floor(serverWorkout.revision ?? 0));
    } catch (err) {
      setIsExplicitSaving(false);
      setSaveError(describeSyncError(err));
      toast({ title: t('workout.toast.errorTitle'), description: t('workout.toast.saveChangesFailedDesc'), variant: "destructive" });
      return;
    }

    const result = await batchSaveWorkout(sessionId, buildExercisesPayload(), {
      notes: dayNotes,
      skippedExercises: skippedExercises.length > 0 ? skippedExercises : undefined,
      dayName: daySnapshotRef.current.dayName || undefined,
      dayFocus: daySnapshotRef.current.focus || undefined,
      expectedRevision,
      // Edycja: baseline świeżo z serwera, każdy klik "Zapisz" to nowa treść.
      writeId: crypto.randomUUID(),
    });

    setIsExplicitSaving(false);

    if (!result.success) {
      setSaveError(t(workoutSyncErrorMessageKey(result.error)));
      void reportClientError(uid, {
        code: classifyWorkoutSyncError(result.error),
        phase: 'edit',
        detail: result.error,
        sessionId,
      });
      toast({
        title: t('workout.toast.errorTitle'),
        description: t('workout.toast.saveChangesFailedDesc'),
        variant: "destructive",
      });
    } else {
      cloudMetaRef.current = { sessionId, updatedAt: result.updatedAt, revision: result.revision };
      toast({
        title: t('workout.toast.savedShortTitle'),
        description: t('workout.toast.changesSavedDesc'),
      });
      setIsEditing(false);
    }
  };

  // Get previous sets for a specific exercise
  const getPreviousSets = (exerciseId: string, exerciseName?: string): SetData[] | undefined => {
    if (watchQuickExercise?.id === exerciseId) {
      return Array.from({ length: watchQuickExercise.setCount }, () => ({
        reps: watchQuickExercise.reps,
        weight: watchQuickExercise.weight,
        completed: false,
      }));
    }
    const ex = previousWorkout?.exercises.find(e => e.exerciseId === exerciseId);
    if (ex?.sets && ex.sets.length > 0) return ex.sets;
    // Nowy cykl = nowe id — dopasuj po nazwie (snapshot w historii).
    return exerciseName ? previousSetsByName.get(exerciseName) : undefined;
  };

  if (!startSourcesReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!day) {
    return (
      <div className="py-12 text-center">
        <h1 className="font-heading text-2xl font-bold">{t('workout.dayNotFound')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('workout.dayNotFoundHint')}</p>
        <Button variant="link" onClick={() => navigate('/plan')}>
          {t('workout.backToPlan')}
        </Button>
      </div>
    );
  }

  const isWorkoutStarted = sessionId !== null;
  const isFinalSyncPending = !!currentPageDraft?.finalSyncPending;


  // Calculate stats from exerciseSets
  const exerciseCount = Object.keys(exerciseSets).length;
  const completedSetsCount = Object.values(exerciseSets).reduce(
    (total, sets) => total + sets.filter(s => s.completed && !s.isWarmup).length,
    0
  );
  // Czas trwania do podsumowania: trwały durationSec z zapisanej sesji, a dla świeżo
  // zakończonego lokalnie treningu fallback ze znaczników draftu (finalizedAt/startedAt).
  const currentWorkoutForDuration = workouts.find(w => w.id === sessionId);
  const durationFromTimestamps = currentWorkoutForDuration?.completedAt && currentWorkoutForDuration?.startedAt
    ? Math.max(0, Math.floor((currentWorkoutForDuration.completedAt - currentWorkoutForDuration.startedAt) / 1000))
    : null;
  // Z142: ten sam clamp co przy finalizacji w silniku — kafel "Czas" pokazuje to,
  // co pójdzie do Firestore (duration do ostatniej realnej aktywności).
  const draftDurationSec = computeEffectiveDurationSec({
    startedAt: currentPageDraft?.startedAt,
    finalizedAt: currentPageDraft?.finalizedAt,
    lastActivityAt: currentPageDraft?.lastActivityAt,
  }) ?? null;
  const sessionDurationSec = currentWorkoutForDuration?.durationSec ?? durationFromTimestamps ?? draftDurationSec;

  const DraftStatusNotice = () => {
    if (isFinalSyncPending && dismissedDraftNoticeSessionId !== sessionId) {
      return (
        <WorkoutDraftStatusNotice
          kind="final-sync-pending"
          busy={isExplicitSaving}
          onRetry={() => { void handleRetrySync(); }}
          onDiscard={() => { void handleDiscardLocalDraft(); }}
          onDismiss={() => setDismissedDraftNoticeSessionId(sessionId)}
        />
      );
    }
    if (!saveError) return null;
    const isTotalLocalSaveError = saveError === t('workout.err.localSaveFailed')
      || saveError === t('workout.err.saveAllFailed');
    if (!isTotalLocalSaveError) {
      return <WorkoutErrorNotice message={saveError} onDismiss={() => setSaveError(null)} />;
    }
    return (
      <WorkoutDraftStatusNotice
        kind="save-error"
        message={saveError}
        busy={isExplicitSaving}
        onRetry={() => { void handleRetryLocalSave(); }}
        onDiscard={() => { void handleDiscardLocalDraft(); }}
        onDismiss={() => setSaveError(null)}
      />
    );
  };

  // Auto-save indicator: dwa proste stany dla usera ("Zapisano" / "W chmurze")
  // plus czerwony błąd. Wewnętrzne statusy (7 wartości) zostają tylko logiką.
  // Fala 2 (2026-08-20): pigułka w prawym slocie headera zamiast fixed top-4 right-4
  // (mockup exercise-card 2a); pełny stan z godziną w title/aria-label.
  const AutoSaveIndicator = () => {
    if (autoSaveStatus === 'error') {
      return (
        <button
          type="button"
          onClick={() => setSaveError(t('workout.err.localSaveFailed'))}
          className="flex min-h-10 touch-manipulation items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-2 text-[11px] text-destructive"
        >
          <CloudOff className="h-3 w-3" /> {t('workout.status.error')}
        </button>
      );
    }
    if (!isActiveTrainingPhase(sessionPhase)) return null;
    const lastCloudSync = activeDraft?.lastFirebaseSyncAt ?? null;
    const cloudCurrent = !!lastCloudSync && !activeDraft?.dirty;
    const fullLabel = cloudCurrent
      ? t('workout.status.cloudSaved', { time: new Date(lastCloudSync).toLocaleTimeString(dateLocale(lang), { hour: '2-digit', minute: '2-digit' }) })
      : t('workout.status.localSaved');
    return (
      <div
        title={fullLabel}
        aria-label={fullLabel}
        className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-2 text-[11px] text-muted-foreground"
      >
        {cloudCurrent ? <Cloud className="h-3 w-3 text-fitness-success" /> : <Smartphone className="h-3 w-3" />}
        {cloudCurrent ? t('workout.status.savedCloudShort') : t('workout.status.savedShort')}
      </div>
    );
  };

  // Z161: usunięcie zapisanego treningu — przez deleteWorkoutEverywhere (jak Historia).
  const handleDeleteWorkout = async () => {
    if (!sessionId) return;
    setIsDeletingWorkout(true);
    const result = await deleteWorkoutEverywhere(uid, sessionId);
    setIsDeletingWorkout(false);
    setShowDeleteConfirm(false);
    if (result.success) {
      toast({ title: t('history.deleted') });
      navigate('/history');
    } else {
      toast({ title: t('history.deleteFailed'), description: result.error, variant: 'destructive' });
    }
  };

  // COMPLETED VIEW (not editing)
  if (isCompleted && !isEditing) {
    // Runna p.1 (spec A1): podsumowanie liczone deterministycznie z danych sesji.
    const completionSummary = computeCompletionSummary({
      exerciseSets,
      dayExercises: day.exercises,
      skippedExercises,
      workouts,
      sessionId,
      dayId: day.id,
    });
    const handleSessionRate = (rating: WorkoutSessionRating, reasons: WorkoutSessionRatingReason[]) => {
      if (!sessionId) return;
      // Fire-and-forget: offline updateDoc rozstrzyga się dopiero po reconnect,
      // a brak/utrata oceny = brak sygnału, nic nie wisi (reguła #6).
      void saveWorkoutSessionRating(db, sessionId, rating, reasons).catch(() => {});
    };
    // Spec A3: edycja z podsumowania przez istniejący tryb edycji. Gasimy
    // justCompleted, żeby po powrocie z edycji celebracja nie wróciła zombie.
    const handleEditFromSummary = () => {
      setJustCompleted(false);
      setIsEditing(true);
    };
    // E-T1: PR-y liczone z DANYCH przy każdym renderze — remount (wejście z
    // Historii, restart appki, powrót po share) pokazuje te same PR-y co moment
    // zakończenia. Wcześniej: useState ustawiany tylko w przepływie finish = 0.
    const derivedSessionPRs = sessionId ? computeSessionPRs({
      sessionId,
      exerciseSets,
      workouts,
      dayExercises: day.exercises,
      resolveIsBodyweight,
      resolveTracking,
      bodyWeightKg: getLatestMeasurement()?.weight ?? null,
      backfillWeightOf: id => backfillByExerciseId.get(id) ?? 0,
    }) : [];
    // Spec A4: PR-y sesji jako teksty na share card (hero 'Rekord').
    const sharePRLabels = derivedSessionPRs.map(pr => pr.type === 'reps'
      ? `${pr.exerciseName} ×${pr.newValue}`
      : pr.type === 'duration'
        ? `${pr.exerciseName} ${fmtDuration(pr.newValue)}`
        : `${pr.exerciseName} ${fmt(pr.newValue)}`);
    // Fala 2 (plan/summary.md par. 2.4-2.5): tonaż per ćwiczenie liczony RAZ —
    // zasila pasek rankingowy listy i split "Gdzie poszedł tonaż".
    const tonnageByExerciseId = new Map(day.exercises.map((exercise) => {
      const sets = exerciseSets[exercise.id] || [];
      const tonnageKg = sets
        .filter((s) => s.completed && !s.isWarmup)
        .reduce((sum, s) => sum + s.reps * s.weight, 0);
      return [exercise.id, tonnageKg] as const;
    }));
    const maxExerciseTonnageKg = Math.max(0, ...tonnageByExerciseId.values());
    // Kategoria: biblioteka → własne ćwiczenia → fallback primaryMuscle → null
    // ("Inne"; zero zmyślonych grup dla nierozpoznanych nazw).
    const resolveVolumeCategory = (name: string): string | null => {
      const lib = exerciseLibrary.find((e) => e.name === name);
      if (lib) return lib.category;
      const custom = customExercises.find((e) => e.name === name);
      if (custom?.category) return custom.category;
      const details = getExerciseDetails(name, 'pl');
      if (details) return primaryMuscleToCategory[details.primaryMuscle] ?? null;
      return null;
    };
    const volumeSplitBuckets = completionSummary.volumeKg > 0
      ? computeVolumeSplit(
        day.exercises.map((exercise) => ({
          name: exercise.name,
          tonnageKg: tonnageByExerciseId.get(exercise.id) ?? 0,
        })),
        resolveVolumeCategory,
      )
      : [];
    const summaryDateLabel = parseLocalDate(targetDate)
      .toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' });
    const summarySubtitle = [localizeFocus(day.focus, lang), summaryDateLabel]
      .filter(Boolean).join(' · ');
    return (
      <div className="space-y-6 pb-20">
        {/* Fala 2 (mockup 1a): kwadratowy wstecz + tytuł z datą + Edit w pigułce. */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 shrink-0 rounded-2xl bg-surface-container"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-xl font-bold leading-tight">
              {localizeDayName(day.dayName, lang)}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{summarySubtitle}</p>
          </div>
          {!isFinalSyncPending && (
            <button type="button" className="chip-mono shrink-0" onClick={handleEditFromSummary}>
              <Pencil className="h-3 w-3" />
              {t('dash.edit')}
            </button>
          )}
        </div>

        <DraftStatusNotice />

        <WorkoutCompletionSequence
          justCompleted={justCompleted}
          summary={completionSummary}
          durationSec={sessionDurationSec}
          fmtTonnage={fmtTonnage}
          fmtWeight={fmt}
          fmtDuration={fmtDuration}
          prs={derivedSessionPRs}
          onRate={handleSessionRate}
          onEditSets={isFinalSyncPending ? undefined : handleEditFromSummary}
        >

        {dayNotes && (
          <div className="rounded-xl bg-surface-low p-3.5">
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dayNotes}</p>
            </div>
          </div>
        )}

        {/* Fala 2 (par. 2.4): split tonażu po grupach — tylko gdy >=2 kubełki
            (WorkoutVolumeSplit sam się nie renderuje przy mniejszej liczbie). */}
        <WorkoutVolumeSplit buckets={volumeSplitBuckets} />

        {/* Fala 2 (par. 2.5): lista ćwiczeń jako ranking tonażu — te same dane
            i stany (skipped, licznik serii, expand), nowa prezentacja. */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between pb-1">
            <span className="eyebrow-mono text-muted-foreground">
              {t('workout.completion.exercisesCount', { n: exerciseCount })}
            </span>
            <span className="eyebrow-mono text-muted-foreground">
              {t('workout.completion.statTonnage')}
            </span>
          </div>
          {day.exercises.map((exercise) => {
            const isSkipped = skippedExercises.includes(exercise.id);
            const sets = exerciseSets[exercise.id] || [];
            // B-T1: metryki podsumowania z serii roboczych, spójne z nagłówkiem strony.
            const completed = sets.filter(s => s.completed && !s.isWarmup);
            const totalWeight = tonnageByExerciseId.get(exercise.id) ?? 0;
            const isMaxTonnage = totalWeight > 0 && totalWeight === maxExerciseTonnageKg;
            const incompleteSets = !isSkipped && completed.length < sets.length;
            const canExpand = !isSkipped && sets.length > 0;
            const isExpanded = expandedSummaryIds.has(exercise.id);
            const toggleExpand = () => setExpandedSummaryIds((prev) => {
              const next = new Set(prev);
              if (next.has(exercise.id)) next.delete(exercise.id);
              else next.add(exercise.id);
              return next;
            });

            return (
              <div key={exercise.id} className={cn(isSkipped && "opacity-50")}>
                <button
                  type="button"
                  onClick={toggleExpand}
                  disabled={!canExpand}
                  className="flex w-full items-center gap-3 py-2.5 text-left disabled:cursor-default"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                        {localizeExerciseName(exercise.name, lang)}
                      </span>
                      <span className={cn(
                        "shrink-0 font-mono text-[10px]",
                        incompleteSets ? "text-fitness-warning" : "text-muted-foreground/70",
                      )}>
                        {isSkipped
                          ? t('dayplan.badgeMissed')
                          : t('workout.setsProgress', { done: completed.length, total: sets.length })}
                      </span>
                    </div>
                    {maxExerciseTonnageKg > 0 && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={cn("h-full rounded-full", isMaxTonnage ? "bg-primary" : "bg-primary/40")}
                          style={{ width: `${(totalWeight / maxExerciseTonnageKg) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "w-[52px] shrink-0 text-right font-mono text-xs font-semibold tabular-nums",
                    isMaxTonnage ? "text-primary" : "text-foreground/80",
                  )}>
                    {Math.round(toDisplay(totalWeight)).toLocaleString(dateLocale(lang))}
                  </span>
                  {canExpand ? (
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform",
                      isExpanded && "rotate-180",
                    )} />
                  ) : (
                    <span className="w-4 shrink-0" aria-hidden />
                  )}
                </button>

                {canExpand && isExpanded && (
                  <div className="border-t border-surface-high px-1 py-2 space-y-1.5">
                    {sets.map((set, si) => (
                      <div
                        key={si}
                        className={cn(
                          "flex items-center justify-between text-sm tabular-nums",
                          !set.completed && "opacity-40",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          {set.isWarmup ? (
                            <span className="flex items-center gap-1 text-[hsl(var(--ec-warmup-gold))]">
                              <Flame className="h-3 w-3" />
                              {t('workout.warmupShort')}
                            </span>
                          ) : (
                            t('workout.setLabel', { n: si + 1 })
                          )}
                        </span>
                        <span className="font-bold text-foreground">
                          {set.weight > 0
                            ? `${set.reps} × ${fmt(set.weight)}`
                            : t('card.repsValue', { n: set.reps })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              className="h-12 flex-1 rounded-2xl bg-surface-container"
              onClick={() => setShowShare(true)}
            >
              <Share2 className="h-4 w-4" />
              {t('comp.share.share')}
            </Button>
            {/* H-T1: pełny button zamiast samej ikony (sama koperta była za mało
                widoczna). Układ 2+1: Wróć schodzi pod spód, rząd mieści się na 390px. */}
            <Button
              variant="secondary"
              className="h-12 flex-1 rounded-2xl bg-surface-container"
              onClick={() => setShowEmailDialog(true)}
              data-testid="workout-email"
            >
              <Mail className="h-4 w-4" />
              {t('email.sendToCoach')}
            </Button>
          </div>
          {/* X17D Z140.3: powrót z ukończonego treningu odpala confetti na Dashboardzie.
              Ten sam wzorzec co ?welcome=1 po onboardingu — AppHeader ukryty na
              /workout/*, więc świętowanie musi wydarzyć się PO nawigacji. */}
          {/* Fala 2 (2026-08-20, tokens.md par. 2.8): CTA hero podsumowania tej samej
              wielkości i klasy co "Zakończ trening" (wymóg właściciela: h-14 + kinetic). */}
          <Button
            size="lg"
            className="kinetic-primary-button h-14 w-full text-base hover:brightness-105"
            onClick={() => navigate('/?celebrate=1')}
          >
            <Home className="h-4 w-4" />
            {t('workout.backToDashboard')}
          </Button>
        </div>

        {/* Z161: usunięcie zapisanego treningu — user szukał tej opcji właśnie tutaj. */}
        {sessionId && (
          <Button
            variant="ghost"
            className="w-full gap-1.5 text-destructive hover:text-destructive"
            data-testid="workout-delete"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t('history.delete')}
          </Button>
        )}
        </WorkoutCompletionSequence>

        <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false); }}>
          <AlertDialogContent data-testid="workout-delete-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('history.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('history.deleteDesc', { day: localizeDayName(day.dayName, lang), date: targetDate })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingWorkout}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                data-testid="workout-delete-confirm"
                disabled={isDeletingWorkout}
                onClick={(event) => { event.preventDefault(); void handleDeleteWorkout(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingWorkout ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                {t('history.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ShareWorkoutDialog
          data={{
            dayName: day.dayName,
            date: targetDate,
            exercises: day.exercises.map(ex => {
              const sets = exerciseSets[ex.id] || [];
              const completed = sets.filter(s => s.completed && !s.isWarmup);
              const maxW = completed.length > 0 ? Math.max(...completed.map(s => s.weight)) : 0;
              return { name: ex.name, sets: maxW > 0 ? `${completed.length}x ${fmt(maxW)}` : t('workout.setsCount', { n: completed.length }) };
            }),
            tonnage: Object.values(exerciseSets).reduce(
              (t, sets) => t + sets.filter(s => s.completed && !s.isWarmup).reduce((s, set) => s + set.reps * set.weight, 0), 0
            ),
            duration: sessionDurationSec != null ? fmtDuration(sessionDurationSec) : '',
            prs: sharePRLabels,
            streak: calculateStreak(workouts),
            completedSets: completedSetsCount,
            // Pasek "Tydzień N z M" tylko dla dnia z planu (ad-hoc bez cyklu).
            week: !isAdhocDay && planDurationWeeks > 0
              ? { current: Math.max(1, currentWeek), total: planDurationWeeks }
              : null,
          }}
          open={showShare}
          onOpenChange={setShowShare}
        />

        {sessionId && (
          <EmailWorkoutDialog
            open={showEmailDialog}
            onOpenChange={setShowEmailDialog}
            mode="workout"
            uid={uid}
            workoutId={sessionId}
            initialEmail={profile?.preferences?.trainerEmail}
          />
        )}
      </div>
    );
  }

  // EDIT MODE
  if (isCompleted && isEditing) {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{localizeDayName(day.dayName, lang)}</h1>
            <p className="text-muted-foreground">{t('workout.editMode')}</p>
          </div>
        </div>

        <DraftStatusNotice />

        <div className="space-y-4">
          {day.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index + 1}
              savedSets={exerciseSets[exercise.id]}
              savedNotes={exerciseNotes[exercise.id]}
              onSetsChange={handleSetsChangeLocal}
              isEditable={true}
              isBodyweight={resolveIsBodyweight(exercise.name)}
              historicalBest={exerciseInsights.get(exercise.id)?.historicalBest}
              metrics={exerciseMetrics[exercise.id]}
              onMetricsChange={healthConsent ? handleMetricsChangeLocal : undefined}
              defaultMetricsVisible={exercise.instructions?.some((i) => i.content.includes('RPE'))}
              pinnedNote={getPinnedNote(exercise.name)}
              onPinnedNoteSave={savePinnedNote}
              trackingType={resolveTracking(exercise.name)}
            />
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('workout.dayNoteLabel')}</span>
          </div>
          <textarea
            value={dayNotes}
            onChange={e => setDayNotes(e.target.value)}
            placeholder={t('workout.dayNotePlaceholder')}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Button
          className="bg-fitness-success hover:bg-fitness-success/90"
          onClick={handleFinishEditing}
          disabled={isExplicitSaving}
        >
          {isExplicitSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          {t('workout.saveChanges')}
        </Button>
      </div>
    );
  }

  // ACTIVE WORKOUT VIEW
  // Padding dolny: miejsce na sticky REST (aktywna przerwa) i fixed CTA startu
  // (pre-start) + safe-area — FINISH w przepływie nie może chować się pod paskiem.
  return (
    <div className="space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Fala 2 (2026-08-20, mockup exercise-card 2a): header wstecz · tytuł ·
          rozgrzewka + badge Saved (AutoSaveIndicator przeniesiony z fixed). */}
      <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-2xl bg-surface-container">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="truncate font-heading text-sm font-bold uppercase tracking-[0.16em]">{localizeDayName(day.dayName, lang)}</h1>
          <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{localizeFocus(day.focus, lang)}</p>
        </div>
        <div className="flex min-w-10 items-center justify-end gap-2">
          {isWorkoutStarted && !isCompleted && (
            <Button variant="ghost" size="icon" onClick={() => setShowWarmup(true)} className="h-10 w-10 rounded-full bg-surface-container" aria-label={t('comp.warmup.title')}>
              <Flame className="h-4 w-4 text-[hsl(var(--ec-warmup-gold))]" />
            </Button>
          )}
          <AutoSaveIndicator />
        </div>
      </div>

      {/* Z131: Czas / Objętość / Serie w JEDNYM zwartym rzędzie (wzorzec Hevy).
          Dwa duże kafelki StatCard zjadały pionową przestrzeń nad pierwszą kartą,
          a liczby serii sesji nie pokazywały w ogóle.
          Fala 2: karta surface-container, etykiety mono, wartości font-heading. */}
      {isWorkoutStarted && !isCompleted && (
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-container px-4 py-3" data-testid="session-stats">
          <div className="min-w-0 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{t('workout.statTime')}</p>
            <p className="mt-0.5 truncate font-heading text-[19px] font-bold tabular-nums text-primary">
              {sessionClockStartedAt !== null ? <SessionClock startedAt={sessionClockStartedAt} /> : fmtDuration(0)}
            </p>
          </div>
          <div className="min-w-0 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{t('dash.stat.tonnage')}</p>
            <p className="mt-0.5 truncate font-heading text-[19px] font-bold tabular-nums">{fmt(sessionVolumeKg)}</p>
          </div>
          <div className="min-w-0 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{t('workout.statSets')}</p>
            <p className="mt-0.5 truncate font-heading text-[19px] font-bold tabular-nums">{sessionCompletedSets}</p>
          </div>
        </div>
      )}

      <DraftStatusNotice />

      {/* C-T2: prompt pre-start — sesja powstaje DOKŁADNIE raz, po decyzji. */}
      <Dialog open={preStartOpen} onOpenChange={setPreStartOpen}>
        <DialogContent className="max-w-sm" data-testid="prestart-sheet">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('warmup.prestart.title')}</DialogTitle>
            <DialogDescription>{t('warmup.prestart.desc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              className="kinetic-primary-button w-full"
              data-testid="prestart-yes"
              disabled={isExplicitSaving}
              onClick={() => {
                setPreStartOpen(false);
                void handleStartWorkout().then(() => setShowWarmup(true));
              }}
            >
              {t('warmup.prestart.yes')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              data-testid="prestart-skip"
              disabled={isExplicitSaving}
              onClick={() => {
                setPreStartOpen(false);
                void handleStartWorkout();
              }}
            >
              {t('warmup.prestart.skip')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warmup dialog */}
      <WarmupRoutineDialog
        focus={day.focus}
        plan={preStartPlan}
        open={showWarmup}
        onOpenChange={setShowWarmup}
        checked={warmupCheckedSet}
        onToggle={toggleWarmupItem}
      />

      {/* Past date without workout — T10: tylko daty PRZESZŁE (dla przyszłego
          treningu z planu karta "brak zapisanego treningu" była myląca). */}
      {shouldShowNoWorkoutCard({ isWorkoutStarted, targetDateISO: targetDate, todayISO: today }) && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('workout.noWorkoutForDate')}</p>
            <Button variant="link" onClick={() => navigate('/plan')} className="mt-2">
              {t('workout.backToPlan')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* T10: notatka do dnia treningu — pełna edycja dla przyszłej daty
          (planowanie), widoczna i edytowalna też dziś przed startem i w trakcie
          (ten widok renderuje się tylko dla !isCompleted). Daty przeszłe bez
          sekcji (tam obowiązuje karta noWorkoutForDate). */}
      {(isFutureDate || !isViewingPastWorkout) && (
        <WorkoutDayNoteSection
          dateISO={targetDate}
          dayNote={getDayNote(targetDate)}
          onSave={saveDayNote}
          showFutureHint={isFutureDate}
        />
      )}

      {/* Today without workout - show start button (nigdy na ukończonym treningu) */}
      <div className="space-y-4">
        {day.exercises.filter(ex => !(isWorkoutStarted && !isCompleted && skippedExercises.includes(ex.id))).map((exercise, index) => (
          <div key={exercise.id} id={`exercise-card-${exercise.id}`} ref={index === 0 ? firstExerciseRef : undefined} className="space-y-2">
            <ExerciseCard
              exercise={exercise}
              index={index + 1}
              savedSets={exerciseSets[exercise.id]}
              savedNotes={exerciseNotes[exercise.id]}
              previousSets={exerciseInsights.get(exercise.id)?.previousSets}
              onSetsChange={handleSetsChange}
              isBodyweight={resolveIsBodyweight(exercise.name)}
              isEditable={isWorkoutStarted && !isCompleted}
              nextAdvice={exerciseInsights.get(exercise.id)?.nextAdvice}
              weeklyTarget={weeklyTargets?.[exercise.id]}
              lastNote={exerciseInsights.get(exercise.id)?.lastNote}
              historicalBest={exerciseInsights.get(exercise.id)?.historicalBest}
              livePRWeight={livePRWeights[exercise.id] ?? null}
              metrics={exerciseMetrics[exercise.id]}
              onMetricsChange={healthConsent ? handleMetricsChange : undefined}
              defaultMetricsVisible={exercise.instructions?.some((i) => i.content.includes('RPE'))}
              rzaAdvice={exerciseInsights.get(exercise.id)?.rzaAdvice}
              pinnedNote={getPinnedNote(exercise.name)}
              onPinnedNoteSave={savePinnedNote}
              trackingType={resolveTracking(exercise.name)}
              restRun={restState && restState.exerciseId === exercise.id ? restState : null}
              onRestStart={handleRestStart}
              {...(isWorkoutStarted && !isCompleted && !isExerciseFullyCompleted(exerciseSets[exercise.id])
                ? { onRequestSwap: handleRequestSwap, onSkip: handleSkipExercise }
                : {})}
            />
          </div>
        ))}
      </div>

      {/* Z104: dodawanie ćwiczeń w locie — tylko szybki trening (ad-hoc) */}
      {isAdhocDay && isWorkoutStarted && !isCompleted && (
        <Button
          variant="outline"
          className="h-12 w-full gap-2 rounded-2xl border-0 bg-surface-low text-foreground hover:bg-surface-high"
          onClick={() => setShowAddExercise(true)}
          data-testid="adhoc-add-exercise"
        >
          <Plus className="h-4 w-4 text-primary" />
          {t('adhoc.addExercise')}
        </Button>
      )}

      {isAdhocDay && (
        <ExercisePicker
          open={showAddExercise}
          onOpenChange={setShowAddExercise}
          title={t('adhoc.addExercise')}
          customExercises={customExercises}
          onCreateCustomExercise={addCustomExercise}
          onPick={handleAddAdhocExercise}
        />
      )}

      {/* Exercise swap picker (Z69) — wspólny ExercisePicker z wyborem zakresu w footerze */}
      {(() => {
        const swapTarget = swapExerciseId && day ? day.exercises.find(ex => ex.id === swapExerciseId) ?? null : null;
        return (
          <ExercisePicker
            open={!!swapTarget}
            onOpenChange={(open) => { if (!open) setSwapExerciseId(null); }}
            title={t('planeditor.swapExercise')}
            description={swapTarget ? t('planeditor.swappingExercise', { name: swapTarget.name }) : undefined}
            customExercises={customExercises}
            onCreateCustomExercise={addCustomExercise}
            renderFooter={(picked) => (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('workout.swapHowLong')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => swapTarget && handleApplySwap(picked, swapTarget.id, swapTarget.sets, 'today')}
                  >
                    {t('workout.swapToday')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => swapTarget && handleApplySwap(picked, swapTarget.id, swapTarget.sets, 'plan')}
                  >
                    {t('workout.swapPermanent')}
                  </Button>
                </div>
              </div>
            )}
          />
        );
      })()}

      {/* Edit plan button — nie dotyczy treningu ad-hoc (nie ma go w planie) */}
      {!isAdhocDay && (
        <Button
          variant="outline"
          className="h-12 w-full rounded-2xl border-0 bg-surface-low text-muted-foreground hover:bg-surface-high"
          onClick={() => navigate('/plan/edit')}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {t('workout.editDayPlan')}
        </Button>
      )}

      {/* Day notes - at the end of workout */}
      {isWorkoutStarted && !isCompleted && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('workout.dayNoteLabel')}</span>
          </div>
          <textarea
            value={dayNotes}
            onChange={e => handleDayNotesChange(e.target.value)}
            placeholder={t('workout.dayNotePlaceholder')}
            className="min-h-[74px] w-full resize-none rounded-2xl bg-surface-low px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Fala 2 (2026-08-20, mockup 2a): FINISH WORKOUT w PRZEPŁYWIE po notatce
          (koniec fixed baru — rytm sesji prowadzi sticky REST). Potwierdzenie
          inline podmienia przycisk w miejscu (decyzja usera 2026-08-13:
          press-and-hold zawodził na siłowni — drgnięcie palca anulowało hold). */}
      {isWorkoutStarted && !isCompleted && (
        showCompleteConfirm ? (
          <div className="flex gap-2">
            <Button
              size="lg"
              variant="outline"
              className="h-14 flex-1"
              onClick={() => setShowCompleteConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="lg"
              className="kinetic-primary-button h-14 flex-1 hover:brightness-105"
              onClick={handleCompleteWorkout}
              disabled={isExplicitSaving}
            >
              {isExplicitSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
              {t('workout.confirmFinish')}
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="kinetic-primary-button h-14 w-full text-base hover:brightness-105"
            onClick={() => setShowCompleteConfirm(true)}
            disabled={isExplicitSaving}
            data-testid="finish-workout"
          >
            <Check className="h-5 w-5 mr-2" />
            {t('workout.finishWorkout')}
          </Button>
        )
      )}

      {!isWorkoutStarted && !isViewingPastWorkout && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
          {/* Z244: przycisk nie może wyglądać na martwy — dopóki źródła startu się
              ładują, pokazujemy to wprost; po 8 s dajemy wyjście (odśwież). */}
          {!startSourcesReady && startSourcesTimedOut && (
            <p className="mb-2 text-center text-[12px] text-fitness-warning">{t('workout.loadingStartStuck')}</p>
          )}
          <Button
            size="lg"
            className="kinetic-primary-button h-14 w-full text-base hover:brightness-105"
            onClick={() => {
              if (!startSourcesReady && startSourcesTimedOut) {
                window.location.reload();
                return;
              }
              // C-T2: sheet rozgrzewki PRZED utworzeniem sesji — tylko świeży,
              // jawny start; resume/autostart (Watch/Garmin) idą prosto do startu.
              if (shouldOfferPreStartWarmup({
                alreadyStarted: isWorkoutStarted,
                hasDraftContent: currentPageDraft ? draftHasLiveContent(currentPageDraft) : false,
                autostart,
                viewingPast: isViewingPastWorkout,
              })) {
                setPreStartOpen(true);
                return;
              }
              void handleStartWorkout();
            }}
            disabled={isExplicitSaving || (!startSourcesReady && !startSourcesTimedOut)}
          >
            {!startSourcesReady && startSourcesTimedOut ? (
              <>{t('workout.reload')}</>
            ) : isExplicitSaving || !startSourcesReady ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />{startSourcesReady ? t('dash.startWorkout') : t('workout.loadingStart')}</>
            ) : (
              <><Play className="h-5 w-5 mr-2 fill-current" />{t('dash.startWorkout')}</>
            )}
          </Button>
        </div>
      )}

      {/* Fala 2 (2026-08-20): STICKY pasek REST na dole ekranu (mockup 2a) —
          logika przerwy (deadline, notyfikacje, dźwięk) w RestBar bez zmian,
          zmienił się wyłącznie rodzic renderujący. Tap w korpus paska otwiera
          ustawienia timera (wymóg właściciela). */}
      {FEATURE_FLAGS.workoutTimers && isWorkoutStarted && !isCompleted && restState && restState.runId > 0 && (() => {
        const restExercise = day.exercises.find((ex) => ex.id === restState.exerciseId);
        const nextSet = (exerciseSets[restState.exerciseId] ?? []).find((s) => !s.completed && !s.isWarmup);
        // Pusta seria (prefill 0×0) nie dostaje etykiety — "Następne: × 0" to szum.
        const nextSetLabel = nextSet && (nextSet.weight > 0 || nextSet.reps > 0)
          ? (nextSet.weight > 0
            ? `${Math.round(toDisplay(nextSet.weight) * 2) / 2} ${unit} × ${nextSet.reps}`
            : `× ${nextSet.reps}`)
          : undefined;
        return (
          <RestBar
            deadlineAt={restState.deadlineAt}
            totalSeconds={restState.totalSeconds}
            runId={restState.runId}
            exerciseLabel={restExercise ? localizeExerciseName(restExercise.name, lang) : ''}
            nextSetLabel={nextSetLabel}
            onSkip={stopRestTimer}
            onAdjust={adjustRestTimer}
            onFinished={stopRestTimer}
            onOpenSettings={() => setRestSettingsOpen(true)}
          />
        );
      })()}

      {/* Sheet ustawień timera NIEZALEŻNY od restState (lekcja b.92: nigdy nie
          unmountuj Radix Sheet w stanie open — koniec przerwy zdejmuje pasek,
          sheet zostaje w drzewie i zamyka się wyłącznie przez open=false). */}
      <WorkoutSettingsSheet open={restSettingsOpen} onOpenChange={setRestSettingsOpen} />

      {/* FIX-B T2: zawsze zamontowany overlay celebracji live PR (dane sterują). */}
      <LivePRCelebration data={livePRCelebration} onDone={() => setLivePRCelebration(null)} />

    </div>
  );
};

export default WorkoutDay;
