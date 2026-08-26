// C-T2: jeden pre-start warmup flow. Rozgrzewka budowana pod PIERWSZE główne
// ćwiczenie dnia. X37 WP-B (RESEARCH sekcja 7, konsensus Nippard / RP / Squat
// University / Barbell Logic): podniesienie tętna -> mobilność dynamiczna wg
// kategorii pierwszego ćwiczenia (góra / dół / full body) -> aktywacja.
// X38 WP-B: rozgrzewka siłowa bez pajacyków (spokojne cardio zamiast skoków);
// plan opisuje TYLKO fazy. Rampa (schemat rampSchemeFor) nie jest już częścią
// dialogu: żyje wyłącznie jako chip "Rozgrzewka" w karcie ćwiczenia
// (warmup-generator.ts). Początkujący dostaje wariant 4 min (max 6 pozycji).
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

/**
 * Schemat rampy (% ciężaru roboczego x powtórzenia) wg sprzętu i ciężaru.
 * Sztanga: gryf x8, 50% x5, 70% x3, 85% x1; roboczy <60 kg: gryf x8, 60% x4,
 * 85% x1; >150 kg dodatkowo 40% x5. Hantle/maszyna/inne: 50% x8, 75% x3.
 * Bodyweight: bez rampy. Źródło dla generatora serii rozgrzewkowych w karcie
 * ćwiczenia (warmup-generator.ts, chip "Rozgrzewka").
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

// Tętno: standard spokojne cardio 2 min (rower / wioślarz / marsz na bieżni)
// + pięty do pośladków z krążeniami 30 s; początkujący marsz z wysokimi
// kolanami 60 s + 30 s. X38: bez pajacyków (rozgrzewka siłowa, bez skoków).
const PULSE_STANDARD: WarmupItem[] = [
  timed('warmup.v3.cardioEasy', 'pulse', 120),
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

export interface PreStartWarmupInput {
  exerciseName: string;
  category?: string;
  /** Sprzęt i ciężar roboczy: od X38 bez wpływu na plan (rampa poza dialogiem, chip w karcie). */
  isBodyweight?: boolean;
  workingWeightKg?: number;
  /** profile.trainingProfile.level z onboardingu; 'beginner' = wariant 4 min. */
  level?: string;
}

export const buildPreStartWarmup = (input: PreStartWarmupInput): PreStartWarmupPlan => {
  const variant = warmupVariantForCategory(input.category);
  const beginner = input.level === 'beginner';
  const items = beginner
    ? [...PULSE_BEGINNER, ...BODY_BEGINNER[variant]]
    : [...PULSE_STANDARD, ...BODY_STANDARD[variant]];

  return {
    variant,
    items,
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
  /** X38: szybki trening (dzień ad-hoc z Dashboardu); jego autostart NIE blokuje arkusza. */
  isAdhoc?: boolean;
}

/**
 * Prompt pojawia się WYŁĄCZNIE przy świeżym starcie. Resume (draft z treścią),
 * autostart z planu (?autostart=true: Dashboard "dzisiejszy trening", Watch/Garmin)
 * i widok przeszłości nie dostają promptu i nie są blokowane: draft/sesja
 * powstaje dokładnie raz, w handleStartWorkout. X37: user może wyłączyć
 * proponowanie (Profil > Trening albo "Nie proponuj więcej" w arkuszu).
 * X38: szybki trening (ad-hoc) startuje zawsze przez autostart, więc dla niego
 * autostart nie jest bramką; arkusz otwiera się PO utworzeniu sesji.
 */
export const shouldOfferPreStartWarmup = (ctx: PreStartOfferContext): boolean =>
  ctx.warmupPrompt !== false
  && !ctx.alreadyStarted && !ctx.hasDraftContent && !ctx.viewingPast
  && (!ctx.autostart || ctx.isAdhoc === true);
