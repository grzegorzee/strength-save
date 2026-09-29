// F2 (2026-09-29): czy zaplanowana data jest ZABLOKOWANA jako dzień treningowy.
// Lustrzana kopia src/lib/plan-date-block.ts (functions mają osobny build);
// parity pilnuje wspólny fixture fixtures/cross-platform/plan-date-block-v1.json
// (src/test/plan-date-block-parity.test.ts). Zmiana reguł = obie kopie + fixture.
//
// Reguły (kolejność = priorytet powodu):
// 1. urlop: data w [vacation.startDate, vacation.endDate] (dowolna aktywność);
// 2. pauza: data w oknie reducedMode z level === "pause" ("Pauza od treningów");
// 3. pominięty dzień: data w skippedDates.

export interface DateWindow {
  startDate: string;
  endDate: string;
}

export interface PlannedDateBlockContext {
  vacation?: DateWindow | null;
  reducedMode?: (DateWindow & { level?: string }) | null;
  skippedDates?: readonly string[] | null;
}

export type PlannedDateBlockReason = "vacation" | "pause" | "skipped";

const inWindow = (window: DateWindow | null | undefined, dateISO: string): boolean =>
  !!window && window.startDate <= dateISO && dateISO <= window.endDate;

export const plannedDateBlockReason = (
  dateISO: string,
  context: PlannedDateBlockContext,
): PlannedDateBlockReason | null => {
  if (inWindow(context.vacation, dateISO)) return "vacation";
  if (context.reducedMode?.level === "pause" && inWindow(context.reducedMode, dateISO)) return "pause";
  if (context.skippedDates?.includes(dateISO)) return "skipped";
  return null;
};

export const isPlannedDateBlocked = (dateISO: string, context: PlannedDateBlockContext): boolean =>
  plannedDateBlockReason(dateISO, context) !== null;
