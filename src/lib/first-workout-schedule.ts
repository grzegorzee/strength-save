import type { Weekday } from '@/data/trainingPlan';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek, weekdayOfDate } from '@/lib/plan-schedule';

// X34b (docs/PLAN-X34-2026-08-25.md, sekcja 7): ekran 6/6 pyta o KONKRETNY
// dzien pierwszego treningu. Model planu zostaje zakotwiczony w poniedzialku
// (startDate = poniedzialek tygodnia wybranej daty, walidowany
// isValidPlanStartMonday), a dni treningowe tygodnia startu sprzed wybranej
// daty (i sprzed dzis) ida do training_plans.skippedDates, zeby Dashboard/Plan
// nie pokazywaly ich jako zaleglych. Czysty modul: zero Firebase, zero React.

/** Okno startu planu (WP-PLANS-2): poniedzialek biezacego tygodnia .. +8 tygodni. */
const PLAN_START_WINDOW_WEEKS = 8;

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const weekdaySet = (weekdays: readonly Weekday[]): Set<Weekday> => new Set(weekdays);

export interface FirstWorkoutSchedule {
  /** Poniedzialek tygodnia pierwszego treningu (ISO). */
  startDate: string;
  /** Dni treningowe tygodnia startu przed pierwszym treningiem / przed dzis (ISO, rosnaco). */
  skippedDates: string[];
}

/**
 * Poniedzialek tygodnia wybranej daty + dni treningowe tego tygodnia, ktore
 * maja byc pominiete: kazda data treningowa z tygodnia startu wczesniejsza
 * niz wybrany dzien LUB niz dzis (stary szkic wczytany pozniej). Brak dni
 * treningowych = zero skippedDates.
 */
export const buildFirstWorkoutSchedule = (
  firstWorkoutISO: string,
  trainingWeekdays: readonly Weekday[],
  todayISO: string = formatLocalDate(new Date()),
): FirstWorkoutSchedule => {
  const monday = getStartOfPlanWeek(parseLocalDate(firstWorkoutISO));
  const training = weekdaySet(trainingWeekdays);
  const cutoff = firstWorkoutISO > todayISO ? firstWorkoutISO : todayISO;
  const skippedDates: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(monday, offset);
    const iso = formatLocalDate(date);
    if (iso >= cutoff) break;
    if (training.has(weekdayOfDate(date))) skippedDates.push(iso);
  }
  return { startDate: formatLocalDate(monday), skippedDates };
};

/**
 * Kolejne dni treningowe od dzis (dzis wlacznie, jesli jest dniem treningowym)
 * w oknie startu planu (do niedzieli tygodnia +8), max `limit`. Brak dni
 * treningowych = najblizsze poniedzialki (fallback bez pulapki: chip zawsze
 * daje poniedzialek akceptowany przez isValidPlanStartMonday).
 */
export const listFirstWorkoutOptions = (
  trainingWeekdays: readonly Weekday[],
  todayISO: string = formatLocalDate(new Date()),
  limit = 8,
): string[] => {
  const training = trainingWeekdays.length > 0 ? weekdaySet(trainingWeekdays) : weekdaySet(['monday']);
  const today = parseLocalDate(todayISO);
  const windowEnd = addDays(getStartOfPlanWeek(today), PLAN_START_WINDOW_WEEKS * 7 + 6);
  const options: string[] = [];
  for (let date = today; date <= windowEnd && options.length < limit; date = addDays(date, 1)) {
    if (training.has(weekdayOfDate(date))) options.push(formatLocalDate(date));
  }
  return options;
};
