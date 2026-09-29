// F2 (2026-09-29): czy zaplanowana data jest ZABLOKOWANA jako dzień treningowy.
// Lustrzana kopia src/lib/plan-date-block.ts (functions mają osobny build);
// parity pilnuje wspólny fixture fixtures/cross-platform/plan-date-block-v1.json
// (src/test/plan-date-block-parity.test.ts). Zmiana reguł = obie kopie + fixture.
//
// Reguły (kolejność = priorytet powodu):
// 1. urlop z pełną przerwą: data w [vacation.startDate, vacation.endDate]
//    i vacation.activity === "none" ("Tylko główne boje" = user trenuje, NIE blokuje);
// 2. pauza: data w oknie reducedMode z level === "pause" ("Pauza od treningów");
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

export type PlannedDateBlockReason = "vacation" | "pause" | "skipped";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const inWindow = (window: DateWindow | null | undefined, dateISO: string): boolean =>
  !!window && window.startDate <= dateISO && dateISO <= window.endDate;

export const plannedDateBlockReason = (
  dateISO: string,
  context: PlannedDateBlockContext,
): PlannedDateBlockReason | null => {
  if (context.vacation?.activity === "none" && inWindow(context.vacation, dateISO)) return "vacation";
  if (context.reducedMode?.level === "pause" && inWindow(context.reducedMode, dateISO)) return "pause";
  if (context.skippedDates?.includes(dateISO)) return "skipped";
  return null;
};

export const isPlannedDateBlocked = (dateISO: string, context: PlannedDateBlockContext): boolean =>
  plannedDateBlockReason(dateISO, context) !== null;

const toWindow = (raw: unknown): (DateWindow & Record<string, unknown>) | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.startDate !== "string" || !DATE_KEY.test(source.startDate)) return null;
  if (typeof source.endDate !== "string" || !DATE_KEY.test(source.endDate)) return null;
  return source as DateWindow & Record<string, unknown>;
};

/** Kontekst blokad z surowego dokumentu training_plans/{uid} (push, zegarek). */
export const blockContextFromPlanDoc = (data: Record<string, unknown>): PlannedDateBlockContext => {
  const vacation = toWindow(data.vacation);
  const reduced = toWindow(data.reducedMode);
  return {
    ...(vacation && typeof vacation.activity === "string"
      ? { vacation: { startDate: vacation.startDate, endDate: vacation.endDate, activity: vacation.activity } }
      : {}),
    ...(reduced && typeof reduced.level === "string"
      ? { reducedMode: { startDate: reduced.startDate, endDate: reduced.endDate, level: reduced.level } }
      : {}),
    ...(Array.isArray(data.skippedDates)
      ? { skippedDates: data.skippedDates.filter((date): date is string => typeof date === "string") }
      : {}),
  };
};
