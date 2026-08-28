import type { ActiveHealthGrant } from '@/lib/legal-versions';
import { callProtectedFunction } from '@/lib/protected-callable';
import type { WorkoutBackupV3RestoreItem } from '@/lib/workout-backup-v3';

export interface WorkoutRestoreV3Request {
  v: 3;
  restoreId: string;
  workout: Record<string, unknown>;
  health?: { workoutId: string; metrics: Record<string, unknown>[] };
  healthEpoch?: number;
  healthGrantId?: string;
}

export interface WorkoutRestoreV3Response {
  status: 'restored' | 'already-present';
  workoutId: string;
}

export type WorkoutRestoreV3Transport = (
  request: WorkoutRestoreV3Request,
) => Promise<WorkoutRestoreV3Response>;

const callableTransport: WorkoutRestoreV3Transport = (request) => (
  callProtectedFunction<WorkoutRestoreV3Request, WorkoutRestoreV3Response>(
    'restoreWorkoutBackupV3',
    request,
  )
);

export async function restoreWorkoutBackupV3Item(
  item: WorkoutBackupV3RestoreItem,
  activeHealthGrant: ActiveHealthGrant | null,
  restoreId: string,
  transport: WorkoutRestoreV3Transport = callableTransport,
): Promise<WorkoutRestoreV3Response> {
  if (item.health && !activeHealthGrant) {
    throw new Error('WORKOUT_BACKUP_HEALTH_CONSENT_REQUIRED');
  }
  return transport({
    v: 3,
    restoreId,
    workout: item.workout as unknown as Record<string, unknown>,
    ...(item.health ? {
      health: item.health as unknown as WorkoutRestoreV3Request['health'],
      healthEpoch: activeHealthGrant!.healthEpoch,
      healthGrantId: activeHealthGrant!.healthGrantId,
    } : {}),
  });
}
