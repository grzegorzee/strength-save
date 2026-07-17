import { describe, expect, it } from 'vitest';
import { buildTrainingReportModel } from '@/lib/pdf-report';
import type { WorkoutSession } from '@/types';

const w = (over: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-07-10',
  completed: true,
  exercises: [{
    exerciseId: 'ex-1',
    sets: [{ reps: 10, weight: 50, completed: true }],
  }],
  ...over,
});

describe('buildTrainingReportModel (M20)', () => {
  const now = new Date('2026-07-17T12:00:00');

  it('sumy całkowite liczone z miesięcy (tylko completed, okno 12 miesięcy)', () => {
    const model = buildTrainingReportModel([
      w({ id: 'a', date: '2026-07-01', durationSec: 3600 }),
      w({ id: 'b', date: '2026-06-15', durationSec: 1800 }),
      w({ id: 'c', date: '2026-06-16' }),
      w({ id: 'd', date: '2026-05-01', completed: false }),
      w({ id: 'e', date: '2024-01-01', durationSec: 999 }),
    ], now);

    expect(model.monthly.map(m => m.monthKey)).toEqual(['2026-07', '2026-06']);
    expect(model.totals.workoutCount).toBe(3);
    expect(model.totals.totalDurationSec).toBe(5400);
    expect(model.totals.workoutsWithDuration).toBe(2);
    expect(model.totals.totalTonnageKg).toBe(1500);
  });

  it('pusty raport: zero miesięcy i zerowe sumy', () => {
    const model = buildTrainingReportModel([], now);
    expect(model.monthly).toEqual([]);
    expect(model.totals.workoutCount).toBe(0);
  });
});
