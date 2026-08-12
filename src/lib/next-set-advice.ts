import type { WorkoutSession } from '@/types';
import { getExerciseHistory, detectPlateau } from '@/lib/exercise-progression';
import { parseRepRange, isIsolationExercise, type RepRange } from '@/lib/exercise-utils';
import { decideNextSet, lastSessionRatedTooHeavy, type NextSetDecision } from '@/lib/progression-engine';
import { translate, type LanguageCode } from '@/i18n';
import { formatWeight, type UnitSystem } from '@/lib/units';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { reducedModeAdviceFactor, type ReducedMode } from '@/lib/reduced-mode';

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
// Spec C2 (Runna p.1): przerwa od ćwiczenia >= tylu dni = lżejsze wejście -10%.
export const COMEBACK_BREAK_DAYS = 14;

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
    case 'hold.rated':
      return translate(lang, 'nsadvice.hold.rated');
    case 'deload.break':
      return translate(lang, 'nsadvice.deload.break', { weight: disp(decision.targetWeight), unit });
  }
};

export const getNextSetAdvice = (
  workouts: WorkoutSession[],
  exerciseId: string,
  setsStr: string,
  exerciseIndex: number,
  options?: {
    isBodyweight?: boolean;
    isSuperset?: boolean;
    todayISO?: string;
    reducedMode?: ReducedMode | null;
    /** Snapshot nazwy — z nim historia i propozycje widzą sesje ad-hoc (spec C5). */
    exerciseName?: string;
  },
  lang: LanguageCode = 'pl',
  unit: UnitSystem = 'kg',
): NextSetAdvice | null => {
  const isBodyweight = !!options?.isBodyweight;
  const repRange: RepRange = parseRepRange(setsStr);
  // Przy zakresie "do upadku" (max) nie ma sensownego celu liczbowego.
  if (repRange.isMax) return null;

  const history = getExerciseHistory(workouts, exerciseId, isBodyweight, options?.exerciseName);
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const lastWeight = last.maxWeight;
  const lastReps = last.bestReps;

  const plateau = detectPlateau(history, PLATEAU_MIN_SESSIONS, isBodyweight);
  const increment = isIsolationExercise(exerciseIndex, options?.isSuperset) ? 1 : 2.5;

  // Spec C2 (Runna p.1): ostatnia sesja ćwiczenia 14+ dni temu = comeback -10%.
  const todayISO = options?.todayISO ?? formatLocalDate(new Date());
  const breakDays = Math.floor(
    (parseLocalDate(todayISO).getTime() - parseLocalDate(last.date).getTime()) / 86_400_000,
  );

  const decision = decideNextSet({
    lastWeight,
    lastReps,
    repRange,
    isBodyweight,
    increment,
    isPlateau: plateau.isPlateau,
    // Spec A2 (Runna p.1): "za ciężko" z oceny sesji gasi podbicie w propozycji.
    lastRatedTooHeavy: lastSessionRatedTooHeavy(workouts, exerciseId, options?.exerciseName),
    longBreak: breakDays >= COMEBACK_BREAK_DAYS,
  });

  // Spec C3 (Runna p.1): tryb "nie na 100%" WYGRYWA z każdą inną korektą
  // (nie dubluje się z deloadem). Mnożnik liczony od BAZY sprzed trybu —
  // rampa wraca do wartości sprzed przerwy, nie od obniżonych sesji.
  const modeAdjustment = reducedModeAdviceFactor({
    mode: options?.reducedMode ?? null,
    todayISO,
    workouts,
    exerciseId,
    exerciseName: options?.exerciseName,
  });
  if (modeAdjustment && !isBodyweight) {
    const baseline = [...history].reverse().find((point) => point.date < (options!.reducedMode!.startDate))?.maxWeight
      ?? lastWeight;
    const targetWeight = Math.max(0, Math.round(baseline * modeAdjustment.factor * 2) / 2);
    return {
      kind: 'deload',
      targetWeight,
      targetReps: repRange.max,
      reason: translate(
        lang,
        modeAdjustment.phase === 'active' ? 'nsadvice.mode.active' : 'nsadvice.mode.ramp',
        { weight: formatWeight(targetWeight, unit, { withUnit: false }), unit },
      ),
      isBodyweight,
    };
  }

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
