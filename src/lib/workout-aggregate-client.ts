// Z217: kliencka strona agregatu all-time (users/{uid}/aggregates/allTime).
// Dokument pisze wyłącznie backend; klient tylko czyta i waliduje kształt.
// Uszkodzony/nieznany kształt => null => bezpieczny fallback na lokalne
// obliczenia z okna listenera (dokładnie dzisiejsze zachowanie).

import { canonicalWorkoutSessionId } from '@/lib/workout-session';

export const WORKOUT_AGGREGATE_SCHEMA_VERSION = 2;

export interface AllTimeAggregateTotals {
  workoutCount: number;
  totalTonnageKg: number;
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  workoutsWithDuration: number;
  firstWorkoutDate: string | null;
}

export interface AllTimeAggregate {
  totals: AllTimeAggregateTotals;
  /** Daty ukończonych treningów z mapy wkładów — streak liczony tą samą funkcją
   * co dotąd (`calculateStreakDetails`), ale z PEŁNEJ historii, nie z okna. */
  completedDates: string[];
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

export const sanitizeAggregate = (data: unknown): AllTimeAggregate | null => {
  if ((data as { schemaVersion?: unknown } | null)?.schemaVersion !== WORKOUT_AGGREGATE_SCHEMA_VERSION) {
    return null;
  }
  const totals = sanitizeAggregateTotals(data);
  if (totals === null) return null;
  const contributions = (data as { contributions?: unknown }).contributions;
  const completedDates: string[] = [];
  if (typeof contributions === 'object' && contributions !== null) {
    const canonical = new Map<string, unknown>();
    for (const [sessionId, value] of Object.entries(contributions as Record<string, unknown>)) {
      const key = canonicalWorkoutSessionId(sessionId);
      if (!canonical.has(key) || sessionId === key) canonical.set(key, value);
    }
    for (const value of canonical.values()) {
      const d = (value as { d?: unknown } | null)?.d;
      if (typeof d === 'string' && d.length === 10) completedDates.push(d);
    }
  }
  return { totals, completedDates };
};
