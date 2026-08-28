import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/protected-callable', () => ({ callProtectedFunction: vi.fn() }));

import {
  createWorkoutV2SaveAdapter,
  saveWorkoutV2,
  type WorkoutSyncV2Response,
  type WorkoutSyncV2Transport,
} from '@/lib/workout-sync-v2';

describe('workout sync v2 client adapter', () => {
  it('udostępnia produkcyjny adapter silnika i zachowuje aktywny grant zdrowotny', async () => {
    const transport: WorkoutSyncV2Transport = vi.fn(async (): Promise<WorkoutSyncV2Response> => ({
      updatedAt: 11, revision: 5, health: 'written',
    }));
    const saveWorkout = createWorkoutV2SaveAdapter(
      { healthEpoch: 5, healthGrantId: 'grant-5' },
      transport,
    );

    await expect(saveWorkout(
      'w1',
      [{ exerciseId: 'walking-lunge', sets: [{ reps: 10, weight: 0, completed: true }] }],
      { expectedRevision: 4, writeId: 'write-12345678' },
    )).resolves.toEqual({
      success: true,
      updatedAt: 11,
      revision: 5,
      health: 'written',
    });
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({
      v: 2,
      sessionId: 'w1',
      healthEpoch: 5,
      healthGrantId: 'grant-5',
      exercises: [{ exerciseId: 'walking-lunge', sets: [{ reps: 10, weight: 0, completed: true }] }],
    }));
  });

  it('adapter zwraca jawny błąd zamiast odrzucać obietnicę', async () => {
    const saveWorkout = createWorkoutV2SaveAdapter(null, vi.fn(async () => {
      throw new Error('NETWORK_DOWN');
    }));

    await expect(saveWorkout('w1', [], {
      expectedRevision: 4,
      writeId: 'write-12345678',
    })).resolves.toEqual({ success: false, error: 'NETWORK_DOWN' });
  });

  it('wysyła wersję, revision/writeId i jawny fence grantu', async () => {
    const transport: WorkoutSyncV2Transport = vi.fn(async (): Promise<WorkoutSyncV2Response> => ({
      updatedAt: 10, revision: 4, health: 'written',
    }));
    await saveWorkoutV2({
      sessionId: 'w1',
      exercises: [{ exerciseId: 'ex1', sets: [], rpe: 8 }],
      options: { expectedRevision: 3, writeId: 'write-12345678' },
      healthGrant: { healthEpoch: 5, healthGrantId: 'grant-5' },
    }, transport);
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({
      v: 2, sessionId: 'w1', expectedRevision: 3, writeId: 'write-12345678',
      healthEpoch: 5, healthGrantId: 'grant-5',
      healthMode: 'replace',
    }));
  });

  it('bez grantu nie wysyła fence, lecz nadal zachowuje bazowy payload', async () => {
    const transport: WorkoutSyncV2Transport = vi.fn(async (): Promise<WorkoutSyncV2Response> => ({
      updatedAt: 10, revision: 4, health: 'stripped',
    }));
    await saveWorkoutV2({
      sessionId: 'w1', exercises: [{ exerciseId: 'ex1', sets: [], rpe: 8 }],
      options: { expectedRevision: 3, writeId: 'write-12345678' }, healthGrant: null,
    }, transport);
    expect(transport).toHaveBeenCalledWith(expect.not.objectContaining({ healthEpoch: expect.anything() }));
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'w1' }));
  });

  it('pending health jest jawnym wynikiem do ponowienia tym samym writeId', async () => {
    const result = await saveWorkoutV2({
      sessionId: 'w1', exercises: [],
      options: { expectedRevision: 3, writeId: 'write-12345678' },
      healthGrant: { healthEpoch: 5, healthGrantId: 'grant-5' },
    }, vi.fn(async (): Promise<WorkoutSyncV2Response> => ({
      updatedAt: 10, revision: 4, health: 'pending',
    })));
    expect(result).toMatchObject({ revision: 4, health: 'pending', healthWritePending: true });
  });
});
