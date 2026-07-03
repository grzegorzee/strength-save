import type { SetData, ExerciseMetrics } from '@/types';
import { workoutDraft } from '@/lib/workout-draft';
import { isProvisionalWorkoutSessionId } from '@/lib/workout-session';

export const WORKOUT_DRAFT_DB_NAME = 'strength-save-db';
export const WORKOUT_DRAFT_STORE_NAME = 'workoutDrafts';

const DB_VERSION = 2;
const writeChains = new Map<string, Promise<void>>();
const latestWriteVersions = new Map<string, number>();

export interface ActiveWorkoutDraft {
  sessionId: string;
  userId: string;
  dayId: string;
  date: string;
  cycleId: string | null;
  sessionOrigin: 'remote' | 'provisional';
  remoteSessionId: string | null;
  exerciseSets: Record<string, SetData[]>;
  exerciseNotes: Record<string, string>;
  exerciseNames?: Record<string, string>;
  // Metryki autoregulacji per ćwiczenie (RPE/ból/jakość). Opcjonalne — stare drafty bez nich
  // normalizują się do {}. Nie wymaga bumpu wersji IndexedDB (pole additive na obiekcie).
  exerciseMetrics: Record<string, ExerciseMetrics>;
  dayNotes: string;
  dayName?: string;
  dayFocus?: string;
  skippedExercises: string[];
  startedAt: number;
  /** Moment potwierdzenia zakończenia. Stabilizuje duration przy retry finalnego syncu. */
  finalizedAt?: number;
  updatedAt: number;
  cloudUpdatedAt?: number;
  cloudRevision?: number;
  lastFirebaseSyncAt: number | null;
  dirty: boolean;
  completedLocally: boolean;
  finalSyncPending: boolean;
  version: number;
  // Klucz idempotencji trwającej próby zapisu + wersja treści, której dotyczy.
  // Reuse writeId dozwolony TYLKO gdy pendingWriteVersion === version.
  pendingWriteId?: string | null;
  pendingWriteVersion?: number | null;
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

const normalizeExerciseMetrics = (value: unknown): Record<string, ExerciseMetrics> => {
  if (!isRecord(value)) return {};

  const num = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, m]) => isRecord(m))
      .map(([exerciseId, m]) => {
        const rec = m as Record<string, unknown>;
        const metrics: ExerciseMetrics = {};
        if (rec.rpe !== undefined && num(rec.rpe) !== undefined) metrics.rpe = num(rec.rpe);
        if (rec.pain !== undefined && num(rec.pain) !== undefined) metrics.pain = num(rec.pain);
        if (rec.quality !== undefined && num(rec.quality) !== undefined) metrics.quality = num(rec.quality);
        return [exerciseId, metrics];
      })
  );
};

const normalizeStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(item => String(item)) : []
);

const toNumberOr = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getWorkoutDraftKey = (userId: string, sessionId: string): string => `${userId}::${sessionId}`;

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
    cycleId: value.cycleId == null ? null : String(value.cycleId),
    sessionOrigin: value.sessionOrigin === 'provisional' || isProvisionalWorkoutSessionId(String(value.sessionId))
      ? 'provisional'
      : 'remote',
    remoteSessionId: value.remoteSessionId == null ? null : String(value.remoteSessionId),
    exerciseSets: normalizeExerciseSets(value.exerciseSets),
    exerciseNotes: normalizeExerciseNotes(value.exerciseNotes),
    ...(isRecord(value.exerciseNames) && {
      exerciseNames: Object.fromEntries(
        Object.entries(value.exerciseNames).map(([exerciseId, name]) => [exerciseId, String(name ?? '')])
      ),
    }),
    exerciseMetrics: normalizeExerciseMetrics(value.exerciseMetrics),
    dayNotes: String(value.dayNotes ?? ''),
    ...(value.dayName !== undefined && { dayName: String(value.dayName) }),
    ...(value.dayFocus !== undefined && { dayFocus: String(value.dayFocus) }),
    skippedExercises: normalizeStringArray(value.skippedExercises),
    startedAt: toNumberOr(value.startedAt, now),
    ...(value.finalizedAt !== undefined && { finalizedAt: toNumberOr(value.finalizedAt, now) }),
    updatedAt: toNumberOr(value.updatedAt, now),
    ...(value.cloudUpdatedAt !== undefined && { cloudUpdatedAt: toNumberOr(value.cloudUpdatedAt, now) }),
    ...(value.cloudRevision !== undefined && { cloudRevision: Math.max(0, Math.round(toNumberOr(value.cloudRevision, 0))) }),
    lastFirebaseSyncAt: value.lastFirebaseSyncAt == null ? null : toNumberOr(value.lastFirebaseSyncAt, now),
    dirty: !!value.dirty,
    completedLocally: !!value.completedLocally,
    finalSyncPending: !!value.finalSyncPending,
    version: Math.max(1, Math.round(toNumberOr(value.version, 1))),
    ...(value.pendingWriteId != null && { pendingWriteId: String(value.pendingWriteId) }),
    ...(value.pendingWriteVersion != null && { pendingWriteVersion: Math.max(1, Math.round(toNumberOr(value.pendingWriteVersion, 1))) }),
  };
};

export const hasDraftContent = (
  exerciseSets: Record<string, SetData[]>,
  exerciseNotes: Record<string, string>,
  dayNotes: string,
  skippedExercises: string[]
): boolean => {
  // Prefill startowy kopiuje reps/weight z poprzedniego treningu — treścią draftu
  // jest dopiero odhaczona seria, nie same prefilowane wartości.
  const hasSetData = Object.values(exerciseSets).some(sets => sets.some(set => set.completed === true));
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
  const draft = workoutDraft.load(userId);
  if (!draft) return null;

  return normalizeDraft({
    ...draft,
    userId,
    cycleId: null,
    sessionOrigin: isProvisionalWorkoutSessionId(draft.sessionId) ? 'provisional' : 'remote',
    remoteSessionId: null,
    startedAt: draft.savedAt,
    updatedAt: draft.savedAt,
    lastFirebaseSyncAt: null,
    dirty: true,
    completedLocally: false,
    finalSyncPending: false,
    version: draft.version ?? 1,
    ...(draft.cloudRevision != null && { cloudRevision: draft.cloudRevision }),
    ...(draft.cloudUpdatedAt != null && { cloudUpdatedAt: draft.cloudUpdatedAt }),
  });
};

const withFallbackSave = (draft: ActiveWorkoutDraft): void => {
  const saved = workoutDraft.save({
    sessionId: draft.sessionId,
    dayId: draft.dayId,
    date: draft.date,
    exerciseSets: draft.exerciseSets,
    exerciseNotes: draft.exerciseNotes,
    dayNotes: draft.dayNotes,
    skippedExercises: draft.skippedExercises,
    savedAt: draft.updatedAt,
    ...(draft.cloudRevision != null && { cloudRevision: draft.cloudRevision }),
    ...(draft.cloudUpdatedAt != null && { cloudUpdatedAt: draft.cloudUpdatedAt }),
    version: draft.version,
  }, draft.userId);
  if (!saved) {
    throw new Error('LOCAL_STORAGE_SAVE_FAILED');
  }
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
      db.createObjectStore(WORKOUT_DRAFT_STORE_NAME);
      return;
    }

    const tx = request.transaction;
    if (!tx) return;

    const existingStore = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    if (existingStore.keyPath !== 'userId') return;

    const getAllRequest = existingStore.getAll();
    getAllRequest.onsuccess = () => {
      const legacyDrafts = (getAllRequest.result ?? [])
        .map(value => normalizeDraft(value))
        .filter((draft): draft is ActiveWorkoutDraft => !!draft);

      db.deleteObjectStore(WORKOUT_DRAFT_STORE_NAME);
      const nextStore = db.createObjectStore(WORKOUT_DRAFT_STORE_NAME);
      legacyDrafts.forEach(draft => {
        nextStore.put(draft, getWorkoutDraftKey(draft.userId, draft.sessionId));
      });
    };
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const pickActiveDraft = (drafts: ActiveWorkoutDraft[]): ActiveWorkoutDraft | null => {
  if (drafts.length === 0) return null;
  return [...drafts].sort((a, b) => {
    const aPending = a.finalSyncPending || a.dirty || a.sessionOrigin === 'provisional';
    const bPending = b.finalSyncPending || b.dirty || b.sessionOrigin === 'provisional';
    if (aPending !== bPending) return aPending ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  })[0];
};

const runReadAll = async (userId: string): Promise<ActiveWorkoutDraft[]> => {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise<ActiveWorkoutDraft[]>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readonly');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const drafts = Array.isArray(request.result)
        ? request.result
          .map(value => normalizeDraft(value, userId))
          .filter((draft): draft is ActiveWorkoutDraft => !!draft && draft.userId === userId)
        : [];
      resolve(drafts);
    };
    request.onerror = () => reject(request.error);
  });
};

const runRead = async (userId: string, sessionId?: string): Promise<ActiveWorkoutDraft | null> => {
  const db = await openDatabase();
  if (!db) return null;

  if (!sessionId) {
    return pickActiveDraft(await runReadAll(userId));
  }

  return new Promise<ActiveWorkoutDraft | null>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readonly');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const request = store.get(getWorkoutDraftKey(userId, sessionId));

    request.onsuccess = () => resolve(normalizeDraft(request.result, userId));
    request.onerror = () => reject(request.error);
  });
};

const clearFallbackCopyIfMatches = (userId: string, sessionId?: string): void => {
  try {
    const copy = workoutDraft.load(userId);
    if (!copy) return;
    if (!sessionId || copy.sessionId === sessionId) {
      workoutDraft.clear(userId);
    }
  } catch {
    // best-effort: brak dostępu do localStorage nie może blokować sprzątania IDB
  }
};

const runWrite = async (value: ActiveWorkoutDraft | null, userId: string, sessionId?: string): Promise<void> => {
  const db = await openDatabase();
  if (!db) {
    if (value) {
      withFallbackSave(value);
    } else {
      if (!workoutDraft.clear(userId)) {
        throw new Error('LOCAL_STORAGE_CLEAR_FAILED');
      }
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    if (value) {
      if (sessionId && sessionId !== value.sessionId) {
        store.delete(getWorkoutDraftKey(userId, sessionId));
      }
      store.put(value, getWorkoutDraftKey(value.userId, value.sessionId));
    } else {
      if (sessionId) {
        store.delete(getWorkoutDraftKey(userId, sessionId));
      } else {
        const request = store.getAll();
        request.onsuccess = () => {
          const activeDraft = pickActiveDraft(
            (Array.isArray(request.result) ? request.result : [])
              .map(value => normalizeDraft(value, userId))
              .filter((draft): draft is ActiveWorkoutDraft => !!draft && draft.userId === userId)
          );
          if (activeDraft) {
            store.delete(getWorkoutDraftKey(activeDraft.userId, activeDraft.sessionId));
          }
        };
        request.onerror = () => reject(request.error);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  if (!value) {
    // Usunięcie draftu przez działające IDB musi sprzątnąć też kopię fallback,
    // inaczej pierwszy błąd odczytu IDB wskrzesza starego drafta z localStorage.
    clearFallbackCopyIfMatches(userId, sessionId);
  }
};

// RMW w JEDNEJ transakcji readwrite: get + put bez okna, w którym równoległy
// saveActiveDraft mógłby zostać nadpisany obiektem zbudowanym na starszym odczycie
// (R2-02). Mutator MUSI być synchroniczny — transakcja IDB auto-commituje po
// opróżnieniu kolejki mikrotasków.
const runUpdate = async (
  userId: string,
  sessionId: string,
  updater: (draft: ActiveWorkoutDraft) => ActiveWorkoutDraft | null
): Promise<void> => {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
  } catch {
    db = null;
  }

  if (!db) {
    const current = withFallbackLoad(userId);
    if (!current || current.sessionId !== sessionId) return;
    const next = updater(current);
    if (next) {
      withFallbackSave(next);
    } else if (!workoutDraft.clear(userId)) {
      throw new Error('LOCAL_STORAGE_CLEAR_FAILED');
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const key = getWorkoutDraftKey(userId, sessionId);
    const request = store.get(key);

    request.onsuccess = () => {
      const current = normalizeDraft(request.result, userId);
      if (!current || current.userId !== userId) return;
      const next = updater(current);
      if (!next) {
        store.delete(key);
        return;
      }
      if (next.sessionId !== current.sessionId) {
        // Zmiana tożsamości sesji (promocja provisional -> remote): stary klucz znika.
        store.delete(key);
      }
      store.put(next, getWorkoutDraftKey(next.userId, next.sessionId));
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const updateDraft = async (
  userId: string,
  sessionId: string | undefined,
  updater: (draft: ActiveWorkoutDraft) => ActiveWorkoutDraft | null
): Promise<void> => {
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const current = await workoutDraftDb.loadActiveDraft(userId);
    if (!current) return;
    targetSessionId = current.sessionId;
  }

  // Serializacja z saveActiveDraft per klucz draftu.
  const key = getWorkoutDraftKey(userId, targetSessionId);
  const previous = writeChains.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => runUpdate(userId, targetSessionId, updater));
  const chain = run.catch(() => undefined).finally(() => {
    if (writeChains.get(key) === chain) writeChains.delete(key);
  });
  writeChains.set(key, chain);
  await run;
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
      return await runRead(userId);
    } catch {
      return withFallbackLoad(userId);
    }
  },

  async loadDraft(userId: string, sessionId: string): Promise<ActiveWorkoutDraft | null> {
    if (!this.isSupported()) {
      const fallback = withFallbackLoad(userId);
      return fallback?.sessionId === sessionId ? fallback : null;
    }

    try {
      return await runRead(userId, sessionId);
    } catch {
      const fallback = withFallbackLoad(userId);
      return fallback?.sessionId === sessionId ? fallback : null;
    }
  },

  async listDrafts(userId: string): Promise<ActiveWorkoutDraft[]> {
    if (!this.isSupported()) {
      const fallback = withFallbackLoad(userId);
      return fallback ? [fallback] : [];
    }

    try {
      return await runReadAll(userId);
    } catch {
      const fallback = withFallbackLoad(userId);
      return fallback ? [fallback] : [];
    }
  },

  async saveActiveDraft(draft: ActiveWorkoutDraft): Promise<void> {
    const normalized = normalizeDraft(draft, draft.userId);
    if (!normalized) return;
    const key = getWorkoutDraftKey(normalized.userId, normalized.sessionId);
    const highestVersion = latestWriteVersions.get(key) ?? 0;
    if (normalized.version < highestVersion) return;
    latestWriteVersions.set(key, normalized.version);
    const previous = writeChains.get(key) ?? Promise.resolve();
    const write = previous.then(async () => {
      if (normalized.version < (latestWriteVersions.get(key) ?? normalized.version)) return;
      try {
        await runWrite(normalized, normalized.userId);
      } catch {
        // IndexedDB w WKWebView potrafi stracić połączenie po powrocie z tła — jedna ponowna
        // próba, potem localStorage. Błąd pozostaje widoczny tylko gdy fallback zawiedzie.
        try {
          await runWrite(normalized, normalized.userId);
        } catch {
          withFallbackSave(normalized);
        }
      }
    });
    const chain = write.finally(() => {
      if (writeChains.get(key) === chain) writeChains.delete(key);
      if (latestWriteVersions.get(key) === normalized.version) latestWriteVersions.delete(key);
    });
    writeChains.set(key, chain);
    await chain;
  },

  async markDraftSynced(
    userId: string,
    syncedAt: number,
    expectedDraftVersion: number,
    sessionId?: string,
    cloudState?: { updatedAt?: number; revision?: number }
  ): Promise<void> {
    await updateDraft(userId, sessionId, draft => {
      // cloudUpdatedAt/cloudRevision to FAKT serwera, niezależny od edycji draftu w trakcie
      // syncu — zapisz je ZAWSZE. Inaczej, gdy edycja podbije version w trakcie syncu, po
      // purge WKWebView IDB ma stale cloudRevision i kolejny sync fałszywie wykrywa
      // WORKOUT_CONFLICT (#1 P1: "Trening edytowany na innym urządzeniu").
      const cloudMarkers = {
        ...(cloudState?.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
        ...(cloudState?.revision !== undefined && { cloudRevision: cloudState.revision }),
      };
      // Edycja w trakcie syncu podbiła version: zaktualizuj WYŁĄCZNIE znaczniki chmury,
      // NIE czyść dirty ani nie ruszaj treści (lokalna edycja czeka na własny sync).
      if (draft.version !== expectedDraftVersion) {
        return { ...draft, ...cloudMarkers };
      }
      return {
        ...draft,
        dirty: false,
        lastFirebaseSyncAt: syncedAt,
        ...cloudMarkers,
      };
    });
  },

  async markPromotedToRemote(
    userId: string,
    remoteSessionId: string,
    sessionId?: string,
    cloudState?: { updatedAt?: number; revision?: number },
  ): Promise<void> {
    await updateDraft(userId, sessionId, draft => ({
      ...draft,
      sessionId: remoteSessionId,
      sessionOrigin: 'remote',
      remoteSessionId,
      updatedAt: Date.now(),
      version: draft.version + 1,
      ...(cloudState?.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
      ...(cloudState?.revision !== undefined && { cloudRevision: cloudState.revision }),
    }));
  },

  async clearActiveDraft(userId: string, sessionId?: string): Promise<void> {
    await runWrite(null, userId, sessionId);
  },

  // Utrwala fakt serwera (revision/updatedAt) bez ruszania dirty/wersji/treści.
  async setCloudBaseline(
    userId: string,
    sessionId: string,
    cloudState: { updatedAt?: number; revision?: number },
  ): Promise<void> {
    await updateDraft(userId, sessionId, draft => ({
      ...draft,
      ...(cloudState.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
      ...(cloudState.revision !== undefined && { cloudRevision: cloudState.revision }),
    }));
  },

  // Persystuje klucz idempotencji trwającej próby zapisu (null = ack otrzymany).
  async setPendingWrite(
    userId: string,
    sessionId: string,
    pending: { writeId: string; version: number } | null,
  ): Promise<void> {
    await updateDraft(userId, sessionId, draft => ({
      ...draft,
      pendingWriteId: pending ? pending.writeId : null,
      pendingWriteVersion: pending ? pending.version : null,
    }));
  },

  async migrateFromLocalStorage(userId: string): Promise<ActiveWorkoutDraft | null> {
    const existing = await this.loadActiveDraft(userId);
    if (existing) return existing;

    const legacyDraft = workoutDraft.load();
    if (!legacyDraft) return null;

    // Draft starszy niż 48h nie wraca do życia; klucz usuwamy, żeby nie wracał nigdy.
    const MAX_LEGACY_DRAFT_AGE_MS = 48 * 60 * 60 * 1000;
    if (legacyDraft.savedAt && Date.now() - legacyDraft.savedAt > MAX_LEGACY_DRAFT_AGE_MS) {
      workoutDraft.clear();
      return null;
    }

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
