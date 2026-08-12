import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { slugifyExercise } from '@/lib/exercise-media';

// Szybki trening bez planu (Z104): syntetyczny dzień `adhoc-<YYYY-MM-DD>-<ts>`.
// Dzięki architekturze snapshot+resolver trening ad-hoc nie potrzebuje wpisu w planie —
// historia, rekordy i statystyki czytają nazwy ze snapshotu w WorkoutSession.

const ADHOC_ID_RE = /^adhoc-(\d{4}-\d{2}-\d{2})-\d+$/;

const WEEKDAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

type TranslateFn = (key: string) => string;

const weekdayForDate = (date: string): Weekday => {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'monday' : WEEKDAYS[parsed.getDay()];
};

// Monotoniczny znacznik: dwa starty w tym samym ms nie mogą dać tego samego id.
let lastAdhocTs = 0;
const nextAdhocTs = (): number => {
  const now = Date.now();
  lastAdhocTs = now > lastAdhocTs ? now : lastAdhocTs + 1;
  return lastAdhocTs;
};

export const isAdhocDayId = (dayId: string): boolean => ADHOC_ID_RE.test(dayId);

/** Data (YYYY-MM-DD) z ad-hoc dayId albo null. */
export const parseAdhocDate = (dayId: string): string | null =>
  ADHOC_ID_RE.exec(dayId)?.[1] ?? null;

export interface WatchQuickExerciseParams {
  id: string;
  name: string;
  setCount: number;
  reps: number;
  weight: number;
}

/** Walidowana granica między eventem sparowanego Watch a istniejącym ad-hoc UI. */
export const parseWatchQuickExerciseParams = (
  params: Pick<URLSearchParams, 'get'>,
): WatchQuickExerciseParams | null => {
  const id = params.get('quickExerciseId') ?? '';
  const name = params.get('quickExerciseName') ?? '';
  const setCount = Number(params.get('quickSetCount'));
  const reps = Number(params.get('quickReps'));
  const weight = Number(params.get('quickWeight'));
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(id)
    || name.trim().length === 0 || name.length > 120
    || !Number.isInteger(setCount) || setCount < 1 || setCount > 6
    || !Number.isFinite(reps) || reps < 1 || reps > 1000
    || !Number.isFinite(weight) || weight < 0 || weight > 2000) return null;
  return { id, name: name.trim(), setCount, reps, weight };
};

/** Nowy syntetyczny dzień ad-hoc na wskazaną datę (start z Dashboardu). */
export const createAdhocDay = (date: string, t: TranslateFn): TrainingDay => ({
  id: `adhoc-${date}-${nextAdhocTs()}`,
  dayName: t('adhoc.dayName'),
  weekday: weekdayForDate(date),
  focus: '',
  exercises: [],
});

const ADHOC_EXERCISE_PREFIX = 'adhoc-ex-';

export const isAdhocExerciseId = (exerciseId: string): boolean =>
  exerciseId.startsWith(ADHOC_EXERCISE_PREFIX);

/**
 * Czy wpis historyczny sesji liczy się do ćwiczenia (krok 16 Runna p.1, spec C5).
 * Ad-hoc ma syntetyczne id + snapshot nazwy, więc match wyłącznie po exerciseId
 * gubił szybkie treningi w historii i propozycjach silnika. Po nazwie łączymy
 * WYŁĄCZNIE pary, w których uczestniczy strona ad-hoc (wpis albo szukane
 * ćwiczenie) — planowe wpisy między cyklami zachowują dzisiejsze zachowanie.
 */
export const matchesExerciseEntry = (
  entry: { exerciseId: string; name?: string },
  exerciseId: string,
  exerciseName?: string,
): boolean => {
  if (entry.exerciseId === exerciseId) return true;
  if (!exerciseName || entry.name !== exerciseName) return false;
  return isAdhocExerciseId(entry.exerciseId) || isAdhocExerciseId(exerciseId);
};

/** Id ćwiczenia dodanego w locie do treningu ad-hoc; unikalne wśród istniejących id sesji. */
export const buildAdhocExerciseId = (name: string, existingIds: Iterable<string>): string => {
  const taken = new Set(existingIds);
  const base = `${ADHOC_EXERCISE_PREFIX}${slugifyExercise(name).slice(0, 32) || 'exercise'}`;
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
};

/** Odtwarza TrainingDay z istniejącego ad-hoc dayId (deep-link, resume po zimnym starcie). */
export const adhocDayFromId = (dayId: string, t: TranslateFn): TrainingDay | null => {
  const date = parseAdhocDate(dayId);
  if (!date) return null;
  return {
    id: dayId,
    dayName: t('adhoc.dayName'),
    weekday: weekdayForDate(date),
    focus: '',
    exercises: [],
  };
};
