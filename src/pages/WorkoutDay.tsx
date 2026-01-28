import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    getTodaysWorkout,
    createWorkoutSession,
    updateExerciseProgress,
    completeWorkout,
    isLoaded
  } = useFirebaseWorkouts();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track if initial data has been loaded to prevent race conditions
  const isInitialized = useRef(false);
  const pendingSaves = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const day = trainingPlan.find(d => d.id === dayId);

  // Load initial data ONLY ONCE when component mounts
  useEffect(() => {
    if (isLoaded && dayId && !isInitialized.current) {
      const todaysWorkout = getTodaysWorkout(dayId);
      console.log('WorkoutDay useEffect: todaysWorkout =', todaysWorkout);
      if (todaysWorkout) {
        console.log('WorkoutDay useEffect: Setting sessionId to', todaysWorkout.id);
        setSessionId(todaysWorkout.id);
        setIsCompleted(todaysWorkout.completed);
        const sets: Record<string, SetData[]> = {};
        todaysWorkout.exercises.forEach(ex => {
          sets[ex.exerciseId] = ex.sets;
        });
        setExerciseSets(sets);
        console.log('WorkoutDay useEffect: Loaded exercises:', sets);
      } else {
        console.log('WorkoutDay useEffect: No workout found for today');
      }
      isInitialized.current = true;
    }
  }, [isLoaded, dayId, getTodaysWorkout]);

  // Reset initialization flag when dayId changes
  useEffect(() => {
    isInitialized.current = false;
  }, [dayId]);

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
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await createWorkoutSession(day.id);

      if (result.error || !result.session) {
        setSaveError(result.error || 'Nie udało się utworzyć treningu');
        toast({
          title: "Błąd!",
          description: result.error || 'Nie udało się rozpocząć treningu. Sprawdź połączenie z internetem.',
          variant: "destructive",
        });
        return;
      }

      setSessionId(result.session.id);
      toast({
        title: "Trening rozpoczęty!",
        description: `${day.dayName} - ${day.focus}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      setSaveError(errorMessage);
      toast({
        title: "Błąd!",
        description: 'Nie udało się rozpocząć treningu. Sprawdź połączenie z internetem.',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetsChange = useCallback(async (exerciseId: string, sets: SetData[]) => {
    // Always update local state immediately for responsive UI
    setExerciseSets(prev => ({ ...prev, [exerciseId]: sets }));
    setSaveError(null);

    if (!sessionId) {
      console.error('handleSetsChange: sessionId is null! Cannot save to Firebase.');
      setSaveError('Brak ID sesji - dane nie zostaną zapisane');
      toast({
        title: "Błąd!",
        description: "Brak ID sesji treningowej. Odśwież stronę.",
        variant: "destructive",
      });
      return;
    }

    console.log(`handleSetsChange: Saving exercise ${exerciseId} to session ${sessionId}`);

    // Debounce Firebase saves to prevent race conditions
    const existingTimeout = pendingSaves.current.get(exerciseId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      console.log(`handleSetsChange: Executing Firebase save for ${exerciseId}`);

      const result = await updateExerciseProgress(sessionId, exerciseId, sets);

      console.log(`handleSetsChange: Result for ${exerciseId}:`, result);

      if (!result.success) {
        setSaveError(result.error || 'Błąd zapisu');
        toast({
          title: "Błąd zapisu!",
          description: `Nie udało się zapisać ćwiczenia. ${result.error || 'Sprawdź połączenie.'}`,
          variant: "destructive",
        });
      }

      setIsSaving(false);
      pendingSaves.current.delete(exerciseId);
    }, 500); // 500ms debounce

    pendingSaves.current.set(exerciseId, timeout);
  }, [sessionId, updateExerciseProgress, toast]);

  const handleCompleteWorkout = async () => {
    if (!sessionId) return;

    // Wait for any pending saves to complete
    if (pendingSaves.current.size > 0) {
      toast({
        title: "Poczekaj...",
        description: "Trwa zapisywanie ostatnich zmian.",
      });

      // Wait a bit for pending saves
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsSaving(true);
    setSaveError(null);

    const result = await completeWorkout(sessionId);

    if (!result.success) {
      setSaveError(result.error || 'Błąd zakończenia treningu');
      toast({
        title: "Błąd!",
        description: `Nie udało się zakończyć treningu. ${result.error || 'Sprawdź połączenie.'}`,
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    setIsCompleted(true);
    setIsSaving(false);
    toast({
      title: "Trening zakończony!",
      description: "Świetna robota! Dane zostały zapisane.",
    });
  };

  const isWorkoutStarted = sessionId !== null;

  const handleFinishEditing = async () => {
    // Wait for any pending saves
    if (pendingSaves.current.size > 0) {
      setIsSaving(true);
      toast({
        title: "Zapisywanie...",
        description: "Czekam na zakończenie zapisu danych.",
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSaving(false);
    }

    // Check if there was an error during saving
    if (saveError) {
      toast({
        title: "Uwaga!",
        description: `Niektóre dane mogły się nie zapisać: ${saveError}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Zmiany zapisane!",
        description: "Dane treningu zostały zaktualizowane.",
      });
    }

    setIsEditing(false);
  };

  // Error banner component
  const ErrorBanner = () => saveError ? (
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{saveError}</span>
        </div>
      </CardContent>
    </Card>
  ) : null;

  // Saving indicator component
  const SavingIndicator = () => isSaving ? (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Zapisywanie...</span>
    </div>
  ) : null;

  // Workout completed view (with optional edit mode)
  if (isCompleted && !isEditing) {
    return (
      <div className="space-y-6">
        <SavingIndicator />

        {/* Header */}
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

        {/* Completed Status */}
        <Card className="border-fitness-success bg-fitness-success/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fitness-success">
              <Check className="h-6 w-6" />
              Trening ukończony!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Świetna robota! Oto podsumowanie Twojego treningu:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-2xl font-bold">{Object.keys(exerciseSets).length}</p>
                <p className="text-sm text-muted-foreground">Ćwiczeń wykonanych</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-2xl font-bold">
                  {Object.values(exerciseSets).reduce((total, sets) =>
                    total + sets.filter(s => s.completed).length, 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Serii ukończonych</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review exercises */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Podsumowanie ćwiczeń
          </h3>
          {day.exercises.map((exercise, index) => {
            const sets = exerciseSets[exercise.id] || [];
            const completedSets = sets.filter(s => s.completed);
            const totalWeight = completedSets.reduce((sum, s) => sum + (s.reps * s.weight), 0);

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
                      <span>{completedSets.length}/{sets.length} serii</span>
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

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/')}
        >
          Wróć do dashboardu
        </Button>
      </div>
    );
  }

  // Edit mode for completed workout
  if (isCompleted && isEditing) {
    return (
      <div className="space-y-6">
        <SavingIndicator />

        {/* Header */}
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

        {/* Exercises - editable */}
        <div className="space-y-4">
          {day.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index + 1}
              savedSets={exerciseSets[exercise.id]}
              onSetsChange={(sets) => handleSetsChange(exercise.id, sets)}
              isEditable={true}
            />
          ))}
        </div>

        {/* Finish editing button */}
        <Button
          size="lg"
          className="w-full py-6 text-lg bg-fitness-success hover:bg-fitness-success/90"
          onClick={handleFinishEditing}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Check className="h-5 w-5 mr-2" />
          )}
          Zapisz zmiany
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SavingIndicator />

      {/* Header */}
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

      {/* Start Workout Button */}
      {!isWorkoutStarted && (
        <Button
          size="lg"
          className="w-full py-6 text-lg"
          onClick={handleStartWorkout}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Play className="h-5 w-5 mr-2" />
          )}
          Rozpocznij trening
        </Button>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {day.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index + 1}
            savedSets={exerciseSets[exercise.id]}
            onSetsChange={(sets) => handleSetsChange(exercise.id, sets)}
            isEditable={isWorkoutStarted && !isCompleted}
          />
        ))}
      </div>

      {/* Complete Workout Button */}
      {isWorkoutStarted && !isCompleted && (
        <Button
          size="lg"
          className="w-full py-6 text-lg bg-fitness-success hover:bg-fitness-success/90"
          onClick={handleCompleteWorkout}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Check className="h-5 w-5 mr-2" />
          )}
          Zakończ trening
        </Button>
      )}
    </div>
  );
};

export default WorkoutDay;
