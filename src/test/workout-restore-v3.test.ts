import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/protected-callable', () => ({ callProtectedFunction: vi.fn() }));

import {
  restoreWorkoutBackupV3Item,
  type WorkoutRestoreV3Transport,
} from '@/lib/workout-restore-v3';
import type { WorkoutBackupV3RestoreItem } from '@/lib/workout-backup-v3';

const item: WorkoutBackupV3RestoreItem = {
  workout: {
    id: 'w1', userId: 'exported-owner', dayId: 'd1', date: '2026-08-28', completed: true,
    exercises: [{ exerciseId: 'lunge', sets: [{ reps: 10, weight: 0, completed: true }] }],
  },
  health: { workoutId: 'w1', metrics: [{ exerciseId: 'lunge', rpe: 7 }] },
};

describe('restore workout backup v3 client', () => {
  it('wysyła bazę i health osobno z aktywnym grantem', async () => {
    const transport: WorkoutRestoreV3Transport = vi.fn(async () => ({
      status: 'restored' as const,
      workoutId: 'w1',
    }));
    await restoreWorkoutBackupV3Item(item, {
      healthEpoch: 8,
      healthGrantId: 'grant-8',
    }, 'restore-12345678', transport);

    expect(transport).toHaveBeenCalledWith({
      v: 3,
      restoreId: 'restore-12345678',
      workout: item.workout,
      health: item.health,
      healthEpoch: 8,
      healthGrantId: 'grant-8',
    });
  });

  it('nie wysyła żądania health bez aktywnego grantu', async () => {
    const transport: WorkoutRestoreV3Transport = vi.fn();
    await expect(restoreWorkoutBackupV3Item(item, null, 'restore-12345678', transport))
      .rejects.toThrow('WORKOUT_BACKUP_HEALTH_CONSENT_REQUIRED');
    expect(transport).not.toHaveBeenCalled();
  });
});
