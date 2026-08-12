import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { isDeloadWeek, type ProgressionConfig } from '@/lib/progression-engine';
import type { ReducedMode } from '@/lib/reduced-mode';

// Tryb urlopu (Runna pakiet 1, spec C4): przerwa deklarowana Z GÓRY (3-21 dni).
// Kluczowy trik z researchu: przerwa PEŁNI ROLĘ deloadu — tydzień wyjazdu
// liczy się jako deload, a pierwszy programowy deload po urlopie się nie
// dubluje. Po powrocie rampa jak w trybie "nie na 100%" (wspólny mechanizm).
// Cykl wydłuża się o pełne tygodnie przerwy (durationWeeks; id dni bez zmian,
// niezmiennik X19 nietknięty — days w ogóle nie ruszamy).

export type VacationActivity = 'none' | 'mains_only';

export interface VacationMode {
  startDate: string;
  endDate: string;
  activity: VacationActivity;
  /** O ile tygodni wydłużono cykl przy włączeniu — anulowanie je odejmuje. */
  extendedWeeks: number;
}

export const VACATION_MIN_DAYS = 3;
export const VACATION_MAX_DAYS = 21;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVITIES: ReadonlySet<string> = new Set(['none', 'mains_only']);

const isValidDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return false;
  try {
    parseLocalDate(value);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeVacationMode = (raw: unknown): VacationMode | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const source = raw as Record<string, unknown>;
  if (!isValidDate(source.startDate) || !isValidDate(source.endDate)) return null;
  if (typeof source.activity !== 'string' || !ACTIVITIES.has(source.activity)) return null;
  if (source.endDate < source.startDate) return null;
  const extendedWeeks = Number(source.extendedWeeks);
  if (!Number.isFinite(extendedWeeks) || extendedWeeks < 0) return null;
  return {
    startDate: source.startDate,
    endDate: source.endDate,
    activity: source.activity as VacationActivity,
    extendedWeeks: Math.floor(extendedWeeks),
  };
};

export const buildVacationMode = (
  startISO: string,
  days: number,
  activity: VacationActivity,
): VacationMode => {
  const span = Math.max(VACATION_MIN_DAYS, Math.min(VACATION_MAX_DAYS, Math.floor(days)));
  const end = parseLocalDate(startISO);
  end.setDate(end.getDate() + span - 1);
  return {
    startDate: startISO,
    endDate: formatLocalDate(end),
    activity,
    extendedWeeks: Math.ceil(span / 7),
  };
};

export const isVacationActive = (vacation: VacationMode | null | undefined, todayISO: string): boolean =>
  !!vacation && vacation.startDate <= todayISO && todayISO <= vacation.endDate;

export const isDateInVacation = (vacation: VacationMode | null | undefined, dateISO: string): boolean =>
  !!vacation && vacation.startDate <= dateISO && dateISO <= vacation.endDate;

/**
 * Okno urlopu jako pseudo-tryb "nie na 100%" — propozycje i rampa po powrocie
 * idą przez WSPÓLNY mechanizm (reducedModeAdviceFactor), zero duplikacji.
 */
export const vacationToAdviceWindow = (vacation: VacationMode | null | undefined): ReducedMode | null =>
  vacation
    ? {
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      level: vacation.activity === 'none' ? 'pause' : 'mains_only',
    }
    : null;

/** Tygodnie cyklu (1-based) pokryte urlopem, liczone od startu planu. */
export const vacationWeekIndexes = (
  vacation: VacationMode,
  planStartDate: string,
): number[] => {
  const planStart = parseLocalDate(planStartDate);
  const weekOf = (dateISO: string): number => {
    const diffDays = Math.floor((parseLocalDate(dateISO).getTime() - planStart.getTime()) / 86_400_000);
    return Math.floor(diffDays / 7) + 1;
  };
  const first = Math.max(1, weekOf(vacation.startDate));
  const last = Math.max(first, weekOf(vacation.endDate));
  const weeks: number[] = [];
  for (let week = first; week <= last; week += 1) weeks.push(week);
  return weeks;
};

/**
 * Programowy deload z uwzględnieniem urlopu: tydzień urlopu JEST deloadem,
 * a PIERWSZY programowy deload po urlopie jest pomijany (przerwa przejęła
 * jego rolę). Bez urlopu zachowanie identyczne z isDeloadWeek (niezmiennik).
 */
export const resolveDeloadWeek = (
  weekIndex: number,
  config: ProgressionConfig,
  vacation: VacationMode | null | undefined,
  planStartDate: string | null | undefined,
): boolean => {
  const vacationWeeks = vacation && planStartDate ? vacationWeekIndexes(vacation, planStartDate) : [];
  if (vacationWeeks.includes(weekIndex)) return true;
  if (!isDeloadWeek(weekIndex, config)) return false;
  if (vacationWeeks.length > 0 && config.deloadEveryWeeks > 0) {
    let firstAfterVacation = Math.max(...vacationWeeks) + 1;
    while (!isDeloadWeek(firstAfterVacation, config)) firstAfterVacation += 1;
    if (weekIndex === firstAfterVacation) return false;
  }
  return true;
};
