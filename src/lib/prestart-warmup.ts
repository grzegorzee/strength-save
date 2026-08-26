// C-T2: jeden pre-start warmup flow. Rozgrzewka budowana pod PIERWSZE główne
// ćwiczenie dnia. X37 WP-B (RESEARCH sekcja 7, konsensus Nippard / RP / Squat
// University / Barbell Logic): podniesienie tętna -> mobilność dynamiczna wg
// kategorii pierwszego ćwiczenia (góra / dół / full body) -> aktywacja; serie
// rampujące pod pierwsze ćwiczenie zależne od sprzętu (gryf TYLKO dla sztangi,
// hantle/maszyny od % ciężaru roboczego, bodyweight bez rampy). Copy mówi o
// "% ciężaru roboczego" (nie %1RM), statyczny stretching nie jest domyślną
// połową rozgrzewki. Początkujący dostaje wariant 4 min (max 6 pozycji).
import { foldPolish } from '@/lib/pr-backfill';
import type { TranslationKey } from '@/i18n';

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

/**
 * Schemat rampy (% ciężaru roboczego x powtórzenia) wg sprzętu i ciężaru.
 * Sztanga: gryf x8, 50% x5, 70% x3, 85% x1; roboczy <60 kg: gryf x8, 60% x4,
 * 85% x1; >150 kg dodatkowo 40% x5. Hantle/maszyna/inne: 50% x8, 75% x3.
 * Bodyweight: bez rampy. Jedno źródło dla dialogu (tu) i generatora serii
 * w karcie ćwiczenia (warmup-generator.ts).
 */
export const rampSchemeFor = (
  equipment: WarmupEquipment,
  workingWeightKg: number,
): Array<{ pct: number; reps: number }> => {
  if (equipment === 'bodyweight') return [];
  if (equipment !== 'barbell') return [{ pct: 50, reps: 8 }, { pct: 75, reps: 3 }];
  if (workingWeightKg > 0 && workingWeightKg < 60) {
    return [{ pct: 0, reps: 8 }, { pct: 60, reps: 4 }, { pct: 85, reps: 1 }];
  }
  return [
    { pct: 0, reps: 8 },
    ...(workingWeightKg > 150 ? [{ pct: 40, reps: 5 }] : []),
    { pct: 50, reps: 5 },
    { pct: 70, reps: 3 },
    { pct: 85, reps: 1 },
  ];
};

export type WarmupPhase = 'pulse' | 'mobility' | 'activation';
export type WarmupVariant = 'upper' | 'lower' | 'full';

export interface WarmupItem {
  /** Klucz i18n nazwy pozycji; jednocześnie klucz odhaczenia w drafcie sesji (warmupChecked). */
  key: TranslationKey;
  phase: WarmupPhase;
  /** Pozycja czasowa (sekundy); wyklucza się z reps. */
  durationSec?: number;
  /** Pozycja na powtórzenia; perSide = "na stronę / na nogę". */
  reps?: number;
  perSide?: boolean;
}

export interface PreStartWarmupPlan {
  variant: WarmupVariant;
  /** Pozycje w kolejności faz: tętno -> mobilność -> aktywacja (6-9, początkujący max 6). */
  items: WarmupItem[];
  ramp: RampSet[];
  /** Notka sprzętowa: gryf dla sztangi, lekki start dla hantli/maszyn, null dla bodyweight. */
  rampNoteKey: 'warmup.v2.rampBar' | 'warmup.v2.rampLight' | null;
  estMinutes: 4 | 6;
}

const UPPER_CATEGORIES = new Set(['chest', 'back', 'shoulders', 'arms']);
const LOWER_CATEGORIES = new Set(['legs', 'glutes', 'calves']);

export const warmupVariantForCategory = (category: string | undefined): WarmupVariant => {
  if (category && UPPER_CATEGORIES.has(category)) return 'upper';
  if (category && LOWER_CATEGORIES.has(category)) return 'lower';
  return 'full';
};

const timed = (key: TranslationKey, phase: WarmupPhase, durationSec: number): WarmupItem =>
  ({ key, phase, durationSec });
const reps = (key: TranslationKey, phase: WarmupPhase, count: number, perSide = false): WarmupItem =>
  ({ key, phase, reps: count, ...(perSide ? { perSide: true } : {}) });

// Tętno (1,5 min): standard pajacyki, początkujący marsz z wysokimi kolanami (bez skoków).
const PULSE_STANDARD: WarmupItem[] = [
  timed('warmup.v3.jacks', 'pulse', 60),
  timed('warmup.v3.heelsArmCircles', 'pulse', 30),
];
const PULSE_BEGINNER: WarmupItem[] = [
  timed('warmup.v3.marchHighKnees', 'pulse', 60),
  timed('warmup.v3.heelsArmCircles', 'pulse', 30),
];

// Mobilność + aktywacja wg wariantu (RESEARCH sekcja 7, tabela + warianty).
const BODY_STANDARD: Record<WarmupVariant, WarmupItem[]> = {
  upper: [
    reps('warmup.v3.armCircles', 'mobility', 10),
    reps('warmup.v3.armSwings', 'mobility', 10),
    reps('warmup.v3.extRotations', 'mobility', 10, true),
    reps('warmup.v3.hipHinge', 'mobility', 10),
    reps('warmup.v3.bandPullApart', 'activation', 15),
    reps('warmup.v3.facePull', 'activation', 12),
    reps('warmup.v3.pushups', 'activation', 8),
  ],
  lower: [
    reps('warmup.v3.gobletSquatPause', 'mobility', 8),
    reps('warmup.v3.legSwings', 'mobility', 10, true),
    reps('warmup.v3.lungePause', 'mobility', 6, true),
    reps('warmup.v3.hipAirplane', 'mobility', 6, true),
    reps('warmup.v3.gluteBridge', 'activation', 12),
    reps('warmup.v3.birdDog', 'activation', 5, true),
  ],
  full: [
    reps('warmup.v3.hipCircles', 'mobility', 8, true),
    reps('warmup.v3.legSwings', 'mobility', 10, true),
    reps('warmup.v3.squatPause', 'mobility', 10),
    reps('warmup.v3.hipAirplane', 'mobility', 6, true),
    reps('warmup.v3.torsoTwists', 'mobility', 10),
    reps('warmup.v3.gluteBridge', 'activation', 12),
    reps('warmup.v3.bandPullApart', 'activation', 15),
  ],
};
const BODY_BEGINNER: Record<WarmupVariant, WarmupItem[]> = {
  upper: [
    reps('warmup.v3.armCircles', 'mobility', 10),
    reps('warmup.v3.hipHinge', 'mobility', 10),
    reps('warmup.v3.bandPullApart', 'activation', 10),
    reps('warmup.v3.pushupsKnees', 'activation', 8),
  ],
  lower: [
    reps('warmup.v3.squatPause', 'mobility', 8),
    reps('warmup.v3.legSwings', 'mobility', 8, true),
    reps('warmup.v3.gluteBridge', 'activation', 10),
    reps('warmup.v3.birdDog', 'activation', 5, true),
  ],
  full: [
    reps('warmup.v3.hipCircles', 'mobility', 6, true),
    reps('warmup.v3.legSwings', 'mobility', 8, true),
    reps('warmup.v3.squatPause', 'mobility', 8),
    reps('warmup.v3.gluteBridge', 'activation', 10),
  ],
};

const roundToPlate = (kg: number): number => Math.round(kg * 2) / 2;

const rampWeight = (workingWeightKg: number, pct: number): number | null =>
  workingWeightKg > 0 ? roundToPlate((workingWeightKg * pct) / 100) : null;

export interface PreStartWarmupInput {
  exerciseName: string;
  category?: string;
  isBodyweight?: boolean;
  /** Ciężar pierwszej serii roboczej (kg); 0/undefined = pokazujemy same %. */
  workingWeightKg?: number;
  /** profile.trainingProfile.level z onboardingu; 'beginner' = wariant 4 min. */
  level?: string;
}

export const buildPreStartWarmup = (input: PreStartWarmupInput): PreStartWarmupPlan => {
  const equipment = detectWarmupEquipment(input.exerciseName, input.isBodyweight ?? false);
  const working = input.workingWeightKg ?? 0;
  const variant = warmupVariantForCategory(input.category);
  const beginner = input.level === 'beginner';
  const items = beginner
    ? [...PULSE_BEGINNER, ...BODY_BEGINNER[variant]]
    : [...PULSE_STANDARD, ...BODY_STANDARD[variant]];

  const ramp: RampSet[] = rampSchemeFor(equipment, working).map(({ pct, reps: count }) => ({
    pctOfWorking: pct,
    reps: count,
    // Sam gryf: kg zależą od gryfu na tej siłowni, copy mówi "sam gryf".
    weightKg: pct === 0 ? null : rampWeight(working, pct),
  }));
  const rampNoteKey: PreStartWarmupPlan['rampNoteKey'] = equipment === 'barbell'
    ? 'warmup.v2.rampBar'
    : equipment === 'bodyweight' ? null : 'warmup.v2.rampLight';

  return {
    variant,
    items,
    ramp,
    rampNoteKey,
    estMinutes: beginner ? 4 : 6,
  };
};

export interface PreStartOfferContext {
  alreadyStarted: boolean;
  hasDraftContent: boolean;
  autostart: boolean;
  viewingPast: boolean;
  /** X37: preferences.warmupPrompt (cache isWarmupPromptEnabled); brak = włączone. */
  warmupPrompt?: boolean;
}

/**
 * Prompt pojawia się WYŁĄCZNIE przy świeżym, jawnym starcie z przycisku.
 * Resume (draft z treścią), autostart (?autostart=true, w tym start z
 * Watch/Garmin) i widok przeszłości nie dostają promptu i nie są blokowane:
 * draft/sesja powstaje dokładnie raz, w handleStartWorkout. X37: user może
 * wyłączyć proponowanie (Profil > Trening albo "Nie proponuj więcej" w arkuszu).
 */
export const shouldOfferPreStartWarmup = (ctx: PreStartOfferContext): boolean =>
  ctx.warmupPrompt !== false
  && !ctx.alreadyStarted && !ctx.hasDraftContent && !ctx.autostart && !ctx.viewingPast;
