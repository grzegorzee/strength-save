import type { TrainingDay, Weekday } from '@/data/trainingPlan';

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

/** Nowy syntetyczny dzień ad-hoc na wskazaną datę (start z Dashboardu). */
export const createAdhocDay = (date: string, t: TranslateFn): TrainingDay => ({
  id: `adhoc-${date}-${nextAdhocTs()}`,
  dayName: t('adhoc.dayName'),
  weekday: weekdayForDate(date),
  focus: '',
  exercises: [],
});

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
