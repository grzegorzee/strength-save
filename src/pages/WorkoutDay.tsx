import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye, Pencil, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseCard } from '@/components/ExerciseCard';
import { trainingPlan } from '@/data/trainingPlan';
import { useFirebaseWorkouts, SetData } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';

const WorkoutDay = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    workouts,
    createWorkoutSession,
    updateExerciseProgress,
    completeWorkout,
    isLoaded
  } = useFirebaseWorkouts();

  // Get date from URL or use today
  const today = new Date().toISOString().split('T')[0];
  const targetDate = searchParams.get('date') || today;
  const isViewingPastWorkout = targetDate !== today;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pendingSaves = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastLoadedWorkoutId = useRef<string | null>(null);

  const day = trainingPlan.find(d => d.id === dayId);

  // Load data from Firebase - find workout for specific date
  useEffect(() => {
    if (!isLoaded || !dayId) return;

    // Find workout for this day and date
    const workoutForDate = workouts.find(w => w.dayId === dayId && w.date === targetDate);

    // Only reload if workout changed or we don't have data yet
    if (workoutForDate && workoutForDate.id !== lastLoadedWorkoutId.current) {
      lastLoadedWorkoutId.current = workoutForDate.id;
      setSessionId(workoutForDate.id);
      setIsCompleted(workoutForDate.completed);

      // Load exercises from Firebase
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
    } else if (!workoutForDate && lastLoadedWorkoutId.current !== 'none') {
      // No workout found - reset state
      lastLoadedWorkoutId.current = 'none';
      setSessionId(null);
      setIsCompleted(false);
      setExerciseSets({});
      setExerciseNotes({});
    }
  }, [isLoaded, dayId, workouts, targetDate]);

  // Cleanup pending saves on unmount
  useEffect(() => {
    return () => {
      pendingSaves.current.forEach(timeout => clearTimeout(timeout));
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
    // Don't allow starting workout for past dates
    if (isViewingPastWorkout) {
      toast({
        title: "Nie można rozpocząć",
        description: "Nie można rozpocząć treningu dla przeszłej daty.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
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
      setIsSaving(false);
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

  // Handler for ACTIVE WORKOUT - auto-saves to Firebase
  const handleSetsChange = useCallback(async (exerciseId: string, sets: SetData[], notes?: string) => {
    const sanitizedSets = sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
      ...(s.isWarmup && { isWarmup: true }),
    }));

    // Update local state immediately
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

    const currentNotes = notes !== undefined ? notes : exerciseNotes[exerciseId];

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      const result = await updateExerciseProgress(sessionId, exerciseId, sanitizedSets, currentNotes);

      if (!result.success) {
        setSaveError(result.error || 'Błąd zapisu');
        toast({
          title: "Błąd zapisu!",
          description: result.error || 'Sprawdź połączenie.',
          variant: "destructive",
        });
      }

      setIsSaving(false);
      pendingSaves.current.delete(exerciseId);
    }, 300);

    pendingSaves.current.set(exerciseId, timeout);
  }, [sessionId, updateExerciseProgress, toast, exerciseNotes]);

  const handleCompleteWorkout = async () => {
    if (!sessionId) return;

    // Wait for pending saves
    if (pendingSaves.current.size > 0) {
      toast({ title: "Poczekaj...", description: "Zapisywanie danych." });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsSaving(true);
    const result = await completeWorkout(sessionId);

    if (!result.success) {
      setSaveError(result.error || 'Błąd');
      toast({
        title: "Błąd!",
        description: result.error || 'Nie udało się zakończyć treningu.',
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    setIsCompleted(true);
    setIsSaving(false);
    toast({
      title: "Trening zakończony!",
      description: "Świetna robota!",
    });
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

    setIsSaving(true);
    setSaveError(null);

    // Save ALL exercises to Firebase at once (with notes)
    let hasError = false;
    for (const [exerciseId, sets] of Object.entries(exerciseSets)) {
      const notes = exerciseNotes[exerciseId];
      const result = await updateExerciseProgress(sessionId, exerciseId, sets, notes);
      if (!result.success) {
        hasError = true;
        setSaveError(result.error || 'Błąd zapisu');
      }
    }

    setIsSaving(false);

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

  const SavingIndicator = () => isSaving ? (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Zapisywanie...</span>
    </div>
  ) : null;

  // COMPLETED VIEW (not editing)
  if (isCompleted && !isEditing) {
    return (
      <div className="space-y-6 pb-20">
        <SavingIndicator />

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

        <Button
          className="bg-fitness-success hover:bg-fitness-success/90"
          onClick={handleFinishEditing}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Zapisz zmiany
        </Button>
      </div>
    );
  }

  // ACTIVE WORKOUT VIEW
  return (
    <div className="space-y-6 pb-24">
      <SavingIndicator />

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

      {/* Past date without workout - show message */}
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
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
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
            onSetsChange={(sets, notes) => handleSetsChange(exercise.id, sets, notes)}
            isEditable={isWorkoutStarted && !isCompleted}
          />
        ))}
      </div>

      {isWorkoutStarted && !isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            size="lg"
            className="w-full py-6 text-lg bg-fitness-success hover:bg-fitness-success/90"
            onClick={handleCompleteWorkout}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
            Zakończ trening
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkoutDay;
