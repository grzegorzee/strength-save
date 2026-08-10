// Z217: kliencka strona agregatu all-time (users/{uid}/aggregates/allTime).
// Dokument pisze wyłącznie backend; klient tylko czyta i waliduje kształt.
// Uszkodzony/nieznany kształt => null => bezpieczny fallback na lokalne
// obliczenia z okna listenera (dokładnie dzisiejsze zachowanie).

export interface AllTimeAggregateTotals {
  workoutCount: number;
  totalTonnageKg: number;
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  workoutsWithDuration: number;
  firstWorkoutDate: string | null;
}

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const sanitizeAggregateTotals = (data: unknown): AllTimeAggregateTotals | null => {
  if (typeof data !== 'object' || data === null) return null;
  const totals = (data as { totals?: unknown }).totals;
  if (typeof totals !== 'object' || totals === null) return null;
  const t = totals as Record<string, unknown>;
  if (
    !isNonNegativeNumber(t.workoutCount)
    || !isNonNegativeNumber(t.totalTonnageKg)
    || !isNonNegativeNumber(t.totalSets)
    || !isNonNegativeNumber(t.totalReps)
    || !isNonNegativeNumber(t.totalDurationSec)
    || !isNonNegativeNumber(t.workoutsWithDuration)
  ) return null;
  const firstWorkoutDate = typeof t.firstWorkoutDate === 'string' && t.firstWorkoutDate.length === 10
    ? t.firstWorkoutDate
    : null;
  return {
    workoutCount: t.workoutCount,
    totalTonnageKg: t.totalTonnageKg,
    totalSets: t.totalSets,
    totalReps: t.totalReps,
    totalDurationSec: t.totalDurationSec,
    workoutsWithDuration: t.workoutsWithDuration,
    firstWorkoutDate,
  };
};
