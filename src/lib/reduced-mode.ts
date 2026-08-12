import { matchesExerciseEntry } from '@/lib/adhoc-workout';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

// Tryb "nie na 100%" (Runna pakiet 1, spec C3): user deklaruje okres obniżonej
// dyspozycji (choroba, ból, przeciążenie). W oknie propozycje -20% od BAZY
// sprzed trybu, po końcu rampa powrotna 85% → 92% → 100% w kolejnych sesjach
// ćwiczenia (zamiast skoku). Wszystko wyłącznie w PROPOZYCJACH — plan, cykl
// i ciężary zapisane w historii pozostają nietknięte (zasada "za zgodą").

export type ReducedModeLevel = 'lighter' | 'mains_only' | 'pause';

export interface ReducedMode {
  startDate: string;
  endDate: string;
  level: ReducedModeLevel;
}

export const REDUCED_MODE_MIN_DAYS = 3;
export const REDUCED_MODE_MAX_DAYS = 14;
/** Mnożnik propozycji w oknie trybu. */
export const REDUCED_MODE_ACTIVE_FACTOR = 0.8;
/** Rampa powrotu wg liczby ukończonych sesji ćwiczenia po końcu trybu. */
export const REDUCED_MODE_RAMP_FACTORS = [0.85, 0.92] as const;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const LEVELS: ReadonlySet<string> = new Set(['lighter', 'mains_only', 'pause']);

const isValidDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return false;
  try {
    parseLocalDate(value);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeReducedMode = (raw: unknown): ReducedMode | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const source = raw as Record<string, unknown>;
  if (!isValidDate(source.startDate) || !isValidDate(source.endDate)) return null;
  if (typeof source.level !== 'string' || !LEVELS.has(source.level)) return null;
  if (source.endDate < source.startDate) return null;
  return {
    startDate: source.startDate,
    endDate: source.endDate,
    level: source.level as ReducedModeLevel,
  };
};

/** Tryb od dziś na N dni (clamp 3-14). */
export const buildReducedMode = (
  level: ReducedModeLevel,
  days: number,
  todayISO: string,
): ReducedMode => {
  const span = Math.max(REDUCED_MODE_MIN_DAYS, Math.min(REDUCED_MODE_MAX_DAYS, Math.floor(days)));
  const end = parseLocalDate(todayISO);
  end.setDate(end.getDate() + span - 1);
  return { startDate: todayISO, endDate: formatLocalDate(end), level };
};

export const isReducedModeActive = (mode: ReducedMode | null | undefined, todayISO: string): boolean =>
  !!mode && mode.startDate <= todayISO && todayISO <= mode.endDate;

export const isDateInReducedMode = (mode: ReducedMode | null | undefined, dateISO: string): boolean =>
  !!mode && mode.startDate <= dateISO && dateISO <= mode.endDate;

/**
 * Korekta propozycji: w oknie 0.8 ('active'), po końcu rampa 0.85/0.92 ('ramp')
 * wg liczby UKOŃCZONYCH sesji ćwiczenia po endDate. null = tryb nie wpływa
 * (brak trybu, przed startem albo rampa domknięta) — niezmiennik.
 */
export const reducedModeAdviceFactor = (params: {
  mode: ReducedMode | null | undefined;
  todayISO: string;
  workouts: Array<Pick<WorkoutSession, 'date' | 'completed' | 'exercises'>>;
  exerciseId: string;
  /** Snapshot nazwy — sesja ad-hoc z tym ćwiczeniem liczy się jako krok rampy (spec C5). */
  exerciseName?: string;
}): { factor: number; phase: 'active' | 'ramp' } | null => {
  const { mode, todayISO, workouts, exerciseId, exerciseName } = params;
  if (!mode || todayISO < mode.startDate) return null;
  if (isReducedModeActive(mode, todayISO)) {
    return { factor: REDUCED_MODE_ACTIVE_FACTOR, phase: 'active' };
  }
  const sessionsAfter = workouts.filter((w) =>
    w.completed
    && w.date > mode.endDate
    && w.exercises.some((exercise) => matchesExerciseEntry(exercise, exerciseId, exerciseName)
      && exercise.sets.some((set) => set.completed && !set.isWarmup))).length;
  const factor = REDUCED_MODE_RAMP_FACTORS[sessionsAfter];
  return factor !== undefined ? { factor, phase: 'ramp' } : null;
};
