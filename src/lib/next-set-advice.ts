import type { WorkoutSession } from '@/types';
import { getExerciseHistory, detectPlateau } from '@/lib/exercise-progression';
import { parseRepRange, isIsolationExercise, type RepRange } from '@/lib/exercise-utils';

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
        reason: `Zastój ${plateau.sessionsSinceProgress} sesji — zrób lżejszą sesję (krótsze serie), potem atakuj rekord.`,
        isBodyweight,
      };
    }
    const deloadWeight = Math.max(0, Math.round(lastWeight * 0.9 * 2) / 2); // -10%, do 0.5 kg
    return {
      kind: 'deload',
      targetWeight: deloadWeight,
      targetReps: repRange.max,
      reason: `Zastój ${plateau.sessionsSinceProgress} sesji — odpuść do ${deloadWeight} kg i odbuduj objętość, zamiast forsować.`,
      isBodyweight,
    };
  }

  // Bodyweight: progresja przez powtórzenia.
  if (isBodyweight) {
    if (lastReps >= repRange.max) {
      return { kind: 'progress', targetWeight: 0, targetReps: lastReps + 1, reason: `Ostatnio ${lastReps} powt. — dorzuć jedno więcej.`, isBodyweight };
    }
    return { kind: 'hold', targetWeight: 0, targetReps: Math.min(lastReps + 1, repRange.max), reason: `Dobij powtórzenia do ${repRange.max}, potem podnieś trudność.`, isBodyweight };
  }

  // Z obciążeniem.
  const increment = isIsolationExercise(exerciseIndex, options?.isSuperset) ? 1 : 2.5;

  if (lastReps >= repRange.max) {
    // Dowiozłeś górę zakresu → dołóż ciężar, zresetuj powtórzenia do dołu zakresu.
    return {
      kind: 'progress',
      targetWeight: lastWeight + increment,
      targetReps: repRange.min,
      reason: `Dowiozłeś ${lastReps} powt. — dołóż ${increment} kg (cel ${lastWeight + increment} kg × ${repRange.min}).`,
      isBodyweight,
    };
  }

  if (lastReps < repRange.min) {
    // Poniżej zakresu → utrzymaj ciężar, wejdź w zakres.
    return {
      kind: 'hold',
      targetWeight: lastWeight,
      targetReps: repRange.min,
      reason: `Utrzymaj ${lastWeight} kg i dobij do ${repRange.min} powt.`,
      isBodyweight,
    };
  }

  // W zakresie → dobij powtórzenia przy tym samym ciężarze.
  return {
    kind: 'hold',
    targetWeight: lastWeight,
    targetReps: Math.min(lastReps + 1, repRange.max),
    reason: `Ten sam ciężar — dorzuć powtórzenia w stronę ${repRange.max}.`,
    isBodyweight,
  };
};
