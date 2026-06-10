import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_STORAGE_WORKOUT_DRAFT_KEY, getScopedWorkoutDraftKey } from '@/lib/workout-draft';
import { hasDraftContent, workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';

class FakeRequest<T> {
  public result!: T;
  public error: Error | null = null;
  public onsuccess: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onupgradeneeded: ((event: Event) => void) | null = null;
}

class FakeObjectStore {
  constructor(
    private readonly data: Map<string, unknown>,
    private readonly tx?: FakeTransaction,
    public readonly keyPath: string | string[] | null = null,
  ) {}

  get(key: string) {
    const request = new FakeRequest<unknown>();
    setTimeout(() => {
      request.result = this.data.get(key);
      request.onsuccess?.(new Event('success'));
    }, 0);
    return request as unknown as IDBRequest;
  }

  getAll() {
    const request = new FakeRequest<unknown[]>();
    setTimeout(() => {
      request.result = Array.from(this.data.values());
      request.onsuccess?.(new Event('success'));
    }, 0);
    return request as unknown as IDBRequest;
  }

  put(value: { userId: string; sessionId?: string }, key?: IDBValidKey) {
    const request = new FakeRequest<string>();
    setTimeout(() => {
      const resolvedKey = String(key ?? value.userId);
      this.data.set(resolvedKey, JSON.parse(JSON.stringify(value)));
      request.result = resolvedKey;
      request.onsuccess?.(new Event('success'));
      this.tx?.complete();
    }, 0);
    return request as unknown as IDBRequest;
  }

  delete(key: string) {
    const request = new FakeRequest<undefined>();
    setTimeout(() => {
      this.data.delete(key);
      request.result = undefined;
      request.onsuccess?.(new Event('success'));
      this.tx?.complete();
    }, 0);
    return request as unknown as IDBRequest;
  }
}

class FakeTransaction {
  public oncomplete: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onabort: ((event: Event) => void) | null = null;

  constructor(private readonly stores: Map<string, { data: Map<string, unknown>; keyPath: string | string[] | null }>) {}

  objectStore(name: string) {
    const entry = this.stores.get(name);
    const store = entry?.data;
    if (!store) throw new Error(`Missing object store: ${name}`);
    return new FakeObjectStore(store, this, entry.keyPath) as unknown as IDBObjectStore;
  }

  complete() {
    setTimeout(() => {
      this.oncomplete?.(new Event('complete'));
    }, 0);
  }
}

class FakeDatabase {
  public version = 1;
  public readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  } as DOMStringList;

  constructor(private readonly stores: Map<string, { data: Map<string, unknown>; keyPath: string | string[] | null }>) {}

  createObjectStore(name: string, options?: IDBObjectStoreParameters) {
    if (!this.stores.has(name)) {
      this.stores.set(name, { data: new Map(), keyPath: options?.keyPath ?? null });
    }
    const entry = this.stores.get(name)!;
    return new FakeObjectStore(entry.data, undefined, entry.keyPath) as unknown as IDBObjectStore;
  }

  deleteObjectStore(name: string) {
    this.stores.delete(name);
  }

  transaction(name: string) {
    return new FakeTransaction(this.stores) as unknown as IDBTransaction;
  }
}

class FakeIndexedDbFactory {
  private readonly databases = new Map<string, { version: number; stores: Map<string, { data: Map<string, unknown>; keyPath: string | string[] | null }> }>();

  open(name: string, version?: number) {
    const request = new FakeRequest<IDBDatabase>();

    setTimeout(() => {
      let entry = this.databases.get(name);
      if (!entry) {
        entry = { version: version ?? 1, stores: new Map() };
        this.databases.set(name, entry);
      }

      const db = new FakeDatabase(entry.stores) as unknown as IDBDatabase;
      const needsUpgrade = (version ?? 1) > entry.version || entry.stores.size === 0;
      if (needsUpgrade) {
        entry.version = version ?? 1;
        request.result = db;
        request.onupgradeneeded?.(new Event('upgradeneeded'));
      }

      request.result = db;
      request.onsuccess?.(new Event('success'));
    }, 0);

    return request as unknown as IDBOpenDBRequest;
  }
}

const baseDraft: ActiveWorkoutDraft = {
  sessionId: 'workout-123',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-04-03',
  cycleId: 'cycle-1',
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-123',
  exerciseSets: {
    'ex-1': [
      { reps: 10, weight: 50, completed: true },
      { reps: 8, weight: 50, completed: true },
    ],
  },
  exerciseNotes: { 'ex-1': 'Strong set' },
  exerciseMetrics: { 'ex-1': { rpe: 8, pain: 1, quality: 5 } },
  dayNotes: 'Good session',
  skippedExercises: ['ex-3'],
  startedAt: 100,
  updatedAt: 200,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 1,
};

describe('workoutDraftDb', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: new FakeIndexedDbFactory(),
    });
  });

  it('save and load roundtrip in IndexedDB', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded).toEqual(baseDraft);
  });

  it('keeps multiple dirty drafts for the same user keyed by session', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: 'workout-456',
      dayId: 'day-2',
      date: '2026-04-04',
      remoteSessionId: 'workout-456',
      updatedAt: 300,
    });

    const drafts = await workoutDraftDb.listDrafts('user-1');
    const first = await workoutDraftDb.loadDraft('user-1', 'workout-123');
    const second = await workoutDraftDb.loadDraft('user-1', 'workout-456');

    expect(drafts.map(draft => draft.sessionId).sort()).toEqual(['workout-123', 'workout-456']);
    expect(first?.dayId).toBe('day-1');
    expect(second?.dayId).toBe('day-2');
  });

  it('markDraftSynced clears dirty flag and sets timestamp', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.markDraftSynced('user-1', 999);
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.dirty).toBe(false);
    expect(loaded?.lastFirebaseSyncAt).toBe(999);
  });

  it('markCompletedLocally keeps draft and marks final sync pending', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.markCompletedLocally('user-1');
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.completedLocally).toBe(true);
    expect(loaded?.finalSyncPending).toBe(true);
    expect(loaded?.dirty).toBe(true);
  });

  it('markPromotedToRemote rewrites provisional draft as remote session', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: 'local-workout-user-1-day-1-2026-04-03',
      sessionOrigin: 'provisional',
      remoteSessionId: null,
    });

    await workoutDraftDb.markPromotedToRemote('user-1', 'workout-user-1-day-1-2026-04-03', 'local-workout-user-1-day-1-2026-04-03');
    const loaded = await workoutDraftDb.loadDraft('user-1', 'workout-user-1-day-1-2026-04-03');
    const oldDraft = await workoutDraftDb.loadDraft('user-1', 'local-workout-user-1-day-1-2026-04-03');

    expect(loaded?.sessionId).toBe('workout-user-1-day-1-2026-04-03');
    expect(loaded?.sessionOrigin).toBe('remote');
    expect(loaded?.remoteSessionId).toBe('workout-user-1-day-1-2026-04-03');
    expect(oldDraft).toBeNull();
  });

  it('clearActiveDraft removes stored record', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.clearActiveDraft('user-1');
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded).toBeNull();
  });

  it('migrates legacy localStorage draft into IndexedDB', async () => {
    localStorage.setItem(LOCAL_STORAGE_WORKOUT_DRAFT_KEY, JSON.stringify({
      sessionId: 'legacy-1',
      dayId: 'day-1',
      date: '2026-04-03',
      exerciseSets: { 'ex-1': [{ reps: 5, weight: 0, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      savedAt: 123,
    }));

    const migrated = await workoutDraftDb.migrateFromLocalStorage('user-1');
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(migrated?.sessionId).toBe('legacy-1');
    expect(loaded?.userId).toBe('user-1');
    expect(localStorage.getItem(LOCAL_STORAGE_WORKOUT_DRAFT_KEY)).toBeNull();
  });

  it('falls back to localStorage when IndexedDB is unavailable', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await workoutDraftDb.saveActiveDraft(baseDraft);
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.sessionId).toBe(baseDraft.sessionId);
    expect(localStorage.getItem(getScopedWorkoutDraftKey('user-1'))).not.toBeNull();
  });
});

describe('hasDraftContent', () => {
  it('recognizes meaningful draft data', () => {
    expect(hasDraftContent({ 'ex-1': [{ reps: 0, weight: 0, completed: false }] }, {}, '', [])).toBe(false);
    expect(hasDraftContent({ 'ex-1': [{ reps: 12, weight: 0, completed: true }] }, {}, '', [])).toBe(true);
    expect(hasDraftContent({}, { 'ex-1': 'note' }, '', [])).toBe(true);
    expect(hasDraftContent({}, {}, 'day note', [])).toBe(true);
    expect(hasDraftContent({}, {}, '', ['ex-2'])).toBe(true);
  });
});
