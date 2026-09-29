import type { Exercise } from '@/data/trainingPlan';
import type { ExerciseMetrics, SetData } from '@/types';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import type { ExerciseMetricGrants } from '@/lib/workout-health-fence';
import type { SessionSwapMap } from '@/lib/workout-day-view';

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

export interface SessionExerciseState {
  exerciseSets: Record<string, SetData[]>;
  exerciseNotes: Record<string, string>;
  exerciseMetrics: Record<string, ExerciseMetrics>;
  exerciseMetricGrants: ExerciseMetricGrants;
  skippedExercises: string[];
  sessionSwaps: SessionSwapMap;
}

export interface SessionExerciseSwap {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  /** Preskrypcja z karty ("3 x 8-10"). */
  sets: string;
  videoUrl?: string;
  /** Serie dla nowego ćwiczenia, gdy nie ma czego przenieść. */
  createSets: () => SetData[];
}

const renameKey = <T>(record: Record<string, T>, fromId: string, toId: string): Record<string, T> => (
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key === fromId ? toId : key, value]))
);

const insertAfter = <T>(record: Record<string, T>, afterId: string, id: string, value: T): Record<string, T> => {
  const entries = Object.entries(record).filter(([key]) => key !== id);
  const index = entries.findIndex(([key]) => key === afterId);
  entries.splice(index === -1 ? entries.length : index + 1, 0, [id, value]);
  return Object.fromEntries(entries);
};

/**
 * F4 (2026-09-29): zamiana ćwiczenia w bieżącej sesji, wspólna dla "tylko dziś"
 * i "Na stałe" (wcześniej "Na stałe" zmieniało wyłącznie plan i draft zostawał
 * ze starym kluczem, więc nowe ćwiczenie lądowało na końcu listy i historii).
 *
 * - Bez odhaczonych serii: klucz podmieniany NA TEJ SAMEJ pozycji, serie/notatki/
 *   metryki idą za zamianą, stare ćwiczenie znika z sesji (jak dotąd).
 * - Z odhaczonymi seriami: stare ZOSTAJE nietknięte (zrobiona praca nie może
 *   zmienić nazwy ani zniknąć), nowe dostaje świeże serie tuż za nim.
 * - `sessionSwaps[fromId]` to jawny rekord zamiany (Z185) dla widoku dnia.
 */
export const applySessionExerciseSwap = (
  state: SessionExerciseState,
  swap: SessionExerciseSwap,
): SessionExerciseState => {
  const { fromId, toId } = swap;
  if (fromId === toId) return state;

  const sessionSwaps: SessionSwapMap = {
    ...state.sessionSwaps,
    [fromId]: {
      id: toId,
      name: swap.toName,
      sets: swap.sets,
      ...(swap.videoUrl !== undefined && { videoUrl: swap.videoUrl }),
    },
  };

  const previousSets = state.exerciseSets[fromId];
  if (previousSets?.some((set) => set.completed)) {
    return {
      ...state,
      exerciseSets: insertAfter(state.exerciseSets, fromId, toId, swap.createSets()),
      sessionSwaps,
    };
  }

  const movedSets = resetSetsForExerciseSwap(previousSets ?? swap.createSets(), swap.fromName, swap.toName);
  const exerciseSets = previousSets
    ? renameKey({ ...state.exerciseSets, [fromId]: movedSets }, fromId, toId)
    : { ...state.exerciseSets, [toId]: movedSets };

  return {
    exerciseSets,
    exerciseNotes: renameKey(state.exerciseNotes, fromId, toId),
    exerciseMetrics: renameKey(state.exerciseMetrics, fromId, toId),
    exerciseMetricGrants: renameKey(state.exerciseMetricGrants, fromId, toId),
    skippedExercises: state.skippedExercises.filter((id) => id !== fromId),
    sessionSwaps,
  };
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
