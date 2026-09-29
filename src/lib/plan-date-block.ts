// F2 (2026-09-29): czy zaplanowana data jest ZABLOKOWANA jako dzień treningowy.
// Jedno źródło decyzji dla hero Dashboardu, karty tygodnia, "następnego"
// w zakładce Plan i (lustrzana kopia functions/src/plan-date-block.ts) pusha
// dailyTrainingReminder. Parity: fixtures/cross-platform/plan-date-block-v1.json.
//
// Reguły (kolejność = priorytet powodu):
// 1. urlop z pełną przerwą: data w [vacation.startDate, vacation.endDate]
//    i vacation.activity === 'none' ("Tylko główne boje" = user trenuje, NIE blokuje);
// 2. pauza: data w oknie reducedMode z level === 'pause' ("Pauza od treningów");
// 3. pominięty dzień: data w skippedDates.

export interface DateWindow {
  startDate: string;
  endDate: string;
}

export interface PlannedDateBlockContext {
  vacation?: (DateWindow & { activity?: string }) | null;
  reducedMode?: (DateWindow & { level?: string }) | null;
  skippedDates?: readonly string[] | null;
}

export type PlannedDateBlockReason = 'vacation' | 'pause' | 'skipped';

const inWindow = (window: DateWindow | null | undefined, dateISO: string): boolean =>
  !!window && window.startDate <= dateISO && dateISO <= window.endDate;

export const plannedDateBlockReason = (
  dateISO: string,
  context: PlannedDateBlockContext,
): PlannedDateBlockReason | null => {
  if (context.vacation?.activity === 'none' && inWindow(context.vacation, dateISO)) return 'vacation';
  if (context.reducedMode?.level === 'pause' && inWindow(context.reducedMode, dateISO)) return 'pause';
  if (context.skippedDates?.includes(dateISO)) return 'skipped';
  return null;
};

export const isPlannedDateBlocked = (dateISO: string, context: PlannedDateBlockContext): boolean =>
  plannedDateBlockReason(dateISO, context) !== null;

/** Okno przerwy (urlop albo pauza) obejmujące datę; null = dzień nie jest przerwą. */
export const activeBreakWindow = (
  dateISO: string,
  context: PlannedDateBlockContext,
): (DateWindow & { kind: 'vacation' | 'pause' }) | null => {
  const reason = plannedDateBlockReason(dateISO, context);
  if (reason === 'vacation' && context.vacation) {
    return { startDate: context.vacation.startDate, endDate: context.vacation.endDate, kind: 'vacation' };
  }
  if (reason === 'pause' && context.reducedMode) {
    return { startDate: context.reducedMode.startDate, endDate: context.reducedMode.endDate, kind: 'pause' };
  }
  return null;
};
