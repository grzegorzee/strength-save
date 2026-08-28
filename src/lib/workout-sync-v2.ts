import type { ActiveHealthGrant } from '@/lib/legal-versions';
import { callProtectedFunction } from '@/lib/protected-callable';
import type { WorkoutSaveExercise, WorkoutSaveOptions } from '@/lib/workout-sync-engine';

export interface WorkoutSyncV2Request {
  v: 2;
  sessionId: string;
  expectedRevision: number;
  writeId: string;
  healthEpoch?: number;
  healthGrantId?: string;
  healthMode?: 'replace';
  exercises: WorkoutSaveExercise[];
  options: Omit<WorkoutSaveOptions, 'expectedRevision' | 'writeId'>;
}

export interface WorkoutSyncV2Response {
  updatedAt: number;
  revision: number;
  alreadyApplied?: true;
  health: 'none' | 'stripped' | 'written' | 'pending';
}

export type WorkoutSyncV2Transport = (
  request: WorkoutSyncV2Request,
) => Promise<WorkoutSyncV2Response>;

export type WorkoutV2SaveAdapter = (
  sessionId: string,
  exercises: WorkoutSaveExercise[],
  options: WorkoutSaveOptions,
) => Promise<{
  success: boolean;
  error?: string;
  updatedAt?: number;
  revision?: number;
  alreadyApplied?: boolean;
  health?: WorkoutSyncV2Response['health'];
}>;

const callableTransport: WorkoutSyncV2Transport = (request) => (
  callProtectedFunction<WorkoutSyncV2Request, WorkoutSyncV2Response>('syncWorkoutV2', request)
);

export async function saveWorkoutV2(input: {
  sessionId: string;
  exercises: WorkoutSaveExercise[];
  options: WorkoutSaveOptions;
  healthGrant: ActiveHealthGrant | null;
}, transport: WorkoutSyncV2Transport = callableTransport): Promise<{
  updatedAt: number;
  revision: number;
  alreadyApplied?: true;
  health: WorkoutSyncV2Response['health'];
  healthWritePending?: true;
}> {
  if (!Number.isSafeInteger(input.options.expectedRevision) || (input.options.expectedRevision ?? -1) < 0) {
    throw new Error('WORKOUT_SYNC_V2_REQUIRES_REVISION');
  }
  const { expectedRevision, writeId, ...options } = input.options;
  const result = await transport({
    v: 2,
    sessionId: input.sessionId,
    expectedRevision: expectedRevision!,
    writeId,
    exercises: input.exercises,
    options,
    ...(input.healthGrant ? {
      healthEpoch: input.healthGrant.healthEpoch,
      healthGrantId: input.healthGrant.healthGrantId,
      healthMode: 'replace' as const,
    } : {}),
  });
  return {
    updatedAt: result.updatedAt,
    revision: result.revision,
    health: result.health,
    ...(result.alreadyApplied ? { alreadyApplied: true as const } : {}),
    ...(result.health === 'pending' ? { healthWritePending: true as const } : {}),
  };
}

export function createWorkoutV2SaveAdapter(
  healthGrant: ActiveHealthGrant | null,
  transport: WorkoutSyncV2Transport = callableTransport,
): WorkoutV2SaveAdapter {
  return async (sessionId, exercises, options) => {
    try {
      const result = await saveWorkoutV2({
        sessionId,
        exercises,
        options,
        healthGrant,
      }, transport);
      return {
        success: true,
        updatedAt: result.updatedAt,
        revision: result.revision,
        health: result.health,
        ...(result.alreadyApplied ? { alreadyApplied: true } : {}),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}
