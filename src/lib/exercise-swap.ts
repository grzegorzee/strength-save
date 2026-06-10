import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import { isBodyweightExercise } from '@/lib/exercise-utils';

const normalizeIdPart = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'exercise';

export const buildSwappedExerciseId = (
  currentId: string,
  replacementName: string,
  existingIds: Iterable<string>,
): string => {
  const taken = new Set(existingIds);
  const base = `${currentId}__swap-${normalizeIdPart(replacementName)}`;
  if (!taken.has(base)) return base;

  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
};

export const shouldClearSetsForExerciseSwap = (currentName: string, replacementName: string): boolean =>
  isBodyweightExercise(currentName) !== isBodyweightExercise(replacementName);

export const resetSetsForExerciseSwap = (
  sets: SetData[],
  currentName: string,
  replacementName: string,
): SetData[] => {
  if (!shouldClearSetsForExerciseSwap(currentName, replacementName)) return sets;
  return sets.map(set => ({
    reps: 0,
    weight: 0,
    completed: false,
    ...(set.isWarmup && { isWarmup: true }),
  }));
};

export const swapExerciseIdentity = (
  exercise: Exercise,
  replacement: { name: string; sets?: string; videoUrl?: string },
  siblingIds: Iterable<string>,
): Exercise => {
  if (exercise.name === replacement.name) {
    const updated: Exercise = {
      ...exercise,
      ...(replacement.sets && { sets: replacement.sets }),
      instructions: [],
    };
    if (replacement.videoUrl) updated.videoUrl = replacement.videoUrl;
    else delete updated.videoUrl;
    return updated;
  }

  const swapped: Exercise = {
    ...exercise,
    id: buildSwappedExerciseId(exercise.id, replacement.name, siblingIds),
    name: replacement.name,
    ...(replacement.sets && { sets: replacement.sets }),
    instructions: [],
  };

  if (replacement.videoUrl) swapped.videoUrl = replacement.videoUrl;
  else delete swapped.videoUrl;

  return swapped;
};
