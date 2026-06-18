import type { WorkoutSession } from '@/types';

type WorkoutLookupOptions = {
  dayId?: string | null;
  date: string;
  sessionId?: string | null;
  allowDateFallback?: boolean;
  /** Dzisiejsza data (YYYY-MM-DD). Gdy podana, cross-day fallback (trening INNEGO
   *  dnia z tej samej daty) działa tylko dla dat przeszłych — oglądanie historii.
   *  Dla daty dzisiejszej user może zaczynać nowy trening danego dnia, więc nie
   *  wolno wciągać ukończonego treningu innego dnia (powodowało miks ćwiczeń). */
  today?: string;
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
  const { dayId, date, sessionId, allowDateFallback = false, today } = options;

  if (sessionId) {
    const bySession = workouts.find(workout => workout.id === sessionId && workout.date === date);
    if (bySession) return bySession;
  }

  if (dayId) {
    const byDayAndDate = bestWorkout(workouts.filter(workout => workout.dayId === dayId && workout.date === date));
    if (byDayAndDate) return byDayAndDate;
  }

  if (!allowDateFallback) return undefined;

  // Fallback po dacie zwraca trening INNEGO dnia planu (bo byDayAndDate nie trafił).
  // Dla daty dzisiejszej blokujemy go: user zaczyna nowy trening danego dnia i nie
  // chce wciągać ukończonego treningu innego dnia z tej samej daty (miks ćwiczeń).
  if (dayId && today && date >= today) return undefined;

  return bestWorkout(workouts.filter(workout => workout.date === date && workout.completed));
};

export const buildWorkoutRoute = (
  workout: WorkoutSession,
  fallbackDayId?: string,
): string => {
  const params = new URLSearchParams({ date: workout.date, session: workout.id });
  return `/workout/${workout.dayId || fallbackDayId || 'unknown'}?${params.toString()}`;
};
