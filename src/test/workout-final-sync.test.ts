import { describe, expect, it } from 'vitest';
import { buildWorkoutWriteExpectation, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import type { WorkoutSession } from '@/types';

const workout = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'workout-1',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-05-30',
  completed: true,
  exercises: [
    {
      exerciseId: 'ex-1',
      sets: [
        { reps: 8, weight: 100, completed: true },
        { reps: 8, weight: 102.5, completed: true },
      ],
    },
  ],
  ...overrides,
});

describe('workout final sync validation', () => {
  it('accepts a completed workout with the expected exercises and sets', () => {
    const expectation = buildWorkoutWriteExpectation([
      {
        exerciseId: 'ex-1',
        sets: [
          { reps: 8, weight: 100, completed: true },
          { reps: 8, weight: 102.5, completed: true },
        ],
      },
    ], { completed: true });

    expect(validateWorkoutCloudWrite(workout(), expectation)).toEqual({ ok: true });
  });

  it('rejects final sync when Firestore has no workout document', () => {
    const expectation = buildWorkoutWriteExpectation([
      { exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] },
    ], { completed: true });

    expect(validateWorkoutCloudWrite(null, expectation)).toEqual({ ok: false, reason: 'missing-workout' });
  });

  it('rejects final sync when the workout is not marked completed', () => {
    const expectation = buildWorkoutWriteExpectation([
      { exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] },
    ], { completed: true });

    expect(validateWorkoutCloudWrite(workout({ completed: false }), expectation)).toEqual({ ok: false, reason: 'not-completed' });
  });

  it('rejects final sync when exercises are missing', () => {
    const expectation = buildWorkoutWriteExpectation([
      { exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] },
    ], { completed: true });

    expect(validateWorkoutCloudWrite(workout({ exercises: [] }), expectation)).toEqual({ ok: false, reason: 'missing-exercises' });
  });

  it('rejects final sync when a set value differs from the local draft', () => {
    const expectation = buildWorkoutWriteExpectation([
      { exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] },
    ], { completed: true });

    expect(validateWorkoutCloudWrite(workout({
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 90, completed: true }] }],
    }), expectation)).toEqual({ ok: false, reason: 'set-mismatch:ex-1:1' });
  });
});
