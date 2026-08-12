import type { SetData, WorkoutSession } from '@/types';

// PR na żywo w trakcie sesji (Runna pakiet 1, spec A4): świeżo odhaczona seria
// robocza cięższa niż wszystko w historii ćwiczenia = toast + badge. Jak
// w detectNewPRs: brak historii (bestBefore=0) nie jest rekordem — pierwszy
// trening ustala baseline, nie bije go.

/** Max ciężar ukończonych serii roboczych ćwiczenia w podanych treningach. */
export const bestPreviousWeight = (workouts: WorkoutSession[], exerciseId: string): number => {
  let best = 0;
  for (const workout of workouts) {
    if (!workout.completed) continue;
    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets) {
        if (set.completed && !set.isWarmup && set.weight > best) best = set.weight;
      }
    }
  }
  return best;
};

/**
 * Ciężar świeżo odhaczonej serii bijącej rekord albo null.
 * "Świeżo" = completed teraz, a NIE completed w poprzednim stanie (ta sama pozycja).
 */
export const detectLiveWeightPR = (args: {
  previousSets?: SetData[];
  nextSets: SetData[];
  bestBefore: number;
}): number | null => {
  const { previousSets, nextSets, bestBefore } = args;
  if (bestBefore <= 0) return null;
  let best: number | null = null;
  nextSets.forEach((set, index) => {
    if (!set.completed || set.isWarmup) return;
    if (previousSets?.[index]?.completed) return;
    if (set.weight > bestBefore && (best === null || set.weight > best)) best = set.weight;
  });
  return best;
};
