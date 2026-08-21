import type { TrainingDay } from '@/data/trainingPlan';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

/** Wpisy starsze niż tyle dni względem "dziś" wylatują przy każdym zapisie. */
export const OVERRIDES_RETENTION_DAYS = 28;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateKey = (key: string): boolean => {
  if (!DATE_KEY.test(key)) return false;
  try {
    parseLocalDate(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Głęboka walidacja kształtu scheduleOverrides (rules pilnują tylko `is map` +
 * limitu rozmiaru — nie iterują po mapach): zostają wyłącznie wpisy
 * klucz YYYY-MM-DD -> dayId string | null.
 */
export const sanitizeScheduleOverrides = (raw: unknown): ScheduleOverrides => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: ScheduleOverrides = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isValidDateKey(key)) continue;
    if (value !== null && typeof value !== 'string') continue;
    result[key] = value;
  }
  return result;
};

/** Wpisy z datą starszą niż OVERRIDES_RETENTION_DAYS przed todayISO wylatują. */
export const pruneScheduleOverrides = (
  overrides: ScheduleOverrides,
  todayISO: string,
): ScheduleOverrides => {
  const cutoffDate = parseLocalDate(todayISO);
  cutoffDate.setDate(cutoffDate.getDate() - OVERRIDES_RETENTION_DAYS);
  const cutoff = formatLocalDate(cutoffDate);
  const result: ScheduleOverrides = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (key >= cutoff) result[key] = value;
  }
  return result;
};

export type ScheduleMoveResult =
  | { ok: true; swapped: boolean; overrides: ScheduleOverrides }
  | { ok: false; reason?: 'completed-source' | 'completed-target' | 'before-start' };

/**
 * Przeniesienie treningu z daty fromISO na toISO jako JEDNA nowa mapa (para
 * wpisów w pojedynczym zapisie pola = atomowość; pole nadpisywane w całości =
 * LWW między urządzeniami). Cel zajęty => SWAP (symetryczny, odwracalny).
 * Pruning starych wpisów przy każdej budowie.
 *
 * WP-A (X27): opcjonalny zbiór completedDates (daty sesji `completed === true`)
 * blokuje przełożenie Z daty z ukończonym treningiem (completed-source) oraz
 * NA taką datę (completed-target) — swap przestawiłby ukończony dzień.
 *
 * WP-B (X28): opcjonalne planStartDateISO blokuje cel PRZED startem planu
 * (before-start) — override na dacie sprzed startu jest martwy w resolverze
 * (reguła 0), więc "przeniesiony" trening po prostu by zniknął.
 */
export const buildScheduleMove = (params: {
  overrides: ScheduleOverrides;
  planDays: TrainingDay[];
  fromISO: string;
  toISO: string;
  todayISO: string;
  completedDates?: ReadonlySet<string>;
  planStartDateISO?: string | null;
}): ScheduleMoveResult => {
  const { overrides, planDays, fromISO, toISO, todayISO, completedDates, planStartDateISO } = params;
  if (fromISO === toISO) return { ok: false };
  if (completedDates?.has(fromISO)) return { ok: false, reason: 'completed-source' };
  if (completedDates?.has(toISO)) return { ok: false, reason: 'completed-target' };
  if (planStartDateISO && toISO < planStartDateISO) return { ok: false, reason: 'before-start' };
  const fromDay = resolvePlannedDay(fromISO, planDays, overrides, planStartDateISO);
  if (!fromDay) return { ok: false };
  const toDay = resolvePlannedDay(toISO, planDays, overrides, planStartDateISO);
  return {
    ok: true,
    swapped: toDay !== null,
    overrides: {
      ...pruneScheduleOverrides(overrides, todayISO),
      [fromISO]: toDay ? toDay.id : null,
      [toISO]: fromDay.id,
    },
  };
};

/**
 * Zmiana albo reset planu czyści scheduleOverrides (spec, przypadek 7); edycja
 * ćwiczeń wewnątrz dni NIE czyści. Rozróżnienie: mapa id dnia -> weekday.
 * Brak poprzedniego planu (pierwszy zapis) niczego nie czyści.
 */
export const shouldClearOverridesOnPlanSave = (
  currentDays: TrainingDay[] | undefined,
  nextDays: TrainingDay[],
): boolean => {
  if (!currentDays) return false;
  if (currentDays.length !== nextDays.length) return true;
  const currentByDayId = new Map(currentDays.map((d) => [d.id, d.weekday]));
  return nextDays.some((d) => currentByDayId.get(d.id) !== d.weekday);
};
