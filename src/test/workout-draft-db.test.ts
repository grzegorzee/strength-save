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
  ) {}

  get(key: string) {
    const request = new FakeRequest<unknown>();
    setTimeout(() => {
      request.result = this.data.get(key);
      request.onsuccess?.(new Event('success'));
    }, 0);
    return request as unknown as IDBRequest;
  }

  put(value: { userId: string }) {
    const request = new FakeRequest<string>();
    setTimeout(() => {
      this.data.set(value.userId, JSON.parse(JSON.stringify(value)));
      request.result = value.userId;
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

  constructor(private readonly stores: Map<string, Map<string, unknown>>) {}

  objectStore(name: string) {
    const store = this.stores.get(name);
    if (!store) throw new Error(`Missing object store: ${name}`);
    return new FakeObjectStore(store, this) as unknown as IDBObjectStore;
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

  constructor(private readonly stores: Map<string, Map<string, unknown>>) {}

  createObjectStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }
    return new FakeObjectStore(this.stores.get(name)!) as unknown as IDBObjectStore;
  }

  transaction(name: string) {
    return new FakeTransaction(this.stores) as unknown as IDBTransaction;
  }
}

class FakeIndexedDbFactory {
  private readonly databases = new Map<string, { version: number; stores: Map<string, Map<string, unknown>> }>();

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

    await workoutDraftDb.markPromotedToRemote('user-1', 'workout-user-1-day-1-2026-04-03');
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.sessionId).toBe('workout-user-1-day-1-2026-04-03');
    expect(loaded?.sessionOrigin).toBe('remote');
    expect(loaded?.remoteSessionId).toBe('workout-user-1-day-1-2026-04-03');
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
