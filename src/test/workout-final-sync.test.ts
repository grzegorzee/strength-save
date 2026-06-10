import { describe, expect, it } from 'vitest';
import { buildWorkoutWriteExpectation, hasWorkoutWriteConflict, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
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
      name: 'Bench press',
      rpe: 8,
      pain: 1,
      quality: 5,
    },
  ],
  notes: 'good day',
  skippedExercises: ['ex-2'],
  dayName: 'Push',
  dayFocus: 'Chest',
  durationSec: 1800,
  startedAt: 1000,
  updatedAt: 2000,
  revision: 2,
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
        name: 'Bench press',
        rpe: 8,
        pain: 1,
        quality: 5,
      },
    ], {
      completed: true,
      notes: 'good day',
      skippedExercises: ['ex-2'],
      dayName: 'Push',
      dayFocus: 'Chest',
      durationSec: 1800,
      startedAt: 1000,
    });

    expect(validateWorkoutCloudWrite(workout(), expectation)).toEqual({ ok: true });
  });

  it('rejects final sync when expected metadata is missing', () => {
    const expectation = buildWorkoutWriteExpectation([
      {
        exerciseId: 'ex-1',
        sets: [{ reps: 8, weight: 100, completed: true }],
        name: 'Bench press',
        rpe: 8,
      },
    ], { completed: true, dayName: 'Push' });

    expect(validateWorkoutCloudWrite(workout({
      dayName: undefined,
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }], name: 'Bench press' }],
    }), expectation)).toEqual({ ok: false, reason: 'day-name-mismatch' });
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

  it('detects an offline draft conflict when cloud was updated after the draft baseline', () => {
    expect(hasWorkoutWriteConflict(workout({ updatedAt: 3000 }), 2000)).toBe(true);
    expect(hasWorkoutWriteConflict(workout({ updatedAt: 2000 }), 2000)).toBe(false);
    expect(hasWorkoutWriteConflict(workout({ updatedAt: 3000 }), null)).toBe(false);
  });
});
