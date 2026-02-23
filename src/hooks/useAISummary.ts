import { useState, useCallback } from 'react';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { generateWorkoutSummary, type WorkoutSummaryResult } from '@/lib/ai-coach';

export const useAISummary = () => {
  const { workouts } = useFirebaseWorkouts();
  const { plan } = useTrainingPlan();

  const [summary, setSummary] = useState<WorkoutSummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedWorkoutId, setAnalyzedWorkoutId] = useState<string | null>(null);

  // Get last completed workouts
  const completedWorkouts = workouts
    .filter(w => w.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastWorkout = completedWorkouts[0] || null;

  const analyze = useCallback(async (workoutId?: string) => {
    const targetId = workoutId || lastWorkout?.id;
    if (!targetId) return;

    const workout = workouts.find(w => w.id === targetId);
    if (!workout) return;

    // Find previous workout of same dayId
    const previousWorkout = workouts
      .filter(w => w.completed && w.dayId === workout.dayId && w.id !== workout.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateWorkoutSummary(workout, previousWorkout, plan);
      setSummary(result);
      setAnalyzedWorkoutId(targetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setIsLoading(false);
    }
  }, [workouts, plan, lastWorkout]);

  return { summary, isLoading, error, analyze, lastWorkout, analyzedWorkoutId, completedWorkouts };
};
