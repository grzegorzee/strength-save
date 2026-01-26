import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExerciseCard } from '@/components/ExerciseCard';
import { trainingPlan } from '@/data/trainingPlan';
import { useFirebaseWorkouts, SetData } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

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

  const day = trainingPlan.find(d => d.id === dayId);
  
  useEffect(() => {
    if (isLoaded && dayId) {
      const todaysWorkout = getTodaysWorkout(dayId);
      if (todaysWorkout) {
        setSessionId(todaysWorkout.id);
        setIsCompleted(todaysWorkout.completed);
        const sets: Record<string, SetData[]> = {};
        todaysWorkout.exercises.forEach(ex => {
          sets[ex.exerciseId] = ex.sets;
        });
        setExerciseSets(sets);
      }
    }
  }, [isLoaded, dayId, getTodaysWorkout]);

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
    const session = await createWorkoutSession(day.id);
    setSessionId(session.id);
    toast({
      title: "Trening rozpoczęty!",
      description: `${day.dayName} - ${day.focus}`,
    });
  };

  const handleSetsChange = async (exerciseId: string, sets: SetData[]) => {
    setExerciseSets(prev => ({ ...prev, [exerciseId]: sets }));
    if (sessionId) {
      await updateExerciseProgress(sessionId, exerciseId, sets);
    }
  };

  const handleCompleteWorkout = async () => {
    if (sessionId) {
      await completeWorkout(sessionId);
      setIsCompleted(true);
      toast({
        title: "Trening zakończony!",
        description: "Świetna robota! Dane zostały zapisane do Firebase.",
      });
    }
  };

  const isWorkoutStarted = sessionId !== null;

  // Workout completed view
  if (isCompleted) {
    return (
      <div className="space-y-6">
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
                        <Badge variant="outline">{totalWeight} kg</Badge>
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

  return (
    <div className="space-y-6">
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

      {/* Start Workout Button */}
      {!isWorkoutStarted && (
        <Button 
          size="lg" 
          className="w-full py-6 text-lg"
          onClick={handleStartWorkout}
        >
          <Play className="h-5 w-5 mr-2" />
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
        >
          <Check className="h-5 w-5 mr-2" />
          Zakończ trening
        </Button>
      )}
    </div>
  );
};

export default WorkoutDay;
