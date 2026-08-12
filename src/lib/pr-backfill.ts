import type { PRComparison } from '@/lib/pr-utils';

// Backfill rekordów sprzed instalacji (Runna pakiet 1, spec A5): user wpisuje
// stare PR-y w bojach głównych, żeby celebracja PR nie gratulowała ciężarów
// dźwiganych przed apką. Detekcja porównuje z max(historia w apce, backfill).
// Kg kanoniczne (konwersja jednostek wyłącznie w UI).

export interface PRBackfill {
  squat?: number;
  bench?: number;
  deadlift?: number;
}

export const PR_BACKFILL_LIFTS = ['squat', 'bench', 'deadlift'] as const;
export type PRBackfillLift = typeof PR_BACKFILL_LIFTS[number];

/** Twardy limit zapisu (rules mają ten sam); miękkie ostrzeżenie UI jest niżej. */
export const PR_BACKFILL_MAX_KG = 600;
/** Powyżej tego progu UI pokazuje życzliwe "na pewno?" (nie błąd, zapis możliwy). */
export const PR_BACKFILL_SOFT_WARN_KG = 400;

export const sanitizePRBackfill = (raw: unknown): PRBackfill | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const source = raw as Record<string, unknown>;
  const result: PRBackfill = {};
  for (const lift of PR_BACKFILL_LIFTS) {
    const value = Number(source[lift]);
    if (!Number.isFinite(value) || value <= 0) continue;
    result[lift] = Math.round(Math.min(PR_BACKFILL_MAX_KG, value) * 2) / 2;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

// Dopasowanie ćwiczenia do boju głównego po nazwie (PL/EN). Warianty
// (hack/front/bułgarski, hantle/skos, rumuński/RDL) świadomie NIE dziedziczą
// rekordu boju — to osobne PR-y. Nazwy foldowane do ASCII przed porównaniem:
// matcher łapie też nazwy wpisane bez polskich znaków, a needle'e zostają
// czyste ASCII. Mapa z kodów znaków — guard i18n skanuje literały w kodzie.
const POLISH_FOLD: Record<string, string> = Object.fromEntries((
  [[261, 'a'], [263, 'c'], [281, 'e'], [322, 'l'], [324, 'n'], [243, 'o'], [347, 's'], [380, 'z'], [378, 'z']] as const
).map(([code, ascii]) => [String.fromCharCode(code), ascii]));

const foldPolish = (text: string): string => text
  .toLowerCase()
  .split('')
  .map((ch) => POLISH_FOLD[ch] ?? ch)
  .join('');

const includesAny = (name: string, needles: string[]): boolean =>
  needles.some((needle) => name.includes(needle));

export const backfillLiftForExercise = (exerciseName: string): PRBackfillLift | null => {
  const name = foldPolish(exerciseName);
  if (includesAny(name, ['przysiad', 'squat'])) {
    if (includesAny(name, ['hack', 'bulgar', 'goblet', 'split', 'front', 'cossack'])) return null;
    return 'squat';
  }
  if (name.includes('bench') || (name.includes('wyciskanie') && name.includes('lez'))) {
    if (includesAny(name, ['skos', 'incline', 'decline', 'hantl', 'dumbbell', 'wask', 'close'])) return null;
    return 'bench';
  }
  if (includesAny(name, ['martwy', 'deadlift'])) {
    if (includesAny(name, ['rumun', 'romanian', 'rdl', 'prostych'])) return null;
    return 'deadlift';
  }
  return null;
};

/** Ciężar z backfillu dla ćwiczenia (0 = brak dopasowania albo brak backfillu). */
export const backfillWeightForExercise = (
  exerciseName: string,
  backfill: PRBackfill | undefined,
): number => {
  if (!backfill) return 0;
  const lift = backfillLiftForExercise(exerciseName);
  return lift ? backfill[lift] ?? 0 : 0;
};

const WEIGHT_PR_TYPES: ReadonlySet<PRComparison['type']> = new Set(['weight', '1rm', 'both']);

/**
 * Tnie PR-y ciężarowe nie przekraczające backfillu (stary rekord był wyższy).
 * Typy nie-ciężarowe (reps/duration/weight_distance/effective_load) przechodzą.
 */
export const filterPRsAgainstBackfill = (
  prs: PRComparison[],
  weightForExerciseId: (exerciseId: string) => number,
): PRComparison[] =>
  prs.filter((pr) => {
    if (!WEIGHT_PR_TYPES.has(pr.type)) return true;
    const backfillWeight = weightForExerciseId(pr.exerciseId);
    return backfillWeight <= 0 || pr.newValue > backfillWeight;
  });
