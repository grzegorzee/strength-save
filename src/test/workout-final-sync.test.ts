import { describe, expect, it } from 'vitest';
import { buildDraftFinalExpectation, buildWorkoutWriteExpectation, hasWorkoutWriteConflict, matchesFinalWorkoutContent, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import type { WorkoutSession } from '@/types';

const workout = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'workout-1',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-05-30',
  cycleId: 'cycle-1',
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
      cycleId: 'cycle-1',
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

  it('rejects final sync when the workout is attached to a different cycle', () => {
    const expectation = buildWorkoutWriteExpectation([
      { exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] },
    ], { completed: true, cycleId: 'cycle-1' });

    expect(validateWorkoutCloudWrite(
      workout({ cycleId: undefined }),
      expectation,
    )).toEqual({ ok: false, reason: 'cycle-id-mismatch' });
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

  it('rejects a concurrent write by revision even when client clocks are skewed', () => {
    expect(hasWorkoutWriteConflict(workout({ updatedAt: 5000, revision: 3 }), 2)).toBe(true);
    expect(hasWorkoutWriteConflict(workout({ updatedAt: 5000, revision: 2 }), 2)).toBe(false);
    expect(hasWorkoutWriteConflict(workout({ updatedAt: 1, revision: undefined }), null)).toBe(false);
  });

  it('treats missing expectedRevision as conflicting with any synced revision', () => {
    expect(hasWorkoutWriteConflict(workout({ revision: 1 }), undefined)).toBe(true);
    expect(hasWorkoutWriteConflict(workout({ revision: 1 }), 1)).toBe(false);
  });

  it('recognizes an already-finalized legacy workout despite a retried duration', () => {
    const expectation = buildWorkoutWriteExpectation([
      { exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] },
    ], { completed: true, durationSec: 86_400, startedAt: 1000 });

    expect(matchesFinalWorkoutContent(workout({
      durationSec: 1800,
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
    }), expectation)).toBe(true);
  });
});

describe('buildDraftFinalExpectation (R2-22)', () => {
  const draft = {
    exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
    dayNotes: 'notatka dnia',
    skippedExercises: ['ex-2'],
  };

  it('ekspektacja z draftu zawiera notes i skippedExercises', () => {
    const expectation = buildDraftFinalExpectation(draft);
    expect(expectation.notes).toBe('notatka dnia');
    expect(expectation.skippedExercises).toEqual(['ex-2']);
  });

  it('chmura bez notatki draftu = walidacja pada (draft zostaje, nie jest kasowany)', () => {
    const expectation = buildDraftFinalExpectation(draft);
    const cloud = {
      id: 's1', userId: 'u1', dayId: 'd1', date: '2026-07-03',
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
      completed: true,
      skippedExercises: ['ex-2'],
    } as unknown as Parameters<typeof validateWorkoutCloudWrite>[0];

    expect(validateWorkoutCloudWrite(cloud, expectation).ok).toBe(false);
  });

  it('pusta notatka i brak skipow nie wchodza do porownania', () => {
    const expectation = buildDraftFinalExpectation({ exerciseSets: draft.exerciseSets, dayNotes: '', skippedExercises: [] });
    expect(expectation.notes).toBeUndefined();
    expect(expectation.skippedExercises).toBeUndefined();
  });
});
