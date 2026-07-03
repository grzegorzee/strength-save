import { describe, expect, it } from 'vitest';
import { resolveWorkoutHydration } from '@/lib/workout-hydration';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';

// Przypadki przeniesione Z ISTNIEJĄCYCH gałęzi shouldUseDraft w WorkoutDay (Z57):
// refaktor ekstrakcyjny, zero zmiany zachowania.

const makeDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'workout-1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-07-03',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-1',
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 100,
  lastFirebaseSyncAt: null,
  dirty: false,
  completedLocally: false,
  finalSyncPending: false,
  version: 1,
  ...over,
});

const makeWorkout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'workout-1',
  dayId: 'day-1',
  date: '2026-07-03',
  completed: false,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
  ...over,
} as WorkoutSession);

describe('resolveWorkoutHydration (Z57)', () => {
  it('brak draftu => useDraft=false', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout(),
      draft: null,
      draftHasData: false,
      completedValidationOk: null,
    });
    expect(result).toEqual({ useDraft: false, clearDraft: false });
  });

  it('draft innej sesji niż workoutForDate => false', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout({ id: 'workout-OTHER' }),
      draft: makeDraft({ dirty: true }),
      draftHasData: true,
      completedValidationOk: null,
    });
    expect(result.useDraft).toBe(false);
  });

  it('brak workoutForDate + draftHasData => true', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: null,
      draft: makeDraft(),
      draftHasData: true,
      completedValidationOk: null,
    });
    expect(result.useDraft).toBe(true);
  });

  it('brak workoutForDate + puste dane ale prefilowane exerciseSets => true', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: null,
      draft: makeDraft({ exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: false }] } }),
      draftHasData: false,
      completedValidationOk: null,
    });
    expect(result.useDraft).toBe(true);
  });

  it('completed + walidacja ok + !finalSyncPending => clearDraft=true, useDraft=false', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout({ completed: true }),
      draft: makeDraft(),
      draftHasData: true,
      completedValidationOk: true,
    });
    expect(result.clearDraft).toBe(true);
    expect(result.useDraft).toBe(false);
  });

  it('completed + walidacja NIE-ok + draftHasData => useDraft=true (draft ma niedosłane dane)', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout({ completed: true }),
      draft: makeDraft(),
      draftHasData: true,
      completedValidationOk: false,
    });
    expect(result.useDraft).toBe(true);
    expect(result.clearDraft).toBe(false);
  });

  it('finalSyncPending => true', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout({ completed: true }),
      draft: makeDraft({ finalSyncPending: true, completedLocally: true }),
      draftHasData: true,
      completedValidationOk: true,
    });
    expect(result.useDraft).toBe(true);
    expect(result.clearDraft).toBe(false);
  });

  it('dirty => true', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout(),
      draft: makeDraft({ dirty: true }),
      draftHasData: false,
      completedValidationOk: null,
    });
    expect(result.useDraft).toBe(true);
  });

  it('puste exercises w chmurze + draftHasData => true', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout({ exercises: [] }),
      draft: makeDraft(),
      draftHasData: true,
      completedValidationOk: null,
    });
    expect(result.useDraft).toBe(true);
  });

  it('lastFirebaseSyncAt null + draftHasData => true', () => {
    const result = resolveWorkoutHydration({
      workoutForDate: makeWorkout(),
      draft: makeDraft({ lastFirebaseSyncAt: null }),
      draftHasData: true,
      completedValidationOk: null,
    });
    expect(result.useDraft).toBe(true);
  });

  it('updatedAt > lastFirebaseSyncAt => true; updatedAt <= lastFirebaseSyncAt => false', () => {
    const newer = resolveWorkoutHydration({
      workoutForDate: makeWorkout(),
      draft: makeDraft({ lastFirebaseSyncAt: 50, updatedAt: 100 }),
      draftHasData: true,
      completedValidationOk: null,
    });
    expect(newer.useDraft).toBe(true);

    const older = resolveWorkoutHydration({
      workoutForDate: makeWorkout(),
      draft: makeDraft({ lastFirebaseSyncAt: 200, updatedAt: 100 }),
      draftHasData: true,
      completedValidationOk: null,
    });
    expect(older.useDraft).toBe(false);
  });
});
