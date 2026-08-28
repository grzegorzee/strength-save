import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteRef, commit, doc } = vi.hoisted(() => ({
  deleteRef: vi.fn(),
  commit: vi.fn(async () => undefined),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { clearActiveDraft: vi.fn(async () => undefined) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { remove: vi.fn() },
}));
vi.mock('firebase/firestore', () => ({
  doc,
  deleteDoc: vi.fn(async () => undefined),
  writeBatch: vi.fn(() => ({ delete: deleteRef, commit })),
}));

describe('deleteWorkoutEverywhere health sidecar', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_E2E_MODE', 'false');
    vi.stubEnv('VITE_USE_EMULATORS', 'true');
    vi.resetModules();
  });

  it('usuwa bazę i prywatny sidecar w jednym batchu', async () => {
    const { deleteWorkoutCloudDocuments } = await import('@/lib/workout-delete');
    await expect(deleteWorkoutCloudDocuments('w1')).resolves.toBeUndefined();
    expect(deleteRef).toHaveBeenCalledWith({ collection: 'workouts', id: 'w1' });
    expect(deleteRef).toHaveBeenCalledWith({ collection: 'workout_health_v2', id: 'w1' });
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
