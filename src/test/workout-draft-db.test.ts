import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_STORAGE_WORKOUT_DRAFT_KEY,
  getScopedWorkoutDraftJournalKey,
  workoutDraft,
} from '@/lib/workout-draft';
import {
  __resetWorkoutDraftDbConnectionForTests,
  DraftSaveTotalFailure,
  getPromotionTombstoneKey,
  hasDraftContent,
  workoutDraftDb,
  type ActiveWorkoutDraft,
} from '@/lib/workout-draft-db';
import { hasWorkoutWriteConflict } from '@/lib/workout-final-sync';

class FakeRequest<T> {
  public result!: T;
  public error: Error | null = null;
  public onsuccess: ((event: Event) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onupgradeneeded: ((event: Event) => void) | null = null;
}

const enqueue = (callback: () => void | Promise<void>): void => {
  queueMicrotask(() => {
    void Promise.resolve(callback());
  });
};

type Deferred<T = void> = {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T = void>(): Deferred<T> => {
  let resolve!: (value?: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res as (value?: T | PromiseLike<T>) => void;
    reject = rej;
  });
  return { promise, resolve, reject };
};

let nextPutGate: Deferred | null = null;
let nextPutStarted: Deferred | null = null;

const blockNextPut = () => {
  const gate = deferred();
  const started = deferred();
  nextPutGate = gate;
  nextPutStarted = started;
  return {
    started: started.promise,
    release: () => gate.resolve(),
  };
};

class FakeObjectStore {
  constructor(
    private readonly data: Map<string, unknown>,
    private readonly tx?: FakeTransaction,
    public readonly keyPath: string | string[] | null = null,
  ) {}

  get(key: string) {
    const request = new FakeRequest<unknown>();
    enqueue(() => {
      request.result = this.data.get(key);
      request.onsuccess?.(new Event('success'));
    });
    return request as unknown as IDBRequest;
  }

  getAll() {
    const request = new FakeRequest<unknown[]>();
    enqueue(() => {
      request.result = Array.from(this.data.values());
      request.onsuccess?.(new Event('success'));
    });
    return request as unknown as IDBRequest;
  }

  put(value: { userId: string; sessionId?: string }, key?: IDBValidKey) {
    const request = new FakeRequest<string>();
    const gate = nextPutGate;
    const started = nextPutStarted;
    nextPutGate = null;
    nextPutStarted = null;
    enqueue(async () => {
      if (gate) {
        started?.resolve();
        await gate.promise;
      }
      const resolvedKey = String(key ?? value.userId);
      this.data.set(resolvedKey, JSON.parse(JSON.stringify(value)));
      request.result = resolvedKey;
      request.onsuccess?.(new Event('success'));
      this.tx?.complete();
    });
    return request as unknown as IDBRequest;
  }

  delete(key: string) {
    const request = new FakeRequest<undefined>();
    enqueue(() => {
      this.data.delete(key);
      request.result = undefined;
      request.onsuccess?.(new Event('success'));
      this.tx?.complete();
    });
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
    enqueue(() => {
      this.oncomplete?.(new Event('complete'));
    });
  }
}

class FakeDatabase {
  public version = 1;
  public onclose: (() => void) | null = null;
  public onversionchange: (() => void) | null = null;
  close() {}
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
  public lastDb: IDBDatabase | null = null;

  open(name: string, version?: number) {
    const request = new FakeRequest<IDBDatabase>();

    enqueue(() => {
      let entry = this.databases.get(name);
      if (!entry) {
        entry = { version: version ?? 1, stores: new Map() };
        this.databases.set(name, entry);
      }

      const db = new FakeDatabase(entry.stores) as unknown as IDBDatabase;
      this.lastDb = db;
      const needsUpgrade = (version ?? 1) > entry.version || entry.stores.size === 0;
      if (needsUpgrade) {
        entry.version = version ?? 1;
        request.result = db;
        request.onupgradeneeded?.(new Event('upgradeneeded'));
      }

      request.result = db;
      request.onsuccess?.(new Event('success'));
    });

    return request as unknown as IDBOpenDBRequest;
  }
}

const replaceFirstOpenedDatabaseWithBrokenReadConnection = (
  healthyFactory: FakeIndexedDbFactory,
): { getOpenCount: () => number } => {
  let openCount = 0;
  const brokenDb = {
    onclose: null,
    onversionchange: null,
    close: () => undefined,
    transaction: () => {
      throw new DOMException('Connection became inactive after resume', 'InvalidStateError');
    },
  } as unknown as IDBDatabase;

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    writable: true,
    value: {
      open: (name: string, version?: number) => {
        openCount += 1;
        if (openCount > 1) return healthyFactory.open(name, version);

        const request = new FakeRequest<IDBDatabase>();
        enqueue(() => {
          request.result = brokenDb;
          request.onsuccess?.(new Event('success'));
        });
        return request as unknown as IDBOpenDBRequest;
      },
    },
  });

  return { getOpenCount: () => openCount };
};

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
    nextPutGate = null;
    nextPutStarted = null;
    __resetWorkoutDraftDbConnectionForTests();
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

  it.each([
    ['loadActiveDraft', () => workoutDraftDb.loadActiveDraft('user-1')],
    ['loadDraft', () => workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)],
    ['listDrafts', () => workoutDraftDb.listDrafts('user-1')],
  ])('%s ponawia odczyt na świeżym połączeniu po jednorazowej awarii resume', async (_name, read) => {
    const healthyFactory = window.indexedDB as unknown as FakeIndexedDbFactory;
    await workoutDraftDb.saveActiveDraft(baseDraft);
    __resetWorkoutDraftDbConnectionForTests();
    const connection = replaceFirstOpenedDatabaseWithBrokenReadConnection(healthyFactory);

    const result = await read();
    const loaded = Array.isArray(result) ? result[0] : result;

    expect(loaded).toEqual(baseDraft);
    expect(connection.getOpenCount()).toBe(2);
  });

  it('crash path zapisuje bieżący snapshot synchronicznie do fallbacku bez czekania na IDB', () => {
    const saved = workoutDraftDb.saveEmergencyFallback({
      ...baseDraft,
      version: 9,
      exerciseSets: { 'ex-1': [{ reps: 3, weight: 120, completed: true }] },
    });

    expect(saved).toBe(true);
    expect(workoutDraft.load('user-1')?.version).toBe(9);
    expect(workoutDraft.load('user-1')?.exerciseSets['ex-1'][0]).toMatchObject({
      reps: 3,
      weight: 120,
      completed: true,
    });
  });

  it('saveActiveDraft zapisuje journal synchronicznie zanim zablokowany IDB odpowie', async () => {
    const blocked = blockNextPut();
    const save = workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 9,
      dayNotes: 'ostatni tap przed force quit',
    });

    expect(workoutDraft.loadSession(baseDraft.sessionId, 'user-1')).toMatchObject({
      version: 9,
      dayNotes: 'ostatni tap przed force quit',
    });

    await blocked.started;
    blocked.release();
    await save;
  });

  it('Z175: zapis z niższą wersją NIE nadpisuje żywego draftu pod tym samym kluczem', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 5,
      exerciseSets: {
        'ex-1': [
          { reps: 5, weight: 100, completed: true },
          { reps: 5, weight: 100, completed: true },
          { reps: 5, weight: 100, completed: true },
        ],
      },
    });

    // Autostart z kafla budował świeży stan (version=1, zero odhaczeń) i nadpisywał
    // żywą sesję pod tym samym kluczem — guard read-before-write w IDB ma go odbić.
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 1, exerciseSets: { 'ex-1': [] } });

    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.version).toBe(5);
    expect(loaded?.exerciseSets['ex-1'].filter((set) => set.completed)).toHaveLength(3);
  });

  it('Z175 niezmiennik: zapis z wyższą wersją nadpisuje jak dotąd', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 2 });
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 7, dayNotes: 'Nowsza treść' });

    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.version).toBe(7);
    expect(loaded?.dayNotes).toBe('Nowsza treść');
  });

  it('roundtrip zachowuje lastTouchedExerciseId (Z47)', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, lastTouchedExerciseId: 'ex-1' });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.lastTouchedExerciseId).toBe('ex-1');
  });

  it('roundtrip zachowuje warmupChecked (Z162)', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      warmupChecked: ['warmup.jumpingJacks', 'stretch.catCow'],
    });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.warmupChecked).toEqual(['warmup.jumpingJacks', 'stretch.catCow']);
  });

  it('normalizeDraft odfiltrowuje nie-stringi z warmupChecked (Z162)', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      warmupChecked: ['warmup.jumpingJacks', 3, null, { a: 1 }] as unknown as string[],
    });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.warmupChecked).toEqual(['warmup.jumpingJacks']);
  });

  it('legacy draft bez warmupChecked ładuje się bez pola (niezmiennik Z162)', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.warmupChecked).toBeUndefined();
    expect(loaded?.exerciseSets).toEqual(baseDraft.exerciseSets);
  });

  it('sekwencja Z162: odhaczenia giną razem z sesją, nowa sesja startuje czysta', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      warmupChecked: ['warmup.jumpingJacks', 'stretch.catCow'],
    });
    // Koniec treningu = draft skasowany.
    await workoutDraftDb.clearActiveDraft('user-1', baseDraft.sessionId);

    // Nowa sesja tego samego dnia: brak odhaczeń z poprzedniej.
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: 'workout-999',
      remoteSessionId: 'workout-999',
    });
    const loaded = await workoutDraftDb.loadDraft('user-1', 'workout-999');

    expect(loaded?.warmupChecked).toBeUndefined();
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

  it('journal zachowuje plan i szybki trening, a clear usuwa tylko wskazaną sesję', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: 'workout-quick-456',
      remoteSessionId: 'workout-quick-456',
      dayId: 'adhoc-1',
      updatedAt: 300,
    });

    await workoutDraftDb.clearActiveDraft('user-1', baseDraft.sessionId);

    expect(workoutDraft.loadSession(baseDraft.sessionId, 'user-1')).toBeNull();
    expect(workoutDraft.loadSession('workout-quick-456', 'user-1')).not.toBeNull();
    expect((await workoutDraftDb.listDrafts('user-1')).map(draft => draft.sessionId)).toEqual([
      'workout-quick-456',
    ]);
  });

  it('fallback-only sesja jest widoczna przy zdrowym IDB we wszystkich odczytach', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    workoutDraft.save({
      sessionId: 'workout-fallback-only',
      dayId: 'day-fallback',
      date: baseDraft.date,
      cycleId: baseDraft.cycleId,
      sessionOrigin: 'remote',
      remoteSessionId: 'workout-fallback-only',
      exerciseSets: baseDraft.exerciseSets,
      exerciseNotes: baseDraft.exerciseNotes,
      exerciseMetrics: baseDraft.exerciseMetrics,
      dayNotes: baseDraft.dayNotes,
      skippedExercises: baseDraft.skippedExercises,
      savedAt: 900,
      version: 8,
    }, 'user-1');

    expect((await workoutDraftDb.listDrafts('user-1')).map(draft => draft.sessionId).sort()).toEqual([
      'workout-123',
      'workout-fallback-only',
    ]);
    expect(await workoutDraftDb.loadDraft('user-1', 'workout-fallback-only')).toMatchObject({
      sessionId: 'workout-fallback-only',
      version: 8,
    });
    expect(await workoutDraftDb.loadDraftForDay('user-1', 'day-fallback', baseDraft.date)).toMatchObject({
      sessionId: 'workout-fallback-only',
    });
    expect((await workoutDraftDb.loadActiveDraft('user-1'))?.sessionId).toBe('workout-fallback-only');
  });

  it('merge per sesja wybiera version, potem updatedAt, a przy pełnym remisie journal syncu', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 5, updatedAt: 500, dayNotes: 'IDB' });

    workoutDraft.save({
      ...baseDraft,
      savedAt: 100,
      version: 6,
      dayNotes: 'fallback wyższa wersja',
    }, 'user-1');
    expect((await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId))?.dayNotes)
      .toBe('fallback wyższa wersja');

    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 7, updatedAt: 700, dayNotes: 'IDB remis' });
    workoutDraft.save({
      ...baseDraft,
      savedAt: 700,
      version: 7,
      dayNotes: 'fallback remis',
    }, 'user-1');
    expect((await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId))?.dayNotes).toBe('fallback remis');
  });

  it('pełny remis nie cofa finalizacji zapisanej w IDB, gdy mirror journalu zawiódł', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      completedLocally: true,
      finalSyncPending: true,
    });
    workoutDraft.save({
      ...baseDraft,
      savedAt: baseDraft.updatedAt,
      completedLocally: false,
      finalSyncPending: false,
    }, 'user-1');

    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toMatchObject({
      completedLocally: true,
      finalSyncPending: true,
    });
  });

  it('markDraftSynced clears dirty flag and sets timestamp', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.markDraftSynced('user-1', 999, baseDraft.version);
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.dirty).toBe(false);
    expect(loaded?.lastFirebaseSyncAt).toBe(999);
  });

  // Sekwencja release: udany checkpoint zostawiał pendingWriteId dla tej samej
  // wersji. Final bez nowej serii reuse'ował ten ID, więc backend uznawał go za
  // już zastosowany checkpoint i pozostawiał completed=false.
  it('ACK checkpointu czyści jego writeId, aby final tej samej wersji dostał nowy klucz', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 6,
      pendingWriteId: 'checkpoint-write',
      pendingWriteVersion: 6,
    });

    await workoutDraftDb.markDraftSynced('user-1', 999, 6, baseDraft.sessionId, { revision: 2 });

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);
    expect(loaded?.pendingWriteId).toBeUndefined();
    expect(loaded?.pendingWriteVersion).toBeUndefined();
  });

  it('setPendingWrite i ACK są mirrorowane do journalu na wypadek utraty IDB', async () => {
    const healthyFactory = window.indexedDB;
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.setPendingWrite('user-1', baseDraft.sessionId, {
      writeId: 'write-after-lost-ack',
      version: baseDraft.version,
    });

    __resetWorkoutDraftDbConnectionForTests();
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toMatchObject({
      pendingWriteId: 'write-after-lost-ack',
      pendingWriteVersion: baseDraft.version,
    });

    await workoutDraftDb.markDraftSynced('user-1', 999, baseDraft.version, baseDraft.sessionId, { revision: 3 });
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toMatchObject({
      dirty: false,
      cloudRevision: 3,
      lastFirebaseSyncAt: 999,
    });
    expect((await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId))?.pendingWriteId).toBeUndefined();

    // Po powrocie starego IDB journal z ACK wygrywa także przy tej samej
    // version/updatedAt i naprawia rekord bez ponownego oznaczania dirty.
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: healthyFactory,
    });
    __resetWorkoutDraftDbConnectionForTests();
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toMatchObject({
      dirty: false,
      cloudRevision: 3,
      lastFirebaseSyncAt: 999,
    });
    expect((await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId))?.pendingWriteId).toBeUndefined();
  });

  it('runUpdate scala nowszy journal z IDB i nie cofa treści ani final flags', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    workoutDraft.save({
      ...baseDraft,
      savedAt: 300,
      version: 2,
      dayNotes: 'nowsza notatka z journalu',
      completedLocally: true,
      finalSyncPending: true,
    }, 'user-1');

    await workoutDraftDb.setPendingWrite('user-1', baseDraft.sessionId, {
      writeId: 'final-write',
      version: 2,
    });

    __resetWorkoutDraftDbConnectionForTests();
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toMatchObject({
      version: 2,
      dayNotes: 'nowsza notatka z journalu',
      completedLocally: true,
      finalSyncPending: true,
      pendingWriteId: 'final-write',
    });
  });

  it('does not clear a newer local draft when an older cloud ACK arrives', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 2, dayNotes: 'newer local edit' });
    await workoutDraftDb.markDraftSynced('user-1', 999, 1);
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.dirty).toBe(true);
    expect(loaded?.version).toBe(2);
  });

  it('persists cloudRevision even when an edit bumped version during sync (#1 P1 false conflict)', async () => {
    // draft v1 z cloudRevision=5; sync rusza z expectedDraftVersion=1
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 1, cloudRevision: 5 });
    // użytkownik edytuje serię W TRAKCIE syncu → version podbita do 2
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 2, cloudRevision: 5, dayNotes: 'edit during sync' });
    // sync kończy się: serwer ma revision 6; ACK dotyczy wersji v1 (expected)
    await workoutDraftDb.markDraftSynced('user-1', 999, 1, undefined, { updatedAt: 777, revision: 6 });

    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    // Fakt serwera (cloudRevision/cloudUpdatedAt) MUSI trafić do IDB — inaczej po purge
    // WKWebView kolejny sync ma stale expectedRevision i fałszywie wykrywa WORKOUT_CONFLICT.
    expect(loaded?.cloudRevision).toBe(6);
    expect(loaded?.cloudUpdatedAt).toBe(777);
    // Edycja w trakcie syncu zachowana: dirty pozostaje true, treść/wersja nietknięte.
    expect(loaded?.dirty).toBe(true);
    expect(loaded?.version).toBe(2);
    expect(loaded?.dayNotes).toBe('edit during sync');
  });

  it('after resume from purge persisted cloudRevision avoids false conflict (#1 P1 integration)', async () => {
    // Sync z edycją w trakcie: serwer ma revision 6, mimo podbitej wersji draftu cloudRevision
    // zostaje zapisany do IDB.
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 1, cloudRevision: 5 });
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 2, cloudRevision: 5 });
    await workoutDraftDb.markDraftSynced('user-1', 999, 1, undefined, { revision: 6 });

    // Reload z IDB (symulacja powrotu po purge WKWebView) — expectedRevision z draftu.
    const reloaded = await workoutDraftDb.loadActiveDraft('user-1');
    const serverWorkout = { revision: 6 };
    // Serwer zgodny z zapisanym cloudRevision → BRAK konfliktu.
    expect(hasWorkoutWriteConflict(serverWorkout, reloaded?.cloudRevision)).toBe(false);
    // Kontrola negatywna: ze stale cloudRevision (5) konflikt BYŁBY fałszywie zgłoszony.
    expect(hasWorkoutWriteConflict(serverWorkout, 5)).toBe(true);
  });

  it('serializes draft writes and keeps the newer version after a delayed older completion', async () => {
    const gate = blockNextPut();
    const firstWrite = workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 1, dayNotes: 'older edit' });
    await gate.started;

    const secondWrite = workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 2, dayNotes: 'newer edit' });

    let secondWriteCompleted = false;
    void secondWrite.then(() => {
      secondWriteCompleted = true;
    });
    await Promise.resolve();
    expect(secondWriteCompleted).toBe(false);

    gate.release();
    await Promise.all([firstWrite, secondWrite]);

    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.version).toBe(2);
    expect(loaded?.dayNotes).toBe('newer edit');
  });

  it('markDraftSynced nie cofa treści zapisanej równolegle przez saveActiveDraft (R2-02)', async () => {
    // Wyścig RMW: markDraftSynced czyta v1, w oknie przed jego putem user odhacza
    // serię (saveActiveDraft v2). Bez serializacji przez writeChains put markDraftSynced
    // nadpisuje v2 obiektem zbudowanym na v1 i seria znika z IDB.
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 1 });

    const gate = blockNextPut();
    const syncMark = workoutDraftDb.markDraftSynced('user-1', 999, 1, baseDraft.sessionId, { revision: 6 });
    await gate.started;

    // Odhaczenie serii w trakcie markDraftSynced.
    const save = workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 2,
      exerciseSets: {
        'ex-1': [
          { reps: 10, weight: 50, completed: true },
          { reps: 8, weight: 50, completed: true },
          { reps: 6, weight: 55, completed: true },
        ],
      },
    });

    // Serializacja przez writeChains: zapis v2 czeka, aż markDraftSynced skończy.
    let saveCompleted = false;
    void save.then(() => {
      saveCompleted = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(saveCompleted).toBe(false);

    gate.release();
    await Promise.all([syncMark, save]);

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);
    expect(loaded?.version).toBe(2);
    expect(loaded?.exerciseSets['ex-1']).toHaveLength(3);
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

  it('po markPromotedToRemote zapis pod stary klucz provisional ląduje pod remote (R2-04)', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });
    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId, { revision: 0, updatedAt: 500 });

    // Edycja w oknie promocji: WorkoutDay ma jeszcze stary sessionId i pisze pod provisional.
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 4,
      dayNotes: 'edycja w oknie promocji',
    });

    const drafts = await workoutDraftDb.listDrafts('user-1');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].sessionId).toBe(remoteId);
    expect(drafts[0].sessionOrigin).toBe('remote');
    expect(drafts[0].dayNotes).toBe('edycja w oknie promocji');
    // Znaczniki chmury z rekordu remote (promocja) zachowane mimo przekierowania.
    expect(drafts[0].cloudRevision).toBe(0);
    expect(drafts[0].cloudUpdatedAt).toBe(500);
  });

  it('świadomy discard po promocji pozwala rozpocząć nową sesję o tym samym provisional ID', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
    });
    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);

    // UI może nadal znać provisional ID, mimo że AutoSync wypromował rekord.
    await workoutDraftDb.discardActiveDraft('user-1', provisionalId);
    __resetWorkoutDraftDbConnectionForTests();
    expect(await workoutDraftDb.resolvePromotedSessionId('user-1', provisionalId)).toBeNull();
    expect(await workoutDraftDb.loadDraft('user-1', remoteId)).toBeNull();

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 1,
      dayNotes: 'nowy trening tego samego dnia',
    });
    expect(await workoutDraftDb.loadDraft('user-1', provisionalId)).toMatchObject({
      sessionId: provisionalId,
      dayNotes: 'nowy trening tego samego dnia',
    });
  });

  it('świadomy discard działa w trybie fallback-only bez IndexedDB', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
    });

    await workoutDraftDb.discardActiveDraft('user-1', provisionalId);

    expect(await workoutDraftDb.loadDraft('user-1', provisionalId)).toBeNull();
  });

  it('utrata localStorage tombstone po promocji nie wskrzesza provisional draftu', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });
    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);
    localStorage.removeItem(getPromotionTombstoneKey('user-1', provisionalId));
    __resetWorkoutDraftDbConnectionForTests();

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 5,
      dayNotes: 'późna edycja po utracie localStorage',
    });

    const drafts = await workoutDraftDb.listDrafts('user-1');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sessionId: remoteId,
      sessionOrigin: 'remote',
      dayNotes: 'późna edycja po utracie localStorage',
    });
    expect(await workoutDraftDb.loadDraft('user-1', provisionalId)).toBeNull();
  });

  it('bug 20: redirect po promocji przenosi warmupChecked, sessionSwaps, lastTouchedExerciseId i lastActivityAt', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });
    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId, { revision: 0, updatedAt: 500 });

    // Edycja w oknie promocji: swap "tylko dziś" + odhaczenie rozgrzewki idą jeszcze
    // pod stary klucz provisional (WorkoutDay ma stary sessionId do końca syncu).
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 5,
      warmupChecked: ['warmup.jumpingJacks'],
      sessionSwaps: { 'ex-1': { id: 'ex-1-swap', name: 'Swap', sets: '3 x 8' } },
      lastTouchedExerciseId: 'ex-1-swap',
      lastActivityAt: 4_200_000,
    });

    const merged = await workoutDraftDb.loadDraft('user-1', remoteId);
    expect(merged?.warmupChecked).toEqual(['warmup.jumpingJacks']);
    expect(merged?.sessionSwaps).toEqual({ 'ex-1': { id: 'ex-1-swap', name: 'Swap', sets: '3 x 8' } });
    expect(merged?.lastTouchedExerciseId).toBe('ex-1-swap');
    expect(merged?.lastActivityAt).toBe(4_200_000);
  });

  it('bug 38: autosave startujący w oknie promocji (tombstone jeszcze nie zapisany) nie wskrzesza draftu pod kluczem provisional', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });

    // Wyścig: autosave rusza PO rejestracji łańcucha promocji w writeChains
    // (synchronicznej), ale PRZED zapisem tombstone'a — synchroniczny odczyt
    // tombstone'a w saveActiveDraft widzi jeszcze null, a odroczony zapis
    // wykonuje się już PO commicie runPromote (stary klucz usunięty).
    const promote = workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId, { revision: 0, updatedAt: 500 });
    const racingSave = workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 4,
      dayNotes: 'zapis wyscigowy w oknie promocji',
    });
    await Promise.all([promote, racingSave]);

    const drafts = await workoutDraftDb.listDrafts('user-1');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].sessionId).toBe(remoteId);
    expect(drafts[0].dayNotes).toBe('zapis wyscigowy w oknie promocji');
    const orphan = await workoutDraftDb.loadDraft('user-1', provisionalId);
    expect(orphan).toBeNull();
  });

  it('promocja przenosi journal na remote i nie zostawia zombie provisional', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });

    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);

    expect(workoutDraft.loadSession(provisionalId, 'user-1')).toBeNull();
    expect(workoutDraft.loadSession(remoteId, 'user-1')).toMatchObject({
      sessionId: remoteId,
      sessionOrigin: 'remote',
      remoteSessionId: remoteId,
    });
  });

  it('promocja przenosi journal synchronicznie przed pierwszym await', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
    });

    const promotion = workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);

    expect(workoutDraft.loadSession(provisionalId, 'user-1')).toBeNull();
    expect(workoutDraft.loadSession(remoteId, 'user-1')?.sessionOrigin).toBe('remote');
    await promotion;
  });

  it('wyścig promocji nie wskrzesza provisional, gdy zapis localStorage tombstone rzuca quota error', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === getPromotionTombstoneKey('user-1', provisionalId)) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      const promote = workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);
      const racingSave = workoutDraftDb.saveActiveDraft({
        ...baseDraft,
        sessionId: provisionalId,
        sessionOrigin: 'provisional',
        remoteSessionId: null,
        version: 4,
        dayNotes: 'zapis bez localStorage tombstone',
      });
      await Promise.all([promote, racingSave]);
    } finally {
      setItem.mockRestore();
    }

    __resetWorkoutDraftDbConnectionForTests();
    const drafts = await workoutDraftDb.listDrafts('user-1');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ sessionId: remoteId, dayNotes: 'zapis bez localStorage tombstone' });
    expect(await workoutDraftDb.loadDraft('user-1', provisionalId)).toBeNull();
  });

  it('bug 3: resolvePromotedSessionId odzyskuje remote id także po utracie localStorage tombstone', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    expect(await workoutDraftDb.resolvePromotedSessionId('user-1', provisionalId)).toBeNull();

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
    });
    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);
    localStorage.removeItem(getPromotionTombstoneKey('user-1', provisionalId));
    __resetWorkoutDraftDbConnectionForTests();

    // WorkoutDay po skipped/missingDraft własnej sesji provisional odzyskuje
    // tożsamość remote i może ponowić sync zamiast cichego no-opa.
    expect(await workoutDraftDb.resolvePromotedSessionId('user-1', provisionalId)).toBe(remoteId);
    expect(await workoutDraftDb.resolvePromotedSessionId('user-1', 'local-workout-inny')).toBeNull();
  });

  it('trwały alias nie pozwala staremu ekranowi odtworzyć draftu po finalnym cleanupie', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 3,
    });
    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId);
    localStorage.removeItem(getPromotionTombstoneKey('user-1', provisionalId));
    __resetWorkoutDraftDbConnectionForTests();
    const remote = await workoutDraftDb.loadDraft('user-1', remoteId);
    expect(remote).not.toBeNull();
    expect(await workoutDraftDb.clearActiveDraftIfVersion('user-1', remoteId, remote!.version)).toBe(true);

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 4,
    });

    expect(await workoutDraftDb.resolvePromotedSessionId('user-1', provisionalId)).toBe(remoteId);
    expect(await workoutDraftDb.loadDraft('user-1', provisionalId)).toBeNull();
    expect(await workoutDraftDb.loadDraft('user-1', remoteId)).toBeNull();
  });

  it('bug 4 sekwencja: niedokończony adhoc nie przysłania sesji planu — loadDraftForDay wybiera draft strony', async () => {
    // 1) Sesja planu: 2 odhaczone ćwiczenia, po checkpoincie (dirty=false, remote).
    const planDraft: ActiveWorkoutDraft = {
      ...baseDraft,
      sessionId: 'workout-plan-1',
      remoteSessionId: 'workout-plan-1',
      dayId: 'day-1',
      date: '2026-04-03',
      dirty: false,
      updatedAt: 200,
      version: 6,
    };
    // 2) Porzucony szybki trening — nowszy i dirty, wygrywa globalny pick.
    const adhocDraft: ActiveWorkoutDraft = {
      ...baseDraft,
      sessionId: 'workout-adhoc-1',
      remoteSessionId: 'workout-adhoc-1',
      dayId: 'adhoc-123',
      date: '2026-04-03',
      dirty: true,
      updatedAt: 900,
      version: 2,
      exerciseSets: { 'adhoc-ex': [{ reps: 5, weight: 60, completed: true }] },
    };
    await workoutDraftDb.saveActiveDraft(planDraft);
    await workoutDraftDb.saveActiveDraft(adhocDraft);

    // Globalny pick (dzisiejsze zachowanie loadActiveDraft): adhoc — niezmiennik.
    const globalPick = await workoutDraftDb.loadActiveDraft('user-1');
    expect(globalPick?.sessionId).toBe('workout-adhoc-1');

    // 3) Powrót na stronę planu bez ?session: draft TEJ strony, nie globalny pick.
    const pageDraft = await workoutDraftDb.loadDraftForDay('user-1', 'day-1', '2026-04-03');
    expect(pageDraft?.sessionId).toBe('workout-plan-1');
    expect(pageDraft?.exerciseSets['ex-1'].filter((s) => s.completed)).toHaveLength(2);

    // Strona bez własnego draftu → null (WorkoutDay wraca do globalnego picku).
    expect(await workoutDraftDb.loadDraftForDay('user-1', 'day-2', '2026-04-03')).toBeNull();
    expect(await workoutDraftDb.loadDraftForDay('user-1', 'day-1', '2026-04-04')).toBeNull();
  });

  it('markPromotedToRemote nie cofa treści, gdy draft remote ma nowszą version (R2-04)', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const remoteId = 'workout-user-1-day-1-2026-04-03';
    // Nowszy draft remote (trwający/ukończony trening) + osierocony stary provisional.
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: remoteId,
      remoteSessionId: remoteId,
      version: 10,
      dayNotes: 'nowsza tresc remote',
    });
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      version: 2,
      dayNotes: 'stary orphan',
    });

    await workoutDraftDb.markPromotedToRemote('user-1', remoteId, provisionalId, { revision: 7, updatedAt: 900 });

    const remote = await workoutDraftDb.loadDraft('user-1', remoteId);
    const orphan = await workoutDraftDb.loadDraft('user-1', provisionalId);
    expect(orphan).toBeNull();
    expect(remote?.dayNotes).toBe('nowsza tresc remote');
    // Znaczniki chmury zawsze świeże (fakt serwera).
    expect(remote?.cloudRevision).toBe(7);
    expect(remote?.cloudUpdatedAt).toBe(900);
  });

  it('tombstone starszy niż 7 dni jest ignorowany i czyszczony (R2-04)', async () => {
    const provisionalId = 'local-workout-user-1-day-1-2026-04-03';
    const key = getPromotionTombstoneKey('user-1', provisionalId);
    localStorage.setItem(key, JSON.stringify({
      remoteId: 'workout-user-1-day-1-2026-04-03',
      at: Date.now() - 8 * 24 * 60 * 60 * 1000,
    }));

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      sessionId: provisionalId,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
    });

    const drafts = await workoutDraftDb.listDrafts('user-1');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].sessionId).toBe(provisionalId);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('clearActiveDraft removes stored record', async () => {
    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.clearActiveDraft('user-1');
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded).toBeNull();
  });

  it('clearActiveDraft bez sessionId usuwa tylko aktywną sesję z połączonego IDB+journal', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, updatedAt: 200 });
    workoutDraft.save({
      sessionId: 'workout-quick-active',
      dayId: 'adhoc-1',
      date: baseDraft.date,
      exerciseSets: baseDraft.exerciseSets,
      exerciseNotes: {},
      dayNotes: 'fallback-only quick',
      skippedExercises: [],
      savedAt: 900,
      version: 2,
    }, 'user-1');

    await workoutDraftDb.clearActiveDraft('user-1');

    expect(await workoutDraftDb.loadDraft('user-1', 'workout-quick-active')).toBeNull();
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).not.toBeNull();
  });

  it('clearActiveDraftIfVersion kasuje przy równej lub starszej wersji (R2-03)', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 4 });

    const cleared = await workoutDraftDb.clearActiveDraftIfVersion('user-1', baseDraft.sessionId, 4);

    expect(cleared).toBe(true);
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toBeNull();
  });

  it('awaria kasowania journalu nie usuwa jedynej kopii IDB ani nie zgłasza fałszywego sukcesu', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 4 });
    const journalKey = getScopedWorkoutDraftJournalKey('user-1');
    const originalRemoveItem = Storage.prototype.removeItem;
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (key === journalKey) throw new DOMException('storage unavailable', 'InvalidStateError');
      return originalRemoveItem.call(this, key);
    });

    await expect(workoutDraftDb.clearActiveDraftIfVersion('user-1', baseDraft.sessionId, 4))
      .rejects.toThrow('LOCAL_STORAGE_CLEAR_FAILED');
    removeSpy.mockRestore();

    // Po recovery rekord nadal jest osiągalny i cleanup można bezpiecznie ponowić.
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).not.toBeNull();
    expect(await workoutDraftDb.clearActiveDraftIfVersion('user-1', baseDraft.sessionId, 4)).toBe(true);
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toBeNull();
  });

  it('clearActiveDraftIfVersion odmawia przy nowszej wersji draftu (R2-03)', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 5, dayNotes: 'seria z finalnego RTT' });

    const cleared = await workoutDraftDb.clearActiveDraftIfVersion('user-1', baseDraft.sessionId, 4);

    expect(cleared).toBe(false);
    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);
    expect(loaded?.version).toBe(5);
    expect(loaded?.dayNotes).toBe('seria z finalnego RTT');
  });

  it('clearActiveDraftIfVersion zwraca true, gdy draft już nie istnieje', async () => {
    const cleared = await workoutDraftDb.clearActiveDraftIfVersion('user-1', 'workout-nieistniejacy', 4);
    expect(cleared).toBe(true);
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
      // Świeży draft (bezpiecznik 48h odrzuca starsze).
      savedAt: Date.now() - 1000,
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
    expect(localStorage.getItem(getScopedWorkoutDraftJournalKey('user-1'))).not.toBeNull();
  });

  it('fallback po restarcie zachowuje tożsamość i intencję finalnego syncu', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const finalDraft: ActiveWorkoutDraft = {
      ...baseDraft,
      sessionId: 'workout-remote-final',
      cycleId: 'cycle-final',
      sessionOrigin: 'remote',
      remoteSessionId: 'workout-remote-final',
      dayName: 'Nogi A',
      dayFocus: 'Siła',
      lastTouchedExerciseId: 'ex-1',
      completedLocally: true,
      finalSyncPending: true,
      dirty: true,
      version: 12,
      finalizedAt: 1_760_000_000_000,
    };

    await workoutDraftDb.saveActiveDraft(finalDraft);
    __resetWorkoutDraftDbConnectionForTests();

    const loaded = await workoutDraftDb.loadDraft('user-1', finalDraft.sessionId);

    expect(loaded).toMatchObject({
      sessionId: finalDraft.sessionId,
      cycleId: 'cycle-final',
      sessionOrigin: 'remote',
      remoteSessionId: 'workout-remote-final',
      dayName: 'Nogi A',
      dayFocus: 'Siła',
      lastTouchedExerciseId: 'ex-1',
      completedLocally: true,
      finalSyncPending: true,
      dirty: true,
      version: 12,
      finalizedAt: 1_760_000_000_000,
    });
  });

  it('fallback zachowuje updatedEventId potrzebny do tie-breakera cross-device', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      exerciseSets: {
        'ex-1': [{
          reps: 5,
          weight: 80,
          completed: true,
          updatedAt: 1_760_000_000_000,
          updatedEventId: 'watch-event-z',
        }],
      },
    });
    __resetWorkoutDraftDbConnectionForTests();

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded?.exerciseSets['ex-1'][0].updatedEventId).toBe('watch-event-z');
  });

  it('corrupted IndexedDB open po kill/resume odtwarza istniejący fallback localStorage', async () => {
    let openCount = 0;
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: baseDraft.exerciseSets,
      exerciseNotes: baseDraft.exerciseNotes,
      dayNotes: baseDraft.dayNotes,
      skippedExercises: baseDraft.skippedExercises,
      savedAt: Date.now(),
    }, 'user-1');
    __resetWorkoutDraftDbConnectionForTests();
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: {
        open: () => {
          openCount += 1;
          const request = new FakeRequest<IDBDatabase>();
          enqueue(() => {
            request.error = new Error('IndexedDB connection is corrupted');
            request.onerror?.(new Event('error'));
          });
          return request as unknown as IDBOpenDBRequest;
        },
      },
    });

    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.sessionId).toBe(baseDraft.sessionId);
    expect(loaded?.exerciseSets).toEqual(baseDraft.exerciseSets);
    expect(loaded?.dayNotes).toBe(baseDraft.dayNotes);
    expect(openCount).toBe(2);
  });

  it('total failure: gdy IDB i localStorage padną, leci DraftSaveTotalFailure ze stage (FIX-A T4)', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    try {
      await expect(workoutDraftDb.saveActiveDraft(baseDraft)).rejects.toMatchObject({ stage: 'fallback' });
      await expect(workoutDraftDb.saveActiveDraft(baseDraft)).rejects.toBeInstanceOf(DraftSaveTotalFailure);
    } finally {
      setItem.mockRestore();
    }
  });

  it('fallback OK: zapis do localStorage NIE rzuca (user nie widzi błędu, FIX-A T4)', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    await expect(workoutDraftDb.saveActiveDraft(baseDraft)).resolves.toBeUndefined();
  });

  it('clearActiveDraft usuwa też kopię fallback z localStorage', async () => {
    // Działające (fake) IDB + osierocona kopia fallback tej samej sesji.
    await workoutDraftDb.saveActiveDraft(baseDraft);
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: baseDraft.exerciseSets,
      exerciseNotes: baseDraft.exerciseNotes,
      dayNotes: baseDraft.dayNotes,
      skippedExercises: baseDraft.skippedExercises,
      savedAt: baseDraft.updatedAt,
    }, 'user-1');

    await workoutDraftDb.clearActiveDraft('user-1', baseDraft.sessionId);

    expect(workoutDraft.load('user-1')).toBeNull();
    expect(await workoutDraftDb.loadActiveDraft('user-1')).toBeNull();
  });

  it('clearActiveDraft czeka na rozpoczęty save tej samej sesji i nie pozwala mu wskrzesić draftu', async () => {
    const gate = blockNextPut();
    const save = workoutDraftDb.saveActiveDraft(baseDraft);
    await gate.started;

    const clear = workoutDraftDb.clearActiveDraft('user-1', baseDraft.sessionId);
    let clearFinished = false;
    void clear.then(() => { clearFinished = true; });
    await Promise.resolve();
    expect(clearFinished).toBe(false);

    gate.release();
    await Promise.all([save, clear]);
    expect(await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId)).toBeNull();
  });

  it('migrateFromLocalStorage pomija i usuwa drafty starsze niż 48h', async () => {
    localStorage.setItem(LOCAL_STORAGE_WORKOUT_DRAFT_KEY, JSON.stringify({
      sessionId: 'legacy-old',
      dayId: 'day-1',
      date: '2026-04-01',
      exerciseSets: { 'ex-1': [{ reps: 5, weight: 50, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      savedAt: Date.now() - 49 * 60 * 60 * 1000,
    }));

    const migrated = await workoutDraftDb.migrateFromLocalStorage('user-1');
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(migrated).toBeNull();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_WORKOUT_DRAFT_KEY)).toBeNull();
  });

  it('fallback localStorage zachowuje warmupChecked (Z162)', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      warmupChecked: ['warmup.hipCircles'],
    });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.warmupChecked).toEqual(['warmup.hipCircles']);
  });

  it('fallback localStorage zachowuje cloudRevision i version draftu', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      cloudRevision: 5,
      cloudUpdatedAt: 1730000000000,
      version: 7,
    });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.cloudRevision).toBe(5);
    expect(loaded?.cloudUpdatedAt).toBe(1730000000000);
    expect(loaded?.version).toBe(7);
  });

  it('bug 13: fallback localStorage niesie exerciseMetrics, exerciseNames i pendingWriteId/pendingWriteVersion', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      exerciseMetrics: { 'ex-1': { rpe: 8, pain: 1, quality: 5 } },
      exerciseNames: { 'ex-1': 'Przysiad ze sztangą' },
      pendingWriteId: 'write-abc',
      pendingWriteVersion: 1,
    });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.exerciseMetrics).toEqual({ 'ex-1': { rpe: 8, pain: 1, quality: 5 } });
    expect(loaded?.exerciseNames).toEqual({ 'ex-1': 'Przysiad ze sztangą' });
    // Kontrakt R2-01: retry checkpointu po lost-ack idzie ze STARYM writeId
    // (draftWriteId reuse'uje pendingWriteId przy zgodnej wersji) — bez
    // round-tripu przez fallback retry kończył się fałszywym konfliktem.
    expect(loaded?.pendingWriteId).toBe('write-abc');
    expect(loaded?.pendingWriteVersion).toBe(1);
  });

  it('bug 13: metryki wpisane po awarii IDB przeżywają restart — merge per ćwiczenie, fallback wygrywa per klucz', async () => {
    // IDB umarło w trakcie sesji: rekord IDB ma metryki sprzed awarii...
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 2,
      exerciseMetrics: { 'ex-1': { rpe: 7 } },
      exerciseNames: { 'ex-1': 'Przysiad' },
    });
    // ...a wszystko po awarii (nowe RPE dla ex-1, świeże ex-2, pendingWrite)
    // żyje wyłącznie w fallbacku localStorage.
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: { 'ex-1': [{ reps: 6, weight: 85, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      savedAt: baseDraft.updatedAt + 100,
      version: 9,
      exerciseMetrics: { 'ex-1': { rpe: 9 }, 'ex-2': { pain: 2 } },
      exerciseNames: { 'ex-2': 'Wykroki' },
      pendingWriteId: 'write-po-awarii',
      pendingWriteVersion: 9,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded?.version).toBe(9);
    // Fallback wygrywa per klucz; klucze, których fallback nie zna, zostają z IDB.
    expect(loaded?.exerciseMetrics).toEqual({ 'ex-1': { rpe: 9 }, 'ex-2': { pain: 2 } });
    expect(loaded?.exerciseNames).toEqual({ 'ex-1': 'Przysiad', 'ex-2': 'Wykroki' });
    expect(loaded?.pendingWriteId).toBe('write-po-awarii');
    expect(loaded?.pendingWriteVersion).toBe(9);
  });

  it('Z185: sessionSwaps przeżywa roundtrip przez IDB i fallback localStorage', async () => {
    const swaps = { 'ex-1': { id: 'ex-1__swap-wyciskanie', name: 'Wyciskanie', sets: '3 x 6-8' } };
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, sessionSwaps: swaps });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');
    expect(loaded?.sessionSwaps).toEqual(swaps);

    // Fallback: IDB niedostępne — pole musi przejść przez kształt WorkoutDraft.
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    __resetWorkoutDraftDbConnectionForTests();
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, sessionSwaps: swaps });
    const fromFallback = await workoutDraftDb.loadActiveDraft('user-1');
    expect(fromFallback?.sessionSwaps).toEqual(swaps);
  });

  it('fallback niesie znaczniki czasu: startedAt/lastActivityAt/finalizedAt przeżywają roundtrip (incydent 180 s)', async () => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      startedAt: 1_000_000,
      lastActivityAt: 5_500_000,
      finalizedAt: 6_000_000,
    });
    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.startedAt).toBe(1_000_000);
    expect(loaded?.lastActivityAt).toBe(5_500_000);
    expect(loaded?.finalizedAt).toBe(6_000_000);
  });

  it('merge Z182: świeższy fallback wygrywa też znacznikami aktywności (nie dziedziczy stęchłego lastActivityAt z IDB)', async () => {
    // Incydent 2026-08-13: IDB umarło na starcie sesji (lastActivityAt = startedAt),
    // cały trening zapisywał się fallbackiem; przy finalizacji scalony draft wziął
    // lastActivityAt z IDB i clamp Z142 ściął czas 1h19m do 180 s.
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 2,
      startedAt: 1_000_000,
      lastActivityAt: 1_000_000,
    });
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: { 'ex-1': [{ reps: 6, weight: 85, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      savedAt: baseDraft.updatedAt + 100,
      version: 9,
      startedAt: 1_000_000,
      lastActivityAt: 5_700_000,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded?.version).toBe(9);
    expect(loaded?.startedAt).toBe(1_000_000);
    expect(loaded?.lastActivityAt).toBe(5_700_000);
  });

  it('po odzyskaniu IDB merge zachowuje finalSyncPending z nowszego fallbacku', async () => {
    await workoutDraftDb.saveActiveDraft({
      ...baseDraft,
      version: 2,
      completedLocally: false,
      finalSyncPending: false,
    });
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      cycleId: 'cycle-after-idb-failure',
      sessionOrigin: 'remote',
      remoteSessionId: baseDraft.sessionId,
      exerciseSets: baseDraft.exerciseSets,
      exerciseNotes: baseDraft.exerciseNotes,
      exerciseMetrics: baseDraft.exerciseMetrics,
      dayNotes: baseDraft.dayNotes,
      skippedExercises: baseDraft.skippedExercises,
      savedAt: baseDraft.updatedAt + 100,
      version: 9,
      dirty: true,
      completedLocally: true,
      finalSyncPending: true,
      finalizedAt: 1_760_000_000_000,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded).toMatchObject({
      cycleId: 'cycle-after-idb-failure',
      sessionOrigin: 'remote',
      remoteSessionId: baseDraft.sessionId,
      dirty: true,
      completedLocally: true,
      finalSyncPending: true,
      finalizedAt: 1_760_000_000_000,
      version: 9,
    });
  });

  it('Z182: fallback localStorage z wyższą wersją wygrywa z IDB (najświeższy snapshot)', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 5 });
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: { 'ex-1': [{ reps: 6, weight: 85, completed: true }] },
      exerciseNotes: {},
      dayNotes: 'nowszy zapis awaryjny',
      skippedExercises: [],
      savedAt: baseDraft.updatedAt + 100,
      version: 8,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded?.version).toBe(8);
    expect(loaded?.dayNotes).toBe('nowszy zapis awaryjny');
    expect(loaded?.exerciseSets['ex-1']).toEqual([{ reps: 6, weight: 85, completed: true }]);
    // Pola, których fallback nie niesie, dziedziczone z rekordu IDB.
    expect(loaded?.cycleId).toBe(baseDraft.cycleId);
    expect(loaded?.exerciseMetrics).toEqual(baseDraft.exerciseMetrics);

    // Zwycięzca od razu przepisany do IDB: kolejny odczyt bez fallbacku daje ten sam stan.
    workoutDraft.clear('user-1');
    const reloaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);
    expect(reloaded?.version).toBe(8);
    expect(reloaded?.dayNotes).toBe('nowszy zapis awaryjny');
  });

  it('Z182: loadActiveDraft też preferuje świeższy fallback tej samej sesji', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 5 });
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: { 'ex-1': [{ reps: 6, weight: 85, completed: true }] },
      exerciseNotes: {},
      dayNotes: 'fallback aktywnej sesji',
      skippedExercises: [],
      savedAt: baseDraft.updatedAt + 100,
      version: 8,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadActiveDraft('user-1');

    expect(loaded?.version).toBe(8);
    expect(loaded?.dayNotes).toBe('fallback aktywnej sesji');
  });

  it('Z182 niezmiennik: fallback ze starszą wersją jest ignorowany (dzisiejsze zachowanie)', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 5 });
    workoutDraft.save({
      sessionId: baseDraft.sessionId,
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: { 'ex-1': [{ reps: 1, weight: 10, completed: false }] },
      exerciseNotes: {},
      dayNotes: 'starszy zombie-fallback',
      skippedExercises: [],
      savedAt: baseDraft.updatedAt + 999,
      version: 3,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded?.version).toBe(5);
    expect(loaded?.dayNotes).toBe(baseDraft.dayNotes);
  });

  it('Z182 niezmiennik: fallback INNEJ sesji nie podmienia draftu', async () => {
    await workoutDraftDb.saveActiveDraft({ ...baseDraft, version: 5 });
    workoutDraft.save({
      sessionId: 'workout-obca-sesja',
      dayId: baseDraft.dayId,
      date: baseDraft.date,
      exerciseSets: { 'ex-9': [{ reps: 6, weight: 85, completed: true }] },
      exerciseNotes: {},
      dayNotes: 'inna sesja',
      skippedExercises: [],
      savedAt: baseDraft.updatedAt + 100,
      version: 9,
    }, 'user-1');

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(loaded?.version).toBe(5);
    expect(loaded?.dayNotes).toBe(baseDraft.dayNotes);
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

  it('ignoruje prefilowane serie bez completed (porzucony start to nie treść)', () => {
    expect(hasDraftContent({ 'ex-1': [{ reps: 10, weight: 50, completed: false }] }, {}, '', [])).toBe(false);
  });

  it('widzi odhaczoną serię lub notatkę', () => {
    expect(hasDraftContent({ 'ex-1': [{ reps: 10, weight: 50, completed: true }] }, {}, '', [])).toBe(true);
    expect(hasDraftContent({ 'ex-1': [{ reps: 10, weight: 50, completed: false }] }, {}, 'notatka dnia', [])).toBe(true);
  });
});

describe('singleton polaczenia IDB (R2-23)', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetWorkoutDraftDbConnectionForTests();
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: new FakeIndexedDbFactory(),
    });
  });

  it('kolejne operacje uzywaja jednego polaczenia (open raz)', async () => {
    const factory = window.indexedDB as unknown as { open: (name: string, version?: number) => IDBOpenDBRequest };
    const openSpy = vi.spyOn(factory, 'open');

    await workoutDraftDb.saveActiveDraft(baseDraft);
    await workoutDraftDb.loadActiveDraft('user-1');
    await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('po zerwaniu polaczenia (onclose) nastepna operacja otwiera nowe', async () => {
    const factory = window.indexedDB as unknown as { open: (name: string, version?: number) => IDBOpenDBRequest; lastDb?: { onclose?: (() => void) | null } };
    const openSpy = vi.spyOn(factory, 'open');

    await workoutDraftDb.saveActiveDraft(baseDraft);
    expect(openSpy).toHaveBeenCalledTimes(1);

    // iOS potrafi zerwac polaczenie po powrocie z tla.
    factory.lastDb?.onclose?.();

    const loaded = await workoutDraftDb.loadDraft('user-1', baseDraft.sessionId);
    expect(loaded?.sessionId).toBe(baseDraft.sessionId);
    expect(openSpy).toHaveBeenCalledTimes(2);
  });
});
