import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { OVERRIDES_RETENTION_DAYS } from '@/lib/schedule-overrides';

// Jawne "Pomiń trening" (Runna pakiet 1, spec C1): stan per DATA, model jak
// scheduleOverrides (te same reguły pruningu), odwracalny. Świadomy skip to
// czysty sygnał: dzień znika z zaległych, silnik nie liczy go jako porażki.
// Daty (nie dayId) — zmiana planu niczego nie osieroca.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateKey = (key: unknown): key is string => {
  if (typeof key !== 'string' || !DATE_KEY.test(key)) return false;
  try {
    parseLocalDate(key);
    return true;
  } catch {
    return false;
  }
};

/** Rules pilnują tylko `is list` + limitu — kształt wpisów waliduje kod (Z41). */
export const sanitizeSkippedDates = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isValidDateKey))].sort().slice(0, 60);
};

/** Wpisy starsze niż OVERRIDES_RETENTION_DAYS przed todayISO wylatują. */
export const pruneSkippedDates = (dates: string[], todayISO: string): string[] => {
  const cutoffDate = parseLocalDate(todayISO);
  cutoffDate.setDate(cutoffDate.getDate() - OVERRIDES_RETENTION_DAYS);
  const cutoff = formatLocalDate(cutoffDate);
  return dates.filter((date) => date >= cutoff);
};

/** Dodaje/zdejmuje datę (odwracalność, reguła #6) z pruningiem przy każdym zapisie. */
export const toggleSkippedDate = (dates: string[], dateISO: string, todayISO: string): string[] => {
  const pruned = pruneSkippedDates(dates, todayISO);
  return pruned.includes(dateISO)
    ? pruned.filter((date) => date !== dateISO)
    : [...new Set([...pruned, dateISO])].sort();
};
