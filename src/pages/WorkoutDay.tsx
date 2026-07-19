import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye, Pencil, Loader2, AlertCircle, Cloud, CloudOff, Smartphone, StickyNote, ArrowRightLeft, Flame, Share2, SkipForward, ChevronDown, X, Plus } from 'lucide-react';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';
import { RestTimer } from '@/components/RestTimer';
import { calculateStreak } from '@/lib/summary-utils';
import { StatCard } from '@/components/kinetic/StatCard';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ExercisePicker } from '@/components/ExercisePicker';
import type { TrainingDay, Exercise } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useRequiresPaywall } from '@/hooks/useSubscription';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { getExerciseNoteHistory } from '@/lib/exercise-notes';
import { hapticSuccess } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import { shouldRequestReview, readLastReviewPromptAt, markReviewPromptShown } from '@/lib/review-prompt';
import { getRzaAdvice } from '@/lib/rza-progression';
import { findWorkoutForRoute } from '@/lib/workout-lookup';
import { adhocDayFromId, buildAdhocExerciseId, isAdhocDayId } from '@/lib/adhoc-workout';
import { exerciseLibrary, type LibraryExercise } from '@/data/exerciseLibrary';
import { getTrackingType, type TrackingType } from '@/lib/set-tracking';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import { useExerciseNotes } from '@/hooks/useExerciseNotes';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { dateLocale } from '@/i18n';
import type { SetData, ExerciseMetrics } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn, formatLocalDate } from '@/lib/utils';
import { detectNewPRs, getExerciseBest1RM } from '@/lib/pr-utils';
import { carrySetExtras, createEmptySets, createPrefilledSets, parseSetCount, isBodyweightExercise } from '@/lib/exercise-utils';
import { buildSwappedExerciseId, resetSetsForExerciseSwap } from '@/lib/exercise-swap';
import { hasDraftContent, workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { setPwaUpdateBlocked } from '@/lib/pwa-update-guard';
import { buildWorkoutDraftSnapshot } from '@/lib/workout-draft-snapshot';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { deriveWorkoutSessionPhase, isActiveTrainingPhase } from '@/lib/workout-session-state';
import { resolveWorkoutHydration } from '@/lib/workout-hydration';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { buildDraftFinalExpectation, buildWorkoutWriteExpectation, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import { classifyWorkoutSyncError, shouldAutoResolveConflict, workoutSyncErrorMessageKey } from '@/lib/workout-sync-conflict';
import { reportClientError } from '@/lib/error-telemetry';
import { applySyncMarkers } from '@/lib/workout-sync-markers';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';
import { useWatchWorkoutSync } from '@/hooks/useWatchWorkoutSync';
import { ackWatchEvents, sendWorkoutToWatch, type WatchSetLoggedEvent } from '@/lib/watch-bridge';
import { isExerciseFullyCompleted } from '@/lib/workout-sanitizers';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import {
  areWorkoutStartSourcesReady,
  buildWorkoutStartSnapshot,
  findUniqueCycleForDate,
} from '@/lib/workout-start';

const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const requiresPaywall = useRequiresPaywall();
  const {
    workouts,
    createWorkoutSession,
    createOfflineWorkoutSession,
    batchSaveWorkout,
    getWorkoutSessionFromServer,
    isLoaded: workoutsLoaded,
    workoutsFromCache,
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, swapExercise, isLoaded: planLoaded } = useTrainingPlan(uid);
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
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const today = formatLocalDate(new Date());
  const targetDate = searchParams.get('date') || today;
  const routeSessionId = searchParams.get('session');
  const autostart = searchParams.get('autostart') === 'true';
  const watchStartEventId = searchParams.get('watchEventId');
  const isViewingPastWorkout = targetDate !== today;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [exerciseMetrics, setExerciseMetrics] = useState<Record<string, ExerciseMetrics>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isExplicitSaving, setIsExplicitSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [skippedExercises, setSkippedExercises] = useState<string[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [queuedDraft, setQueuedDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  // Local-wins (Z87): konflikt wersji rozwiązujemy automatycznie na korzyść lokalnej.
  // Limit prób per sesja zapisu chroni przed pętlą, gdy drugie urządzenie aktywnie pisze.
  const conflictAutoResolveAttemptsRef = useRef(0);
  const keepLocalOnConflictRef = useRef<null | (() => Promise<void>)>(null);
  const [showWarmup, setShowWarmup] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [restTimer, setRestTimer] = useState<{ open: boolean; seconds: number; exerciseLabel: string; runId: number }>({
    open: false,
    seconds: 90,
    exerciseLabel: '',
    runId: 0,
  });
  // Podsumowanie ukończonego treningu: które ćwiczenia mają rozwinięte serie.
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Set<string>>(new Set());
  const { unit, fmt, toDisplay } = useUnit();

  // Exercise swap (search library, no AI)
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  // Z104: picker dodawania ćwiczenia w locie (tylko trening ad-hoc).
  const [showAddExercise, setShowAddExercise] = useState(false);
  // Session-only swaps ("tylko dziś") keyed by exerciseId — not persisted to the plan.
  const [sessionSwaps, setSessionSwaps] = useState<Record<string, { id: string; name: string; sets: string; videoUrl?: string }>>({});

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
  const activeDraftRef = useRef(activeDraft);
  const queuedDraftRef = useRef(queuedDraft);

  useEffect(() => { exerciseSetsRef.current = exerciseSets; }, [exerciseSets]);
  useEffect(() => { exerciseNotesRef.current = exerciseNotes; }, [exerciseNotes]);
  useEffect(() => { exerciseMetricsRef.current = exerciseMetrics; }, [exerciseMetrics]);
  useEffect(() => { dayNotesRef.current = dayNotes; }, [dayNotes]);
  useEffect(() => { skippedExercisesRef.current = skippedExercises; }, [skippedExercises]);
  useEffect(() => { activeDraftRef.current = activeDraft; }, [activeDraft]);
  useEffect(() => { queuedDraftRef.current = queuedDraft; }, [queuedDraft]);

  // Timer sesji renderuje SessionClock (osobny komponent, Z35) — startedAt tylko
  // z draftu TEJ sesji, bo cudzy draft dawałby absurdalny czas.
  const sessionClockStartedAt = sessionId !== null && !isCompleted && activeDraft?.sessionId === sessionId
    ? activeDraft?.startedAt ?? null
    : null;

  // Tonaż bieżącej sesji (kg) — serie ukończone, bez rozgrzewki.
  const sessionVolumeKg = useMemo(
    () => Object.values(exerciseSets).flat().reduce((t, s) => t + (s.completed && !s.isWarmup ? s.reps * s.weight : 0), 0),
    [exerciseSets],
  );

  // Snapshot etykiet bieżącego dnia (nazwy ćwiczeń + dnia) zapisywany wraz z treningiem,
  // żeby historia była odporna na przyszłe zmiany planu.
  const daySnapshotRef = useRef<{ dayName: string; focus: string; names: Record<string, string> }>({ dayName: '', focus: '', names: {} });

  // Szybki trening (Z104): syntetyczny dzień ad-hoc nie istnieje w planie — odtwarzamy go z dayId.
  const isAdhocDay = !!dayId && isAdhocDayId(dayId);
  const baseDay = useMemo(() => {
    const fromPlan = trainingPlan.find(d => d.id === dayId);
    if (fromPlan) return fromPlan;
    if (dayId && isAdhocDayId(dayId)) return adhocDayFromId(dayId, (key) => t(key as Parameters<typeof t>[0])) ?? undefined;
    return undefined;
  }, [trainingPlan, dayId, t]);
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
      const exerciseNames = draftForDaySnapshot.exerciseNames ?? {};
      const snapshotDay: TrainingDay = {
        id: draftForDaySnapshot.dayId,
        dayName: draftForDaySnapshot.dayName || baseDay?.dayName || draftForDaySnapshot.dayId,
        weekday: baseDay?.weekday ?? 'monday',
        focus: draftForDaySnapshot.dayFocus || baseDay?.focus || '',
        exercises: Object.entries(draftForDaySnapshot.exerciseSets).map(([exerciseId, sets]) => {
          const baseExercise = baseDay?.exercises.find((exercise) => exercise.id === exerciseId);
          return {
            ...baseExercise,
            id: exerciseId,
            name: exerciseNames[exerciseId] || baseExercise?.name || exerciseId,
            sets: `${sets.filter((set) => !set.isWarmup).length} serii`,
            instructions: baseExercise?.instructions ?? [],
          };
        }),
      };
      return snapshotDay;
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

  useEffect(() => {
    daySnapshotRef.current = day
      ? { dayName: day.dayName, focus: day.focus, names: Object.fromEntries(day.exercises.map(e => [e.id, e.name])) }
      : { dayName: '', focus: '', names: {} };
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
      setSessionSwaps(prev => ({
        ...prev,
        [exerciseId]: { id: swappedId, name: pick.name, sets: currentSets, videoUrl: pick.videoUrl },
      }));

      // Utrwal swap w drafcie od razu (istniejąca ścieżka autozapisu, wzorzec handleSkipExercise).
      // Bez tego draft z prefilled exerciseSets pokazywał stare ćwiczenie do następnego odhaczenia,
      // a swap ginął przy odświeżeniu apki.
      saveDraftSnapshot({
        exerciseNames: {
          ...(activeDraftRef.current?.exerciseNames ?? daySnapshotRef.current.names),
          [swappedId]: pick.name,
        },
        lastTouchedExerciseId: swappedId,
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
          }, lang, unit),
        historicalBest: getExerciseBest1RM(workouts, exercise.id),
        rzaAdvice: getRzaAdvice(workouts, exercise.id, exercise.name),
        // Z74: ostatnia notatka z poprzedniej sesji tego ćwiczenia.
        lastNote: getExerciseNoteHistory(workouts, exercise.id, 1)[0]?.note,
      });
    });
    return map;
  }, [day, workouts, previousWorkout, previousSetsByName, lang, unit, resolveIsBodyweight, resolveTracking]);

  const queueAutoSaveStatus = useCallback((status: AutoSaveStatus, nextStatus?: AutoSaveStatus, delay = 1600) => {
    setAutoSaveStatus(status);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (nextStatus) {
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaveStatus(current => current === status ? nextStatus : current);
      }, delay);
    }
  }, []);

  const startRestTimer = useCallback((payload: { seconds: number; exerciseLabel: string }) => {
    if (!FEATURE_FLAGS.workoutTimers) return;
    setRestTimer((current) => ({
      open: true,
      seconds: payload.seconds,
      exerciseLabel: payload.exerciseLabel,
      runId: current.runId + 1,
    }));
  }, []);

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
      dayNames: daySnapshotRef.current.names,
      dayName: daySnapshotRef.current.dayName,
      dayFocus: daySnapshotRef.current.focus,
      cloudMeta: cloudMetaRef.current,
    }, overrides)
  ), [uid, sessionId, dayId, targetDate]);

  const persistDraftSnapshot = useCallback(async (
    overrides: Partial<ActiveWorkoutDraft> = {},
    options: { showStatus?: boolean } = {}
  ): Promise<ActiveWorkoutDraft | null> => {
    const draft = buildDraftSnapshot(overrides);
    if (!draft) return null;

    try {
      await workoutDraftDb.saveActiveDraft(draft);
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
    } catch {
      setSaveError(t('workout.err.localSaveFailed'));
      setAutoSaveStatus('error');
      if (uid) {
        trackTelemetryEvent(uid, 'local_save_failed');
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
        // Local-wins (Z87): wersja lokalna zawsze wygrywa. Telemetria zostaje,
        // żeby widzieć skalę zjawiska po wyłączeniu dialogu.
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
        // Limit wyczerpany (drugie urządzenie aktywnie pisze): zostajemy przy lokalnym
        // drafcie, danych nie tracimy, kolejny checkpoint ponowi zapis.
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
      setSaveError(t(workoutSyncErrorMessageKey(outcome.error)));
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
  }, [uid, sessionId, workoutSyncDeps, persistDraftSnapshot, queueAutoSaveStatus, t]);

  // Local-wins (Z87): zachowaj lokalną wersję — podbij znacznik chmury w drafcie
  // do stanu serwera i ponów zapis (świadome nadpisanie wersji z drugiego urządzenia).
  const keepLocalOnConflict = useCallback(async () => {
    if (!uid || !sessionId) return;
    try {
      const server = await getWorkoutSessionFromServer(sessionId);
      await persistDraftSnapshot({
        ...(server?.updatedAt !== undefined ? { cloudUpdatedAt: server.updatedAt } : {}),
        ...(server?.revision !== undefined ? { cloudRevision: server.revision } : {}),
      }, { showStatus: false });
      await syncDraftToFirebase(activeDraftRef.current?.finalSyncPending ? 'final' : 'checkpoint');
    } catch (err) {
      // Offline/timeout: zostajemy przy lokalnym drafcie, user widzi komunikat,
      // kolejny checkpoint ponowi zapis.
      setSaveError(t(workoutSyncErrorMessageKey(err)));
      void reportClientError(uid, {
        code: classifyWorkoutSyncError(err),
        phase: 'conflict-resolve',
        detail: err instanceof Error ? err.message : String(err),
        sessionId,
      });
    }
  }, [uid, sessionId, getWorkoutSessionFromServer, persistDraftSnapshot, syncDraftToFirebase, t]);
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
  }) => {
    setSessionId(next.sessionId);
    setIsCompleted(next.completed);
    setExerciseSets(next.exerciseSets);
    setExerciseNotes(next.exerciseNotes);
    setExerciseMetrics(next.exerciseMetrics ?? {});
    setDayNotes(next.dayNotes);
    setSkippedExercises(next.skippedExercises);
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
      });

      if (draftRecoveryDone.current !== currentPageDraft.sessionId && (draftHasData || currentPageDraft.finalSyncPending)) {
        draftRecoveryDone.current = currentPageDraft.sessionId;
        trackTelemetryEvent(uid, 'draft_recovered');
        toast({
          title: currentPageDraft.finalSyncPending ? t('workout.toast.draftPendingTitle') : t('workout.toast.draftRecoveredTitle'),
          description: currentPageDraft.finalSyncPending
            ? t('workout.toast.draftPendingDesc')
            : t('workout.toast.draftRecoveredDesc'),
        });
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
    // t pominięte celowo: użyte tylko w toaście; dodanie zresetowałoby stan treningu przy zmianie języka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSourcesReady, dayId, workouts, workoutsFromCache, targetDate, routeSessionId, currentPageDraft, applyWorkoutState, toast, uid, today]);

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

    if (sessionId) {
      // Session already exists, just scroll to first exercise
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    // Auto-start the workout and scroll
    handleStartWorkout().then(() => {
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart, startSourcesReady, day, isViewingPastWorkout, isCompleted, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (periodicSaveTimer.current) clearInterval(periodicSaveTimer.current);
    };
  }, []);

  // Periodic Firebase checkpoint — best effort sync, not source of truth
  const periodicSaveTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!sessionId || (!currentPageDraft?.dirty && !currentPageDraft?.finalSyncPending)) {
      if (periodicSaveTimer.current) clearInterval(periodicSaveTimer.current);
      return;
    }

    periodicSaveTimer.current = setInterval(() => {
      void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
    }, CHECKPOINT_INTERVAL_MS);

    return () => {
      if (periodicSaveTimer.current) clearInterval(periodicSaveTimer.current);
    };
  }, [sessionId, currentPageDraft?.dirty, currentPageDraft?.finalSyncPending, syncDraftToFirebase]);

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
      if (isActive || !sessionId) return;
      saveScroll();
      void persistDraftSnapshot({}, { showStatus: false });
      void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
    });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      removeAppStateListener();
    };
  }, [sessionId, scrollStorageKey, currentPageDraft?.finalSyncPending, persistDraftSnapshot, syncDraftToFirebase]);

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

      if (result.existing) {
        cloudMetaRef.current = {
          sessionId: result.session.id,
          updatedAt: result.session.updatedAt,
          revision: result.session.revision,
        };
        setSessionId(result.session.id);
        setIsCompleted(false);
        if (watchStartEventId) await ackWatchEvents([watchStartEventId]);
        toast({
          title: t('workout.toast.continueTitle'),
          description: t('workout.toast.continueDesc'),
        });
      } else {
        // Pre-fill with progression from previous workout
        const prefilled: Record<string, SetData[]> = {};
        startSnapshot.day.exercises.forEach((exercise) => {
          const prevSets = getPreviousSets(exercise.id, exercise.name);
          const count = parseSetCount(exercise.sets);
          prefilled[exercise.id] = createPrefilledSets(
            count, prevSets, resolveIsBodyweight(exercise.name)
          );
        });
        setExerciseSets(prefilled);
        setExerciseNotes({});
        setDayNotes('');
        setSkippedExercises([]);

        const now = Date.now();
        const initialDraft: ActiveWorkoutDraft = {
          sessionId: result.session.id,
          userId: uid,
          dayId: startSnapshot.day.id,
          date: startSnapshot.date,
          cycleId: startSnapshot.activeCycleId,
          sessionOrigin: result.provisional ? 'provisional' : 'remote',
          remoteSessionId: result.provisional ? null : result.session.id,
          cloudUpdatedAt: result.session.updatedAt,
          cloudRevision: result.session.revision,
          exerciseSets: prefilled,
          exerciseNotes: {},
          exerciseNames: Object.fromEntries(
            startSnapshot.day.exercises.map((exercise) => [exercise.id, exercise.name]),
          ),
          exerciseMetrics: {},
          dayNotes: '',
          dayName: startSnapshot.day.dayName,
          dayFocus: startSnapshot.day.focus,
          skippedExercises: [],
          startedAt: now,
          updatedAt: now,
          lastFirebaseSyncAt: null,
          dirty: true,
          completedLocally: false,
          finalSyncPending: false,
          version: 1,
        };

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
    const sanitizedSets = sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
      ...(s.isWarmup && { isWarmup: true }),
      ...carrySetExtras(s),
    }));
    setExerciseSets(prev => ({ ...prev, [exerciseId]: sanitizedSets }));
    if (notes !== undefined) {
      setExerciseNotes(prev => ({ ...prev, [exerciseId]: notes }));
    }
  }, []);

  // Handler for ACTIVE WORKOUT - saves locally to IndexedDB, Firebase only on checkpoints/finish
  const handleSetsChange = useCallback((exerciseId: string, sets: SetData[], notes?: string) => {
    const sanitizedSets = sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
      ...(s.isWarmup && { isWarmup: true }),
      ...carrySetExtras(s),
    }));
    const nextExerciseSets = { ...exerciseSetsRef.current, [exerciseId]: sanitizedSets };
    const nextExerciseNotes = notes !== undefined
      ? { ...exerciseNotesRef.current, [exerciseId]: notes }
      : exerciseNotesRef.current;

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
  }, [saveDraftSnapshot]);

  // Apple Watch: serie zalogowane na zegarku trafiają do draftu jak ręczne zmiany.
  const handleWatchSetLogged = useCallback(async (event: WatchSetLoggedEvent) => {
    const current = exerciseSetsRef.current[event.exerciseId];
    if (!current || event.setIndex < 0 || event.setIndex >= current.length) return;
    const next = current.map((set, i) =>
      i === event.setIndex
        ? { ...set, reps: event.reps, weight: event.weight, completed: event.completed }
        : set
    );
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
  const handleWatchWorkoutFinished = useCallback(async () => {
    toast({
      title: t('workout.toast.watchFinishedTitle'),
      description: t('workout.toast.watchFinishedDesc'),
    });
    // User potwierdził zakończenie na zegarku — finalizujemy bez drugiego dialogu.
    await completeWorkoutRef.current?.();
  }, [toast, t]);

  useWatchWorkoutSync({
    enabled: isActiveTrainingPhase(sessionPhase) && !isViewingPastWorkout,
    date: targetDate,
    dayId: day?.id,
    dayName: day?.dayName,
    focus: day?.focus,
    exercises: day?.exercises,
    exerciseSets,
    onSetLogged: handleWatchSetLogged,
    onWorkoutFinished: handleWatchWorkoutFinished,
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

  const handleCompleteWorkout = async () => {
    if (!sessionId || !uid || !day) return;
    if (isCompleted || isExplicitSaving) return;

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
        setShowCompleteConfirm(false);
        setAutoSaveStatus('final-sync-pending');
        completedSessionLockRef.current = sessionId;
        setQueuedDraft(pendingDraft);
        setSaveError(result.error || t('workout.err.pendingSync'));
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
    completedSessionLockRef.current = sessionId;
    setIsExplicitSaving(false);
    setShowCompleteConfirm(false);
    // Z82: notification-success przy ukończeniu treningu (natywnie; web no-op).
    void hapticSuccess();

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
    if (currentWorkoutData && day) {
      const previousWorkoutsForPR = workouts.filter(w => w.id !== sessionId && w.completed);
      const exerciseNames = new Map(day.exercises.map(e => [e.id, e.name]));
      const bodyweightIds = new Set(day.exercises.filter(e => resolveIsBodyweight(e.name)).map(e => e.id));
      const newPRs = detectNewPRs(
        { ...currentWorkoutData, exercises: Object.entries(exerciseSets).map(([id, sets]) => ({ exerciseId: id, sets })) },
        previousWorkoutsForPR,
        exerciseNames,
        bodyweightIds,
      );
      if (newPRs.length > 0) {
        const prNames = newPRs.map(pr => pr.exerciseName).join(', ');
        toast({
          title: t('workout.toast.newPRTitle', { n: newPRs.length }),
          description: prNames,
        });
      } else {
        toast({
          title: t('workout.toast.savedTitle'),
          description: t('workout.toast.savedSyncedDesc'),
        });
      }
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
      setSaveError(t(workoutSyncErrorMessageKey(err)));
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
  const totalRepsCount = Object.values(exerciseSets).reduce(
    (total, sets) => total + sets.filter(s => s.completed && !s.isWarmup).reduce((sum, s) => sum + s.reps, 0),
    0
  );
  // Czas trwania do podsumowania: trwały durationSec z zapisanej sesji, a dla świeżo
  // zakończonego lokalnie treningu fallback ze znaczników draftu (finalizedAt/startedAt).
  const currentWorkoutForDuration = workouts.find(w => w.id === sessionId);
  const durationFromTimestamps = currentWorkoutForDuration?.completedAt && currentWorkoutForDuration?.startedAt
    ? Math.max(0, Math.floor((currentWorkoutForDuration.completedAt - currentWorkoutForDuration.startedAt) / 1000))
    : null;
  const draftDurationSec = currentPageDraft?.finalizedAt && currentPageDraft?.startedAt
    ? Math.max(0, Math.floor((currentPageDraft.finalizedAt - currentPageDraft.startedAt) / 1000))
    : null;
  const sessionDurationSec = currentWorkoutForDuration?.durationSec ?? durationFromTimestamps ?? draftDurationSec;

  const ErrorBanner = () => saveError ? (
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm">{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            aria-label={t('workout.close')}
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-destructive/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  ) : null;

  // Auto-save indicator: dwa proste stany dla usera ("na telefonie" / "w chmurze HH:MM")
  // plus czerwony błąd. Wewnętrzne statusy (7 wartości) zostają tylko logiką.
  const AutoSaveIndicator = () => {
    if (autoSaveStatus === 'error') {
      return (
        <div className="fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs z-50 transition-opacity duration-300 bg-destructive/20 text-destructive">
          <CloudOff className="h-3 w-3" /> {t('workout.status.error')}
        </div>
      );
    }
    if (!isActiveTrainingPhase(sessionPhase)) return null;
    const lastCloudSync = activeDraft?.lastFirebaseSyncAt ?? null;
    const cloudCurrent = !!lastCloudSync && !activeDraft?.dirty;
    return (
      <div className="fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs z-50 transition-opacity duration-300 bg-surface-high/90 text-muted-foreground backdrop-blur">
        {cloudCurrent ? <Cloud className="h-3 w-3 text-fitness-success" /> : <Smartphone className="h-3 w-3" />}
        {cloudCurrent
          ? t('workout.status.cloudSaved', { time: new Date(lastCloudSync).toLocaleTimeString(dateLocale(lang), { hour: '2-digit', minute: '2-digit' }) })
          : t('workout.status.localSaved')}
      </div>
    );
  };

  // COMPLETED VIEW (not editing)
  if (isCompleted && !isEditing) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{localizeDayName(day.dayName, lang)}</h1>
            <p className="text-muted-foreground">{localizeFocus(day.focus, lang)}</p>
          </div>
          {!isFinalSyncPending && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('dash.edit')}
            </Button>
          )}
        </div>

        <ErrorBanner />

        {isFinalSyncPending && (
          <Card className="border-fitness-warning bg-fitness-warning">
            <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-fitness-warning">{t('workout.finishedLocally.title')}</p>
                <p className="text-sm text-fitness-warning">{t('workout.finishedLocally.desc')}</p>
              </div>
              <Button
                variant="outline"
                className="border-fitness-warning text-fitness-warning hover:bg-fitness-warning/20"
                onClick={handleRetrySync}
                disabled={isExplicitSaving}
              >
                {isExplicitSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
                {t('strava.syncNow')}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={cn(
          "border-fitness-success bg-fitness-success/10",
          isFinalSyncPending && "border-fitness-warning bg-fitness-warning"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-fitness-success",
              isFinalSyncPending && "text-fitness-warning"
            )}>
              <Check className="h-6 w-6" />
              {isFinalSyncPending ? t('workout.completedLocallyTitle') : t('workout.completedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {isFinalSyncPending ? t('workout.waitingSyncDesc') : t('workout.greatJob')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold">{exerciseCount}</p>
                <p className="text-xs text-muted-foreground">{t('workout.statExercises')}</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold">{completedSetsCount}</p>
                <p className="text-xs text-muted-foreground">{t('workout.statSets')}</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold">{totalRepsCount}</p>
                <p className="text-xs text-muted-foreground">{t('workout.statReps')}</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold tabular-nums">{sessionDurationSec != null ? fmtDuration(sessionDurationSec) : '—'}</p>
                <p className="text-xs text-muted-foreground">{t('workout.statTime')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {dayNotes && (
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dayNotes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t('workout.summary')}
          </h3>
          {day.exercises.map((exercise, index) => {
            const isSkipped = skippedExercises.includes(exercise.id);
            const sets = exerciseSets[exercise.id] || [];
            const completed = sets.filter(s => s.completed);
            const totalWeight = completed.reduce((sum, s) => sum + (s.reps * s.weight), 0);
            const canExpand = !isSkipped && sets.length > 0;
            const isExpanded = expandedSummaryIds.has(exercise.id);
            const toggleExpand = () => setExpandedSummaryIds((prev) => {
              const next = new Set(prev);
              if (next.has(exercise.id)) next.delete(exercise.id);
              else next.add(exercise.id);
              return next;
            });

            return (
              <div
                key={exercise.id}
                className={cn(
                  "rounded-xl bg-surface-low",
                  isSkipped && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={toggleExpand}
                  disabled={!canExpand}
                  className="flex w-full items-center gap-3 p-3 text-left disabled:cursor-default"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fitness-cyan/15 font-heading text-sm font-bold tabular-nums text-fitness-cyan">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-sm font-bold uppercase leading-tight tracking-tight">
                      {localizeExerciseName(exercise.name, lang)}
                    </h3>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {isSkipped
                        ? t('dayplan.badgeMissed')
                        : t('workout.setsProgress', { done: completed.length, total: sets.length })}
                    </p>
                  </div>
                  {!isSkipped && totalWeight > 0 && (
                    <div className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-center leading-none">
                      <span className="block font-heading text-base font-bold tabular-nums text-background">
                        {Math.round(toDisplay(totalWeight)).toLocaleString(dateLocale(lang))}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-background/70">
                        {unit}
                      </span>
                    </div>
                  )}
                  {canExpand && (
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180",
                    )} />
                  )}
                </button>

                {canExpand && isExpanded && (
                  <div className="border-t border-surface-high px-3 py-2 space-y-1.5">
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

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowShare(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            {t('comp.share.share')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
            {t('workout.backToDashboard')}
          </Button>
        </div>

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
            duration: '',
            prs: [],
            streak: calculateStreak(workouts),
          }}
          open={showShare}
          onOpenChange={setShowShare}
        />
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

        <ErrorBanner />

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
              onMetricsChange={handleMetricsChangeLocal}
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
  return (
    <div className="space-y-6 pb-28">
      <AutoSaveIndicator />

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-2xl bg-muted/60">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-heading font-bold uppercase tracking-[0.1em]">{localizeDayName(day.dayName, lang)}</h1>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{localizeFocus(day.focus, lang)}</p>
        </div>
        {isWorkoutStarted && !isCompleted && (
          <Button variant="ghost" size="icon" onClick={() => setShowWarmup(true)} className="rounded-2xl bg-muted/60" aria-label={t('comp.warmup.title')}>
            <Flame className="h-4 w-4 text-orange-500" />
          </Button>
        )}
        {(!isWorkoutStarted || isCompleted) && <span />}
      </div>

      {/* Tonaż + czas sesji (kafelki) */}
      {isWorkoutStarted && !isCompleted && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t('dash.stat.tonnage')} value={fmt(sessionVolumeKg)} accent="secondary" />
          <StatCard
            label={t('workout.statTime')}
            value={sessionClockStartedAt !== null ? <SessionClock startedAt={sessionClockStartedAt} /> : fmtDuration(0)}
            accent="primary"
          />
        </div>
      )}

      <ErrorBanner />

      {/* Warmup dialog */}
      <WarmupRoutineDialog
        focus={day.focus}
        open={showWarmup}
        onOpenChange={setShowWarmup}
      />

      {/* Past date without workout */}
      {!isWorkoutStarted && isViewingPastWorkout && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('workout.noWorkoutForDate')}</p>
            <Button variant="link" onClick={() => navigate('/plan')} className="mt-2">
              {t('workout.backToPlan')}
            </Button>
          </CardContent>
        </Card>
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
              lastNote={exerciseInsights.get(exercise.id)?.lastNote}
              historicalBest={exerciseInsights.get(exercise.id)?.historicalBest}
              metrics={exerciseMetrics[exercise.id]}
              onMetricsChange={handleMetricsChange}
              defaultMetricsVisible={exercise.instructions?.some((i) => i.content.includes('RPE'))}
              rzaAdvice={exerciseInsights.get(exercise.id)?.rzaAdvice}
              onRestTimerStart={startRestTimer}
              pinnedNote={getPinnedNote(exercise.name)}
              onPinnedNoteSave={savePinnedNote}
              trackingType={resolveTracking(exercise.name)}
            />
            {/* AI Swap & Skip buttons — only in active workout */}
            {isWorkoutStarted && !isCompleted && !isExerciseFullyCompleted(exerciseSets[exercise.id]) && (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1"
                  onClick={() => handleSkipExercise(exercise.id)}
                >
                  <SkipForward className="h-3.5 w-3.5" />{t('workout.skip')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1"
                  onClick={() => setSwapExerciseId(exercise.id)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />{t('newplan.swap')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Z104: dodawanie ćwiczeń w locie — tylko szybki trening (ad-hoc) */}
      {isAdhocDay && isWorkoutStarted && !isCompleted && (
        <Button
          variant="outline"
          className="w-full gap-2 border-0 bg-surface-high text-foreground hover:bg-surface-highest"
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
          size="sm"
          className="w-full text-muted-foreground"
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
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {FEATURE_FLAGS.workoutTimers && isWorkoutStarted && !isCompleted && restTimer.open && (
        <RestTimer
          key={restTimer.runId}
          defaultSeconds={restTimer.seconds}
          exerciseLabel={restTimer.exerciseLabel}
          onClose={() => setRestTimer((current) => ({ ...current, open: false }))}
        />
      )}

      {isWorkoutStarted && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
          {showCompleteConfirm ? (
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 py-6"
                onClick={() => setShowCompleteConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="lg"
                className="kinetic-primary-button flex-1 py-6 hover:brightness-105"
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
              className="kinetic-primary-button w-full py-6 text-base hover:brightness-105"
              onClick={() => setShowCompleteConfirm(true)}
              disabled={isExplicitSaving}
            >
              <Check className="h-5 w-5 mr-2" />
              {t('workout.finishWorkout')}
            </Button>
          )}
        </div>
      )}

      {!isWorkoutStarted && !isViewingPastWorkout && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
          <Button
            size="lg"
            className="kinetic-primary-button w-full py-6 text-base hover:brightness-105"
            onClick={handleStartWorkout}
            disabled={isExplicitSaving || !startSourcesReady}
          >
            {isExplicitSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2 fill-current" />}
            {t('dash.startWorkout')}
          </Button>
        </div>
      )}

    </div>
  );
};

export default WorkoutDay;
