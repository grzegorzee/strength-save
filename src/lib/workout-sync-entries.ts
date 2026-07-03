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
  // Wpisy permanent (not-found/permission) czekaja na decyzje usera w Sync Center;
  // auto-retry ponawialby je w nieskonczonosc (R2-17).
  const permanentIds = new Set(
    queueEntries.filter(entry => entry.permanent).map(entry => entry.sessionId),
  );

  for (const draft of activeDrafts) {
    if (permanentIds.has(draft.sessionId) || !isRetryable(draft)) continue;
    seen.add(draft.sessionId);
    targets.push({ entry: draft, source: 'active' });
  }

  for (const entry of queueEntries) {
    if (seen.has(entry.sessionId) || entry.permanent || !isRetryable(entry)) continue;
    targets.push({ entry, source: 'queue' });
  }

  return targets;
};

// Zapis porazki syncu pod DOCELOWYM sessionId (po promocji NOWY id, R2-16): gdy wpis
// nie istnieje (silnik sprzatnal stara referencje przy promocji), adoptuje draft do
// kolejki, zeby lastError byl widoczny dla filtrow AutoSync (np. konflikt) i UI.
export const recordWorkoutSyncFailure = async (
  userId: string,
  outcome: { sessionId: string },
  error: string,
  deps: {
    queue: {
      markRetry: (userId: string, sessionId: string, error?: string | null) => WorkoutSyncQueueEntry | null;
      upsertFromDraft: (draft: ActiveWorkoutDraft, options?: { lastError?: string | null }) => WorkoutSyncQueueEntry;
    };
    loadDraft: (userId: string, sessionId: string) => Promise<ActiveWorkoutDraft | null>;
  },
): Promise<void> => {
  const updated = deps.queue.markRetry(userId, outcome.sessionId, error);
  if (updated) return;
  const draft = await deps.loadDraft(userId, outcome.sessionId);
  if (!draft) return;
  deps.queue.upsertFromDraft(draft, { lastError: error });
  deps.queue.markRetry(userId, outcome.sessionId, error);
};
