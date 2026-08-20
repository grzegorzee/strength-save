// Fala 2 (2026-08-20, redesign Planu): pasek obciążenia dnia na kartach tygodnia.
// Procent = tonaż dnia względem NAJCIĘŻSZEGO dnia widocznego tygodnia (mockup 1b:
// "each day row carries its own load bar"). Dane wyłącznie z UKOŃCZONYCH treningów —
// zero zmyślonych wartości: tydzień bez tonażu = pusta mapa = brak pasków.
import { calculateTonnage } from '@/lib/summary-utils';
import type { WorkoutSession } from '@/types';

/**
 * Mapa dateISO -> procent obciążenia (0-100) względem maksymalnego dnia tygodnia.
 * Tylko ukończone treningi w zakresie [weekStartISO, weekEndISO]. Gdy żaden dzień
 * nie ma tonażu > 0, zwraca pustą mapę (karty nie renderują paska).
 */
export const buildDayLoadMap = (
  workouts: WorkoutSession[],
  weekStartISO: string,
  weekEndISO: string,
): Map<string, number> => {
  const tonnageByDate = new Map<string, number>();
  for (const workout of workouts) {
    if (!workout?.completed) continue;
    if (typeof workout.date !== 'string' || workout.date < weekStartISO || workout.date > weekEndISO) continue;
    const tonnage = calculateTonnage([workout]);
    tonnageByDate.set(workout.date, (tonnageByDate.get(workout.date) ?? 0) + tonnage);
  }
  let max = 0;
  for (const value of tonnageByDate.values()) {
    if (value > max) max = value;
  }
  if (max <= 0) return new Map();
  const result = new Map<string, number>();
  for (const [date, tonnage] of tonnageByDate) {
    result.set(date, Math.round((tonnage / max) * 100));
  }
  return result;
};

/**
 * Data "następnego" treningu w widocznym tygodniu (badge NASTĘPNY, najwyżej jeden):
 * najwcześniejsza zaplanowana data >= dziś, nieukończona i niepominięta.
 * Brak kandydata (tydzień historyczny / wszystko zrobione) = null.
 */
export const findNextPlannedDate = (
  scheduleDates: readonly string[],
  completedDates: ReadonlySet<string>,
  skippedDates: readonly string[],
  todayISO: string,
): string | null => {
  const skipped = new Set(skippedDates);
  let next: string | null = null;
  for (const date of scheduleDates) {
    if (date < todayISO || completedDates.has(date) || skipped.has(date)) continue;
    if (next === null || date < next) next = date;
  }
  return next;
};
