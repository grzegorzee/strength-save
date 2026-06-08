import { describe, expect, it } from 'vitest';
import { getWeeklyMetrics } from '@/lib/rza-metrics';
import type { WorkoutSession } from '@/types';

const mk = (
  id: string,
  date: string,
  completed: boolean,
  exercises: { exerciseId: string; weight: number; reps: number; rpe?: number; pain?: number; quality?: number }[],
): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed,
  exercises: exercises.map(e => ({
    exerciseId: e.exerciseId,
    sets: [{ weight: e.weight, reps: e.reps, completed: true }],
    ...(e.rpe !== undefined && { rpe: e.rpe }),
    ...(e.pain !== undefined && { pain: e.pain }),
    ...(e.quality !== undefined && { quality: e.quality }),
  })),
});

describe('getWeeklyMetrics', () => {
  it('grupuje po tygodniu (poniedziałek) i sumuje objętość', () => {
    // 2026-06-02 (wt) i 2026-06-05 (pt) to ten sam tydzień (pon 2026-06-01).
    const weeks = getWeeklyMetrics([
      mk('a', '2026-06-02', true, [{ exerciseId: 'sq', weight: 100, reps: 5 }]),
      mk('b', '2026-06-05', true, [{ exerciseId: 'bp', weight: 80, reps: 5 }]),
    ]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStart).toBe('2026-06-01');
    expect(weeks[0].workouts).toBe(2);
    expect(weeks[0].totalVolume).toBe(100 * 5 + 80 * 5);
  });

  it('liczy średnie RPE/ból i okCount wg reguły', () => {
    const weeks = getWeeklyMetrics([
      mk('a', '2026-06-01', true, [
        { exerciseId: 'sq', weight: 100, reps: 5, rpe: 8, pain: 1, quality: 5 }, // OK
        { exerciseId: 'bp', weight: 80, reps: 5, rpe: 9, pain: 0, quality: 5 },  // nie OK (RPE>8.5)
      ]),
    ]);
    expect(weeks[0].avgRpe).toBe(8.5);
    expect(weeks[0].avgPain).toBe(0.5);
    expect(weeks[0].okCount).toBe(1);
    expect(weeks[0].hasRpe).toBe(true);
  });

  it('pomija treningi nieukończone', () => {
    const weeks = getWeeklyMetrics([
      mk('a', '2026-06-01', false, [{ exerciseId: 'sq', weight: 100, reps: 5, rpe: 8 }]),
    ]);
    expect(weeks).toHaveLength(0);
  });

  it('avgRpe null gdy brak metryk (plan bez RPE)', () => {
    const weeks = getWeeklyMetrics([
      mk('a', '2026-06-01', true, [{ exerciseId: 'sq', weight: 100, reps: 5 }]),
    ]);
    expect(weeks[0].avgRpe).toBeNull();
    expect(weeks[0].hasRpe).toBe(false);
    expect(weeks[0].totalVolume).toBe(500);
  });

  it('sortuje tygodnie rosnąco', () => {
    const weeks = getWeeklyMetrics([
      mk('b', '2026-06-15', true, [{ exerciseId: 'sq', weight: 100, reps: 5 }]),
      mk('a', '2026-06-01', true, [{ exerciseId: 'sq', weight: 90, reps: 5 }]),
    ]);
    expect(weeks.map(w => w.weekStart)).toEqual(['2026-06-01', '2026-06-15']);
  });
});
