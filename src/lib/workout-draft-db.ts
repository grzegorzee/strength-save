import type { SetData, ExerciseMetrics } from '@/types';
import { workoutDraft } from '@/lib/workout-draft';
import { isProvisionalWorkoutSessionId } from '@/lib/workout-session';
import type { ActiveHealthGrant } from '@/lib/legal-versions';
import type { ExerciseMetricGrants, WorkoutHealthMetricKey } from '@/lib/workout-health-fence';

export const WORKOUT_DRAFT_DB_NAME = 'strength-save-db';
export const WORKOUT_DRAFT_STORE_NAME = 'workoutDrafts';

const DB_VERSION = 2;
const writeChains = new Map<string, Promise<void>>();
const latestWriteVersions = new Map<string, number>();
const promotionAliasCache = new Map<string, string>();

interface PromotionAlias {
  kind: 'promotion-alias';
  userId: string;
  provisionalSessionId: string;
  remoteSessionId: string;
  at: number;
}

// FIX-A T4: typowany błąd totalnego faila zapisu (IDB + retry + localStorage padły).
// Tylko ten błąd oznacza realne zagrożenie danych — UI pokazuje czerwony stan
// wyłącznie na jego podstawie (fallback OK = stan neutralny).
export class DraftSaveTotalFailure extends Error {
  constructor(public stage: 'idb' | 'fallback') {
    super(`draft save failed at ${stage}`);
    this.name = 'DraftSaveTotalFailure';
  }
}

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
  /** Grant per pole z chwili wpisania metryki; nie wolno zastępować go grantem z retry. */
  exerciseMetricGrants?: ExerciseMetricGrants;
  /** Grant jednej oczekującej operacji replace sidecara. */
  pendingHealthGrant?: ActiveHealthGrant | null;
  dayNotes: string;
  dayName?: string;
  dayFocus?: string;
  skippedExercises: string[];
  // Ostatnio dotykane ćwiczenie (odhaczenie serii / metryki) — cel scrolla po hydracji.
  // Opcjonalne pole additive, bez bumpu wersji IndexedDB.
  lastTouchedExerciseId?: string;
  // Odhaczone pozycje rozgrzewki/stretchingu po nameKey (Z162). Pole additive, bez bumpu
  // wersji IndexedDB; NIE wychodzi do Firestore (stan pomocniczy sesji, nie trening).
  warmupChecked?: string[];
  // Swapy "tylko dziś" per planId (Z185). Pole additive, wyłącznie lokalne (IndexedDB +
  // fallback localStorage) — NIE wychodzi do Firestore (rules mają schema-checks).
  // Bez persystencji mapa żyła tylko w stanie Reacta i po restarcie draft renderował
  // dwie karty (plan + swap).
  sessionSwaps?: Record<string, { id: string; name: string; sets: string; videoUrl?: string }>;
  startedAt: number;
  /** Ostatnia realna akcja treningowa (serie/kg/notatki/metryki/skipy) — Z142.
   *  Bumpowana TYLKO przy zmianie treści draftu; snapshoty techniczne (scroll,
   *  finalizedAt, promocja) jej nie ruszają. Opcjonalna: stare drafty bez migracji. */
  lastActivityAt?: number;
  /** Moment potwierdzenia zakończenia. Stabilizuje duration przy retry finalnego syncu. */
  finalizedAt?: number;
  updatedAt: number;
  cloudUpdatedAt?: number;
  cloudRevision?: number;
  lastFirebaseSyncAt: number | null;
  dirty: boolean;
  completedLocally: boolean;
  finalSyncPending: boolean;
  /** Baza jest już w chmurze, lecz prywatny sidecar health czeka na retry. */
  healthSyncPending?: boolean;
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
    // Nowe typy serii (Z105): czas/dystans/asysta przeżywają round-trip przez IndexedDB.
    ...(Number.isFinite(Number(set.durationSec)) && Number(set.durationSec) > 0
      ? { durationSec: Number(set.durationSec) } : {}),
    ...(Number.isFinite(Number(set.distanceM)) && Number(set.distanceM) > 0
      ? { distanceM: Number(set.distanceM) } : {}),
    ...(Number.isFinite(Number(set.assistWeight)) && Number(set.assistWeight) > 0
      ? { assistWeight: Number(set.assistWeight) } : {}),
    ...(Number.isFinite(Number(set.updatedAt)) && Number(set.updatedAt) > 0
      ? { updatedAt: Number(set.updatedAt) } : {}),
    ...(typeof set.updatedEventId === 'string' && set.updatedEventId.length > 0
      ? { updatedEventId: set.updatedEventId.slice(0, 120) } : {}),
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

const normalizeHealthGrant = (value: unknown): ActiveHealthGrant | null => {
  if (!isRecord(value)) return null;
  if (!Number.isSafeInteger(value.healthEpoch) || Number(value.healthEpoch) <= 0) return null;
  if (typeof value.healthGrantId !== 'string' || value.healthGrantId.length === 0) return null;
  return { healthEpoch: Number(value.healthEpoch), healthGrantId: value.healthGrantId };
};

const normalizeExerciseMetricGrants = (value: unknown): ExerciseMetricGrants => {
  if (!isRecord(value)) return {};
  const metricKeys: WorkoutHealthMetricKey[] = ['rpe', 'pain', 'quality'];
  const entries = Object.entries(value).flatMap(([exerciseId, rawFields]) => {
    if (!isRecord(rawFields)) return [];
    const fields: Partial<Record<WorkoutHealthMetricKey, ActiveHealthGrant>> = {};
    metricKeys.forEach((key) => {
      const grant = normalizeHealthGrant(rawFields[key]);
      if (grant) fields[key] = grant;
    });
    return Object.keys(fields).length > 0 ? [[exerciseId, fields] as const] : [];
  });
  return Object.fromEntries(entries);
};

const normalizeStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(item => String(item)) : []
);

const normalizeSessionSwaps = (
  value: unknown,
): Record<string, { id: string; name: string; sets: string; videoUrl?: string }> | undefined => {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .filter(([, swap]) => typeof swap.id === 'string' && typeof swap.name === 'string')
    .map(([planId, swap]) => [planId, {
      id: String(swap.id),
      name: String(swap.name),
      sets: String(swap.sets ?? ''),
      ...(typeof swap.videoUrl === 'string' && { videoUrl: swap.videoUrl }),
    }] as const);
  return Object.fromEntries(entries);
};

const toNumberOr = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getWorkoutDraftKey = (userId: string, sessionId: string): string => `${userId}::${sessionId}`;
const getPromotionAliasIdbKey = (userId: string, provisionalSessionId: string): string => (
  `${userId}::__promotion_alias__:${provisionalSessionId}`
);
const getPromotionAliasCacheKey = (userId: string, provisionalSessionId: string): string => (
  `${userId}::${provisionalSessionId}`
);

const normalizePromotionAlias = (
  value: unknown,
  userId: string,
  provisionalSessionId: string,
): PromotionAlias | null => {
  if (!isRecord(value) || value.kind !== 'promotion-alias') return null;
  if (
    value.userId !== userId
    || value.provisionalSessionId !== provisionalSessionId
    || typeof value.remoteSessionId !== 'string'
    || value.remoteSessionId.length === 0
    || value.remoteSessionId === provisionalSessionId
    || !Number.isFinite(Number(value.at))
  ) return null;
  return {
    kind: 'promotion-alias',
    userId,
    provisionalSessionId,
    remoteSessionId: value.remoteSessionId,
    at: Number(value.at),
  };
};

// Tombstone promocji provisional -> remote (R2-04): zapisy trafiające pod stary klucz
// provisional w oknie promocji (sessionId w React aktualizuje się dopiero po outcome)
// są przekierowywane pod klucz remote zamiast wskrzeszać osierocony draft.
const PROMOTION_TOMBSTONE_PREFIX = 'fittracker_promoted';
const PROMOTION_DISCARD_PREFIX = 'fittracker_promotion_discarded';
const PROMOTION_TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const getPromotionTombstoneKey = (userId: string, provisionalSessionId: string): string => (
  `${PROMOTION_TOMBSTONE_PREFIX}:${userId}:${provisionalSessionId}`
);
const getPromotionDiscardKey = (userId: string, provisionalSessionId: string): string => (
  `${PROMOTION_DISCARD_PREFIX}:${userId}:${provisionalSessionId}`
);

const isPromotionDiscarded = (userId: string, provisionalSessionId: string): boolean => {
  try {
    return localStorage.getItem(getPromotionDiscardKey(userId, provisionalSessionId)) !== null;
  } catch {
    return false;
  }
};

const writePromotionTombstone = (userId: string, provisionalSessionId: string, remoteSessionId: string): void => {
  try {
    // Nowa, jawna promocja tej samej deterministycznej sesji rozpoczyna kolejną
    // generację i unieważnia marker wcześniejszego discardu.
    localStorage.removeItem(getPromotionDiscardKey(userId, provisionalSessionId));
    localStorage.setItem(
      getPromotionTombstoneKey(userId, provisionalSessionId),
      JSON.stringify({ remoteId: remoteSessionId, at: Date.now() }),
    );
    // Sprzątanie przeterminowanych tombstone'ów przy okazji zapisu nowego.
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${PROMOTION_TOMBSTONE_PREFIX}:`)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? '');
        if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > PROMOTION_TOMBSTONE_TTL_MS) {
          stale.push(key);
        }
      } catch {
        stale.push(key);
      }
    }
    stale.forEach(key => localStorage.removeItem(key));
  } catch {
    // best-effort: brak tombstone'a nie blokuje promocji
  }
};

const readPromotionTombstone = (userId: string, provisionalSessionId: string): { remoteId: string } | null => {
  try {
    const key = getPromotionTombstoneKey(userId, provisionalSessionId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.remoteId !== 'string' || typeof parsed.at !== 'number'
      || Date.now() - parsed.at > PROMOTION_TOMBSTONE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return { remoteId: parsed.remoteId };
  } catch {
    return null;
  }
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
    ...(value.exerciseMetricGrants !== undefined && {
      exerciseMetricGrants: normalizeExerciseMetricGrants(value.exerciseMetricGrants),
    }),
    ...(value.pendingHealthGrant !== undefined && {
      pendingHealthGrant: normalizeHealthGrant(value.pendingHealthGrant),
    }),
    dayNotes: String(value.dayNotes ?? ''),
    ...(value.dayName !== undefined && { dayName: String(value.dayName) }),
    ...(value.dayFocus !== undefined && { dayFocus: String(value.dayFocus) }),
    skippedExercises: normalizeStringArray(value.skippedExercises),
    ...(typeof value.lastTouchedExerciseId === 'string' && { lastTouchedExerciseId: value.lastTouchedExerciseId }),
    ...(Array.isArray(value.warmupChecked) && {
      warmupChecked: value.warmupChecked.filter((key): key is string => typeof key === 'string'),
    }),
    ...(value.sessionSwaps !== undefined && (() => {
      const swaps = normalizeSessionSwaps(value.sessionSwaps);
      return swaps !== undefined ? { sessionSwaps: swaps } : {};
    })()),
    startedAt: toNumberOr(value.startedAt, now),
    ...(value.lastActivityAt !== undefined && { lastActivityAt: toNumberOr(value.lastActivityAt, now) }),
    ...(value.finalizedAt !== undefined && { finalizedAt: toNumberOr(value.finalizedAt, now) }),
    updatedAt: toNumberOr(value.updatedAt, now),
    ...(value.cloudUpdatedAt !== undefined && { cloudUpdatedAt: toNumberOr(value.cloudUpdatedAt, now) }),
    ...(value.cloudRevision !== undefined && { cloudRevision: Math.max(0, Math.round(toNumberOr(value.cloudRevision, 0))) }),
    lastFirebaseSyncAt: value.lastFirebaseSyncAt == null ? null : toNumberOr(value.lastFirebaseSyncAt, now),
    dirty: !!value.dirty,
    completedLocally: !!value.completedLocally,
    finalSyncPending: !!value.finalSyncPending,
    ...(value.healthSyncPending === true && { healthSyncPending: true }),
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

const normalizeFallbackDraft = (draft: import('@/lib/workout-draft').WorkoutDraft, userId: string): ActiveWorkoutDraft | null => (
  normalizeDraft({
    ...draft,
    userId,
    cycleId: draft.cycleId ?? null,
    sessionOrigin: draft.sessionOrigin
      ?? (isProvisionalWorkoutSessionId(draft.sessionId) ? 'provisional' : 'remote'),
    remoteSessionId: draft.remoteSessionId ?? null,
    startedAt: draft.startedAt ?? draft.savedAt,
    ...(draft.lastActivityAt != null && { lastActivityAt: draft.lastActivityAt }),
    ...(draft.finalizedAt != null && { finalizedAt: draft.finalizedAt }),
    updatedAt: draft.savedAt,
    lastFirebaseSyncAt: draft.lastFirebaseSyncAt ?? null,
    dirty: draft.dirty ?? true,
    completedLocally: draft.completedLocally ?? false,
    finalSyncPending: draft.finalSyncPending ?? false,
    version: draft.version ?? 1,
    ...(draft.cloudRevision != null && { cloudRevision: draft.cloudRevision }),
    ...(draft.cloudUpdatedAt != null && { cloudUpdatedAt: draft.cloudUpdatedAt }),
  })
);

const withFallbackLoads = (userId: string): ActiveWorkoutDraft[] => (
  workoutDraft.loadAll(userId)
    .map(draft => normalizeFallbackDraft(draft, userId))
    .filter((draft): draft is ActiveWorkoutDraft => draft !== null)
);

const withFallbackLoad = (userId: string, sessionId?: string): ActiveWorkoutDraft | null => {
  const drafts = withFallbackLoads(userId);
  return sessionId
    ? drafts.find(draft => draft.sessionId === sessionId) ?? null
    : pickActiveDraft(drafts);
};

const withFallbackSave = (draft: ActiveWorkoutDraft): void => {
  const current = withFallbackLoad(draft.userId, draft.sessionId);
  const currentIsNewer = !!current && (
    current.version > draft.version
    || (current.version === draft.version && current.updatedAt > draft.updatedAt)
  );
  if (currentIsNewer) return;

  const saved = workoutDraft.save({
    sessionId: draft.sessionId,
    dayId: draft.dayId,
    date: draft.date,
    cycleId: draft.cycleId,
    sessionOrigin: draft.sessionOrigin,
    remoteSessionId: draft.remoteSessionId,
    exerciseSets: draft.exerciseSets,
    exerciseNotes: draft.exerciseNotes,
    // Bug 13 (X30): metryki, snapshoty nazw i klucz idempotencji zapisu też
    // przeżywają round-trip przez fallback (asymetria vs normalizeDraft była
    // przeoczeniem — wzorzec Z162/Z185/incydent 180 s).
    exerciseMetrics: draft.exerciseMetrics,
    ...(draft.exerciseMetricGrants !== undefined && { exerciseMetricGrants: draft.exerciseMetricGrants }),
    ...(draft.pendingHealthGrant !== undefined && { pendingHealthGrant: draft.pendingHealthGrant }),
    ...(draft.exerciseNames !== undefined && { exerciseNames: draft.exerciseNames }),
    dayNotes: draft.dayNotes,
    ...(draft.dayName !== undefined && { dayName: draft.dayName }),
    ...(draft.dayFocus !== undefined && { dayFocus: draft.dayFocus }),
    skippedExercises: draft.skippedExercises,
    ...(draft.lastTouchedExerciseId !== undefined && { lastTouchedExerciseId: draft.lastTouchedExerciseId }),
    ...(draft.warmupChecked !== undefined && { warmupChecked: draft.warmupChecked }),
    ...(draft.sessionSwaps !== undefined && { sessionSwaps: draft.sessionSwaps }),
    savedAt: draft.updatedAt,
    ...(draft.cloudRevision != null && { cloudRevision: draft.cloudRevision }),
    ...(draft.cloudUpdatedAt != null && { cloudUpdatedAt: draft.cloudUpdatedAt }),
    version: draft.version,
    // Znaczniki czasu sesji — patrz komentarz w WorkoutDraft (incydent 180 s).
    ...(draft.startedAt !== undefined && { startedAt: draft.startedAt }),
    ...(draft.lastActivityAt !== undefined && { lastActivityAt: draft.lastActivityAt }),
    ...(draft.finalizedAt !== undefined && { finalizedAt: draft.finalizedAt }),
    // Kontrakt R2-01 (bug 13, X30): pendingWrite* przeżywają flush przez fallback.
    ...(draft.pendingWriteId != null && { pendingWriteId: draft.pendingWriteId }),
    ...(draft.pendingWriteVersion != null && { pendingWriteVersion: draft.pendingWriteVersion }),
    lastFirebaseSyncAt: draft.lastFirebaseSyncAt,
    dirty: draft.dirty,
    completedLocally: draft.completedLocally,
    finalSyncPending: draft.finalSyncPending,
    ...(draft.healthSyncPending === true && { healthSyncPending: true }),
  }, draft.userId);
  if (!saved) {
    throw new Error('LOCAL_STORAGE_SAVE_FAILED');
  }
};

// Singleton połączenia IDB (R2-23): open per operacja mnożył połączenia i pracę
// przeglądarki. Po powrocie z tła iOS potrafi zerwać połączenie — handlery
// onclose/onversionchange czyszczą cache, następna operacja otwiera świeże.
let cachedDatabase: IDBDatabase | null = null;
let cachedDatabasePromise: Promise<IDBDatabase | null> | null = null;

const resetDatabaseConnection = (): void => {
  cachedDatabase = null;
  cachedDatabasePromise = null;
};

export const __resetWorkoutDraftDbConnectionForTests = (): void => {
  resetDatabaseConnection();
  promotionAliasCache.clear();
};

const resetCachedDatabase = (db: IDBDatabase): void => {
  if (cachedDatabase === db) cachedDatabase = null;
};

const openDatabase = (): Promise<IDBDatabase | null> => {
  if (cachedDatabase) return Promise.resolve(cachedDatabase);
  if (cachedDatabasePromise) return cachedDatabasePromise;
  cachedDatabasePromise = openDatabaseConnection().then((db) => {
    cachedDatabasePromise = null;
    if (db) cachedDatabase = db;
    return db;
  }, (error) => {
    cachedDatabasePromise = null;
    throw error;
  });
  return cachedDatabasePromise;
};

const openDatabaseConnection = (): Promise<IDBDatabase | null> => new Promise((resolve, reject) => {
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

  request.onsuccess = () => {
    const db = request.result;
    db.onclose = () => resetCachedDatabase(db);
    db.onversionchange = () => {
      resetCachedDatabase(db);
      try {
        db.close();
      } catch {
        // połączenie mogło już zostać zamknięte przez przeglądarkę
      }
    };
    resolve(db);
  };
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

const runReadPromotionAlias = async (
  userId: string,
  provisionalSessionId: string,
): Promise<string | null> => {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readonly');
    const request = tx.objectStore(WORKOUT_DRAFT_STORE_NAME)
      .get(getPromotionAliasIdbKey(userId, provisionalSessionId));
    request.onsuccess = () => {
      resolve(normalizePromotionAlias(request.result, userId, provisionalSessionId)?.remoteSessionId ?? null);
    };
    request.onerror = () => reject(request.error);
  });
};

// Po resume WKWebView potrafi zostawić obiekt połączenia, który istnieje, ale
// pierwsza transakcja kończy się InvalidStateError/TransactionInactiveError.
// Dokładnie jedna próba na świeżym open() poprzedza istniejący fallback; brak
// pętli chroni przed blokowaniem UI przy trwałej awarii IndexedDB.
const runReadWithFreshConnectionRetry = async <T>(read: () => Promise<T>): Promise<T> => {
  try {
    return await read();
  } catch {
    resetDatabaseConnection();
    return read();
  }
};

const resolvePromotionAlias = async (userId: string, provisionalSessionId: string): Promise<string | null> => {
  const cacheKey = getPromotionAliasCacheKey(userId, provisionalSessionId);
  if (isPromotionDiscarded(userId, provisionalSessionId)) {
    promotionAliasCache.delete(cacheKey);
    return null;
  }
  const synchronousAlias = promotionAliasCache.get(cacheKey)
    ?? readPromotionTombstone(userId, provisionalSessionId)?.remoteId;
  if (synchronousAlias) {
    promotionAliasCache.set(cacheKey, synchronousAlias);
    return synchronousAlias;
  }

  try {
    const remoteId = await runReadWithFreshConnectionRetry(
      () => runReadPromotionAlias(userId, provisionalSessionId),
    );
    if (remoteId) {
      promotionAliasCache.set(cacheKey, remoteId);
      // localStorage pozostaje szybkim cache i fallbackiem dla braku IDB.
      writePromotionTombstone(userId, provisionalSessionId, remoteId);
    }
    return remoteId;
  } catch {
    return null;
  }
};

/** Świadomy discard/delete kończy generację deterministycznego provisional ID.
 * Automatyczny cleanup po finalnym ACK nie używa tej funkcji — jego alias nadal
 * chroni przed spóźnionymi callbackami starego ekranu. */
const clearPromotionAliasesForDiscard = async (userId: string, sessionId: string): Promise<Set<string>> => {
  const matchingProvisionalIds = new Set<string>();
  const relatedSessionIds = new Set<string>([sessionId]);
  if (sessionId.startsWith('workout-')) matchingProvisionalIds.add(`local-${sessionId}`);
  const tombstonePrefix = `${PROMOTION_TOMBSTONE_PREFIX}:${userId}:`;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(tombstonePrefix)) continue;
    const provisionalId = key.slice(tombstonePrefix.length);
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '') as { remoteId?: unknown };
      if (provisionalId === sessionId || parsed.remoteId === sessionId) {
        matchingProvisionalIds.add(provisionalId);
        if (typeof parsed.remoteId === 'string') relatedSessionIds.add(parsed.remoteId);
      }
    } catch {
      if (provisionalId === sessionId) matchingProvisionalIds.add(provisionalId);
    }
  }
  for (const [cacheKey, remoteId] of promotionAliasCache) {
    if (!cacheKey.startsWith(`${userId}::`)) continue;
    const provisionalId = cacheKey.slice(`${userId}::`.length);
    if (provisionalId === sessionId || remoteId === sessionId) {
      matchingProvisionalIds.add(provisionalId);
      relatedSessionIds.add(remoteId);
    }
  }

  const db = await openDatabase();
  if (db) await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const request = store.getAll();
    let hasDeletes = false;

    request.onsuccess = () => {
      const aliases = (Array.isArray(request.result) ? request.result : [])
        .filter((value): value is PromotionAlias => (
          isRecord(value)
          && value.kind === 'promotion-alias'
          && value.userId === userId
          && typeof value.provisionalSessionId === 'string'
          && typeof value.remoteSessionId === 'string'
          && (value.provisionalSessionId === sessionId || value.remoteSessionId === sessionId)
        ));
      aliases.forEach(alias => matchingProvisionalIds.add(alias.provisionalSessionId));
      aliases.forEach(alias => relatedSessionIds.add(alias.remoteSessionId));
      try {
        matchingProvisionalIds.forEach((provisionalId) => {
          localStorage.setItem(getPromotionDiscardKey(userId, provisionalId), String(Date.now()));
          localStorage.removeItem(getPromotionTombstoneKey(userId, provisionalId));
        });
      } catch {
        reject(new Error('PROMOTION_ALIAS_CLEAR_LOCAL_STORAGE_FAILED'));
        return;
      }
      aliases.forEach((alias) => {
        hasDeletes = true;
        store.delete(getPromotionAliasIdbKey(userId, alias.provisionalSessionId));
      });
      if (!hasDeletes) resolve();
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  if (!db) {
    matchingProvisionalIds.forEach((provisionalId) => {
      localStorage.setItem(getPromotionDiscardKey(userId, provisionalId), String(Date.now()));
      localStorage.removeItem(getPromotionTombstoneKey(userId, provisionalId));
    });
  }

  matchingProvisionalIds.forEach((provisionalId) => {
    promotionAliasCache.delete(getPromotionAliasCacheKey(userId, provisionalId));
    relatedSessionIds.add(provisionalId);
  });
  return relatedSessionIds;
};

const clearFallbackCopyIfMatches = (userId: string, sessionId?: string): boolean => {
  try {
    const copy = sessionId
      ? workoutDraft.loadSession(sessionId, userId)
      : workoutDraft.load(userId);
    if (!copy) return true;
    return workoutDraft.clearSession(copy.sessionId, userId);
  } catch {
    return false;
  }
};

const runWrite = async (
  value: ActiveWorkoutDraft | null,
  userId: string,
  sessionId?: string,
  options?: { skipIfNewerExists?: boolean },
): Promise<void> => {
  const db = await openDatabase();
  if (!db) {
    if (value) {
      withFallbackSave(value);
    } else {
      const fallback = withFallbackLoad(userId, sessionId);
      if (fallback && !workoutDraft.clearSession(fallback.sessionId, userId)) {
        throw new Error('LOCAL_STORAGE_CLEAR_FAILED');
      }
    }
    return;
  }

  // Najpierw wymagamy usunięcia journalu. Jeśli localStorage chwilowo odmawia,
  // rekord IDB zostaje i operację można bezpiecznie ponowić; odwrotna kolejność
  // tworzyłaby zombie po restarcie z jedynej, starej kopii fallback.
  if (!value && sessionId && !clearFallbackCopyIfMatches(userId, sessionId)) {
    throw new Error('LOCAL_STORAGE_CLEAR_FAILED');
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    if (value) {
      if (sessionId && sessionId !== value.sessionId) {
        store.delete(getWorkoutDraftKey(userId, sessionId));
      }
      const targetKey = getWorkoutDraftKey(value.userId, value.sessionId);
      if (options?.skipIfNewerExists) {
        // Z175: read-before-write w TEJ SAMEJ transakcji — świeży stan (np. autostart
        // z kafla, version=1) nie może nadpisać żywego draftu z odhaczeniami.
        // Mapa latestWriteVersions chroni tylko wyścigi w obrębie strony; po reloadzie
        // WebView jest pusta i jedyną prawdą o wersji jest rekord w IDB.
        const getRequest = store.get(targetKey);
        getRequest.onsuccess = () => {
          const existing = normalizeDraft(getRequest.result, value.userId);
          if (existing && existing.version > value.version) {
            // Nie nadpisujemy; resolve wprost — transakcja bez writa nie w każdym
            // driverze strzela oncomplete.
            resolve();
            return;
          }
          store.put(value, targetKey);
        };
        getRequest.onerror = () => reject(getRequest.error);
      } else {
        store.put(value, targetKey);
      }
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

  // Fallback został usunięty przed IDB. Jeśli delete IDB zawiedzie, pozostaje
  // bezpieczna kopia do ponownego cleanupu zamiast utraty ostatniego rekordu.
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
    const current = withFallbackLoad(userId, sessionId);
    if (!current) return;
    const next = updater(current);
    if (next) {
      withFallbackSave(next);
    } else if (!workoutDraft.clearSession(sessionId, userId)) {
      throw new Error('LOCAL_STORAGE_CLEAR_FAILED');
    }
    return;
  }

  let mirrored: ActiveWorkoutDraft | null | undefined;
  let previousSessionId = sessionId;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const key = getWorkoutDraftKey(userId, sessionId);
    const request = store.get(key);

    request.onsuccess = () => {
      const current = mergeDraftRecord(
        normalizeDraft(request.result, userId),
        withFallbackLoad(userId, sessionId),
      );
      if (!current || current.userId !== userId) return;
      previousSessionId = current.sessionId;
      const next = updater(current);
      mirrored = next;
      if (!next) {
        if (!workoutDraft.clearSession(current.sessionId, userId)) {
          reject(new Error('LOCAL_STORAGE_CLEAR_FAILED'));
          return;
        }
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

  // Journal odzwierciedla dopiero zatwierdzoną transakcję. Dzięki temu update
  // znaczników syncu (pendingWrite/cloudRevision/final) przeżywa późniejszą
  // utratę połączenia IDB, ale rollback transakcji nie zatruwa fallbacku.
  if (mirrored === undefined) return;
  if (mirrored) {
    withFallbackSave(mirrored);
    if (mirrored.sessionId !== previousSessionId) {
      workoutDraft.clearSession(previousSessionId, userId);
    }
  }
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

// Czysta logika merge promocji: nowsza treść wygrywa (orphan nie cofa trwającego
// treningu), znaczniki chmury zawsze świeże (R2-04). Używana w runPromote i testach E2E.
export const mergePromotedDraft = (
  fromDraft: ActiveWorkoutDraft | null,
  remoteDraft: ActiveWorkoutDraft | null,
  remoteSessionId: string,
  cloudState?: { updatedAt?: number; revision?: number },
): ActiveWorkoutDraft | null => {
  const cloudMarkers = {
    ...(cloudState?.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
    ...(cloudState?.revision !== undefined && { cloudRevision: cloudState.revision }),
  };
  if (!fromDraft && !remoteDraft) return null;
  if (fromDraft && remoteDraft && remoteDraft.version > fromDraft.version) {
    return { ...remoteDraft, ...cloudMarkers };
  }
  if (fromDraft) {
    return {
      ...fromDraft,
      sessionId: remoteSessionId,
      sessionOrigin: 'remote',
      remoteSessionId,
      updatedAt: Date.now(),
      version: (remoteDraft ? Math.max(remoteDraft.version, fromDraft.version) : fromDraft.version) + 1,
      ...cloudMarkers,
    };
  }
  return { ...(remoteDraft as ActiveWorkoutDraft), ...cloudMarkers };
};

// Promocja provisional -> remote w JEDNEJ transakcji na obu kluczach: nowsza treść
// wygrywa (orphan nie cofa trwającego treningu), znaczniki chmury zawsze świeże (R2-04).
const runPromote = async (
  userId: string,
  fromSessionId: string,
  remoteSessionId: string,
  cloudState?: { updatedAt?: number; revision?: number },
): Promise<void> => {
  const cloudMarkers = {
    ...(cloudState?.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
    ...(cloudState?.revision !== undefined && { cloudRevision: cloudState.revision }),
  };

  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
  } catch {
    db = null;
  }

  if (!db) {
    const next = mergePromotedDraft(
      withFallbackLoad(userId, fromSessionId),
      withFallbackLoad(userId, remoteSessionId),
      remoteSessionId,
      cloudState,
    );
    if (next) withFallbackSave(next);
    workoutDraft.clearSession(fromSessionId, userId);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const fromKey = getWorkoutDraftKey(userId, fromSessionId);
    const remoteKey = getWorkoutDraftKey(userId, remoteSessionId);
    const aliasKey = getPromotionAliasIdbKey(userId, fromSessionId);
    const alias: PromotionAlias = {
      kind: 'promotion-alias',
      userId,
      provisionalSessionId: fromSessionId,
      remoteSessionId,
      at: Date.now(),
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    const fromRequest = store.get(fromKey);
    fromRequest.onsuccess = () => {
      const fromDraft = normalizeDraft(fromRequest.result, userId);
      const remoteRequest = store.get(remoteKey);
      remoteRequest.onsuccess = () => {
        const remoteDraft = normalizeDraft(remoteRequest.result, userId);
        const next = mergePromotedDraft(fromDraft, remoteDraft, remoteSessionId, cloudState);
        if (fromDraft) store.delete(fromKey);
        if (next) store.put(next, remoteKey);
        // Ten sam commit przenosi draft i utrwala dokładne mapowanie P→R.
        store.put(alias, aliasKey);
      };
      remoteRequest.onerror = () => reject(remoteRequest.error);
    };
    fromRequest.onerror = () => reject(fromRequest.error);
  });
};

// Zapis pod klucz provisional po promocji: przekierowanie pod klucz remote z merge
// po version (stale zapis sprzed promocji nie cofa treści; brak rekordu remote =
// sesja domknięta, nie wskrzeszamy draftu).
const redirectDraftSave = async (
  incoming: ActiveWorkoutDraft,
  remoteSessionId: string,
): Promise<ActiveWorkoutDraft | null> => {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
  } catch {
    db = null;
  }

  if (!db) {
    const current = withFallbackLoad(incoming.userId, remoteSessionId);
    // Alias przeżywa finalny cleanup. Brak rekordu remote oznacza sesję domkniętą,
    // więc stary ekran nie może jej wskrzesić samym spóźnionym autosave.
    if (!current) return null;
    if (current.version > incoming.version) return current;
    const next: ActiveWorkoutDraft = {
      ...incoming,
      sessionId: remoteSessionId,
      sessionOrigin: 'remote',
      remoteSessionId,
      ...(current && current.sessionId === remoteSessionId && {
        ...(current.cloudRevision !== undefined && { cloudRevision: current.cloudRevision }),
        ...(current.cloudUpdatedAt !== undefined && { cloudUpdatedAt: current.cloudUpdatedAt }),
      }),
    };
    withFallbackSave(next);
    return next;
  }

  return new Promise<ActiveWorkoutDraft | null>((resolve, reject) => {
    const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
    const remoteKey = getWorkoutDraftKey(incoming.userId, remoteSessionId);
    const request = store.get(remoteKey);

    request.onsuccess = () => {
      const existing = normalizeDraft(request.result, incoming.userId);
      if (!existing) {
        resolve(null);
        return;
      }
      if (incoming.version < existing.version) {
        resolve(existing);
        return;
      }
      const next: ActiveWorkoutDraft = {
        ...existing,
        exerciseSets: incoming.exerciseSets,
        exerciseNotes: incoming.exerciseNotes,
        exerciseMetrics: incoming.exerciseMetrics,
        ...(incoming.exerciseMetricGrants !== undefined && { exerciseMetricGrants: incoming.exerciseMetricGrants }),
        ...(incoming.pendingHealthGrant !== undefined && { pendingHealthGrant: incoming.pendingHealthGrant }),
        ...(incoming.exerciseNames !== undefined && { exerciseNames: incoming.exerciseNames }),
        dayNotes: incoming.dayNotes,
        ...(incoming.dayName !== undefined && { dayName: incoming.dayName }),
        ...(incoming.dayFocus !== undefined && { dayFocus: incoming.dayFocus }),
        skippedExercises: incoming.skippedExercises,
        // Bug 20 (X30): pola pomocnicze sesji też jadą z incoming — redirect był
        // jedyną ścieżką merge, która je gubiła (resolveFresherFallback i
        // mergePromotedDraft przenoszą je od zawsze). Najgroźniejszy był swap
        // "tylko dziś": utrata utrwalała się do końca sesji przez activeDraftRef.
        ...(incoming.warmupChecked !== undefined && { warmupChecked: incoming.warmupChecked }),
        ...(incoming.sessionSwaps !== undefined && { sessionSwaps: incoming.sessionSwaps }),
        ...(incoming.lastTouchedExerciseId !== undefined && { lastTouchedExerciseId: incoming.lastTouchedExerciseId }),
        ...(incoming.lastActivityAt !== undefined && { lastActivityAt: incoming.lastActivityAt }),
        completedLocally: incoming.completedLocally || existing.completedLocally,
        finalSyncPending: incoming.finalSyncPending || existing.finalSyncPending,
        ...((incoming.healthSyncPending || existing.healthSyncPending) && { healthSyncPending: true }),
        ...(incoming.finalizedAt !== undefined && { finalizedAt: incoming.finalizedAt }),
        updatedAt: incoming.updatedAt,
        dirty: true,
        version: Math.max(existing.version, incoming.version) + 1,
      };
      store.put(next, remoteKey);
      tx.oncomplete = () => resolve(next);
    };
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

// Z182: fallback localStorage może być NOWSZY niż rekord IDB (zapis awaryjny tuż przed
// kill trafia do fallbacku, gdy IDB zawiedzie w połowie sesji, a po restarcie IDB znów
// działa ze STARSZYM snapshotem). Najświeższy wygrywa: wyższa version, przy równych
// tiebreaker nowszy updatedAt. Pełny remis wybiera journal, bo operacje syncu
// (pendingWrite/ACK/cloudRevision) celowo nie zmieniają wersji treści ani updatedAt.
const mergeDraftRecord = (
  idbRecord: ActiveWorkoutDraft | null,
  fallback: ActiveWorkoutDraft | null,
): ActiveWorkoutDraft | null => {
  if (!idbRecord) return fallback;
  if (!fallback) return idbRecord;
  const fallbackAtLeastAsFresh = fallback.version > idbRecord.version
    || (fallback.version === idbRecord.version && fallback.updatedAt >= idbRecord.updatedAt);
  if (!fallbackAtLeastAsFresh) return idbRecord;
  const merged: ActiveWorkoutDraft = {
    ...idbRecord,
    // Tożsamość z nowego fallbacku wygrywa po promocji/awarii IDB. Dla starych
    // fallbacków wartości null nie kasują kompletnego rekordu IndexedDB.
    ...(fallback.cycleId !== null && { cycleId: fallback.cycleId }),
    sessionOrigin: fallback.sessionOrigin,
    ...(fallback.remoteSessionId !== null && { remoteSessionId: fallback.remoteSessionId }),
    exerciseSets: fallback.exerciseSets,
    exerciseNotes: fallback.exerciseNotes,
    // Bug 13 (X30): metryki i nazwy mergowane PER KLUCZ ćwiczenia — wpisy ze
    // świeższego fallbacku wygrywają, klucze znane tylko staremu rekordowi IDB
    // zostają (fallback w starym formacie = pusta mapa, nic nie nadpisze).
    exerciseMetrics: { ...idbRecord.exerciseMetrics, ...fallback.exerciseMetrics },
    ...((idbRecord.exerciseMetricGrants !== undefined || fallback.exerciseMetricGrants !== undefined) && {
      exerciseMetricGrants: {
        ...(idbRecord.exerciseMetricGrants ?? {}),
        ...(fallback.exerciseMetricGrants ?? {}),
      },
    }),
    ...(fallback.pendingHealthGrant !== undefined && { pendingHealthGrant: fallback.pendingHealthGrant }),
    ...((idbRecord.exerciseNames !== undefined || fallback.exerciseNames !== undefined) && {
      exerciseNames: { ...(idbRecord.exerciseNames ?? {}), ...(fallback.exerciseNames ?? {}) },
    }),
    dayNotes: fallback.dayNotes,
    ...(fallback.dayName !== undefined && { dayName: fallback.dayName }),
    ...(fallback.dayFocus !== undefined && { dayFocus: fallback.dayFocus }),
    skippedExercises: fallback.skippedExercises,
    ...(fallback.lastTouchedExerciseId !== undefined && {
      lastTouchedExerciseId: fallback.lastTouchedExerciseId,
    }),
    ...(fallback.warmupChecked !== undefined && { warmupChecked: fallback.warmupChecked }),
    ...(fallback.sessionSwaps !== undefined && { sessionSwaps: fallback.sessionSwaps }),
    ...(fallback.cloudRevision !== undefined && { cloudRevision: fallback.cloudRevision }),
    ...(fallback.cloudUpdatedAt !== undefined && { cloudUpdatedAt: fallback.cloudUpdatedAt }),
    // Znaczniki aktywności ze świeższego fallbacku (incydent 180 s): stary rekord
    // IDB niesie lastActivityAt z momentu, gdy IDB jeszcze żyło — czyli z początku
    // sesji. startedAt celowo z IDB (stabilny od startu; stare fallbacki bez pola
    // fałszowałyby go przez savedAt).
    ...(fallback.lastActivityAt !== undefined && { lastActivityAt: fallback.lastActivityAt }),
    ...(fallback.finalizedAt !== undefined && { finalizedAt: fallback.finalizedAt }),
    // Kontrakt R2-01 (bug 13, X30): klucz idempotencji z NOWSZEGO snapshotu —
    // retry checkpointu po lost-ack idzie ze starym writeId, nie z nowym.
    lastFirebaseSyncAt: fallback.lastFirebaseSyncAt,
    // Finalizacja jest monotoniczna do czasu jawnego usunięcia draftu. Pełny remis
    // wybiera journal dla ACK/pendingWrite, ale nie może cofnąć finalizacji, która
    // zdążyła zatwierdzić się w IDB przed nieudanym mirrorem localStorage.
    completedLocally: idbRecord.completedLocally || fallback.completedLocally,
    finalSyncPending: idbRecord.finalSyncPending || fallback.finalSyncPending,
    updatedAt: fallback.updatedAt,
    dirty: fallback.dirty,
    version: fallback.version,
  };
  if (fallback.pendingWriteId !== undefined) merged.pendingWriteId = fallback.pendingWriteId;
  else delete merged.pendingWriteId;
  if (fallback.pendingWriteVersion !== undefined) merged.pendingWriteVersion = fallback.pendingWriteVersion;
  else delete merged.pendingWriteVersion;
  if (fallback.healthSyncPending === true) merged.healthSyncPending = true;
  else delete merged.healthSyncPending;
  return merged;
};

const mergeDraftLists = (
  idbDrafts: ActiveWorkoutDraft[],
  fallbackDrafts: ActiveWorkoutDraft[],
): ActiveWorkoutDraft[] => {
  const sessionIds = new Set([
    ...idbDrafts.map(draft => draft.sessionId),
    ...fallbackDrafts.map(draft => draft.sessionId),
  ]);
  return [...sessionIds].flatMap((sessionId) => {
    const merged = mergeDraftRecord(
      idbDrafts.find(draft => draft.sessionId === sessionId) ?? null,
      fallbackDrafts.find(draft => draft.sessionId === sessionId) ?? null,
    );
    return merged ? [merged] : [];
  });
};

export const workoutDraftDb = {
  isSupported(): boolean {
    return getIndexedDb() !== null;
  },

  // Crash guard nie może czekać na IndexedDB ani retry: reload strony następuje
  // synchronicznie po asercji SDK. Ten zapis używa wyłącznie istniejącego,
  // scopingowanego per-user fallbacku i nie dotyka chmury.
  saveEmergencyFallback(draft: ActiveWorkoutDraft): boolean {
    const normalized = normalizeDraft(draft, draft.userId);
    if (!normalized) return false;
    try {
      withFallbackSave(normalized);
      return true;
    } catch {
      return false;
    }
  },

  async loadActiveDraft(userId: string): Promise<ActiveWorkoutDraft | null> {
    if (!this.isSupported()) {
      return withFallbackLoad(userId);
    }

    try {
      const records = await runReadWithFreshConnectionRetry(() => runReadAll(userId));
      const picked = pickActiveDraft(mergeDraftLists(records, withFallbackLoads(userId)));
      const idbRecord = picked
        ? records.find(record => record.sessionId === picked.sessionId) ?? null
        : null;
      if (picked && picked !== idbRecord) {
        await runWrite(picked, userId, undefined, { skipIfNewerExists: true }).catch(() => undefined);
      }
      return picked;
    } catch {
      return withFallbackLoad(userId);
    }
  },

  async loadDraft(userId: string, sessionId: string): Promise<ActiveWorkoutDraft | null> {
    if (!this.isSupported()) {
      return withFallbackLoad(userId, sessionId);
    }

    try {
      const record = await runReadWithFreshConnectionRetry(() => runRead(userId, sessionId));
      const merged = mergeDraftRecord(record, withFallbackLoad(userId, sessionId));
      if (merged && merged !== record) {
        await runWrite(merged, userId, undefined, { skipIfNewerExists: true }).catch(() => undefined);
      }
      return merged;
    } catch {
      return withFallbackLoad(userId, sessionId);
    }
  },

  // Bug 4 (X30): wybór draftu PER STRONA treningu (dayId+date) zamiast globalnego
  // picku. Niezmiennik z incydentu 2026-07-20: żywa sesja planu jest bazą — nowszy
  // porzucony adhoc nie ma prawa jej przysłonić przy wejściu bez ?session.
  // Brak draftu strony => null (caller decyduje o fallbacku na globalny pick).
  async loadDraftForDay(userId: string, dayId: string, date: string): Promise<ActiveWorkoutDraft | null> {
    const drafts = await this.listDrafts(userId);
    return pickActiveDraft(drafts.filter(draft => draft.dayId === dayId && draft.date === date));
  },

  async listDrafts(userId: string): Promise<ActiveWorkoutDraft[]> {
    if (!this.isSupported()) {
      return withFallbackLoads(userId);
    }

    try {
      const records = await runReadWithFreshConnectionRetry(() => runReadAll(userId));
      return mergeDraftLists(records, withFallbackLoads(userId));
    } catch {
      return withFallbackLoads(userId);
    }
  },

  async saveActiveDraft(draft: ActiveWorkoutDraft): Promise<void> {
    const normalized = normalizeDraft(draft, draft.userId);
    if (!normalized) return;

    // Force quit nie czeka na IndexedDB ani na pierwszy microtask. Journal jest
    // aktualizowany w tej samej klatce wywołania, zanim pojawi się jakikolwiek await.
    // Znany tombstone/cache promocji od razu kieruje snapshot pod remote.
    const synchronousRemoteId = (normalized.sessionOrigin === 'provisional'
      || isProvisionalWorkoutSessionId(normalized.sessionId))
      ? promotionAliasCache.get(getPromotionAliasCacheKey(normalized.userId, normalized.sessionId))
        ?? readPromotionTombstone(normalized.userId, normalized.sessionId)?.remoteId
      : null;
    const synchronousSnapshot = synchronousRemoteId
      ? {
        ...normalized,
        sessionId: synchronousRemoteId,
        sessionOrigin: 'remote' as const,
        remoteSessionId: synchronousRemoteId,
      }
      : normalized;
    try {
      const mayPersistSnapshot = !synchronousRemoteId
        || withFallbackLoad(normalized.userId, synchronousRemoteId) !== null;
      if (mayPersistSnapshot) withFallbackSave(synchronousSnapshot);
      if (synchronousRemoteId) workoutDraft.clearSession(normalized.sessionId, normalized.userId);
    } catch {
      // IDB nadal może uratować zapis; total failure jest raportowany dopiero po
      // wyczerpaniu istniejącego retry i ponownej próbie fallbacku.
    }

    // Okno promocji provisional -> remote: zapis pod stary klucz przekierowany
    // pod klucz remote (tombstone), zamiast wskrzeszać osierocony draft (R2-04).
    if (normalized.sessionOrigin === 'provisional' || isProvisionalWorkoutSessionId(normalized.sessionId)) {
      const promotedRemoteId = await resolvePromotionAlias(normalized.userId, normalized.sessionId);
      if (promotedRemoteId && promotedRemoteId !== normalized.sessionId) {
        workoutDraft.clearSession(normalized.sessionId, normalized.userId);
        const remoteKey = getWorkoutDraftKey(normalized.userId, promotedRemoteId);
        const previous = writeChains.get(remoteKey) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(() => redirectDraftSave(normalized, promotedRemoteId));
        const chain = run.then(() => undefined, () => undefined).finally(() => {
          if (writeChains.get(remoteKey) === chain) writeChains.delete(remoteKey);
        });
        writeChains.set(remoteKey, chain);
        const redirected = await run;
        if (redirected) {
          try {
            withFallbackSave(redirected);
          } catch {
            // IDB jest źródłem odzyskania, jeśli localStorage nie przyjęło kopii.
          }
        }
        return;
      }
    }

    const key = getWorkoutDraftKey(normalized.userId, normalized.sessionId);
    const highestVersion = latestWriteVersions.get(key) ?? 0;
    if (normalized.version < highestVersion) return;
    latestWriteVersions.set(key, normalized.version);
    const previous = writeChains.get(key) ?? Promise.resolve();
    const write = previous.then(async () => {
      if (normalized.version < (latestWriteVersions.get(key) ?? normalized.version)) return;
      // Bug 38 (X30): tombstone promocji może powstać JUŻ PO synchronicznym
      // sprawdzeniu wyżej — zapis zakolejkowany za łańcuchem markPromotedToRemote
      // wykonuje się dopiero po commicie runPromote (stary klucz usunięty).
      // Ponowny odczyt w closure kieruje taki zapis pod klucz remote, zamiast
      // wskrzeszać osierocony draft provisional. Bez chainowania na klucz remote:
      // jesteśmy w środku łańcucha klucza provisional, a transakcja IDB w
      // redirectDraftSave sama serializuje rekord remote (merge z guardem wersji).
      if (normalized.sessionOrigin === 'provisional' || isProvisionalWorkoutSessionId(normalized.sessionId)) {
        const promotedRemoteId = await resolvePromotionAlias(normalized.userId, normalized.sessionId);
        if (promotedRemoteId && promotedRemoteId !== normalized.sessionId) {
          const redirected = await redirectDraftSave(normalized, promotedRemoteId).catch(() => null);
          workoutDraft.clearSession(normalized.sessionId, normalized.userId);
          if (redirected) {
            try {
              withFallbackSave(redirected);
            } catch {
              // IDB zachowuje rekord; journal zostanie odtworzony kolejnym save.
            }
          }
          return;
        }
      }
      try {
        await runWrite(normalized, normalized.userId, undefined, { skipIfNewerExists: true });
      } catch {
        // IndexedDB w WKWebView potrafi stracić połączenie po powrocie z tła — jedna ponowna
        // próba na ŚWIEŻYM połączeniu, potem localStorage. Błąd pozostaje widoczny tylko
        // gdy fallback zawiedzie.
        resetDatabaseConnection();
        try {
          await runWrite(normalized, normalized.userId, undefined, { skipIfNewerExists: true });
        } catch {
          try {
            withFallbackSave(normalized);
          } catch {
            // QuotaExceeded przy pełnym storage = realny totalny fail: dane
            // sesji żyją już tylko w pamięci Reacta.
            throw new DraftSaveTotalFailure('fallback');
          }
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
      // pendingWrite* opisuje wyłącznie NIEPOTWIERDZONĄ próbę. Po ACK nie może zostać
      // ponownie użyty przez techniczny final tej samej wersji draftu — backend uznałby
      // final za duplikat wcześniejszego checkpointu i pozostawił completed=false.
      // Gdy w trakcie syncu powstała już nowsza próba, jej identyfikatora nie ruszamy.
      const acknowledgedWrite = draft.pendingWriteVersion === expectedDraftVersion
        ? { pendingWriteId: null, pendingWriteVersion: null }
        : {};
      // Edycja w trakcie syncu podbiła version: zaktualizuj WYŁĄCZNIE znaczniki chmury,
      // NIE czyść dirty ani nie ruszaj treści (lokalna edycja czeka na własny sync).
      if (draft.version !== expectedDraftVersion) {
        return { ...draft, ...acknowledgedWrite, ...cloudMarkers };
      }
      return {
        ...draft,
        ...acknowledgedWrite,
        dirty: false,
        healthSyncPending: false,
        pendingHealthGrant: null,
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
    let fromSessionId = sessionId;
    if (!fromSessionId) {
      const current = await this.loadActiveDraft(userId);
      if (!current) return;
      fromSessionId = current.sessionId;
    }

    if (fromSessionId === remoteSessionId) {
      await updateDraft(userId, remoteSessionId, draft => ({
        ...draft,
        sessionOrigin: 'remote',
        remoteSessionId,
        ...(cloudState?.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
        ...(cloudState?.revision !== undefined && { cloudRevision: cloudState.revision }),
      }));
      return;
    }

    // Alias i journal są trwałe synchronicznie, zanim czekamy na kolejkę IDB.
    // Force quit w oknie promocji nie może zostawić provisional ani skierować
    // kolejnego tapu pod stary identyfikator.
    promotionAliasCache.set(getPromotionAliasCacheKey(userId, fromSessionId), remoteSessionId);
    writePromotionTombstone(userId, fromSessionId, remoteSessionId);
    const promotedFallback = mergePromotedDraft(
      withFallbackLoad(userId, fromSessionId),
      withFallbackLoad(userId, remoteSessionId),
      remoteSessionId,
      cloudState,
    );
    if (promotedFallback) {
      try {
        withFallbackSave(promotedFallback);
        workoutDraft.clearSession(fromSessionId, userId);
      } catch {
        // IDB nadal wykona promocję; fallback jest best-effort przy braku miejsca.
      }
    }

    // Serializacja z zapisami OBU kluczy (provisional i remote).
    const fromKey = getWorkoutDraftKey(userId, fromSessionId);
    const remoteKey = getWorkoutDraftKey(userId, remoteSessionId);
    const previous = Promise.all([
      (writeChains.get(fromKey) ?? Promise.resolve()).catch(() => undefined),
      (writeChains.get(remoteKey) ?? Promise.resolve()).catch(() => undefined),
    ]);
    const run = previous.then(() => runPromote(userId, fromSessionId, remoteSessionId, cloudState));
    const chain = run.catch(() => undefined).finally(() => {
      if (writeChains.get(fromKey) === chain) writeChains.delete(fromKey);
      if (writeChains.get(remoteKey) === chain) writeChains.delete(remoteKey);
    });
    writeChains.set(fromKey, chain);
    writeChains.set(remoteKey, chain);
    await run;

    promotionAliasCache.set(getPromotionAliasCacheKey(userId, fromSessionId), remoteSessionId);
    writePromotionTombstone(userId, fromSessionId, remoteSessionId);
    try {
      const promotedRecord = await runReadWithFreshConnectionRetry(
        () => runRead(userId, remoteSessionId),
      );
      if (promotedRecord) withFallbackSave(promotedRecord);
    } catch {
      // Journal został już przeniesiony synchronicznie, jeśli fallback był dostępny.
    }
  },

  async clearActiveDraft(userId: string, sessionId?: string): Promise<void> {
    const targetSessionId = sessionId ?? (await this.loadActiveDraft(userId))?.sessionId;
    if (!targetSessionId) return;
    const key = getWorkoutDraftKey(userId, targetSessionId);
    const previous = writeChains.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(() => runWrite(null, userId, targetSessionId));
    const chain = run.catch(() => undefined).finally(() => {
      if (writeChains.get(key) === chain) writeChains.delete(key);
    });
    writeChains.set(key, chain);
    await run;
  },

  async discardActiveDraft(userId: string, sessionId: string): Promise<void> {
    const relatedSessionIds = await clearPromotionAliasesForDiscard(userId, sessionId);
    for (const relatedSessionId of relatedSessionIds) {
      await this.clearActiveDraft(userId, relatedSessionId);
    }
  },

  // Bug 3 (X30): publiczny odczyt tombstone'a promocji. WorkoutDay po
  // skipped/missingDraft własnej sesji provisional (promocja zewnętrzna przez
  // AutoSync) rozwiązuje nową tożsamość remote i ponawia sync zamiast kończyć
  // cichym no-opem "Zakończ trening".
  async resolvePromotedSessionId(userId: string, provisionalSessionId: string): Promise<string | null> {
    return resolvePromotionAlias(userId, provisionalSessionId);
  },

  // Warunkowe czyszczenie po finalnym syncu: draft z NOWSZĄ wersją (seria odhaczona
  // w trakcie finalnego RTT) zostaje jako dirty i idzie kolejnym checkpointem (R2-03).
  // Zwraca true, gdy draft skasowany lub już nie istniał; false = odmowa (nowsza wersja).
  async clearActiveDraftIfVersion(
    userId: string,
    sessionId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const key = getWorkoutDraftKey(userId, sessionId);
    let cleared = false;

    const clear = async (): Promise<void> => {
      let db: IDBDatabase | null = null;
      try {
        db = await openDatabase();
      } catch {
        db = null;
      }

      if (!db) {
        const current = withFallbackLoad(userId, sessionId);
        if (!current) {
          cleared = true;
          return;
        }
        if (current.version > expectedVersion) {
          cleared = false;
          return;
        }
        if (!workoutDraft.clearSession(sessionId, userId)) {
          throw new Error('LOCAL_STORAGE_CLEAR_FAILED');
        }
        cleared = true;
        return;
      }

      cleared = await new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(WORKOUT_DRAFT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(WORKOUT_DRAFT_STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const current = mergeDraftRecord(
            normalizeDraft(request.result, userId),
            withFallbackLoad(userId, sessionId),
          );
          if (!current || current.userId !== userId) {
            // Nic do skasowania — nie czekamy na commit pustej transakcji.
            resolve(true);
            return;
          }
          if (current.version > expectedVersion) {
            resolve(false);
            return;
          }
          if (!clearFallbackCopyIfMatches(userId, sessionId)) {
            reject(new Error('LOCAL_STORAGE_CLEAR_FAILED'));
            return;
          }
          store.delete(key);
          tx.oncomplete = () => resolve(true);
        };
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    };

    const previous = writeChains.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(clear);
    const chain = run.catch(() => undefined).finally(() => {
      if (writeChains.get(key) === chain) writeChains.delete(key);
    });
    writeChains.set(key, chain);
    await run;
    return cleared;
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

  /** Zachowuje writeId i dirty, ale utrwala revision bazy po częściowym sukcesie. */
  async markHealthWritePending(
    userId: string,
    sessionId: string,
    expectedDraftVersion: number,
    cloudState: { updatedAt?: number; revision?: number },
  ): Promise<void> {
    await updateDraft(userId, sessionId, draft => ({
      ...draft,
      ...(cloudState.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
      ...(cloudState.revision !== undefined && { cloudRevision: cloudState.revision }),
      ...(draft.version === expectedDraftVersion && {
        dirty: true,
        healthSyncPending: true,
      }),
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
