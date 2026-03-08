import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye, Pencil, Loader2, AlertCircle, Cloud, CloudOff, Timer, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseCard } from '@/components/ExerciseCard';
import { RestTimer } from '@/components/RestTimer';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import type { SetData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { getRestDuration } from '@/lib/exercise-utils';

const WorkoutDay = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uid } = useCurrentUser();
  const {
    workouts,
    createWorkoutSession,
    updateExerciseProgress,
    updateWorkoutNotes,
    completeWorkout,
    isLoaded
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);

  const today = new Date().toISOString().split('T')[0];
  const targetDate = searchParams.get('date') || today;
  const isViewingPastWorkout = targetDate !== today;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isExplicitSaving, setIsExplicitSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [restTimerLabel, setRestTimerLabel] = useState<string | undefined>();
  const [restTimerKey, setRestTimerKey] = useState(0);

  const pendingSaves = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingNoteSave = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedWorkoutId = useRef<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const day = trainingPlan.find(d => d.id === dayId);

  // Find previous workout for this day (for weight hints)
  const previousWorkout = workouts.find(w =>
    w.dayId === dayId &&
    w.date !== targetDate &&
    w.completed &&
    w.exercises.length > 0
  );

  // Load data from Firebase
  useEffect(() => {
    if (!isLoaded || !dayId) return;

    const workoutForDate = workouts.find(w => w.dayId === dayId && w.date === targetDate);

    if (workoutForDate && workoutForDate.id !== lastLoadedWorkoutId.current) {
      lastLoadedWorkoutId.current = workoutForDate.id;
      setSessionId(workoutForDate.id);
      setIsCompleted(workoutForDate.completed);

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
      setExerciseSets(sets);
      setExerciseNotes(notes);
      setDayNotes(workoutForDate.notes || '');
    } else if (!workoutForDate && lastLoadedWorkoutId.current !== 'none') {
      lastLoadedWorkoutId.current = 'none';
      setSessionId(null);
      setIsCompleted(false);
      setExerciseSets({});
      setExerciseNotes({});
      setDayNotes('');
    }
  }, [isLoaded, dayId, workouts, targetDate]);

  // Cleanup pending saves on unmount
  useEffect(() => {
    return () => {
      pendingSaves.current.forEach(timeout => clearTimeout(timeout));
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (pendingNoteSave.current) clearTimeout(pendingNoteSave.current);
    };
  }, []);

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
      lastLoadedWorkoutId.current = result.session.id;

      if (result.existing) {
        toast({
          title: "Kontynuujesz trening",
          description: "Wczytano istniejący trening.",
        });
      } else {
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

  // Handler for ACTIVE WORKOUT - auto-saves to Firebase (no re-renders from saving state)
  const handleSetsChange = useCallback((exerciseId: string, sets: SetData[], notes?: string) => {
    const sanitizedSets = sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
      ...(s.isWarmup && { isWarmup: true }),
    }));

    // Update local state immediately (this is the only re-render)
    setExerciseSets(prev => ({ ...prev, [exerciseId]: sanitizedSets }));
    if (notes !== undefined) {
      setExerciseNotes(prev => ({ ...prev, [exerciseId]: notes }));
    }
    setSaveError(null);

    if (!sessionId) {
      setSaveError('Brak sesji - odśwież stronę');
      return;
    }

    // Debounce Firebase saves
    const existingTimeout = pendingSaves.current.get(exerciseId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const currentNotes = notes !== undefined ? notes : exerciseNotes[exerciseId] || '';

    const timeout = setTimeout(async () => {
      // Use subtle status indicator (no state-driven re-render)
      setAutoSaveStatus('saving');

      const result = await updateExerciseProgress(sessionId, exerciseId, sanitizedSets, currentNotes);

      if (!result.success) {
        setAutoSaveStatus('error');
        setSaveError(result.error || 'Błąd zapisu');
      } else {
        setAutoSaveStatus('saved');
        // Reset to idle after a moment
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }

      pendingSaves.current.delete(exerciseId);
    }, 500);

    pendingSaves.current.set(exerciseId, timeout);
  }, [sessionId, updateExerciseProgress, exerciseNotes]);

  const handleDayNotesChange = useCallback((value: string) => {
    setDayNotes(value);
    if (!sessionId) return;

    if (pendingNoteSave.current) clearTimeout(pendingNoteSave.current);
    pendingNoteSave.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const result = await updateWorkoutNotes(sessionId, value);
      if (result.success) {
        setAutoSaveStatus('saved');
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('error');
      }
    }, 500);
  }, [sessionId, updateWorkoutNotes]);

  const handleCompleteWorkout = async () => {
    if (!sessionId) return;

    // Wait for pending saves
    if (pendingSaves.current.size > 0) {
      toast({ title: "Poczekaj...", description: "Zapisywanie danych." });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsExplicitSaving(true);
    const result = await completeWorkout(sessionId);

    if (!result.success) {
      setSaveError(result.error || 'Błąd');
      toast({
        title: "Błąd!",
        description: result.error || 'Nie udało się zakończyć treningu.',
        variant: "destructive",
      });
      setIsExplicitSaving(false);
      return;
    }

    setIsCompleted(true);
    setIsExplicitSaving(false);
    setShowCompleteConfirm(false);

    // Detect new PRs
    const currentWorkoutData = workouts.find(w => w.id === sessionId);
    if (currentWorkoutData && day) {
      const previousWorkoutsForPR = workouts.filter(w => w.id !== sessionId && w.completed);
      const exerciseNames = new Map(day.exercises.map(e => [e.id, e.name]));
      const newPRs = detectNewPRs(
        { ...currentWorkoutData, exercises: Object.entries(exerciseSets).map(([id, sets]) => ({ exerciseId: id, sets })) },
        previousWorkoutsForPR,
        exerciseNames,
      );
      if (newPRs.length > 0) {
        const prNames = newPRs.map(pr => pr.exerciseName).join(', ');
        toast({
          title: `🏆 Nowy rekord! (${newPRs.length})`,
          description: prNames,
        });
      } else {
        toast({
          title: "Trening zakończony!",
          description: "Świetna robota!",
        });
      }
    } else {
      toast({
        title: "Trening zakończony!",
        description: "Świetna robota!",
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

    let hasError = false;

    // Save day notes
    const notesResult = await updateWorkoutNotes(sessionId, dayNotes);
    if (!notesResult.success) {
      hasError = true;
      setSaveError(notesResult.error || 'Błąd zapisu notatki');
    }

    for (const [exerciseId, sets] of Object.entries(exerciseSets)) {
      const notes = exerciseNotes[exerciseId];
      const result = await updateExerciseProgress(sessionId, exerciseId, sets, notes);
      if (!result.success) {
        hasError = true;
        setSaveError(result.error || 'Błąd zapisu');
      }
    }

    setIsExplicitSaving(false);

    if (hasError) {
      toast({
        title: "Błąd!",
        description: "Nie udało się zapisać wszystkich zmian.",
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
        autoSaveStatus === 'saving' && "bg-muted text-muted-foreground opacity-70",
        autoSaveStatus === 'saved' && "bg-fitness-success/20 text-fitness-success opacity-70",
        autoSaveStatus === 'error' && "bg-destructive/20 text-destructive",
      )}>
        {autoSaveStatus === 'saving' && <><Cloud className="h-3 w-3 animate-pulse" /> Zapisuję...</>}
        {autoSaveStatus === 'saved' && <><Cloud className="h-3 w-3" /> Zapisano</>}
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
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edytuj
          </Button>
        </div>

        <ErrorBanner />

        <Card className="border-fitness-success bg-fitness-success/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fitness-success">
              <Check className="h-6 w-6" />
              Trening ukończony!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Świetna robota!</p>
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
            const sets = exerciseSets[exercise.id] || [];
            const completed = sets.filter(s => s.completed);
            const totalWeight = completed.reduce((sum, s) => sum + (s.reps * s.weight), 0);

            return (
              <Card key={exercise.id} className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="h-8 w-8 rounded-lg flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{exercise.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{completed.length}/{sets.length} serii</span>
                      {totalWeight > 0 && (
                        <Badge className="bg-fitness-success text-white">{totalWeight} kg</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
          Wróć do dashboardu
        </Button>
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
        <div>
          <h1 className="text-2xl font-bold">{day.dayName}</h1>
          <p className="text-muted-foreground">{day.focus}</p>
        </div>
      </div>

      <ErrorBanner />

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
        {day.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index + 1}
            savedSets={exerciseSets[exercise.id]}
            savedNotes={exerciseNotes[exercise.id]}
            previousSets={getPreviousSets(exercise.id)}
            onSetsChange={(sets, notes) => handleSetsChange(exercise.id, sets, notes)}
            onSetCompleted={() => {
              if (!isWorkoutStarted || isCompleted) return;
              const duration = getRestDuration({
                exerciseIndex: index,
                isSuperset: !!exercise.isSuperset,
                isFirstInSuperset: !!exercise.isSuperset && exercise.id.endsWith('a'),
              });
              setRestTimerDuration(duration);
              setRestTimerLabel(exercise.name);
              setRestTimerKey(k => k + 1);
              setShowRestTimer(true);
            }}
            isEditable={isWorkoutStarted && !isCompleted}
          />
        ))}
      </div>

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
