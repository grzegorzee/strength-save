import type { WorkoutSession } from '@/types';
import { getExerciseHistory, detectPlateau } from '@/lib/exercise-progression';
import { parseRepRange, isIsolationExercise, type RepRange } from '@/lib/exercise-utils';
import { decideNextSet, type NextSetDecision } from '@/lib/progression-engine';
import { translate, type LanguageCode } from '@/i18n';
import { formatWeight, type UnitSystem } from '@/lib/units';

// Sugestia następnej serii: konkretny cel (ciężar × powtórzenia) z TRENDU całej historii,
// nie tylko ostatniego treningu. Deterministyczna i darmowa — AI dokłada się tylko on-demand.
// Z120: sama decyzja żyje w progression-engine (decideNextSet) — tu tylko historia + i18n.

export type NextSetKind = 'progress' | 'hold' | 'deload';

export interface NextSetAdvice {
  kind: NextSetKind;
  targetWeight: number; // 0 dla ćwiczeń z masą ciała
  targetReps: number;
  reason: string;
  isBodyweight: boolean;
}

// Ile dni zastoju traktujemy jako plateau (próg deload).
const PLATEAU_MIN_SESSIONS = 4;

const reasonText = (
  decision: NextSetDecision,
  ctx: {
    lang: LanguageCode;
    unit: UnitSystem;
    lastWeight: number;
    lastReps: number;
    repRange: RepRange;
    increment: number;
    sessionsSinceProgress: number;
  },
): string => {
  const { lang, unit, lastWeight, lastReps, repRange, increment, sessionsSinceProgress } = ctx;
  // Wartości wag w treści podpowiedzi w jednostce użytkownika (sam ciężar w modelu = kg).
  const disp = (kg: number): string => formatWeight(kg, unit, { withUnit: false });
  switch (decision.reasonKey) {
    case 'deload.bw':
      return translate(lang, 'nsadvice.deload.bw', { sessions: sessionsSinceProgress });
    case 'deload.weight':
      return translate(lang, 'nsadvice.deload.weight', { sessions: sessionsSinceProgress, weight: disp(decision.targetWeight), unit });
    case 'bw.progress':
      return translate(lang, 'nsadvice.bw.progress', { reps: lastReps });
    case 'bw.hold':
      return translate(lang, 'nsadvice.bw.hold', { max: repRange.max });
    case 'progress':
      return translate(lang, 'nsadvice.progress', { reps: lastReps, increment: disp(increment), target: disp(lastWeight + increment), min: repRange.min, unit });
    case 'hold.below':
      return translate(lang, 'nsadvice.hold.below', { weight: disp(lastWeight), min: repRange.min, unit });
    case 'hold.inrange':
      return translate(lang, 'nsadvice.hold.inrange', { max: repRange.max });
  }
};

export const getNextSetAdvice = (
  workouts: WorkoutSession[],
  exerciseId: string,
  setsStr: string,
  exerciseIndex: number,
  options?: { isBodyweight?: boolean; isSuperset?: boolean },
  lang: LanguageCode = 'pl',
  unit: UnitSystem = 'kg',
): NextSetAdvice | null => {
  const isBodyweight = !!options?.isBodyweight;
  const repRange: RepRange = parseRepRange(setsStr);
  // Przy zakresie "do upadku" (max) nie ma sensownego celu liczbowego.
  if (repRange.isMax) return null;

  const history = getExerciseHistory(workouts, exerciseId, isBodyweight);
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const lastWeight = last.maxWeight;
  const lastReps = last.bestReps;

  const plateau = detectPlateau(history, PLATEAU_MIN_SESSIONS, isBodyweight);
  const increment = isIsolationExercise(exerciseIndex, options?.isSuperset) ? 1 : 2.5;

  const decision = decideNextSet({
    lastWeight,
    lastReps,
    repRange,
    isBodyweight,
    increment,
    isPlateau: plateau.isPlateau,
  });

  return {
    kind: decision.kind,
    targetWeight: decision.targetWeight,
    targetReps: decision.targetReps,
    reason: reasonText(decision, {
      lang, unit, lastWeight, lastReps, repRange, increment,
      sessionsSinceProgress: plateau.sessionsSinceProgress,
    }),
    isBodyweight,
  };
};
