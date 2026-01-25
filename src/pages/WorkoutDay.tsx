import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/ExerciseCard';
import { trainingPlan } from '@/data/trainingPlan';
import { useWorkoutProgress, SetData } from '@/hooks/useWorkoutProgress';
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
  } = useWorkoutProgress();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});

  const day = trainingPlan.find(d => d.id === dayId);
  
  useEffect(() => {
    if (isLoaded && dayId) {
      const todaysWorkout = getTodaysWorkout(dayId);
      if (todaysWorkout) {
        setSessionId(todaysWorkout.id);
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

  const handleStartWorkout = () => {
    const session = createWorkoutSession(day.id);
    setSessionId(session.id);
    toast({
      title: "Trening rozpoczęty!",
      description: `${day.dayName} - ${day.focus}`,
    });
  };

  const handleSetsChange = (exerciseId: string, sets: SetData[]) => {
    setExerciseSets(prev => ({ ...prev, [exerciseId]: sets }));
    if (sessionId) {
      updateExerciseProgress(sessionId, exerciseId, sets);
    }
  };

  const handleCompleteWorkout = () => {
    if (sessionId) {
      completeWorkout(sessionId);
      toast({
        title: "Trening zakończony!",
        description: "Świetna robota! Dane zostały zapisane.",
      });
      navigate('/');
    }
  };

  const isWorkoutStarted = sessionId !== null;

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
            isEditable={isWorkoutStarted}
          />
        ))}
      </div>

      {/* Complete Workout Button */}
      {isWorkoutStarted && (
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
