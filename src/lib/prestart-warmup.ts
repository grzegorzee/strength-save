// C-T2: jeden pre-start warmup flow. Rozgrzewka budowana pod PIERWSZE główne
// ćwiczenie dnia: opcjonalne 2-3 min cardio, 2-3 ruchy dynamiczne wg partii
// oraz serie rampujące właściwe dla sprzętu. Zasady audytu: pusty gryf TYLKO
// dla sztangi (hantle/maszyny startują od % ciężaru), copy mówi o
// "% ciężaru roboczego" (nie %1RM), statyczny stretching nie jest domyślną
// połową rozgrzewki.
import { foldPolish } from '@/lib/pr-backfill';

export type WarmupEquipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'other';

export const detectWarmupEquipment = (
  exerciseName: string,
  isBodyweight = false,
): WarmupEquipment => {
  if (isBodyweight) return 'bodyweight';
  const name = foldPolish(exerciseName);
  if (['hantl', 'dumbbell'].some((n) => name.includes(n))) return 'dumbbell';
  if (['maszyn', 'machine', 'wyciag', 'cable', 'smith', 'suwnic'].some((n) => name.includes(n))) {
    return 'machine';
  }
  if (['sztang', 'barbell', 'gryf'].some((n) => name.includes(n))) return 'barbell';
  return 'other';
};

export interface RampSet {
  /** % ciężaru roboczego (0 = sam gryf, tylko sztanga). */
  pctOfWorking: number;
  reps: number;
  /** Kg wyliczone z ciężaru roboczego; null gdy ciężar nieznany (copy pokazuje sam %). */
  weightKg: number | null;
}

export interface PreStartWarmupPlan {
  cardioKey: 'warmup.v2.cardio';
  dynamicKeys: string[];
  ramp: RampSet[];
  /** Notka sprzętowa: gryf dla sztangi, lekki start dla hantli/maszyn, null dla bodyweight. */
  rampNoteKey: 'warmup.v2.rampBar' | 'warmup.v2.rampLight' | null;
  estMinutes: number;
}

const DYNAMIC_BY_CATEGORY: Record<string, string[]> = {
  legs: ['warmup.v2.dynSquats', 'warmup.v2.dynHipCircles', 'warmup.v2.dynLunges'],
  glutes: ['warmup.v2.dynSquats', 'warmup.v2.dynHipCircles', 'warmup.v2.dynLunges'],
  chest: ['warmup.v2.dynArmCircles', 'warmup.v2.dynPushups', 'warmup.v2.dynBandPulls'],
  back: ['warmup.v2.dynHinge', 'warmup.v2.dynBandPulls', 'warmup.v2.dynArmCircles'],
  shoulders: ['warmup.v2.dynArmCircles', 'warmup.v2.dynExtRotations', 'warmup.v2.dynBandPulls'],
  arms: ['warmup.v2.dynArmCircles', 'warmup.v2.dynBandPulls'],
  core: ['warmup.v2.dynJacks', 'warmup.v2.dynHipCircles', 'warmup.v2.dynSquats'],
};

const DEFAULT_DYNAMIC = ['warmup.v2.dynJacks', 'warmup.v2.dynHipCircles', 'warmup.v2.dynSquats'];

const roundToPlate = (kg: number): number => Math.round(kg * 2) / 2;

const rampWeight = (workingWeightKg: number, pct: number): number | null =>
  workingWeightKg > 0 ? roundToPlate((workingWeightKg * pct) / 100) : null;

export interface PreStartWarmupInput {
  exerciseName: string;
  category?: string;
  isBodyweight?: boolean;
  /** Ciężar pierwszej serii roboczej (kg); 0/undefined = pokazujemy same %. */
  workingWeightKg?: number;
}

export const buildPreStartWarmup = (input: PreStartWarmupInput): PreStartWarmupPlan => {
  const equipment = detectWarmupEquipment(input.exerciseName, input.isBodyweight ?? false);
  const working = input.workingWeightKg ?? 0;
  const dynamicKeys = DYNAMIC_BY_CATEGORY[input.category ?? ''] ?? DEFAULT_DYNAMIC;

  let ramp: RampSet[] = [];
  let rampNoteKey: PreStartWarmupPlan['rampNoteKey'] = null;
  if (equipment === 'barbell') {
    // Sam gryf, potem % ciężaru roboczego.
    ramp = [
      { pctOfWorking: 0, reps: 8, weightKg: null },
      { pctOfWorking: 40, reps: 5, weightKg: rampWeight(working, 40) },
      { pctOfWorking: 60, reps: 3, weightKg: rampWeight(working, 60) },
      { pctOfWorking: 80, reps: 1, weightKg: rampWeight(working, 80) },
    ];
    rampNoteKey = 'warmup.v2.rampBar';
  } else if (equipment === 'dumbbell' || equipment === 'machine' || equipment === 'other') {
    // Bez pustego gryfu: start od lekkiego % ciężaru roboczego.
    ramp = [
      { pctOfWorking: 40, reps: 8, weightKg: rampWeight(working, 40) },
      { pctOfWorking: 60, reps: 4, weightKg: rampWeight(working, 60) },
    ];
    rampNoteKey = 'warmup.v2.rampLight';
  }
  // bodyweight: ruchy dynamiczne wystarczą, ramp pusty.

  return {
    cardioKey: 'warmup.v2.cardio',
    dynamicKeys,
    ramp,
    rampNoteKey,
    estMinutes: 4,
  };
};

export interface PreStartOfferContext {
  alreadyStarted: boolean;
  hasDraftContent: boolean;
  autostart: boolean;
  viewingPast: boolean;
}

/**
 * Prompt pojawia się WYŁĄCZNIE przy świeżym, jawnym starcie z przycisku.
 * Resume (draft z treścią), autostart (?autostart=true, w tym start z
 * Watch/Garmin) i widok przeszłości nie dostają promptu i nie są blokowane —
 * draft/sesja powstaje dokładnie raz, w handleStartWorkout.
 */
export const shouldOfferPreStartWarmup = (ctx: PreStartOfferContext): boolean =>
  !ctx.alreadyStarted && !ctx.hasDraftContent && !ctx.autostart && !ctx.viewingPast;
