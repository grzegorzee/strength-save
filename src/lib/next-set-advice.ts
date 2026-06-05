import type { WorkoutSession } from '@/types';
import { getExerciseHistory, detectPlateau } from '@/lib/exercise-progression';
import { parseRepRange, isIsolationExercise, type RepRange } from '@/lib/exercise-utils';
import { translate, type LanguageCode } from '@/i18n';

// Sugestia następnej serii: konkretny cel (ciężar × powtórzenia) z TRENDU całej historii,
// nie tylko ostatniego treningu. Deterministyczna i darmowa — AI dokłada się tylko on-demand.

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

export const getNextSetAdvice = (
  workouts: WorkoutSession[],
  exerciseId: string,
  setsStr: string,
  exerciseIndex: number,
  options?: { isBodyweight?: boolean; isSuperset?: boolean },
  lang: LanguageCode = 'pl',
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

  // Deload ma priorytet: jeśli wynik stoi od kilku sesji, odpuść i wróć z impetem.
  if (plateau.isPlateau) {
    if (isBodyweight) {
      return {
        kind: 'deload',
        targetWeight: 0,
        targetReps: Math.max(repRange.min, lastReps),
        reason: translate(lang, 'nsadvice.deload.bw', { sessions: plateau.sessionsSinceProgress }),
        isBodyweight,
      };
    }
    const deloadWeight = Math.max(0, Math.round(lastWeight * 0.9 * 2) / 2); // -10%, do 0.5 kg
    return {
      kind: 'deload',
      targetWeight: deloadWeight,
      targetReps: repRange.max,
      reason: translate(lang, 'nsadvice.deload.weight', { sessions: plateau.sessionsSinceProgress, weight: deloadWeight }),
      isBodyweight,
    };
  }

  // Bodyweight: progresja przez powtórzenia.
  if (isBodyweight) {
    if (lastReps >= repRange.max) {
      return { kind: 'progress', targetWeight: 0, targetReps: lastReps + 1, reason: translate(lang, 'nsadvice.bw.progress', { reps: lastReps }), isBodyweight };
    }
    return { kind: 'hold', targetWeight: 0, targetReps: Math.min(lastReps + 1, repRange.max), reason: translate(lang, 'nsadvice.bw.hold', { max: repRange.max }), isBodyweight };
  }

  // Z obciążeniem.
  const increment = isIsolationExercise(exerciseIndex, options?.isSuperset) ? 1 : 2.5;

  if (lastReps >= repRange.max) {
    // Dowiozłeś górę zakresu → dołóż ciężar, zresetuj powtórzenia do dołu zakresu.
    return {
      kind: 'progress',
      targetWeight: lastWeight + increment,
      targetReps: repRange.min,
      reason: translate(lang, 'nsadvice.progress', { reps: lastReps, increment, target: lastWeight + increment, min: repRange.min }),
      isBodyweight,
    };
  }

  if (lastReps < repRange.min) {
    // Poniżej zakresu → utrzymaj ciężar, wejdź w zakres.
    return {
      kind: 'hold',
      targetWeight: lastWeight,
      targetReps: repRange.min,
      reason: translate(lang, 'nsadvice.hold.below', { weight: lastWeight, min: repRange.min }),
      isBodyweight,
    };
  }

  // W zakresie → dobij powtórzenia przy tym samym ciężarze.
  return {
    kind: 'hold',
    targetWeight: lastWeight,
    targetReps: Math.min(lastReps + 1, repRange.max),
    reason: translate(lang, 'nsadvice.hold.inrange', { max: repRange.max }),
    isBodyweight,
  };
};
