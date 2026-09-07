import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// The hook must pass the grant captured by the originating draft, including
// explicit base-only saves, and repair names through the revision-checked API.

const fs = vi.hoisted(() => ({
  // Sygnatura (ref, data) jawna — typecheck czyta mock.calls[0][1] jako payload.
  setDoc: vi.fn(async (_ref: unknown, _data: unknown) => undefined),
  deleteDoc: vi.fn(async () => undefined),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
}));

const storageMocks = vi.hoisted(() => ({
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  deleteObject: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase', () => ({ db: {}, storage: {} }));
vi.mock('firebase/storage', () => ({ ref: storageMocks.ref, deleteObject: storageMocks.deleteObject }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: fs.doc,
  getDocs: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  setDoc: fs.setDoc,
  updateDoc: vi.fn(),
  deleteDoc: fs.deleteDoc,
  query: vi.fn(),
  where: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const transport = vi.hoisted(() => vi.fn(async () => ({ updatedAt: 1, revision: 1, health: 'stripped' })));
vi.mock('@/lib/protected-callable', () => ({ callProtectedFunction: transport }));
import { useFirebaseWorkoutActions } from '@/hooks/useFirebaseWorkouts';
import { buildCanonicalState, CANONICAL_UID } from '@/test/canonical-states';

describe('batchSaveWorkout carries the original draft health grant', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not relabel G1 metrics as G2 after revoke/regrant', async () => {
    const currentGrant = { healthEpoch: 2, healthGrantId: 'grant-2' };
    const oldGrant = { healthEpoch: 1, healthGrantId: 'grant-1' };
    const { result } = renderHook(() => useFirebaseWorkoutActions('user-a', { workouts: [], measurements: [] }, 2, currentGrant));
    const save = result.current.batchSaveWorkout;
    await save('w1', [{ exerciseId: 'squat', sets: [], rpe: 8 }], { expectedRevision: 0, writeId: 'write-1' }, { healthGrant: oldGrant, healthMode: 'replace' });
    expect(transport).toHaveBeenCalledWith('syncWorkoutV2', expect.objectContaining({ healthEpoch: 1, healthGrantId: 'grant-1' }));
  });
  it('explicit null draft grant cannot gain health processing from the current profile', async () => {
    const { result } = renderHook(() => useFirebaseWorkoutActions('user-a', { workouts: [], measurements: [] }, 2, { healthEpoch: 2, healthGrantId: 'grant-2' }));
    const save = result.current.batchSaveWorkout;
    await save('w1', [{ exerciseId: 'squat', sets: [], rpe: 8 }], { expectedRevision: 0, writeId: 'write-1' }, { healthGrant: null });
    const payload = (transport.mock.calls as unknown as Array<[string, Record<string, unknown>]>)[0][1];
    expect(payload).not.toHaveProperty('healthEpoch');
  });

  it('name repair uses the revision-checked callable while preserving all sets and notes without consent', async () => {
    const state = buildCanonicalState('active-plan');
    const workout = { ...state.workouts[0], revision: 3, exercises: state.workouts[0].exercises.map(ex => ({ ...ex, name: undefined, notes: 'Keep machine settings' })) };
    const { result } = renderHook(() => useFirebaseWorkoutActions(CANONICAL_UID, { workouts: [workout], measurements: [] }));
    const outcome = await result.current.backfillHistoricalWorkouts(state.cycles);
    expect(outcome).toMatchObject({ updated: 1 });
    const payload = (transport.mock.calls as unknown as Array<[string, Record<string, unknown>]>)[0][1];
    expect(payload).toMatchObject({ expectedRevision: 3 });
    expect(payload).not.toHaveProperty('healthEpoch');
    expect(payload.exercises).toEqual(workout.exercises.map(ex => expect.objectContaining({ sets: ex.sets, notes: ex.notes, name: expect.any(String) })));
  });
});
