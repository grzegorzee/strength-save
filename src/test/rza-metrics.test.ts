import { describe, expect, it } from 'vitest';
import { getWeeklyMetrics, getExerciseMetricHistory, getPainWatchlist, getAvgQuality } from '@/lib/rza-metrics';
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

describe('getExerciseMetricHistory (Z75)', () => {
  it('zwraca metryki ćwiczenia z ukończonych sesji, chronologicznie', () => {
    const history = getExerciseMetricHistory([
      mk('a', '2026-06-08', true, [{ exerciseId: 'sq', weight: 100, reps: 5, rpe: 8, pain: 1, quality: 4 }]),
      mk('b', '2026-06-01', true, [{ exerciseId: 'sq', weight: 95, reps: 5, rpe: 7 }]),
      mk('c', '2026-06-15', false, [{ exerciseId: 'sq', weight: 100, reps: 5, rpe: 9 }]),
    ], 'sq');
    expect(history).toEqual([
      { date: '2026-06-01', rpe: 7 },
      { date: '2026-06-08', rpe: 8, pain: 1, quality: 4 },
    ]);
  });

  it('pomija sesje bez żadnej metryki tego ćwiczenia', () => {
    const history = getExerciseMetricHistory([
      mk('a', '2026-06-01', true, [{ exerciseId: 'sq', weight: 100, reps: 5 }]),
      mk('b', '2026-06-08', true, [{ exerciseId: 'bp', weight: 80, reps: 5, rpe: 8 }]),
    ], 'sq');
    expect(history).toEqual([]);
  });
});

describe('getPainWatchlist (Z75)', () => {
  const now = '2026-07-01';

  it('zbiera tylko ćwiczenia z bólem >= 3 w oknie 4 tygodni', () => {
    const list = getPainWatchlist([
      mk('a', '2026-06-20', true, [{ exerciseId: 'sq', weight: 100, reps: 5, pain: 4 }]),
      mk('b', '2026-06-25', true, [{ exerciseId: 'sq', weight: 100, reps: 5, pain: 3 }]),
      mk('c', '2026-06-26', true, [{ exerciseId: 'bp', weight: 80, reps: 5, pain: 2 }]),
      mk('d', '2026-04-01', true, [{ exerciseId: 'dl', weight: 140, reps: 5, pain: 5 }]),
    ], now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ exerciseId: 'sq', maxPain: 4, sessionsWithPain: 2 });
  });

  it('sortuje po maksymalnym bólu malejąco i używa snapshotu nazwy', () => {
    const withName = mk('a', '2026-06-20', true, [{ exerciseId: 'sq', weight: 100, reps: 5, pain: 3 }]);
    withName.exercises[0].name = 'Przysiad ze sztangą (High Bar)';
    const list = getPainWatchlist([
      withName,
      mk('b', '2026-06-21', true, [{ exerciseId: 'ohp', weight: 40, reps: 5, pain: 5 }]),
    ], now);
    expect(list.map((e) => e.exerciseId)).toEqual(['ohp', 'sq']);
    expect(list[1].exerciseName).toBe('Przysiad ze sztangą (High Bar)');
  });

  it('pusta historia → []', () => {
    expect(getPainWatchlist([], now)).toEqual([]);
  });
});

describe('getAvgQuality (Z75)', () => {
  const now = '2026-07-01';

  it('liczy średnią techniki tylko z ćwiczeń, które mają quality, w oknie 4 tygodni', () => {
    const avg = getAvgQuality([
      mk('a', '2026-06-20', true, [{ exerciseId: 'sq', weight: 100, reps: 5, quality: 4 }]),
      mk('b', '2026-06-25', true, [{ exerciseId: 'bp', weight: 80, reps: 5, quality: 3 }]),
      mk('c', '2026-06-26', true, [{ exerciseId: 'dl', weight: 140, reps: 5 }]),
      mk('d', '2026-04-01', true, [{ exerciseId: 'sq', weight: 100, reps: 5, quality: 1 }]),
    ], now);
    expect(avg).toBe(3.5);
  });

  it('brak quality w oknie → null', () => {
    expect(getAvgQuality([mk('a', '2026-06-20', true, [{ exerciseId: 'sq', weight: 100, reps: 5 }])], now)).toBeNull();
  });
});
