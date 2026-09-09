import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const f = vi.hoisted(() => ({
  load: vi.fn(), save: vi.fn(), create: vi.fn(), get: vi.fn(),
  markSynced: vi.fn(), clearDraft: vi.fn(), setPending: vi.fn(),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({ useFirebaseWorkouts: () => ({
  createWorkoutSession: f.create, batchSaveWorkout: f.save, getWorkoutSessionFromServer: f.get,
  workouts: [], isLoaded: true,
}) }));
vi.mock('@/lib/workout-draft-db', () => ({ workoutDraftDb: {
  loadDraft: f.load, setPendingWrite: f.setPending,
  markDraftSynced: f.markSynced, clearActiveDraftIfVersion: f.clearDraft,
  markPromotedToRemote: vi.fn(), setCloudBaseline: vi.fn(), markHealthWritePending: vi.fn(),
} }));
import { useWorkoutSyncDeps } from '@/hooks/useWorkoutSyncDeps';
import { syncWorkoutSession } from '@/lib/workout-sync-engine';

const draft: ActiveWorkoutDraft = {
  userId: 'owner-a', sessionId: 'session-a', dayId: 'day-1', date: '2026-09-09', cycleId: null,
  sessionOrigin: 'remote', remoteSessionId: 'session-a', cloudRevision: 1,
  exerciseSets: { squat: [{ weight: 50, reps: 5, completed: true }] },
  exerciseNotes: {}, exerciseMetrics: {}, exerciseNames: { squat: 'Squat' }, dayNotes: '', skippedExercises: [],
  startedAt: 1, updatedAt: 2, lastFirebaseSyncAt: null, dirty: true,
  completedLocally: false, finalSyncPending: false, version: 1,
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  f.load.mockReset().mockResolvedValue(draft);
  f.save.mockReset().mockResolvedValue({ success: true, revision: 2, updatedAt: 3, health: 'none' });
  f.get.mockReset().mockResolvedValue(null);
  f.markSynced.mockResolvedValue(undefined);
  f.clearDraft.mockResolvedValue(true);
});

describe('sync adapter owner lifetime with the real engine', () => {
  it('does not start saving A after a delayed local read resolves following logout/unmount and a fresh B mount', async () => {
    const localRead = deferred<ActiveWorkoutDraft>();
    f.load.mockReturnValueOnce(localRead.promise);
    const ownerA = renderHook(() => useWorkoutSyncDeps('owner-a'));
    const pending = syncWorkoutSession('owner-a', 'session-a', 'checkpoint', ownerA.result.current.syncDeps);
    expect(f.load).toHaveBeenCalledOnce();
    ownerA.unmount();
    renderHook(() => useWorkoutSyncDeps('owner-b'));
    await act(async () => localRead.resolve(draft));
    expect(await pending).toMatchObject({ success: false, error: 'WORKOUT_SYNC_OWNER_CHANGED' });
    expect(f.save).not.toHaveBeenCalled();
    expect(f.setPending).not.toHaveBeenCalled();
    expect(f.markSynced).not.toHaveBeenCalled();
  });

  it('does not start confirmation reads or remove A draft after a late final ACK following unmount', async () => {
    const save = deferred<{ success: boolean; revision: number; health: 'none' }>();
    f.load.mockResolvedValue({ ...draft, completedLocally: true, finalSyncPending: true });
    f.save.mockReturnValueOnce(save.promise);
    const ownerA = renderHook(() => useWorkoutSyncDeps('owner-a'));
    const pending = syncWorkoutSession('owner-a', 'session-a', 'final', ownerA.result.current.syncDeps);
    await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
    expect(f.get).toHaveBeenCalledTimes(1);
    ownerA.unmount();
    renderHook(() => useWorkoutSyncDeps('owner-b'));
    await act(async () => save.resolve({ success: true, revision: 2, health: 'none' }));
    await pending;
    expect(f.get).toHaveBeenCalledTimes(1);
    expect(f.clearDraft).not.toHaveBeenCalled();
  });

  it('still syncs after StrictMode effect cleanup and setup, preserving active draft after checkpoint ACK', async () => {
    const hook = renderHook(() => useWorkoutSyncDeps('owner-a'), {
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    });
    const outcome = await syncWorkoutSession('owner-a', 'session-a', 'checkpoint', hook.result.current.syncDeps);
    expect(outcome).toMatchObject({ success: true, revision: 2 });
    expect(f.save).toHaveBeenCalledOnce();
    expect(f.markSynced).toHaveBeenCalledOnce();
    expect(f.clearDraft).not.toHaveBeenCalled();
  });
});
