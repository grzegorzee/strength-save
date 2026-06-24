import type { SetData } from '@/types';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { translate, type LanguageCode } from '@/i18n';
import { toDisplayWeight, type UnitSystem } from '@/lib/units';

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
  isBodyweight?: boolean,
  lang: LanguageCode = 'pl',
  unit: UnitSystem = 'kg',
): ProgressionAdvice | null => {
  if (repRange.isMax) return null;
  if (!previousWorkingSets || previousWorkingSets.length === 0) return null;

  const completedSets = previousWorkingSets.filter(s => s.completed && !s.isWarmup);
  if (completedSets.length === 0) return null;

  const allAtOrAboveMax = completedSets.every(s => s.reps >= repRange.max);
  const anyBelowMin = completedSets.some(s => s.reps < repRange.min);

  if (isBodyweight) {
    if (allAtOrAboveMax) {
      return { type: 'increase', label: translate(lang, 'progress.increaseReps'), increment: 0 };
    }
    if (anyBelowMin) {
      return { type: 'maintain', label: translate(lang, 'progress.maintainReps'), increment: 0 };
    }
    return { type: 'repeat', label: translate(lang, 'progress.repeat'), increment: 0 };
  }

  const isolation = isIsolationExercise(exerciseIndex, isSuperset);
  const increment = isolation ? 1 : 2.5;

  if (allAtOrAboveMax) {
    const dispIncrement = Number(toDisplayWeight(increment, unit).toFixed(1));
    return { type: 'increase', label: translate(lang, 'progress.increaseWeight', { kg: dispIncrement, unit }), increment };
  }
  if (anyBelowMin) {
    return { type: 'maintain', label: translate(lang, 'progress.maintainWeight'), increment: 0 };
  }
  return { type: 'repeat', label: translate(lang, 'progress.repeat'), increment: 0 };
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

export const isBodyweightExercise = (name: string): boolean => {
  const found = exerciseLibrary.find(e => e.name === name);
  return found?.isBodyweight === true;
};

export const getExerciseInstructions = (name: string): { title: string; content: string }[] => {
  const found = exerciseLibrary.find(e => e.name === name);
  return found?.instructions ?? [];
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

// Poprzedni wynik dla N-tej serii ROBOCZEJ (kolumna POPRZ.). Rozgrzewki są pomijane
// po obu stronach — inaczej różna liczba rozgrzewek między sesjami rozjeżdża indeksy.
export const previousWorkingSet = (
  previousSets: SetData[] | undefined,
  workingIndex: number,
): SetData | undefined => {
  if (!previousSets || previousSets.length === 0) return undefined;
  return previousSets.filter(s => !s.isWarmup)[workingIndex];
};

export const createPrefilledSets = (
  setCount: number,
  previousSets: SetData[] | undefined,
  isBodyweight?: boolean,
): SetData[] => {
  if (!previousSets || previousSets.length === 0) {
    return createEmptySets(setCount);
  }

  const prevWorking = previousSets.filter(s => !s.isWarmup);

  // Warmup set from previous
  const prevWarmup = previousSets.find(s => s.isWarmup);
  const warmupSet: SetData = {
    reps: prevWarmup?.reps ?? 0,
    weight: isBodyweight ? 0 : (prevWarmup?.weight ?? 0),
    completed: false,
    isWarmup: true,
  };

  // Working sets: pre-fill OSTATNIĄ wagą (powtórzenie poprzedniego treningu), bez auto-progresji.
  // Sugestię podbicia (+1/+2.5 kg) pokazuje osobno badge "CEL" — user sam decyduje, czy podnieść.
  const workingSets: SetData[] = [];
  for (let i = 0; i < setCount; i++) {
    const prevSet = prevWorking[i] || prevWorking[prevWorking.length - 1];
    if (prevSet && (prevSet.reps > 0 || prevSet.weight > 0)) {
      workingSets.push({
        reps: prevSet.reps,
        weight: isBodyweight ? 0 : prevSet.weight,
        completed: false,
      });
    } else {
      workingSets.push({ reps: 0, weight: 0, completed: false });
    }
  }

  return [warmupSet, ...workingSets];
};

export const sanitizeSets = (
  sets: SetData[] | undefined,
  expectedCount: number,
  enforceWorkingSetCount = false,
): SetData[] => {
  if (!sets || sets.length === 0) {
    return createEmptySets(expectedCount);
  }
  const sanitized = sets.map(set => ({
    reps: set?.reps ?? 0,
    weight: set?.weight ?? 0,
    completed: set?.completed ?? false,
    ...(set?.isWarmup && { isWarmup: true }),
  }));

  if (!enforceWorkingSetCount) {
    if (sanitized.some(s => s.isWarmup)) return sanitized;
    return [{ reps: 0, weight: 0, completed: false, isWarmup: true }, ...sanitized];
  }

  // Aktywny trening wykonuje dokładnie liczbę serii roboczych z planu.
  // Rozgrzewka jest dodatkowa, domyślna i może zostać usunięta przez użytkownika.
  const warmup = sanitized.find(set => set.isWarmup) ?? {
    reps: 0,
    weight: 0,
    completed: false,
    isWarmup: true,
  };
  const working = sanitized.filter(set => !set.isWarmup).slice(0, expectedCount);
  while (working.length < expectedCount) {
    working.push({ reps: 0, weight: 0, completed: false });
  }
  return [warmup, ...working];
};
