import type { WorkoutSession } from '@/types';

type WorkoutLookupOptions = {
  dayId?: string | null;
  date: string;
  sessionId?: string | null;
  allowDateFallback?: boolean;
};

const workoutScore = (workout: WorkoutSession): number => {
  let score = 0;
  if (workout.completed) score += 100;
  if (workout.exercises.length > 0) score += 20;
  const completedSets = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter(set => set.completed).length,
    0,
  );
  score += Math.min(completedSets, 20);
  return score;
};

const bestWorkout = (workouts: WorkoutSession[]): WorkoutSession | undefined =>
  [...workouts].sort((left, right) => {
    const scoreDiff = workoutScore(right) - workoutScore(left);
    if (scoreDiff !== 0) return scoreDiff;
    return right.id.localeCompare(left.id);
  })[0];

export const findWorkoutForRoute = (
  workouts: WorkoutSession[],
  options: WorkoutLookupOptions,
): WorkoutSession | undefined => {
  const { dayId, date, sessionId, allowDateFallback = false } = options;

  if (sessionId) {
    const bySession = workouts.find(workout => workout.id === sessionId && workout.date === date);
    if (bySession) return bySession;
  }

  if (dayId) {
    const byDayAndDate = bestWorkout(workouts.filter(workout => workout.dayId === dayId && workout.date === date));
    if (byDayAndDate) return byDayAndDate;
  }

  if (!allowDateFallback) return undefined;

  return bestWorkout(workouts.filter(workout => workout.date === date && workout.completed));
};

export const buildWorkoutRoute = (
  workout: WorkoutSession,
  fallbackDayId?: string,
): string => {
  const params = new URLSearchParams({ date: workout.date, session: workout.id });
  return `/workout/${workout.dayId || fallbackDayId || 'unknown'}?${params.toString()}`;
};
