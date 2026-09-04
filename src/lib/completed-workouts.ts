import type { WorkoutSession } from '@/types';
import { hasCompletedWorkingSet } from '@/lib/summary-utils';
import { canonicalWorkoutSessionId } from '@/lib/workout-session';

/**
 * Jedna domenowa definicja treningu zaliczanego do liczników i statystyk:
 * finalny dokument oraz co najmniej jedna ukończona seria robocza.
 * Cardio żyje w osobnej kolekcji aktywności i nie jest WorkoutSession.
 */
export const isCompletedWorkout = (workout: WorkoutSession | null | undefined): workout is WorkoutSession => (
  workout?.completed === true && hasCompletedWorkingSet(workout)
);

/**
 * Promocja offline zmienia wyłącznie prefiks id `local-workout-*` na
 * `workout-*`. Nie grupujemy po dayId+date: dwa szybkie treningi tego samego
 * dnia mają różne dayId i oba muszą zostać policzone.
 */
export const selectCompletedWorkouts = (workouts: readonly WorkoutSession[]): WorkoutSession[] => {
  const bySession = new Map<string, WorkoutSession>();
  for (const workout of workouts) {
    if (!isCompletedWorkout(workout)) continue;
    const key = canonicalWorkoutSessionId(workout.id);
    const current = bySession.get(key);
    // Gdy snapshot przejściowo zawiera oba dokumenty, wersja remote jest
    // kanoniczna. Dla wszystkich pozostałych id nie ma deduplikacji.
    if (!current || workout.id === key) bySession.set(key, workout);
  }
  return [...bySession.values()];
};

export const countCompletedWorkouts = (workouts: readonly WorkoutSession[]): number => (
  selectCompletedWorkouts(workouts).length
);
