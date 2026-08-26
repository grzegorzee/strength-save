import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';

export const WORKOUT_SYNC_STATE_CHANGED_EVENT = 'strength-save-workout-sync-state-changed';
// WP-C (X38): prośba o natychmiastowy bieg AutoSync (zakończenie offline,
// unmount WorkoutDay z finalSyncPending). Bez tego final czekał na timer/sieć.
export const WORKOUT_SYNC_REQUESTED_EVENT = 'strength-save-workout-sync-requested';

export const requestWorkoutAutoSync = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WORKOUT_SYNC_REQUESTED_EVENT));
};

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
//
// WP-C (X38): full jitter (AWS): losowo z [0, min(cap, 5s * 2^n)], cap 60 s
// w foregroundzie. Poprzedni sufit 1 h trzymal zakonczony trening poza chmura
// przez godzine po jednym zlym strzale. Jitter jest DETERMINISTYCZNY per
// (sessionId, retryCount): kolejne wywolania collectRetryableSyncEntries
// widza to samo okno, a testy sa powtarzalne. Kazde realne zdarzenie
// (siec/resume/reczny sync) zeruje retryCount (queue.resetBackoff).
export const RETRY_BACKOFF_BASE_MS = 5_000;
export const RETRY_BACKOFF_MAX_MS = 60_000;
// Dolna granica: pelny jitter dopuszcza 0 ms; 1 s chroni przed petla
// natychmiastowych prob w jednym biegu timera.
const RETRY_BACKOFF_MIN_MS = 1_000;

// Hash FNV-1a -> [0, 1). Tani, stabilny, bez zaleznosci.
const jitterUnit = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x100000000;
};

export const workoutSyncRetryDelayMs = (retryCount: number, jitterSeed = ''): number => {
  const ceiling = Math.min(RETRY_BACKOFF_BASE_MS * 2 ** Math.min(Math.max(retryCount, 0), 12), RETRY_BACKOFF_MAX_MS);
  const unit = jitterSeed ? jitterUnit(`${jitterSeed}:${retryCount}`) : 1;
  return Math.max(RETRY_BACKOFF_MIN_MS, Math.round(ceiling * unit));
};

const isInBackoff = (entry: WorkoutSyncQueueEntry, now: number): boolean => (
  entry.retryCount > 0
  && entry.lastErrorAt !== null
  && now - entry.lastErrorAt < workoutSyncRetryDelayMs(entry.retryCount, entry.sessionId)
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
