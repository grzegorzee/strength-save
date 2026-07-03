import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { getDurationTrend, getSkippedStats } from '@/lib/workout-time-stats';

const session = (
  id: string,
  date: string,
  opts: {
    durationSec?: number;
    completed?: boolean;
    sets?: { reps: number; weight: number; completed: boolean; isWarmup?: boolean }[];
    skipped?: string[];
    name?: string;
  } = {},
): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: opts.completed ?? true,
  ...(opts.durationSec !== undefined ? { durationSec: opts.durationSec } : {}),
  ...(opts.skipped ? { skippedExercises: opts.skipped } : {}),
  exercises: [{
    exerciseId: 'ex-1-1',
    ...(opts.name ? { name: opts.name } : {}),
    sets: opts.sets ?? [{ reps: 10, weight: 60, completed: true }],
  }],
});

const resolver = {
  resolveExerciseName: (workout: WorkoutSession, exerciseId: string) =>
    workout.exercises.find((e) => e.exerciseId === exerciseId)?.name ?? exerciseId,
};

describe('getDurationTrend (Z76)', () => {
  it('grupuje po miesiącu, liczy średni czas i gęstość z tonażu bez rozgrzewek', () => {
    const trend = getDurationTrend([
      // 3600s = 60 min, tonaż 600 (rozgrzewka nie liczy się do tonażu)
      session('a', '2026-06-05', {
        durationSec: 3600,
        sets: [
          { reps: 10, weight: 20, completed: true, isWarmup: true },
          { reps: 10, weight: 60, completed: true },
        ],
      }),
      // 1800s = 30 min, tonaż 600
      session('b', '2026-06-19', { durationSec: 1800, sets: [{ reps: 10, weight: 60, completed: true }] }),
    ]);
    expect(trend).toHaveLength(1);
    expect(trend[0].month).toBe('2026-06');
    expect(trend[0].avgMinutes).toBe(45);
    // gęstość = suma tonażu / suma minut = 1200 / 90
    expect(trend[0].densityKgPerMin).toBeCloseTo(13.3, 1);
  });

  it('pomija sesje bez durationSec i nieukończone', () => {
    const trend = getDurationTrend([
      session('a', '2026-06-05', { durationSec: 3600 }),
      session('b', '2026-06-06', {}),
      session('c', '2026-06-07', { durationSec: 3600, completed: false }),
    ]);
    expect(trend).toHaveLength(1);
    expect(trend[0].avgMinutes).toBe(60);
  });

  it('puste dane → []', () => {
    expect(getDurationTrend([])).toEqual([]);
  });
});

describe('getSkippedStats (Z76)', () => {
  it('zlicza pominięcia po id i tłumaczy nazwę przez resolver', () => {
    const stats = getSkippedStats([
      session('a', '2026-06-05', { skipped: ['ex-1-1'], name: 'Wyciskanie sztangi' }),
      session('b', '2026-06-12', { skipped: ['ex-1-1'], name: 'Wyciskanie sztangi' }),
      session('c', '2026-06-19', { skipped: ['ex-9-9'] }),
    ], resolver);
    expect(stats[0]).toEqual({ exerciseName: 'Wyciskanie sztangi', count: 2 });
    expect(stats[1]).toEqual({ exerciseName: 'ex-9-9', count: 1 });
  });

  it('respektuje limit', () => {
    const workouts = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
      session(id, `2026-06-0${i + 1}`, { skipped: [`ex-${i}`] }));
    expect(getSkippedStats(workouts, resolver, 3)).toHaveLength(3);
  });

  it('puste dane → []', () => {
    expect(getSkippedStats([], resolver)).toEqual([]);
  });
});
