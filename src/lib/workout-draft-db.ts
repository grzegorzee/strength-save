import type { SetData } from '@/types';
import { workoutDraft } from '@/lib/workout-draft';

export const WORKOUT_DRAFT_DB_NAME = 'strength-save-db';
export const WORKOUT_DRAFT_STORE_NAME = 'workoutDrafts';

const DB_VERSION = 1;

export interface ActiveWorkoutDraft {
  sessionId: string;
  userId: string;
  dayId: string;
  date: string;
  exerciseSets: Record<string, SetData[]>;
  exerciseNotes: Record<string, string>;
  dayNotes: string;
  skippedExercises: string[];
  startedAt: number;
  updatedAt: number;
  lastFirebaseSyncAt: number | null;
  dirty: boolean;
  completedLocally: boolean;
  finalSyncPending: boolean;
  version: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const normalizeSet = (set: unknown): SetData => {
  if (!isRecord(set)) {
    return { reps: 0, weight: 0, completed: false };
  }

  return {
    reps: Number.isFinite(Number(set.reps)) ? Number(set.reps) : 0,
    weight: Number.isFinite(Number(set.weight)) ? Number(set.weight) : 0,
    completed: !!set.completed,
    ...(set.isWarmup ? { isWarmup: true } : {}),
  };
};

const normalizeExerciseSets = (value: unknown): Record<string, SetData[]> => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([exerciseId, sets]) => [
      exerciseId,
      Array.isArray(sets) ? sets.map(normalizeSet) : [],
    ])
  );
};

const normalizeExerciseNotes = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([exerciseId, note]) => [exerciseId, String(note ?? '')])
  );
};

const normalizeStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(item => String(item)) : []
);

const toNumberOr = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDraft = (value: unknown, fallbackUserId?: string): ActiveWorkoutDraft | null => {
  if (!isRecord(value)) return null;
  if (!value.sessionId || !value.dayId || !value.date) return null;

  const now = Date.now();
  const userId = String(value.userId ?? fallbackUserId ?? '');
  if (!userId) return null;

  return {
    sessionId: String(value.sessionId),
    userId,
    dayId: String(value.dayId),
    date: String(value.date),
    exerciseSets: normalizeExerciseSets(value.exerciseSets),
    exerciseNotes: normalizeExerciseNotes(value.exerciseNotes),
    dayNotes: String(value.dayNotes ?? ''),
    skippedExercises: normalizeStringArray(value.skippedExercises),
    startedAt: toNumberOr(value.startedAt, now),
    updatedAt: toNumberOr(value.updatedAt, now),
    lastFirebaseSyncAt: value.lastFirebaseSyncAt == null ? null : toNumberOr(value.lastFirebaseSyncAt, now),
    dirty: !!value.dirty,
    completedLocally: !!value.completedLocally,
    finalSyncPending: !!value.finalSyncPending,
    version: Math.max(1, Math.round(toNumberOr(value.version, 1))),
  };
};

export const hasDraftContent = (
  exerciseSets: Record<string, SetData[]>,
  exerciseNotes: Record<string, string>,
  dayNotes: string,
  skippedExercises: string[]
): boolean => {
  const hasSetData = Object.keys(exerciseSets).length > 0 &&
    Object.values(exerciseSets).some(sets => sets.some(set => set.reps > 0 || set.weight > 0 || set.completed));
  const hasNotes = Object.values(exerciseNotes).some(note => note.trim().length > 0) || dayNotes.trim().length > 0;
  return hasSetData || hasNotes || skippedExercises.length > 0;
};

const getIndexedDb = (): IDBFactory | null => {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return null;
  }
  return window.indexedDB;
};

const withFallbackLoad = (userId: string): ActiveWorkoutDraft | null => {
  const draft = workoutDraft.load();
  if (!draft) return null;

  return normalizeDraft({
    ...draft,
    userId,
    startedAt: draft.savedAt,
    updatedAt: draft.savedAt,
    lastFirebaseSyncAt: null,
    dirty: true,
    completedLocally: false,
    finalSyncPending: false,
    version: 1,
  });
};

const withFallbackSave = (draft: ActiveWorkoutDraft): void => {
  workoutDraft.save({
    sessionId: draft.sessionId,
    dayId: draft.dayId,
    date: draft.date,
    exerciseSets: draft.exerciseSets,
    exerciseNotes: draft.exerciseNotes,
    dayNotes: draft.dayNotes,
    skippedExercises: draft.skippedExercises,
    savedAt: draft.updatedAt,
  });
};

const openDatabase = (): Promise<IDBDatabase | null> => new Promise((resolve, reject) => {
  const indexedDb = getIndexedDb();
  if (!indexedDb) {
    resolve(null);
    return;
  }

  const request = indexedDb.open(WORKOUT_DRAFT_DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(WORKOUT_DRAFT_STORE_NAME)) {
      db.createObjectStore(WORKOUT_DRAFT_STORE_NAME, { keyPath: 'userId' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const runRead = async <T>(userId: string): Promise<T | null> => {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readonly');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const request = store.get(userId);

    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
};

const runWrite = async (value: ActiveWorkoutDraft | null, userId: string): Promise<void> => {
  const db = await openDatabase();
  if (!db) {
    if (value) {
      withFallbackSave(value);
    } else {
      workoutDraft.clear();
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const request = value ? store.put(value) : store.delete(userId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const updateDraft = async (
  userId: string,
  updater: (draft: ActiveWorkoutDraft) => ActiveWorkoutDraft | null
): Promise<void> => {
  const current = await workoutDraftDb.loadActiveDraft(userId);
  if (!current) return;

  const next = updater(current);
  await runWrite(next, userId);
};

export const workoutDraftDb = {
  isSupported(): boolean {
    return getIndexedDb() !== null;
  },

  async loadActiveDraft(userId: string): Promise<ActiveWorkoutDraft | null> {
    if (!this.isSupported()) {
      return withFallbackLoad(userId);
    }

    try {
      const raw = await runRead<ActiveWorkoutDraft>(userId);
      return normalizeDraft(raw, userId);
    } catch {
      return withFallbackLoad(userId);
    }
  },

  async saveActiveDraft(draft: ActiveWorkoutDraft): Promise<void> {
    const normalized = normalizeDraft(draft, draft.userId);
    if (!normalized) return;
    await runWrite(normalized, normalized.userId);
  },

  async markDraftSynced(userId: string, syncedAt: number): Promise<void> {
    await updateDraft(userId, draft => ({
      ...draft,
      dirty: false,
      lastFirebaseSyncAt: syncedAt,
    }));
  },

  async markCompletedLocally(userId: string): Promise<void> {
    await updateDraft(userId, draft => ({
      ...draft,
      completedLocally: true,
      finalSyncPending: true,
      dirty: true,
      updatedAt: Date.now(),
      version: draft.version + 1,
    }));
  },

  async clearActiveDraft(userId: string): Promise<void> {
    await runWrite(null, userId);
  },

  async migrateFromLocalStorage(userId: string): Promise<ActiveWorkoutDraft | null> {
    const existing = await this.loadActiveDraft(userId);
    if (existing) return existing;

    const legacyDraft = workoutDraft.load();
    if (!legacyDraft) return null;

    const migrated = normalizeDraft({
      ...legacyDraft,
      userId,
      startedAt: legacyDraft.savedAt,
      updatedAt: legacyDraft.savedAt,
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    }, userId);

    if (!migrated) {
      workoutDraft.clear();
      return null;
    }

    await this.saveActiveDraft(migrated);
    workoutDraft.clear();
    return migrated;
  },
};
