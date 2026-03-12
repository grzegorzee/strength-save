import type { SetData } from '@/types';
import { exerciseLibrary } from '@/data/exerciseLibrary';

// --- Rep Range Parsing ---

export interface RepRange {
  min: number;
  max: number;
  isFixed?: boolean;
  isMax?: boolean;
}

export const parseRepRange = (setsStr: string): RepRange => {
  // "3 x MAX" or "3 x max"
  if (/max/i.test(setsStr)) {
    return { min: 0, max: 0, isMax: true };
  }
  // "3 x 6-8"
  const rangeMatch = setsStr.match(/(\d+)\s*x\s*(\d+)\s*-\s*(\d+)/i);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[2], 10), max: parseInt(rangeMatch[3], 10) };
  }
  // "3 x 10/noga" or "3 x 10"
  const fixedMatch = setsStr.match(/(\d+)\s*x\s*(\d+)/i);
  if (fixedMatch) {
    const val = parseInt(fixedMatch[2], 10);
    return { min: val, max: val, isFixed: true };
  }
  return { min: 0, max: 0, isMax: true };
};

// --- Progression Advice ---

export type ProgressionAdvice = {
  type: 'increase' | 'repeat' | 'maintain';
  label: string;
  increment: number;
};

export const isIsolationExercise = (exerciseIndex: number, isSuperset?: boolean): boolean => {
  return exerciseIndex >= 3 || !!isSuperset;
};

export const getProgressionAdvice = (
  repRange: RepRange,
  previousWorkingSets: SetData[],
  exerciseIndex: number,
  isSuperset?: boolean,
): ProgressionAdvice | null => {
  if (repRange.isMax) return null;
  if (!previousWorkingSets || previousWorkingSets.length === 0) return null;

  const completedSets = previousWorkingSets.filter(s => s.completed && !s.isWarmup);
  if (completedSets.length === 0) return null;

  const allAtOrAboveMax = completedSets.every(s => s.reps >= repRange.max);
  const anyBelowMin = completedSets.some(s => s.reps < repRange.min);

  const isolation = isIsolationExercise(exerciseIndex, isSuperset);
  const increment = isolation ? 1 : 2.5;

  if (allAtOrAboveMax) {
    return { type: 'increase', label: `↑ +${increment}kg`, increment };
  }
  if (anyBelowMin) {
    return { type: 'maintain', label: 'Utrzymaj ciężar', increment: 0 };
  }
  return { type: 'repeat', label: 'Powtórz', increment: 0 };
};

// --- Smart Rest Timer ---

export interface RestContext {
  exerciseIndex: number;
  isSuperset: boolean;
  isFirstInSuperset: boolean;
  exerciseType?: 'compound' | 'isolation';
  weight?: number;
  estimated1RM?: number;
}

export const getRestDuration = (ctx: RestContext): number => {
  if (ctx.isSuperset && ctx.isFirstInSuperset) return 15;
  if (ctx.isSuperset) return 60;

  const base = ctx.exerciseType === 'isolation' ? 60 : 90;

  if (ctx.weight && ctx.estimated1RM && ctx.estimated1RM > 0) {
    const intensity = ctx.weight / ctx.estimated1RM;
    if (intensity > 0.9) return base + 60;
    if (intensity > 0.8) return base + 30;
  }

  return base;
};

export const lookupExerciseType = (name: string): 'compound' | 'isolation' => {
  const found = exerciseLibrary.find(e => e.name === name);
  return found?.type ?? 'compound';
};

// --- Set Count Parsing ---

export const parseSetCount = (setsStr: string): number => {
  const match = setsStr.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
};

export const createEmptySets = (count: number): SetData[] => {
  const sets: SetData[] = [
    { reps: 0, weight: 0, completed: false, isWarmup: true },
  ];
  for (let i = 0; i < count; i++) {
    sets.push({ reps: 0, weight: 0, completed: false });
  }
  return sets;
};

export const sanitizeSets = (sets: SetData[] | undefined, expectedCount: number): SetData[] => {
  if (!sets || sets.length === 0) {
    return createEmptySets(expectedCount);
  }
  const hasWarmup = sets.some(s => s.isWarmup);
  const sanitized = sets.map(set => ({
    reps: set?.reps ?? 0,
    weight: set?.weight ?? 0,
    completed: set?.completed ?? false,
    ...(set?.isWarmup && { isWarmup: true }),
  }));

  if (!hasWarmup) {
    return [{ reps: 0, weight: 0, completed: false, isWarmup: true }, ...sanitized];
  }
  return sanitized;
};
