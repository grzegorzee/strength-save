import { describe, expect, it } from 'vitest';
import { sanitizeAggregateTotals } from '@/lib/workout-aggregate-client';

// Z217: fallback bezpieczeństwa — każdy nieznany/uszkodzony kształt dokumentu
// agregatu daje null, a Dashboard liczy wtedy po staremu z okna listenera.

const validDoc = {
  schemaVersion: 1,
  totals: {
    workoutCount: 540,
    totalTonnageKg: 374400,
    totalSets: 1080,
    totalReps: 6480,
    totalDurationSec: 1944000,
    workoutsWithDuration: 540,
    firstWorkoutDate: '2024-12-11',
  },
};

describe('Z217 — sanitizeAggregateTotals', () => {
  it('poprawny dokument przechodzi w całości', () => {
    expect(sanitizeAggregateTotals(validDoc)).toEqual(validDoc.totals);
  });

  it('brak totals / zły typ / ujemne wartości = null (fallback lokalny)', () => {
    expect(sanitizeAggregateTotals(null)).toBeNull();
    expect(sanitizeAggregateTotals({})).toBeNull();
    expect(sanitizeAggregateTotals({ totals: 'x' })).toBeNull();
    expect(sanitizeAggregateTotals({ totals: { ...validDoc.totals, workoutCount: -1 } })).toBeNull();
    expect(sanitizeAggregateTotals({ totals: { ...validDoc.totals, totalTonnageKg: 'duzo' } })).toBeNull();
    expect(sanitizeAggregateTotals({ totals: { ...validDoc.totals, totalTonnageKg: NaN } })).toBeNull();
  });

  it('zła data pierwszego treningu nie wywraca reszty (null w polu)', () => {
    const result = sanitizeAggregateTotals({ totals: { ...validDoc.totals, firstWorkoutDate: 123 } });
    expect(result?.firstWorkoutDate).toBeNull();
    expect(result?.workoutCount).toBe(540);
  });
});
