import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye, Pencil, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
    workouts,
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

  const pendingSaves = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastLoadedWorkoutId = useRef<string | null>(null);

  const day = trainingPlan.find(d => d.id === dayId);

  // Load data from Firebase - update when workouts change
  useEffect(() => {
    if (!isLoaded || !dayId) return;

    const todaysWorkout = getTodaysWorkout(dayId);

    // Only reload if workout changed or we don't have data yet
    if (todaysWorkout && todaysWorkout.id !== lastLoadedWorkoutId.current) {
      console.log('Loading workout from Firebase:', todaysWorkout.id, todaysWorkout);
      lastLoadedWorkoutId.current = todaysWorkout.id;
      setSessionId(todaysWorkout.id);
      setIsCompleted(todaysWorkout.completed);

      // Load exercises from Firebase
      const sets: Record<string, SetData[]> = {};
      todaysWorkout.exercises.forEach(ex => {
        sets[ex.exerciseId] = ex.sets.map(s => ({
          reps: s.reps ?? 0,
          weight: s.weight ?? 0,
          completed: s.completed ?? false,
        }));
      });
      setExerciseSets(sets);
      console.log('Loaded exerciseSets:', sets);
    }
  }, [isLoaded, dayId, workouts, getTodaysWorkout]);

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
          description: "Wczytano istniejący trening z dzisiaj.",
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

  const handleSetsChange = useCallback(async (exerciseId: string, sets: SetData[]) => {
    // Sanitize sets to ensure no undefined values
    const sanitizedSets = sets.map(s => ({
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
      completed: s.completed ?? false,
    }));

    console.log(`handleSetsChange called for ${exerciseId}:`, sanitizedSets);

    // Always update local state immediately
    setExerciseSets(prev => {
      const updated = { ...prev, [exerciseId]: sanitizedSets };
      console.log('Updated exerciseSets:', updated);
      return updated;
    });
    setSaveError(null);

    if (!sessionId) {
      console.error('handleSetsChange: No sessionId!');
      setSaveError('Brak sesji - odśwież stronę');
      toast({
        title: "Błąd!",
        description: "Brak sesji treningowej. Odśwież stronę.",
        variant: "destructive",
      });
      return;
    }

    // Debounce Firebase saves
    const existingTimeout = pendingSaves.current.get(exerciseId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      console.log(`Saving to Firebase: ${exerciseId}`, sanitizedSets);

      const result = await updateExerciseProgress(sessionId, exerciseId, sanitizedSets);
      console.log(`Firebase save result for ${exerciseId}:`, result);

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
  }, [sessionId, updateExerciseProgress, toast]);

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
    // Wait for pending saves
    if (pendingSaves.current.size > 0) {
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSaving(false);
    }

    if (saveError) {
      toast({
        title: "Uwaga!",
        description: `Mogły wystąpić błędy: ${saveError}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Zapisano!",
        description: "Dane zostały zaktualizowane.",
      });
    }

    setIsEditing(false);
  };

  const isWorkoutStarted = sessionId !== null;

  // Calculate stats from exerciseSets
  const exerciseCount = Object.keys(exerciseSets).length;
  const completedSetsCount = Object.values(exerciseSets).reduce(
    (total, sets) => total + sets.filter(s => s.completed).length,
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
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-2xl font-bold">{exerciseCount}</p>
                <p className="text-sm text-muted-foreground">Ćwiczeń wykonanych</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-2xl font-bold">{completedSetsCount}</p>
                <p className="text-sm text-muted-foreground">Serii ukończonych</p>
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
        <SavingIndicator />

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
              onSetsChange={(sets) => handleSetsChange(exercise.id, sets)}
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

      {!isWorkoutStarted && (
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
            onSetsChange={(sets) => handleSetsChange(exercise.id, sets)}
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
