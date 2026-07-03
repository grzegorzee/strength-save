import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Lustrzana semantyka markDraftSynced (IDB): znaczniki chmury zawsze,
// dirty czyszczone tylko gdy nic nie doszło w trakcie syncu.
export const applySyncMarkers = (
  base: ActiveWorkoutDraft,
  syncedVersion: number,
  syncedAt: number,
  result: { updatedAt?: number; revision?: number },
): ActiveWorkoutDraft => ({
  ...base,
  dirty: base.version === syncedVersion ? false : base.dirty,
  lastFirebaseSyncAt: syncedAt,
  ...(result.updatedAt !== undefined && { cloudUpdatedAt: result.updatedAt }),
  ...(result.revision !== undefined && { cloudRevision: result.revision }),
});
