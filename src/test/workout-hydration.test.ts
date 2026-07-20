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

  it('świeży draft ad-hoc (puste exerciseSets, brak workoutu) => true (Z104)', () => {
    // Szybki trening startuje z ZEREM ćwiczeń — pusty draft nie może być
    // uznany za martwy, inaczej hydracja resetuje sesję zaraz po starcie.
    const result = resolveWorkoutHydration({
      workoutForDate: null,
      draft: makeDraft({
        dayId: 'adhoc-2026-07-19-1752130000000',
        sessionId: 'local-workout-u1-adhoc-2026-07-19-1752130000000-2026-07-19',
        sessionOrigin: 'provisional',
        remoteSessionId: null,
        exerciseSets: {},
        dirty: true,
      }),
      draftHasData: false,
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

// Incydent 2026-07-20: szybki trening ukończony z ZEREM ćwiczeń. Chmura ma
// completed=true, ale walidacja finalna zwraca 'empty-final-payload' (nie da się
// jej spełnić), więc draft z finalSyncPending wisiał w nieskończoność: baner
// "Masz lokalne zmiany do synchronizacji" i pomarańczowy ekran nie do usunięcia.
describe('resolveWorkoutHydration — pusty ukończony trening (regresja 2026-07-20)', () => {
  const completedEmpty: WorkoutSession = {
    id: 'workout-adhoc', userId: 'u1', dayId: 'adhoc-2026-07-20-1',
    date: '2026-07-20', completed: true, exercises: [],
  };

  it('draft BEZ treści przy ukończonym treningu w chmurze => czyścimy (nie ma czego stracić)', () => {
    const decision = resolveWorkoutHydration({
      workoutForDate: completedEmpty,
      draft: makeDraft({ dayId: 'adhoc-2026-07-20-1', date: '2026-07-20', finalSyncPending: true, exerciseSets: {} }),
      draftHasData: false,
      completedValidationOk: false,
    });
    expect(decision.clearDraft).toBe(true);
    expect(decision.useDraft).toBe(false);
  });

  it('draft Z treścią przy nieudanej walidacji NIE jest czyszczony (dane usera święte)', () => {
    const decision = resolveWorkoutHydration({
      workoutForDate: { ...completedEmpty, id: 'workout-1', dayId: 'day-1' },
      draft: makeDraft({ finalSyncPending: true }),
      draftHasData: true,
      completedValidationOk: false,
    });
    expect(decision.clearDraft).toBe(false);
    expect(decision.useDraft).toBe(true);
  });
});
