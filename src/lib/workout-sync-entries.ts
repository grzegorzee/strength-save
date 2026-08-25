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

// Bug 37 (X30): wykladniczy backoff AUTO-retry — bez niego kazdy flap sieci
// i kazdy onSnapshot melil trwale bledy (validation/unknown) bez granic,
// palac siec/baterie w docelowym srodowisku apki (slaby zasieg na silowni)
// i wysycajac limit client_errors (20/sesje), ktory maskowal nowe kody.
// min(2^retryCount * 30s, 1h) liczone od lastErrorAt (markRetry ustawia oba).
const RETRY_BACKOFF_BASE_MS = 30_000;
const RETRY_BACKOFF_MAX_MS = 60 * 60 * 1000;

export const workoutSyncRetryDelayMs = (retryCount: number): number =>
  Math.min(RETRY_BACKOFF_BASE_MS * 2 ** Math.min(Math.max(retryCount, 0), 12), RETRY_BACKOFF_MAX_MS);

const isInBackoff = (entry: WorkoutSyncQueueEntry, now: number): boolean => (
  entry.retryCount > 0
  && entry.lastErrorAt !== null
  && now - entry.lastErrorAt < workoutSyncRetryDelayMs(entry.retryCount)
);

export const collectRetryableSyncEntries = (
  activeDrafts: ActiveWorkoutDraft[],
  queueEntries: WorkoutSyncQueueEntry[],
  // `now` podaje WYLACZNIE auto-sync (AutoSyncOnReconnect). Reczne "Ponow"
  // w Sync Center wola bez `now` — backoff nie zabiera niczego temu przeplywowi.
  options: { now?: number } = {},
): WorkoutSyncEntryTarget[] => {
  const seen = new Set<string>();
  const targets: WorkoutSyncEntryTarget[] = [];
  // Wpisy permanent (not-found/permission) czekaja na decyzje usera w Sync Center;
  // auto-retry ponawialby je w nieskonczonosc (R2-17).
  const permanentIds = new Set(
    queueEntries.filter(entry => entry.permanent).map(entry => entry.sessionId),
  );
  const now = options.now;
  const backoffIds = now === undefined
    ? new Set<string>()
    : new Set(queueEntries.filter(entry => isInBackoff(entry, now)).map(entry => entry.sessionId));

  for (const draft of activeDrafts) {
    if (permanentIds.has(draft.sessionId) || backoffIds.has(draft.sessionId) || !isRetryable(draft)) continue;
    seen.add(draft.sessionId);
    targets.push({ entry: draft, source: 'active' });
  }

  for (const entry of queueEntries) {
    if (seen.has(entry.sessionId) || entry.permanent || backoffIds.has(entry.sessionId) || !isRetryable(entry)) continue;
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
