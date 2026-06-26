import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';

export const WORKOUT_SYNC_STATE_CHANGED_EVENT = 'strength-save-workout-sync-state-changed';

export type WorkoutSyncEntrySource = 'active' | 'queue';

export interface WorkoutSyncEntryTarget {
  entry: ActiveWorkoutDraft | WorkoutSyncQueueEntry;
  source: WorkoutSyncEntrySource;
}

const isRetryable = (entry: ActiveWorkoutDraft | WorkoutSyncQueueEntry): boolean => (
  entry.dirty || entry.finalSyncPending || entry.sessionOrigin === 'provisional'
);

export const collectRetryableSyncEntries = (
  activeDrafts: ActiveWorkoutDraft[],
  queueEntries: WorkoutSyncQueueEntry[],
): WorkoutSyncEntryTarget[] => {
  const seen = new Set<string>();
  const targets: WorkoutSyncEntryTarget[] = [];

  for (const draft of activeDrafts) {
    if (!isRetryable(draft)) continue;
    seen.add(draft.sessionId);
    targets.push({ entry: draft, source: 'active' });
  }

  for (const entry of queueEntries) {
    if (seen.has(entry.sessionId) || !isRetryable(entry)) continue;
    targets.push({ entry, source: 'queue' });
  }

  return targets;
};
