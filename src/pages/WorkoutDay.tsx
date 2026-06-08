import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye, Pencil, Loader2, AlertCircle, Cloud, CloudOff, StickyNote, ArrowRightLeft, Flame, Share2, SkipForward, Search } from 'lucide-react';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';
import { calculateStreak } from '@/lib/summary-utils';
import { StatCard } from '@/components/kinetic/StatCard';
import { useUnit } from '@/contexts/UnitContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { TrainingDay, Exercise } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { getExerciseHistory } from '@/lib/exercise-progression';
import { callOpenAI } from '@/lib/ai-coach';
import { findWorkoutForRoute } from '@/lib/workout-lookup';
import { exerciseLibrary, type LibraryExercise } from '@/data/exerciseLibrary';
import { localizeCategory } from '@/data/exercise-i18n';
import type { SetData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn, formatLocalDate } from '@/lib/utils';
import { detectNewPRs, getExerciseBest1RM } from '@/lib/pr-utils';
import { createPrefilledSets, parseSetCount, isBodyweightExercise } from '@/lib/exercise-utils';
import { hasDraftContent, workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { setPwaUpdateBlocked } from '@/lib/pwa-update-guard';
import { isProvisionalWorkoutSessionId } from '@/lib/workout-session';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { buildWorkoutWriteExpectation, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';

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

const WorkoutDay = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const {
    workouts,
    createWorkoutSession,
    createOfflineWorkoutSession,
    batchSaveWorkout,
    getWorkoutSessionFromServer,
    isLoaded
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, swapExercise } = useTrainingPlan(uid);
  const { getActiveCycle, cycles } = usePlanCycles(uid);
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const today = formatLocalDate(new Date());
  const targetDate = searchParams.get('date') || today;
  const routeSessionId = searchParams.get('session');
  const autostart = searchParams.get('autostart') === 'true';
  const isViewingPastWorkout = targetDate !== today;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isExplicitSaving, setIsExplicitSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [coachBusyId, setCoachBusyId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [skippedExercises, setSkippedExercises] = useState<string[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [queuedDraft, setQueuedDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showWarmup, setShowWarmup] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const { fmt } = useUnit();

  // Exercise swap (search library, no AI)
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapQuery, setSwapQuery] = useState('');
  const [swapPick, setSwapPick] = useState<LibraryExercise | null>(null);
  // Session-only swaps ("tylko dziś") keyed by exerciseId — not persisted to the plan.
  const [sessionSwaps, setSessionSwaps] = useState<Record<string, { name: string; sets: string; videoUrl?: string }>>({});

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const firstExerciseRef = useRef<HTMLDivElement>(null);
  const autostartDone = useRef(false);
  const draftRecoveryDone = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const completedSessionLockRef = useRef<string | null>(null);

  // Refs that mirror state for stable callback identity
  const exerciseSetsRef = useRef(exerciseSets);
  const exerciseNotesRef = useRef(exerciseNotes);
  const dayNotesRef = useRef(dayNotes);
  const skippedExercisesRef = useRef(skippedExercises);
  const activeDraftRef = useRef(activeDraft);
  const queuedDraftRef = useRef(queuedDraft);

  useEffect(() => { exerciseSetsRef.current = exerciseSets; }, [exerciseSets]);
  useEffect(() => { exerciseNotesRef.current = exerciseNotes; }, [exerciseNotes]);
  useEffect(() => { dayNotesRef.current = dayNotes; }, [dayNotes]);
  useEffect(() => { skippedExercisesRef.current = skippedExercises; }, [skippedExercises]);
  useEffect(() => { activeDraftRef.current = activeDraft; }, [activeDraft]);
  useEffect(() => { queuedDraftRef.current = queuedDraft; }, [queuedDraft]);

  // Timer sesji (mockup [17]) — liczy od startedAt aktywnego treningu.
  useEffect(() => {
    if (sessionId === null || isCompleted || !activeDraft?.startedAt) return;
    const start = activeDraft.startedAt;
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionId, isCompleted, activeDraft?.startedAt]);

  // Tonaż bieżącej sesji (kg) — serie ukończone, bez rozgrzewki.
  const sessionVolumeKg = useMemo(
    () => Object.values(exerciseSets).flat().reduce((t, s) => t + (s.completed && !s.isWarmup ? s.reps * s.weight : 0), 0),
    [exerciseSets],
  );

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  // Snapshot etykiet bieżącego dnia (nazwy ćwiczeń + dnia) zapisywany wraz z treningiem,
  // żeby historia była odporna na przyszłe zmiany planu.
  const daySnapshotRef = useRef<{ dayName: string; focus: string; names: Record<string, string> }>({ dayName: '', focus: '', names: {} });

  const baseDay = trainingPlan.find(d => d.id === dayId);

  // Zapisany trening dla oglądanej daty (jeśli istnieje).
  const workoutForDate = useMemo(
    () => findWorkoutForRoute(workouts, {
      dayId,
      date: targetDate,
      sessionId: routeSessionId,
      allowDateFallback: true,
    }),
    [workouts, dayId, targetDate, routeSessionId],
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

    if (!baseDay || Object.keys(sessionSwaps).length === 0) return baseDay;
    return {
      ...baseDay,
      exercises: baseDay.exercises.map(ex => {
        const ov = sessionSwaps[ex.id];
        return ov ? { ...ex, name: ov.name, sets: ov.sets, videoUrl: ov.videoUrl, instructions: [] } : ex;
      }),
    };
  }, [baseDay, sessionSwaps, workoutForDate, isViewingPastWorkout, resolver, dayId]);

  useEffect(() => {
    daySnapshotRef.current = day
      ? { dayName: day.dayName, focus: day.focus, names: Object.fromEntries(day.exercises.map(e => [e.id, e.name])) }
      : { dayName: '', focus: '', names: {} };
  }, [day]);

  // Apply an exercise swap chosen from the library — either for this session only or permanently.
  const handleApplySwap = async (exerciseId: string, currentSets: string, scope: 'today' | 'plan') => {
    if (!swapPick || !day) return;
    if (scope === 'plan') {
      await swapExercise(day.id, exerciseId, swapPick.name, currentSets, swapPick.videoUrl);
    } else {
      setSessionSwaps(prev => ({
        ...prev,
        [exerciseId]: { name: swapPick.name, sets: currentSets, videoUrl: swapPick.videoUrl },
      }));
    }
    setSwapExerciseId(null);
    setSwapPick(null);
    setSwapQuery('');
  };
  const currentPageDraft = (activeDraft && activeDraft.dayId === dayId && activeDraft.date === targetDate
    ? activeDraft
    : queuedDraft && queuedDraft.dayId === dayId && queuedDraft.date === targetDate
      ? queuedDraft
      : null);

  // Find previous workout for this day (for weight hints)
  const previousWorkout = workouts.find(w =>
    w.dayId === dayId &&
    w.date < targetDate &&
    w.completed &&
    w.exercises.length > 0
  );

  const queueAutoSaveStatus = useCallback((status: AutoSaveStatus, nextStatus?: AutoSaveStatus, delay = 1600) => {
    setAutoSaveStatus(status);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (nextStatus) {
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaveStatus(current => current === status ? nextStatus : current);
      }, delay);
    }
  }, []);

  const buildDraftSnapshot = useCallback((overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft | null => {
    const draftUserId = overrides.userId ?? uid;
    const draftSessionId = overrides.sessionId ?? sessionId;
    const draftDayId = overrides.dayId ?? dayId;
    const draftDate = overrides.date ?? targetDate;
    if (!draftUserId || !draftSessionId || !draftDayId) return null;

    const now = Date.now();
    const previousDraft = activeDraftRef.current?.sessionId === draftSessionId
      ? activeDraftRef.current
      : null;

    return {
      sessionId: draftSessionId,
      userId: draftUserId,
      dayId: draftDayId,
      date: draftDate,
      cycleId: overrides.cycleId ?? previousDraft?.cycleId ?? null,
      sessionOrigin: overrides.sessionOrigin ?? previousDraft?.sessionOrigin ?? (isProvisionalWorkoutSessionId(draftSessionId) ? 'provisional' : 'remote'),
      remoteSessionId: overrides.remoteSessionId ?? previousDraft?.remoteSessionId ?? null,
      exerciseSets: overrides.exerciseSets ?? exerciseSetsRef.current,
      exerciseNotes: overrides.exerciseNotes ?? exerciseNotesRef.current,
      dayNotes: overrides.dayNotes ?? dayNotesRef.current,
      skippedExercises: overrides.skippedExercises ?? skippedExercisesRef.current,
      startedAt: overrides.startedAt ?? previousDraft?.startedAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      lastFirebaseSyncAt: overrides.lastFirebaseSyncAt ?? previousDraft?.lastFirebaseSyncAt ?? null,
      dirty: overrides.dirty ?? true,
      completedLocally: overrides.completedLocally ?? previousDraft?.completedLocally ?? false,
      finalSyncPending: overrides.finalSyncPending ?? previousDraft?.finalSyncPending ?? false,
      version: overrides.version ?? ((previousDraft?.version ?? 0) + 1),
    };
  }, [uid, sessionId, dayId, targetDate]);

  const persistDraftSnapshot = useCallback(async (
    overrides: Partial<ActiveWorkoutDraft> = {},
    options: { showStatus?: boolean } = {}
  ): Promise<ActiveWorkoutDraft | null> => {
    const draft = buildDraftSnapshot(overrides);
    if (!draft) return null;

    try {
      await workoutDraftDb.saveActiveDraft(draft);
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
      ...(daySnapshotRef.current.names[exerciseId] && { name: daySnapshotRef.current.names[exerciseId] }),
    }))
  ), []);

  const syncDraftToFirebase = useCallback(async (mode: 'checkpoint' | 'final'): Promise<{ success: boolean; skipped?: boolean; error?: string }> => {
    if (!uid || !sessionId || isSyncingRef.current) {
      return { success: false, skipped: true };
    }

    const usesActiveDraftStore = activeDraftRef.current?.sessionId === sessionId;
    let currentDraft = usesActiveDraftStore
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
      const persistedDraft = await persistDraftSnapshot({}, { showStatus: false });
      if (!persistedDraft) {
        return { success: false, error: t('workout.err.localSaveBeforeSync') };
      }
    }

    isSyncingRef.current = true;
    setAutoSaveStatus('syncing');

    try {
      let targetSessionId = sessionId;

      if (currentDraft?.sessionOrigin === 'provisional') {
        if (!navigator.onLine) {
          setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'local-only');
          return { success: false, error: t('workout.err.offline') };
        }

        const promoteResult = await createWorkoutSession(
          currentDraft.dayId,
          currentDraft.date,
          currentDraft.cycleId ?? undefined
        );

        if (promoteResult.error || !promoteResult.session) {
          const errorMessage = promoteResult.error || t('workout.err.createSessionFailed');
          setSaveError(errorMessage);
          setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'local-only');
          return { success: false, error: errorMessage };
        }

        const now = Date.now();
        const promotedDraft: ActiveWorkoutDraft = {
          ...currentDraft,
          sessionId: promoteResult.session.id,
          sessionOrigin: 'remote',
          remoteSessionId: promoteResult.session.id,
          updatedAt: now,
          version: currentDraft.version + 1,
        };

        await workoutDraftDb.saveActiveDraft(promotedDraft);
        setActiveDraft(promotedDraft);
        activeDraftRef.current = promotedDraft;
        currentDraft = promotedDraft;
        targetSessionId = promoteResult.session.id;
        setSessionId(promoteResult.session.id);
        workoutSyncQueue.remove(uid, sessionId);
        setQueuedDraft(prev => prev?.sessionId === sessionId ? null : prev);
        trackTelemetryEvent(uid, 'provisional_session_promoted');
      }

      const result = await batchSaveWorkout(targetSessionId, buildExercisesPayload(), {
        notes: dayNotesRef.current || undefined,
        skippedExercises: skippedExercisesRef.current.length > 0 ? skippedExercisesRef.current : undefined,
        dayName: daySnapshotRef.current.dayName || undefined,
        dayFocus: daySnapshotRef.current.focus || undefined,
        ...(requiresFinalSync && { completed: true }),
      });

      if (!result.success) {
        const errorMessage = result.error || t('workout.err.syncFailed');
        setSaveError(errorMessage);
        setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'error');
        return { success: false, error: errorMessage };
      }

      const syncedAt = Date.now();
      setSaveError(null);

      if (requiresFinalSync) {
        const confirmedWorkout = await getWorkoutSessionFromServer(targetSessionId);
        const validation = validateWorkoutCloudWrite(
          confirmedWorkout,
          buildWorkoutWriteExpectation(buildExercisesPayload(), { completed: true })
        );

        if (!validation.ok) {
          const errorMessage = t('workout.err.cloudIncomplete', { reason: validation.reason ?? 'unknown' });
          setSaveError(errorMessage);
          setAutoSaveStatus('final-sync-pending');
          trackTelemetryEvent(uid, 'sync_validation_failed');
          return { success: false, error: errorMessage };
        }

        if (usesActiveDraftStore) {
          try {
            await workoutDraftDb.clearActiveDraft(uid);
          } catch {
            setSaveError(t('workout.err.cloudSavedLocalCleanupFailed'));
          }
        }
        workoutSyncQueue.remove(uid, targetSessionId);
        if (sessionId !== targetSessionId) {
          workoutSyncQueue.remove(uid, sessionId);
        }
        setQueuedDraft(prev => prev?.sessionId === targetSessionId || prev?.sessionId === sessionId ? null : prev);
        setActiveDraft(null);
        setIsCompleted(true);
        completedSessionLockRef.current = targetSessionId;
        queueAutoSaveStatus('synced', 'idle', 2200);
        trackTelemetryEvent(uid, 'sync_success');
        return { success: true };
      }

      if (usesActiveDraftStore) {
        try {
          await workoutDraftDb.markDraftSynced(uid, syncedAt);
        } catch {
          setSaveError(t('workout.err.cloudSavedStatusStale'));
        }
      }
      workoutSyncQueue.remove(uid, targetSessionId);
      if (usesActiveDraftStore) {
        setActiveDraft(prev => prev && prev.userId === uid
          ? {
            ...prev,
            dirty: false,
            lastFirebaseSyncAt: syncedAt,
          }
          : prev
        );
      }
      queueAutoSaveStatus('synced', 'idle', 2200);
      trackTelemetryEvent(uid, 'sync_success');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('workout.err.syncFailed');
      setSaveError(errorMessage);
      setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'error');
      trackTelemetryEvent(uid, 'sync_failure');
      return { success: false, error: errorMessage };
    } finally {
      isSyncingRef.current = false;
    }
  }, [uid, sessionId, batchSaveWorkout, buildExercisesPayload, createWorkoutSession, getWorkoutSessionFromServer, persistDraftSnapshot, queueAutoSaveStatus, t]);

  const applyWorkoutState = useCallback((next: {
    sessionId: string | null;
    completed: boolean;
    exerciseSets: Record<string, SetData[]>;
    exerciseNotes: Record<string, string>;
    dayNotes: string;
    skippedExercises: string[];
  }) => {
    setSessionId(next.sessionId);
    setIsCompleted(next.completed);
    setExerciseSets(next.exerciseSets);
    setExerciseNotes(next.exerciseNotes);
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
      const draft = await workoutDraftDb.loadActiveDraft(uid);
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
  }, [uid]);

  useEffect(() => {
    if (!uid || !dayId) {
      setQueuedDraft(null);
      return;
    }

    const queueDraft = workoutSyncQueue.findByDayDate(uid, dayId, targetDate);
    setQueuedDraft(queueDraft);
  }, [uid, dayId, targetDate]);

  useEffect(() => {
    if (!sessionId) return;
    if (!navigator.storage?.persist) return;
    void navigator.storage.persist().catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!isLoaded || !isDraftLoaded || !dayId) return;

    const workoutForDate = findWorkoutForRoute(workouts, {
      dayId,
      date: targetDate,
      sessionId: routeSessionId,
      allowDateFallback: true,
    });
    const draftHasData = currentPageDraft
      ? hasDraftContent(
        currentPageDraft.exerciseSets,
        currentPageDraft.exerciseNotes,
        currentPageDraft.dayNotes,
        currentPageDraft.skippedExercises
      )
      : false;

    const completedWorkoutValidation = workoutForDate?.completed && currentPageDraft
      ? validateWorkoutCloudWrite(
        workoutForDate,
        buildWorkoutWriteExpectation(
          Object.entries(currentPageDraft.exerciseSets).map(([exerciseId, sets]) => ({ exerciseId, sets })),
          { completed: true }
        )
      )
      : null;

    if (workoutForDate?.completed && currentPageDraft && !currentPageDraft.finalSyncPending && completedWorkoutValidation?.ok) {
      void workoutDraftDb.clearActiveDraft(uid);
      setActiveDraft(null);
    }

    const shouldUseDraft = (() => {
      if (!currentPageDraft) return false;
      if (workoutForDate && currentPageDraft.sessionId !== workoutForDate.id) return false;
      if (!workoutForDate) return draftHasData || currentPageDraft.finalSyncPending || Object.keys(currentPageDraft.exerciseSets).length > 0;
      if (workoutForDate.completed && !currentPageDraft.finalSyncPending) return completedWorkoutValidation?.ok === false && draftHasData;
      if (currentPageDraft.finalSyncPending) return true;
      if (currentPageDraft.dirty) return true;
      if (workoutForDate.exercises.length === 0 && draftHasData) return true;
      if (currentPageDraft.lastFirebaseSyncAt == null) return draftHasData;
      return currentPageDraft.updatedAt > currentPageDraft.lastFirebaseSyncAt;
    })();

    if (shouldUseDraft && currentPageDraft) {
      applyWorkoutState({
        sessionId: currentPageDraft.sessionId,
        completed: currentPageDraft.completedLocally || !!workoutForDate?.completed,
        exerciseSets: currentPageDraft.exerciseSets,
        exerciseNotes: currentPageDraft.exerciseNotes,
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
      });

      applyWorkoutState({
        sessionId: workoutForDate.id,
        completed: workoutForDate.completed,
        exerciseSets: sets,
        exerciseNotes: notes,
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
  }, [isLoaded, isDraftLoaded, dayId, workouts, targetDate, routeSessionId, currentPageDraft, applyWorkoutState, toast, uid]);

  // Autostart workout when navigating with ?autostart=true
  useEffect(() => {
    if (!autostart || autostartDone.current || !isLoaded || !day) return;
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
  }, [autostart, isLoaded, day, isViewingPastWorkout, isCompleted, sessionId]);

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

  // Flush local draft and try best-effort sync when app goes to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && sessionId) {
        void persistDraftSnapshot({}, { showStatus: false });
        void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
      }
    };
    const handlePageHide = () => {
      if (!sessionId) return;
      void persistDraftSnapshot({}, { showStatus: false });
      void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [sessionId, currentPageDraft?.finalSyncPending, persistDraftSnapshot, syncDraftToFirebase]);

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
    if (!day || !uid) return;
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

    try {
      const activeCycle = getActiveCycle();
      const shouldStartOffline = !navigator.onLine;
      let result = shouldStartOffline
        ? { session: createOfflineWorkoutSession(day.id, targetDate, activeCycle?.id), existing: false, provisional: true }
        : await createWorkoutSession(day.id, targetDate, activeCycle?.id);

      if (!shouldStartOffline && (result.error || !result.session)) {
        const normalizedError = String(result.error || '').toLowerCase();
        const canFallbackToOffline = normalizedError.includes('offline')
          || normalizedError.includes('network')
          || normalizedError.includes('unavailable')
          || normalizedError.includes('failed-precondition');

        if (canFallbackToOffline) {
          result = {
            session: createOfflineWorkoutSession(day.id, targetDate, activeCycle?.id),
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
        setSessionId(result.session.id);
        setIsCompleted(false);
        toast({
          title: t('workout.toast.continueTitle'),
          description: t('workout.toast.continueDesc'),
        });
      } else {
        // Pre-fill with progression from previous workout
        const prefilled: Record<string, SetData[]> = {};
        day.exercises.forEach((exercise, idx) => {
          const prevSets = getPreviousSets(exercise.id);
          const count = parseSetCount(exercise.sets);
          prefilled[exercise.id] = createPrefilledSets(
            count, prevSets, idx, exercise.sets, exercise.isSuperset, isBodyweightExercise(exercise.name)
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
          dayId: day.id,
          date: targetDate,
          cycleId: activeCycle?.id ?? null,
          sessionOrigin: result.provisional ? 'provisional' : 'remote',
          remoteSessionId: result.provisional ? null : result.session.id,
          exerciseSets: prefilled,
          exerciseNotes: {},
          dayNotes: '',
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
        if (result.provisional) {
          trackTelemetryEvent(uid, 'provisional_session_started');
        }
        toast({
          title: result.provisional ? t('workout.toast.startedOfflineTitle') : t('workout.toast.startedTitle'),
          description: result.provisional
            ? t('workout.toast.startedOfflineDesc', { day: localizeDayName(day.dayName, lang), focus: localizeFocus(day.focus, lang) })
            : `${localizeDayName(day.dayName, lang)} - ${localizeFocus(day.focus, lang)}`,
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
    });

    setSaveError(null);
  }, [saveDraftSnapshot]);

  const handleDayNotesChange = useCallback((value: string) => {
    setDayNotes(value);
    saveDraftSnapshot({ dayNotes: value });
  }, [saveDraftSnapshot]);

  const handleSkipExercise = useCallback((exerciseId: string) => {
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

  // AI coach on-demand: jedno wywołanie na żądanie (przycisk), z kontekstem realnej historii.
  // Koszt tylko gdy user kliknie — limit $5/user pilnuje Cloud Function proxyOpenAI.
  const handleAskCoach = async (exercise: Exercise) => {
    if (coachBusyId) return;
    setCoachBusyId(exercise.id);
    try {
      const isBw = isBodyweightExercise(exercise.name);
      const history = getExerciseHistory(workouts, exercise.id, isBw).slice(-5);
      const histStr = history.length
        ? history.map(h => isBw ? `${h.date}: ${h.bestReps} powt.` : `${h.date}: ${h.maxWeight}kg×${h.bestReps}`).join('; ')
        : 'brak wcześniejszych sesji';
      const advice = getNextSetAdvice(workouts, exercise.id, exercise.sets, 0, { isBodyweight: isBw, isSuperset: exercise.isSuperset }, lang);
      const notes = exerciseNotes[exercise.id]?.trim() || dayNotes.trim() || 'brak';

      const coachSystemPrompt = lang === 'en'
        ? 'You are an experienced strength coach. Respond in English, max 2 short sentences, concrete and practical, no intros and no lists.'
        : 'Jesteś doświadczonym trenerem siłowym. Odpowiadasz po polsku, maksymalnie 2 krótkie zdania, konkretnie i praktycznie, bez wstępów i bez listy.';

      const reply = await callOpenAI([
        { role: 'system', content: coachSystemPrompt },
        { role: 'user', content: `Ćwiczenie: ${exercise.name} (schemat ${exercise.sets}). Ostatnie sesje: ${histStr}. Sugestia systemu: ${advice?.reason ?? 'brak'}. Notatki zawodnika: ${notes}. Doradź na dzisiejszą serię.` },
      ]);

      toast({
        title: t('workout.coach.toastTitle', { name: exercise.name }),
        description: reply.trim() || t('workout.coach.noReply'),
        duration: 12000,
      });
    } catch (err) {
      toast({
        title: t('workout.coach.unavailableTitle'),
        description: err instanceof Error ? err.message : t('workout.coach.unavailableDesc'),
        variant: 'destructive',
      });
    } finally {
      setCoachBusyId(null);
    }
  };

  const handleRetrySync = async () => {
    if (!currentPageDraft?.finalSyncPending) return;

    setIsExplicitSaving(true);
    trackTelemetryEvent(uid, 'sync_retry_manual');
    const result = await syncDraftToFirebase('final');
    setIsExplicitSaving(false);

    if (!result.success) {
      toast({
        title: t('workout.toast.noSyncTitle'),
        description: t('workout.toast.noSyncDesc'),
        variant: "destructive",
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

    setIsExplicitSaving(true);
    setSaveError(null);

    const flushedDraft = await persistDraftSnapshot({}, { showStatus: false });
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

    if (!result.success) {
      const now = Date.now();
      const pendingDraft = await persistDraftSnapshot({
        completedLocally: true,
        finalSyncPending: true,
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

    // Detect new PRs
    const currentWorkoutData = workouts.find(w => w.id === sessionId);
    if (currentWorkoutData && day) {
      const previousWorkoutsForPR = workouts.filter(w => w.id !== sessionId && w.completed);
      const exerciseNames = new Map(day.exercises.map(e => [e.id, e.name]));
      const bodyweightIds = new Set(day.exercises.filter(e => isBodyweightExercise(e.name)).map(e => e.id));
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

    const result = await batchSaveWorkout(sessionId, buildExercisesPayload(), {
      notes: dayNotes,
      skippedExercises: skippedExercises.length > 0 ? skippedExercises : undefined,
      dayName: daySnapshotRef.current.dayName || undefined,
      dayFocus: daySnapshotRef.current.focus || undefined,
    });

    setIsExplicitSaving(false);

    if (!result.success) {
      setSaveError(result.error || t('workout.err.saveGeneric'));
      toast({
        title: t('workout.toast.errorTitle'),
        description: t('workout.toast.saveChangesFailedDesc'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('workout.toast.savedShortTitle'),
        description: t('workout.toast.changesSavedDesc'),
      });
      setIsEditing(false);
    }
  };

  // Get previous sets for a specific exercise
  const getPreviousSets = (exerciseId: string): SetData[] | undefined => {
    if (!previousWorkout) return undefined;
    const ex = previousWorkout.exercises.find(e => e.exerciseId === exerciseId);
    return ex?.sets;
  };

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

  const ErrorBanner = () => saveError ? (
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{saveError}</span>
        </div>
      </CardContent>
    </Card>
  ) : null;

  // Auto-save indicator: lokalny zapis jest cichy (trening trzymany lokalnie, sync leci
  // przy "Zakończ trening"). Pokazujemy TYLKO realny błąd, żeby nie zaśmiecać ekranu.
  const AutoSaveIndicator = () => {
    if (autoSaveStatus !== 'error') return null;
    return (
      <div className="fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs z-50 transition-opacity duration-300 bg-destructive/20 text-destructive">
        <CloudOff className="h-3 w-3" /> {t('workout.status.error')}
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
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-amber-900">{t('workout.finishedLocally.title')}</p>
                <p className="text-sm text-amber-800">{t('workout.finishedLocally.desc')}</p>
              </div>
              <Button
                variant="outline"
                className="border-amber-400 text-amber-900 hover:bg-amber-100"
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
          isFinalSyncPending && "border-amber-300 bg-amber-50"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-fitness-success",
              isFinalSyncPending && "text-amber-900"
            )}>
              <Check className="h-6 w-6" />
              {isFinalSyncPending ? t('workout.completedLocallyTitle') : t('workout.completedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {isFinalSyncPending ? t('workout.waitingSyncDesc') : t('workout.greatJob')}
            </p>
            <div className="grid grid-cols-3 gap-3">
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

            return (
              <Card key={exercise.id} className={cn("bg-muted/30", isSkipped && "opacity-60")}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="h-8 w-8 rounded-lg flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{exercise.name}</span>
                      {isSkipped && (
                        <Badge variant="outline" className="text-xs">{t('dayplan.badgeMissed')}</Badge>
                      )}
                    </div>
                    {!isSkipped && (
                      <div className="flex items-center gap-4 text-sm">
                        <span>{t('workout.setsProgress', { done: completed.length, total: sets.length })}</span>
                        {totalWeight > 0 && (
                          <Badge className="bg-fitness-success text-background font-semibold">{totalWeight} kg</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
              return { name: ex.name, sets: maxW > 0 ? `${completed.length}x ${maxW}kg` : t('workout.setsCount', { n: completed.length }) };
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
              onSetsChange={(sets, notes) => handleSetsChangeLocal(exercise.id, sets, notes)}
              isEditable={true}
              isBodyweight={isBodyweightExercise(exercise.name)}
              historicalBest={getExerciseBest1RM(workouts, exercise.id)}
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
          <StatCard label={t('workout.statTime')} value={fmtDuration(elapsedSec)} accent="primary" />
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
          <div key={exercise.id} ref={index === 0 ? firstExerciseRef : undefined} className="space-y-2">
            <ExerciseCard
              exercise={exercise}
              index={index + 1}
              savedSets={exerciseSets[exercise.id]}
              savedNotes={exerciseNotes[exercise.id]}
              previousSets={getPreviousSets(exercise.id)}
              onSetsChange={(sets, notes) => handleSetsChange(exercise.id, sets, notes)}
              isBodyweight={isBodyweightExercise(exercise.name)}
              isEditable={isWorkoutStarted && !isCompleted}
              nextAdvice={getNextSetAdvice(workouts, exercise.id, exercise.sets, index, {
                isBodyweight: isBodyweightExercise(exercise.name),
                isSuperset: exercise.isSuperset,
              }, lang)}
              onAskCoach={isWorkoutStarted && !isCompleted ? () => handleAskCoach(exercise) : undefined}
              coachBusy={coachBusyId === exercise.id}
              historicalBest={getExerciseBest1RM(workouts, exercise.id)}
            />
            {/* AI Swap & Skip buttons — only in active workout */}
            {isWorkoutStarted && !isCompleted && (
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
                  onClick={() => {
                    setSwapExerciseId(exercise.id);
                    setSwapQuery('');
                    setSwapPick(null);
                  }}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />{t('newplan.swap')}
                </Button>
              </div>
            )}

            {/* Exercise swap dialog — search the library, no AI */}
            {swapExerciseId === exercise.id && (
              <Card className="border-primary/30 bg-primary/[0.04]">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{t('planeditor.swappingExercise', { name: exercise.name })}</p>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSwapExerciseId(null); setSwapPick(null); setSwapQuery(''); }}>{t('workout.close')}</Button>
                  </div>

                  {!swapPick ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={swapQuery}
                          onChange={e => setSwapQuery(e.target.value)}
                          placeholder={t('workout.swapSearchPlaceholder')}
                          autoFocus
                          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {exerciseLibrary
                          .filter(e => e.name.toLowerCase().includes(swapQuery.trim().toLowerCase()))
                          .slice(0, 40)
                          .map(libEx => (
                            <button
                              key={libEx.name}
                              onClick={() => setSwapPick(libEx)}
                              className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors"
                            >
                              <span className="text-sm font-medium">{libEx.name}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">{localizeCategory(libEx.category, lang)}</Badge>
                            </button>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm">{t('workout.swapTo')} <span className="font-semibold text-primary">{swapPick.name}</span></p>
                      <p className="text-xs text-muted-foreground">{t('workout.swapHowLong')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleApplySwap(exercise.id, exercise.sets, 'today')}>
                          {t('workout.swapToday')}
                        </Button>
                        <Button size="sm" onClick={() => handleApplySwap(exercise.id, exercise.sets, 'plan')}>
                          {t('workout.swapPermanent')}
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setSwapPick(null)}>{t('workout.swapPickOther')}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* Edit plan button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={() => navigate('/plan/edit')}
      >
        <Pencil className="h-4 w-4 mr-2" />
        {t('workout.editDayPlan')}
      </Button>

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
            disabled={isExplicitSaving}
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
