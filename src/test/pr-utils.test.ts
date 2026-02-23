import { describe, it, expect } from 'vitest';
import { calculate1RM, getExerciseBest1RM, detectNewPRs } from '@/lib/pr-utils';
import type { WorkoutSession } from '@/types';

describe('calculate1RM', () => {
  it('calculates Epley formula correctly', () => {
    // 80 × (1 + 6/30) = 80 × 1.2 = 96.0
    expect(calculate1RM(80, 6)).toBe(96);
  });

  it('returns weight directly for 1 rep', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('returns 0 for 0 weight', () => {
    expect(calculate1RM(0, 8)).toBe(0);
  });

  it('returns 0 for 0 reps', () => {
    expect(calculate1RM(80, 0)).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    // 50 × (1 + 8/30) = 50 × 1.2667 = 63.333...
    expect(calculate1RM(50, 8)).toBe(63.3);
  });
});

describe('getExerciseBest1RM', () => {
  const workouts: WorkoutSession[] = [
    {
      id: 'w1',
      dayId: 'day-1',
      date: '2026-01-01',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 5, weight: 20, completed: true, isWarmup: true },
            { reps: 8, weight: 40, completed: true },
            { reps: 7, weight: 42.5, completed: true },
            { reps: 6, weight: 45, completed: true },
          ],
        },
      ],
    },
  ];

  it('finds max weight', () => {
    const best = getExerciseBest1RM(workouts, 'ex-1-1');
    expect(best.maxWeight).toBe(45);
  });

  it('calculates best 1RM', () => {
    const best = getExerciseBest1RM(workouts, 'ex-1-1');
    // 40×(1+8/30)=50.7, 42.5×(1+7/30)=52.4, 45×(1+6/30)=54.0
    expect(best.best1RM).toBe(54);
  });

  it('ignores warmup sets', () => {
    const best = getExerciseBest1RM(workouts, 'ex-1-1');
    expect(best.maxWeight).toBe(45); // not 20 from warmup
  });

  it('returns zeros for unknown exercise', () => {
    const best = getExerciseBest1RM(workouts, 'ex-unknown');
    expect(best.maxWeight).toBe(0);
    expect(best.best1RM).toBe(0);
  });
});

describe('detectNewPRs', () => {
  const names = new Map([['ex-1-1', 'Bench Press']]);

  const previousWorkouts: WorkoutSession[] = [
    {
      id: 'w1',
      dayId: 'day-1',
      date: '2026-01-01',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 8, weight: 40, completed: true },
            { reps: 8, weight: 40, completed: true },
          ],
        },
      ],
    },
  ];

  it('detects weight PR', () => {
    const current: WorkoutSession = {
      id: 'w2',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 6, weight: 42.5, completed: true },
            { reps: 6, weight: 42.5, completed: true },
          ],
        },
      ],
    };
    const prs = detectNewPRs(current, previousWorkouts, names);
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('both'); // both weight and 1RM improved
    expect(prs[0].exerciseName).toBe('Bench Press');
  });

  it('returns empty when no PRs', () => {
    const current: WorkoutSession = {
      id: 'w2',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 6, weight: 35, completed: true },
          ],
        },
      ],
    };
    const prs = detectNewPRs(current, previousWorkouts, names);
    expect(prs).toHaveLength(0);
  });

  it('ignores exercises with no completed sets', () => {
    const current: WorkoutSession = {
      id: 'w2',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 8, weight: 50, completed: false },
          ],
        },
      ],
    };
    const prs = detectNewPRs(current, previousWorkouts, names);
    expect(prs).toHaveLength(0);
  });
});
