import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const SYNC_QUEUE_KEY_PREFIX = 'fittracker_workout_sync_queue_v1';

export interface WorkoutSyncQueueEntry extends ActiveWorkoutDraft {
  queueId: string;
  enqueuedAt: number;
  retryCount: number;
  lastError: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const getQueueKey = (userId: string) => `${SYNC_QUEUE_KEY_PREFIX}_${userId}`;

const normalizeQueueEntry = (value: unknown): WorkoutSyncQueueEntry | null => {
  if (!isRecord(value)) return null;
  if (!value.userId || !value.sessionId || !value.dayId || !value.date) return null;

  return {
    queueId: String(value.queueId ?? `${value.sessionId}`),
    sessionId: String(value.sessionId),
    userId: String(value.userId),
    dayId: String(value.dayId),
    date: String(value.date),
    cycleId: value.cycleId == null ? null : String(value.cycleId),
    sessionOrigin: value.sessionOrigin === 'provisional' ? 'provisional' : 'remote',
    remoteSessionId: value.remoteSessionId == null ? null : String(value.remoteSessionId),
    exerciseSets: isRecord(value.exerciseSets) ? value.exerciseSets as ActiveWorkoutDraft['exerciseSets'] : {},
    exerciseNotes: isRecord(value.exerciseNotes) ? value.exerciseNotes as ActiveWorkoutDraft['exerciseNotes'] : {},
    dayNotes: String(value.dayNotes ?? ''),
    skippedExercises: Array.isArray(value.skippedExercises) ? value.skippedExercises.map(item => String(item)) : [],
    startedAt: Number(value.startedAt) || Date.now(),
    updatedAt: Number(value.updatedAt) || Date.now(),
    lastFirebaseSyncAt: value.lastFirebaseSyncAt == null ? null : Number(value.lastFirebaseSyncAt),
    dirty: value.dirty !== false,
    completedLocally: !!value.completedLocally,
    finalSyncPending: !!value.finalSyncPending,
    version: Number(value.version) || 1,
    enqueuedAt: Number(value.enqueuedAt) || Date.now(),
    retryCount: Number(value.retryCount) || 0,
    lastError: value.lastError == null ? null : String(value.lastError),
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

const writeQueue = (userId: string, entries: WorkoutSyncQueueEntry[]) => {
  localStorage.setItem(getQueueKey(userId), JSON.stringify(entries));
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
      ...draft,
      queueId: existing?.queueId ?? `${draft.sessionId}`,
      enqueuedAt: existing?.enqueuedAt ?? Date.now(),
      retryCount: existing?.retryCount ?? 0,
      lastError: options.lastError ?? existing?.lastError ?? null,
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
