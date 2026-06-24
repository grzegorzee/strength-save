import type { SetData } from '@/types';

export const clampSet = (set: Partial<SetData>): SetData => ({
  reps: Math.max(0, Math.min(999, Math.round(Number(set.reps) || 0))),
  weight: Math.max(0, Math.min(999, Number(set.weight) || 0)),
  completed: !!set.completed,
  ...(set.isWarmup && { isWarmup: true }),
});

/** Completed warm-up sets do not make an exercise complete on their own. */
export const isExerciseFullyCompleted = (sets: SetData[] | undefined): boolean => {
  const workingSets = (sets ?? []).filter(set => !set.isWarmup);
  return workingSets.length > 0 && workingSets.every(set => set.completed);
};
