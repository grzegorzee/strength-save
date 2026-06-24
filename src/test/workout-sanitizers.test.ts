import { describe, expect, it } from 'vitest';
import { isExerciseFullyCompleted } from '@/lib/workout-sanitizers';

describe('isExerciseFullyCompleted', () => {
  it('allows skipping an incomplete exercise', () => {
    expect(isExerciseFullyCompleted([
      { reps: 8, weight: 60, completed: true },
      { reps: 8, weight: 60, completed: false },
    ])).toBe(false);
  });

  it('blocks skipping when every working set is complete', () => {
    expect(isExerciseFullyCompleted([
      { reps: 10, weight: 20, completed: true, isWarmup: true },
      { reps: 8, weight: 60, completed: true },
      { reps: 8, weight: 60, completed: true },
    ])).toBe(true);
  });

  it('does not treat warm-up-only data as a completed exercise', () => {
    expect(isExerciseFullyCompleted([
      { reps: 10, weight: 20, completed: true, isWarmup: true },
    ])).toBe(false);
  });
});
