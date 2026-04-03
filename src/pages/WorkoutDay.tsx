import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye, Pencil, Loader2, AlertCircle, Cloud, CloudOff, Timer, StickyNote, ArrowRightLeft, Flame, Share2, SkipForward } from 'lucide-react';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';
import { calculateStreak } from '@/lib/summary-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseCard } from '@/components/ExerciseCard';
import { RestTimer } from '@/components/RestTimer';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { useAISwap } from '@/hooks/useAISwap';
import type { SetData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { detectNewPRs, getExerciseBest1RM } from '@/lib/pr-utils';
import { getRestDuration, lookupExerciseType, createPrefilledSets, parseSetCount, isBodyweightExercise } from '@/lib/exercise-utils';
import { hasDraftContent, workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;

type AutoSaveStatus =
  | 'idle'
  | 'local-saved'
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
  const { uid } = useCurrentUser();
  const {
    workouts,
    createWorkoutSession,
    batchSaveWorkout,
    isLoaded
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);

  const today = new Date().toISOString().split('T')[0];
  const targetDate = searchParams.get('date') || today;
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
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [skippedExercises, setSkippedExercises] = useState<string[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(30);
  const [restTimerLabel, setRestTimerLabel] = useState<string | undefined>();
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [showWarmup, setShowWarmup] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // AI Swap
  const { result: swapResult, isLoading: swapLoading, error: swapError, findSwap, reset: resetSwap } = useAISwap(uid);
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState('');

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const draftSaveTimer = useRef<NodeJS.Timeout | null>(null);
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

  useEffect(() => { exerciseSetsRef.current = exerciseSets; }, [exerciseSets]);
  useEffect(() => { exerciseNotesRef.current = exerciseNotes; }, [exerciseNotes]);
  useEffect(() => { dayNotesRef.current = dayNotes; }, [dayNotes]);
  useEffect(() => { skippedExercisesRef.current = skippedExercises; }, [skippedExercises]);
  useEffect(() => { activeDraftRef.current = activeDraft; }, [activeDraft]);

  const day = trainingPlan.find(d => d.id === dayId);
  const currentPageDraft = activeDraft && activeDraft.dayId === dayId && activeDraft.date === targetDate
    ? activeDraft
    : null;

  // Find previous workout for this day (for weight hints)
  const previousWorkout = workouts.find(w =>
    w.dayId === dayId &&
    w.date !== targetDate &&
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
    if (!uid || !sessionId || !dayId) return null;

    const now = Date.now();
    const previousDraft = activeDraftRef.current?.sessionId === sessionId
      ? activeDraftRef.current
      : null;

    return {
      sessionId,
      userId: uid,
      dayId,
      date: targetDate,
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

    setActiveDraft(draft);

    try {
      await workoutDraftDb.saveActiveDraft(draft);
      setSaveError(null);
      if (options.showStatus) {
        if (draft.finalSyncPending) {
          setAutoSaveStatus('final-sync-pending');
        } else {
          queueAutoSaveStatus('local-saved', 'sync-pending');
        }
      }
    } catch {
      setSaveError('Nie udało się zapisać szkicu lokalnie.');
      setAutoSaveStatus('error');
    }

    return draft;
  }, [buildDraftSnapshot, queueAutoSaveStatus]);

  const saveDraftSnapshot = useCallback((overrides: Partial<ActiveWorkoutDraft> = {}) => {
    if (!sessionId || !dayId || !uid) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      void persistDraftSnapshot(overrides, { showStatus: true });
    }, 300);
  }, [sessionId, dayId, uid, persistDraftSnapshot]);

  // Build exercises payload for batchSaveWorkout (reads from refs)
  const buildExercisesPayload = useCallback(() => (
    Object.entries(exerciseSetsRef.current).map(([exerciseId, sets]) => ({
      exerciseId,
      sets,
      ...(exerciseNotesRef.current[exerciseId] && { notes: exerciseNotesRef.current[exerciseId] }),
    }))
  ), []);

  const syncDraftToFirebase = useCallback(async (mode: 'checkpoint' | 'final'): Promise<{ success: boolean; skipped?: boolean; error?: string }> => {
    if (!uid || !sessionId || isSyncingRef.current) {
      return { success: false, skipped: true };
    }

    const currentDraft = activeDraftRef.current?.sessionId === sessionId
      ? activeDraftRef.current
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
      await persistDraftSnapshot({}, { showStatus: false });
    }

    isSyncingRef.current = true;
    setAutoSaveStatus('syncing');

    const result = await batchSaveWorkout(sessionId, buildExercisesPayload(), {
      notes: dayNotesRef.current || undefined,
      skippedExercises: skippedExercisesRef.current.length > 0 ? skippedExercisesRef.current : undefined,
      ...(requiresFinalSync && { completed: true }),
    });

    isSyncingRef.current = false;

    if (!result.success) {
      const errorMessage = result.error || 'Błąd synchronizacji';
      setSaveError(errorMessage);
      setAutoSaveStatus(requiresFinalSync ? 'final-sync-pending' : 'error');
      return { success: false, error: errorMessage };
    }

    const syncedAt = Date.now();
    setSaveError(null);

    if (requiresFinalSync) {
      await workoutDraftDb.clearActiveDraft(uid);
      setActiveDraft(null);
      setIsCompleted(true);
      completedSessionLockRef.current = sessionId;
      queueAutoSaveStatus('synced', 'idle', 2200);
      return { success: true };
    }

    await workoutDraftDb.markDraftSynced(uid, syncedAt);
    setActiveDraft(prev => prev && prev.userId === uid
      ? {
        ...prev,
        dirty: false,
        lastFirebaseSyncAt: syncedAt,
      }
      : prev
    );
    queueAutoSaveStatus('synced', 'idle', 2200);
    return { success: true };
  }, [uid, sessionId, batchSaveWorkout, buildExercisesPayload, persistDraftSnapshot, queueAutoSaveStatus]);

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
    if (!sessionId) return;
    if (!navigator.storage?.persist) return;
    void navigator.storage.persist().catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!isLoaded || !isDraftLoaded || !dayId) return;

    const workoutForDate = workouts.find(w => w.dayId === dayId && w.date === targetDate);
    const draftHasData = currentPageDraft
      ? hasDraftContent(
        currentPageDraft.exerciseSets,
        currentPageDraft.exerciseNotes,
        currentPageDraft.dayNotes,
        currentPageDraft.skippedExercises
      )
      : false;

    if (workoutForDate?.completed && currentPageDraft && !currentPageDraft.finalSyncPending) {
      void workoutDraftDb.clearActiveDraft(uid);
      setActiveDraft(null);
    }

    const shouldUseDraft = (() => {
      if (!currentPageDraft) return false;
      if (workoutForDate && currentPageDraft.sessionId !== workoutForDate.id) return false;
      if (!workoutForDate) return draftHasData || currentPageDraft.finalSyncPending || Object.keys(currentPageDraft.exerciseSets).length > 0;
      if (workoutForDate.completed && !currentPageDraft.finalSyncPending) return false;
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
        toast({
          title: currentPageDraft.finalSyncPending ? 'Trening czeka na synchronizację' : 'Odzyskano niezapisany trening',
          description: currentPageDraft.finalSyncPending
            ? 'Dane zostały zapisane lokalnie. Synchronizacja wróci po połączeniu.'
            : 'Wczytano dane z pamięci urządzenia.',
        });
      }

      setAutoSaveStatus(currentPageDraft.finalSyncPending ? 'final-sync-pending' : (currentPageDraft.dirty ? 'sync-pending' : 'idle'));
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
  }, [isLoaded, isDraftLoaded, dayId, workouts, targetDate, currentPageDraft, applyWorkoutState, toast, uid]);

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
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
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
        if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
        void persistDraftSnapshot({}, { showStatus: false });
        void syncDraftToFirebase(currentPageDraft?.finalSyncPending ? 'final' : 'checkpoint');
      }
    };
    const handlePageHide = () => {
      if (!sessionId) return;
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
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

  // Warn before closing with unsaved data
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sessionId && (activeDraftRef.current?.dirty || activeDraftRef.current?.finalSyncPending)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionId, isCompleted]);

  if (!day) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nie znaleziono dnia treningowego</p>
        <Button variant="link" onClick={() => navigate('/plan')}>
          Wróć do planu
        </Button>
      </div>
    );
  }

  const handleStartWorkout = async () => {
    if (isViewingPastWorkout) {
      toast({
        title: "Nie można rozpocząć",
        description: "Nie można rozpocząć treningu dla przeszłej daty.",
        variant: "destructive",
      });
      return;
    }

    setIsExplicitSaving(true);
    setSaveError(null);

    try {
      const result = await createWorkoutSession(day.id, targetDate);

      if (result.error || !result.session) {
        setSaveError(result.error || 'Nie udało się utworzyć treningu');
        toast({
          title: "Błąd!",
          description: result.error || 'Nie udało się rozpocząć treningu.',
          variant: "destructive",
        });
        return;
      }

      setSessionId(result.session.id);
      setIsCompleted(false);

      if (result.existing) {
        toast({
          title: "Kontynuujesz trening",
          description: "Wczytano istniejący trening.",
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

        setActiveDraft(initialDraft);
        await workoutDraftDb.saveActiveDraft(initialDraft);
        queueAutoSaveStatus('local-saved', 'sync-pending');

        toast({
          title: "Trening rozpoczęty!",
          description: `${day.dayName} - ${day.focus}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      setSaveError(errorMessage);
      toast({
        title: "Błąd!",
        description: 'Nie udało się rozpocząć treningu.',
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
      title: "Ćwiczenie pominięte",
      description: "Ćwiczenie zostało pominięte na dzisiaj.",
    });
  }, [saveDraftSnapshot, toast]);

  const handleRetrySync = async () => {
    if (!currentPageDraft?.finalSyncPending) return;

    setIsExplicitSaving(true);
    const result = await syncDraftToFirebase('final');
    setIsExplicitSaving(false);

    if (!result.success) {
      toast({
        title: "Brak synchronizacji",
        description: "Trening nadal jest bezpieczny lokalnie. Spróbujemy ponownie po odzyskaniu połączenia.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Synchronizacja zakończona",
      description: "Trening został zapisany w chmurze.",
    });
  };

  const handleCompleteWorkout = async () => {
    if (!sessionId || !uid) return;

    setIsExplicitSaving(true);
    setSaveError(null);

    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    await persistDraftSnapshot({}, { showStatus: false });

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
        setIsCompleted(true);
        setShowCompleteConfirm(false);
        setAutoSaveStatus('final-sync-pending');
        completedSessionLockRef.current = sessionId;
      }

      setSaveError(result.error || 'Trening czeka na synchronizację');
      toast({
        title: "Trening zapisano lokalnie",
        description: "Nie ma połączenia z internetem. Synchronizacja ruszy automatycznie po odzyskaniu sieci.",
      });
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
          title: `🏆 Nowy rekord! (${newPRs.length})`,
          description: prNames,
        });
      } else {
        toast({
          title: "Trening zapisany!",
          description: "Zapisano lokalnie i zsynchronizowano z chmurą.",
        });
      }
    } else {
      toast({
        title: "Trening zapisany!",
        description: "Zapisano lokalnie i zsynchronizowano z chmurą.",
      });
    }
  };

  const handleFinishEditing = async () => {
    if (!sessionId) {
      toast({
        title: "Błąd!",
        description: "Brak sesji treningowej.",
        variant: "destructive",
      });
      return;
    }

    setIsExplicitSaving(true);
    setSaveError(null);

    const result = await batchSaveWorkout(sessionId, buildExercisesPayload(), {
      notes: dayNotes,
      skippedExercises: skippedExercises.length > 0 ? skippedExercises : undefined,
    });

    setIsExplicitSaving(false);

    if (!result.success) {
      setSaveError(result.error || 'Błąd zapisu');
      toast({
        title: "Błąd!",
        description: "Nie udało się zapisać zmian.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Zapisano!",
        description: "Zmiany zostały zapisane.",
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

  const isWorkoutStarted = sessionId !== null;
  const isFinalSyncPending = !!currentPageDraft?.finalSyncPending;

  // Calculate stats from exerciseSets
  const exerciseCount = Object.keys(exerciseSets).length;
  const completedSetsCount = Object.values(exerciseSets).reduce(
    (total, sets) => total + sets.filter(s => s.completed).length,
    0
  );
  const totalRepsCount = Object.values(exerciseSets).reduce(
    (total, sets) => total + sets.filter(s => s.completed).reduce((sum, s) => sum + s.reps, 0),
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

  // Subtle auto-save indicator (no layout shift)
  const AutoSaveIndicator = () => {
    if (autoSaveStatus === 'idle') return null;
    return (
      <div className={cn(
        "fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs z-50 transition-opacity duration-300",
        autoSaveStatus === 'local-saved' && "bg-muted text-muted-foreground opacity-70",
        autoSaveStatus === 'sync-pending' && "bg-amber-100 text-amber-700",
        autoSaveStatus === 'syncing' && "bg-primary/10 text-primary",
        autoSaveStatus === 'synced' && "bg-emerald-100 text-emerald-700",
        autoSaveStatus === 'final-sync-pending' && "bg-amber-100 text-amber-800",
        autoSaveStatus === 'error' && "bg-destructive/20 text-destructive",
      )}>
        {autoSaveStatus === 'local-saved' && <><Cloud className="h-3 w-3" /> Zapisano lokalnie</>}
        {autoSaveStatus === 'sync-pending' && <><CloudOff className="h-3 w-3" /> Czeka na synchronizację</>}
        {autoSaveStatus === 'syncing' && <><Loader2 className="h-3 w-3 animate-spin" /> Synchronizacja...</>}
        {autoSaveStatus === 'synced' && <><Cloud className="h-3 w-3" /> Zsynchronizowano</>}
        {autoSaveStatus === 'final-sync-pending' && <><CloudOff className="h-3 w-3" /> Trening zakończony lokalnie</>}
        {autoSaveStatus === 'error' && <><CloudOff className="h-3 w-3" /> Błąd zapisu</>}
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
            <h1 className="text-2xl font-bold">{day.dayName}</h1>
            <p className="text-muted-foreground">{day.focus}</p>
          </div>
          {!isFinalSyncPending && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edytuj
            </Button>
          )}
        </div>

        <ErrorBanner />

        {isFinalSyncPending && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-amber-900">Trening zakończony lokalnie</p>
                <p className="text-sm text-amber-800">Dane są bezpieczne na urządzeniu i czekają na zapis w Firebase.</p>
              </div>
              <Button
                variant="outline"
                className="border-amber-400 text-amber-900 hover:bg-amber-100"
                onClick={handleRetrySync}
                disabled={isExplicitSaving}
              >
                {isExplicitSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
                Synchronizuj teraz
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
              {isFinalSyncPending ? 'Trening ukończony lokalnie' : 'Trening ukończony!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {isFinalSyncPending ? 'Czekamy tylko na synchronizację z chmurą.' : 'Świetna robota!'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold">{exerciseCount}</p>
                <p className="text-xs text-muted-foreground">Ćwiczeń</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold">{completedSetsCount}</p>
                <p className="text-xs text-muted-foreground">Serii</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold">{totalRepsCount}</p>
                <p className="text-xs text-muted-foreground">Powtórzeń</p>
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
            Podsumowanie
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
                        <Badge variant="outline" className="text-xs">Pominięte</Badge>
                      )}
                    </div>
                    {!isSkipped && (
                      <div className="flex items-center gap-4 text-sm">
                        <span>{completed.length}/{sets.length} serii</span>
                        {totalWeight > 0 && (
                          <Badge className="bg-fitness-success text-white">{totalWeight} kg</Badge>
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
            Udostępnij
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
            Wróć do dashboardu
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
              return { name: ex.name, sets: maxW > 0 ? `${completed.length}x ${maxW}kg` : `${completed.length} serii` };
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
            <h1 className="text-2xl font-bold">{day.dayName}</h1>
            <p className="text-muted-foreground">Tryb edycji</p>
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
            />
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Notatka do treningu</span>
          </div>
          <textarea
            value={dayNotes}
            onChange={e => setDayNotes(e.target.value)}
            placeholder="Jak się czujesz? Coś do zapamiętania? (opcjonalne)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Button
          className="bg-fitness-success hover:bg-fitness-success/90"
          onClick={handleFinishEditing}
          disabled={isExplicitSaving}
        >
          {isExplicitSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Zapisz zmiany
        </Button>
      </div>
    );
  }

  // ACTIVE WORKOUT VIEW
  return (
    <div className="space-y-6 pb-24">
      <AutoSaveIndicator />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{day.dayName}</h1>
          <p className="text-muted-foreground">{day.focus}</p>
        </div>
        {isWorkoutStarted && !isCompleted && (
          <Button variant="outline" size="sm" onClick={() => setShowWarmup(true)}>
            <Flame className="h-4 w-4 mr-1 text-orange-500" />
            Rozgrzewka
          </Button>
        )}
      </div>

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
            <p className="text-muted-foreground">Brak zapisanego treningu dla tej daty</p>
            <Button variant="link" onClick={() => navigate('/plan')} className="mt-2">
              Wróć do planu
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today without workout - show start button */}
      {!isWorkoutStarted && !isViewingPastWorkout && (
        <Button
          size="lg"
          className="w-full py-6 text-lg"
          onClick={handleStartWorkout}
          disabled={isExplicitSaving}
        >
          {isExplicitSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
          Rozpocznij trening
        </Button>
      )}

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
              onSetCompleted={(lastWeight?: number) => {
                if (!isWorkoutStarted || isCompleted) return;
                const exerciseType = lookupExerciseType(exercise.name);
                const best = getExerciseBest1RM(workouts, exercise.id);
                const duration = getRestDuration({
                  exerciseIndex: index,
                  isSuperset: !!exercise.isSuperset,
                  isFirstInSuperset: !!exercise.isSuperset && exercise.id.endsWith('a'),
                  exerciseType,
                  weight: lastWeight,
                  estimated1RM: best.best1RM > 0 ? best.best1RM : undefined,
                });
                setRestTimerDuration(duration);
                setRestTimerLabel(exercise.name);
                setRestTimerKey(k => k + 1);
                setShowRestTimer(true);
              }}
              isEditable={isWorkoutStarted && !isCompleted}
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
                  <SkipForward className="h-3.5 w-3.5" />Pomiń
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1"
                  onClick={() => {
                    setSwapExerciseId(exercise.id);
                    setSwapReason('');
                    resetSwap();
                  }}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />Zamień
                </Button>
              </div>
            )}

            {/* AI Swap dialog */}
            {swapExerciseId === exercise.id && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Zamień: {exercise.name}</p>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSwapExerciseId(null)}>Zamknij</Button>
                  </div>
                  <input
                    type="text"
                    value={swapReason}
                    onChange={e => setSwapReason(e.target.value)}
                    placeholder="Powód (opcjonalnie): brak sprzętu, kontuzja..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => findSwap(exercise.name, swapReason)}
                    disabled={swapLoading}
                    className="w-full"
                  >
                    {swapLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
                    Znajdź zamiennik
                  </Button>
                  {swapError && <p className="text-sm text-destructive">{swapError}</p>}
                  {swapResult && !swapLoading && (
                    <div className="space-y-2">
                      {swapResult.alternatives.map((alt, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background">
                          <span className="font-bold text-sm text-primary">{i + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{alt.name} <Badge variant="outline" className="text-[10px] ml-1">{alt.setsScheme}</Badge></p>
                            <p className="text-xs text-muted-foreground">{alt.reason}</p>
                          </div>
                        </div>
                      ))}
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
        Edytuj plan dnia
      </Button>

      {/* Day notes - at the end of workout */}
      {isWorkoutStarted && !isCompleted && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Notatka do treningu</span>
          </div>
          <textarea
            value={dayNotes}
            onChange={e => handleDayNotesChange(e.target.value)}
            placeholder="Jak się czujesz? Coś do zapamiętania? (opcjonalne)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Rest Timer */}
      {showRestTimer && (
        <RestTimer
          key={`timer-${restTimerKey}`}
          defaultSeconds={restTimerDuration}
          exerciseLabel={restTimerLabel}
          onClose={() => setShowRestTimer(false)}
        />
      )}

      {isWorkoutStarted && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
          {showCompleteConfirm ? (
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 py-6"
                onClick={() => setShowCompleteConfirm(false)}
              >
                Anuluj
              </Button>
              <Button
                size="lg"
                className="flex-1 py-6 bg-fitness-success hover:bg-fitness-success/90"
                onClick={handleCompleteWorkout}
                disabled={isExplicitSaving}
              >
                {isExplicitSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                Tak, zakończ
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="outline"
                className="py-6"
                onClick={() => setShowRestTimer(prev => !prev)}
              >
                <Timer className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="flex-1 py-6 text-lg bg-fitness-success hover:bg-fitness-success/90"
                onClick={() => setShowCompleteConfirm(true)}
                disabled={isExplicitSaving}
              >
                <Check className="h-5 w-5 mr-2" />
                Zakończ trening
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutDay;
