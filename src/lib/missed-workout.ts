import type { TrainingDay } from '@/data/trainingPlan';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

/** Ile dni wstecz baner szuka niezrobionego treningu. */
export const MISSED_LOOKBACK_DAYS = 7;

export interface MissedWorkout {
  day: TrainingDay;
  dateISO: string;
}

/**
 * Baner "trening niezrobiony" (spec 2026-08-11, punkt wejścia 2): najświeższy
 * planowany dzień PRZED dziś bez ukończonej sesji w tej dacie. Przełożenie
 * daty źródłowej zwalnia ją w resolverze, więc baner znika sam. Daty jawnie
 * odrzucone (krzyżyk) pomijane — stan ma wyjście (reguła #6).
 */
export const findMissedWorkout = (params: {
  planDays: TrainingDay[];
  overrides: ScheduleOverrides;
  workouts: Array<{ date: string; completed: boolean }>;
  todayISO: string;
  planStartDate?: string | null;
  dismissed?: string[];
  /** Runna p.1 (spec C1): daty jawnie pominięte NIE są zaległością. */
  skippedDates?: string[];
}): MissedWorkout | null => {
  const { planDays, overrides, workouts, todayISO, planStartDate, dismissed = [], skippedDates = [] } = params;
  const completedDates = new Set(workouts.filter((w) => w.completed).map((w) => w.date));
  const today = parseLocalDate(todayISO);

  for (let back = 1; back <= MISSED_LOOKBACK_DAYS; back += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - back);
    const dateISO = formatLocalDate(date);
    if (planStartDate && dateISO < planStartDate) break;
    if (dismissed.includes(dateISO) || skippedDates.includes(dateISO) || completedDates.has(dateISO)) continue;
    const day = resolvePlannedDay(dateISO, planDays, overrides);
    if (day) return { day, dateISO };
  }

  return null;
};
