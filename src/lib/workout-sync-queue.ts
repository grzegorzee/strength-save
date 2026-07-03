import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const SYNC_QUEUE_KEY_PREFIX = 'fittracker_workout_sync_queue_v1';

// Kolejka REFERENCYJNA: wpis wskazuje sesję do zsynchronizowania + metadane retry/UI.
// Treść treningu żyje wyłącznie w drafcie IndexedDB — silnik syncu ładuje ją stamtąd.
// Kopie treści w kolejce powodowały rozjazdy kolejka/draft i wojny rewizji (audyt 3.3).
export interface WorkoutSyncQueueEntry {
  queueId: string;
  userId: string;
  sessionId: string;
  dayId: string;
  date: string;
  sessionOrigin: 'remote' | 'provisional';
  dirty: boolean;
  finalSyncPending: boolean;
  updatedAt: number;
  enqueuedAt: number;
  retryCount: number;
  lastError: string | null;
  lastErrorAt: number | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const getQueueKey = (userId: string) => `${SYNC_QUEUE_KEY_PREFIX}_${userId}`;

const normalizeQueueEntry = (value: unknown): WorkoutSyncQueueEntry | null => {
  if (!isRecord(value)) return null;
  if (!value.userId || !value.sessionId || !value.dayId || !value.date) return null;

  // Stare wpisy niosły pełną kopię draftu — migracja przy odczycie:
  // treść ignorowana, referencja i metadane zostają.
  return {
    queueId: String(value.queueId ?? `${value.sessionId}`),
    userId: String(value.userId),
    sessionId: String(value.sessionId),
    dayId: String(value.dayId),
    date: String(value.date),
    sessionOrigin: value.sessionOrigin === 'provisional' ? 'provisional' : 'remote',
    dirty: value.dirty !== false,
    finalSyncPending: !!value.finalSyncPending,
    updatedAt: Number(value.updatedAt) || Date.now(),
    enqueuedAt: Number(value.enqueuedAt) || Date.now(),
    retryCount: Number(value.retryCount) || 0,
    lastError: value.lastError == null ? null : String(value.lastError),
    lastErrorAt: value.lastErrorAt == null ? null : Number(value.lastErrorAt),
  };
};

const readQueue = (userId: string): WorkoutSyncQueueEntry[] => {
  try {
    const raw = localStorage.getItem(getQueueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeQueueEntry)
      .filter((entry): entry is WorkoutSyncQueueEntry => !!entry)
      .sort((a, b) => b.enqueuedAt - a.enqueuedAt);
  } catch {
    return [];
  }
};

const writeQueue = (userId: string, entries: WorkoutSyncQueueEntry[]): boolean => {
  try {
    localStorage.setItem(getQueueKey(userId), JSON.stringify(entries));
    return true;
  } catch (error) {
    console.warn('Failed to write workout sync queue', error);
    return false;
  }
};

export const workoutSyncQueue = {
  list(userId: string): WorkoutSyncQueueEntry[] {
    if (!userId) return [];
    return readQueue(userId);
  },

  findBySessionId(userId: string, sessionId: string): WorkoutSyncQueueEntry | null {
    return this.list(userId).find(entry => entry.sessionId === sessionId) ?? null;
  },

  findByDayDate(userId: string, dayId: string, date: string): WorkoutSyncQueueEntry | null {
    return this.list(userId).find(entry => entry.dayId === dayId && entry.date === date) ?? null;
  },

  upsertFromDraft(draft: ActiveWorkoutDraft, options: { lastError?: string | null } = {}): WorkoutSyncQueueEntry {
    const entries = this.list(draft.userId);
    const existing = entries.find(entry => entry.sessionId === draft.sessionId);
    const nextEntry: WorkoutSyncQueueEntry = {
      queueId: existing?.queueId ?? `${draft.sessionId}`,
      userId: draft.userId,
      sessionId: draft.sessionId,
      dayId: draft.dayId,
      date: draft.date,
      sessionOrigin: draft.sessionOrigin,
      dirty: draft.dirty,
      finalSyncPending: draft.finalSyncPending,
      updatedAt: draft.updatedAt,
      enqueuedAt: existing?.enqueuedAt ?? Date.now(),
      retryCount: existing?.retryCount ?? 0,
      lastError: options.lastError ?? existing?.lastError ?? null,
      lastErrorAt: options.lastError
        ? Date.now()
        : existing?.lastErrorAt ?? null,
    };

    const nextEntries = existing
      ? entries.map(entry => entry.sessionId === draft.sessionId ? nextEntry : entry)
      : [nextEntry, ...entries];

    writeQueue(draft.userId, nextEntries);
    return nextEntry;
  },

  remove(userId: string, sessionId: string): void {
    if (!userId) return;
    const entries = this.list(userId).filter(entry => entry.sessionId !== sessionId);
    writeQueue(userId, entries);
  },

  clear(userId: string): void {
    if (!userId) return;
    localStorage.removeItem(getQueueKey(userId));
  },

  markRetry(userId: string, sessionId: string, error: string | null = null): WorkoutSyncQueueEntry | null {
    const entries = this.list(userId);
    let updatedEntry: WorkoutSyncQueueEntry | null = null;
    const nextEntries = entries.map(entry => {
      if (entry.sessionId !== sessionId) return entry;
      updatedEntry = {
        ...entry,
        retryCount: entry.retryCount + 1,
        lastError: error,
        lastErrorAt: error ? Date.now() : entry.lastErrorAt,
      };
      return updatedEntry;
    });
    writeQueue(userId, nextEntries);
    return updatedEntry;
  },

  pendingCount(userId: string): number {
    return this.list(userId).length;
  },
};
