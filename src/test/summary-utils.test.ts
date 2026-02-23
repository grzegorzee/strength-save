import { describe, it, expect } from 'vitest';
import { getWeekBounds, calculateTonnage, calculateStreak } from '@/lib/summary-utils';
import type { WorkoutSession } from '@/types';

describe('getWeekBounds', () => {
  it('returns Monday to Sunday for a Wednesday', () => {
    const wed = new Date('2026-02-25'); // Wednesday
    const { start, end } = getWeekBounds(wed);
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(start.getDate()).toBe(23); // Mon Feb 23
    expect(end.getDate()).toBe(1); // Sun Mar 1
  });

  it('returns correct bounds for Monday', () => {
    const mon = new Date('2026-02-23');
    const { start } = getWeekBounds(mon);
    expect(start.getDate()).toBe(23);
  });

  it('returns correct bounds for Sunday', () => {
    const sun = new Date('2026-03-01');
    const { start } = getWeekBounds(sun);
    expect(start.getDate()).toBe(23); // previous Monday
  });
});

describe('calculateTonnage', () => {
  it('sums reps × weight for completed working sets', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w1', dayId: 'day-1', date: '2026-01-01', completed: true,
        exercises: [
          {
            exerciseId: 'ex-1-1',
            sets: [
              { reps: 5, weight: 20, completed: true, isWarmup: true }, // ignored
              { reps: 8, weight: 40, completed: true },  // 320
              { reps: 8, weight: 40, completed: true },  // 320
              { reps: 6, weight: 40, completed: true },  // 240
            ],
          },
        ],
      },
    ];
    expect(calculateTonnage(workouts)).toBe(880);
  });

  it('ignores incomplete sets', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w1', dayId: 'day-1', date: '2026-01-01', completed: true,
        exercises: [
          {
            exerciseId: 'ex-1-1',
            sets: [
              { reps: 8, weight: 40, completed: false }, // ignored
              { reps: 8, weight: 40, completed: true },  // 320
            ],
          },
        ],
      },
    ];
    expect(calculateTonnage(workouts)).toBe(320);
  });

  it('returns 0 for empty workouts', () => {
    expect(calculateTonnage([])).toBe(0);
  });
});

describe('calculateStreak', () => {
  it('returns 0 for no workouts', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 0 for no completed workouts', () => {
    const workouts: WorkoutSession[] = [
      { id: 'w1', dayId: 'day-1', date: '2026-02-23', completed: false, exercises: [] },
    ];
    expect(calculateStreak(workouts)).toBe(0);
  });
});
