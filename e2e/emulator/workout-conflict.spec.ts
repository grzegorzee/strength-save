import { test, expect } from '@playwright/test';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import type { WorkoutSession } from '../../src/types';
import { mergePromotedDraft, type ActiveWorkoutDraft } from '../../src/lib/workout-draft-db';
import { saveWorkoutBatchWithRevision } from '../../src/lib/workout-save';
import { syncWorkoutSession, type WorkoutSyncDeps } from '../../src/lib/workout-sync-engine';

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8081';
const PROJECT_ID = 'fittracker-workouts';
const PASSWORD = 'e2e-test-password-123';

async function createAuthUser(email: string): Promise<string> {
  const res = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    throw new Error(`Auth emulator signUp failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { localId: string };
  return data.localId;
}

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFirestoreValue(value: unknown): FirestoreValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (value !== null && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toFirestoreValue(v)]),
        ),
      },
    };
  }
  throw new Error(`Unsupported Firestore value: ${String(value)}`);
}

async function seedDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)]),
  );
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!res.ok) {
    throw new Error(`Firestore emulator seed failed (${path}): ${res.status} ${await res.text()}`);
  }
}

const connectClient = async (email: string, appName: string): Promise<{ app: FirebaseApp; db: ReturnType<typeof getFirestore> }> => {
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, appName);
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_EMULATOR, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  await signInWithEmailAndPassword(auth, email, PASSWORD);
  return { app, db };
};

const seedActiveUser = async (uid: string, email: string): Promise<void> => {
  await seedDoc(`users/${uid}`, {
    uid,
    email,
    displayName: 'Workout Conflict',
    role: 'user',
    status: 'active',
    access: { enabled: true },
  });
};

const workoutSeed = (uid: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  userId: uid,
  dayId: 'day-1',
  date: '2026-07-03',
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
  completed: false,
  updatedAt: 1000,
  revision: 1,
  ...over,
});

const payload = (reps: number) => ([
  { exerciseId: 'ex-1', sets: [{ reps, weight: 100, completed: true }] },
]);

test('Emulator: dwóch klientów, ten sam trening — stale revision dostaje WORKOUT_CONFLICT', async () => {
  const email = `workout-conflict-${Date.now()}@e2e.test`;
  const uid = await createAuthUser(email);
  await seedActiveUser(uid, email);
  const sessionId = `workout-${uid}-day-1-2026-07-03`;
  await seedDoc(`workouts/${sessionId}`, workoutSeed(uid));

  const a = await connectClient(email, `wc-a-${Date.now()}`);
  const b = await connectClient(email, `wc-b-${Date.now()}`);

  try {
    const first = await saveWorkoutBatchWithRevision(a.db, sessionId, payload(9), {
      expectedRevision: 1,
      writeId: 'write-a',
    });
    expect(first.revision).toBe(2);

    await expect(saveWorkoutBatchWithRevision(b.db, sessionId, payload(10), {
      expectedRevision: 1,
      writeId: 'write-b',
    })).rejects.toThrow('WORKOUT_CONFLICT');

    const saved = await getDoc(doc(a.db, 'workouts', sessionId));
    expect(saved.data()?.revision).toBe(2);
    expect((saved.data()?.exercises as { sets: { reps: number }[] }[])[0].sets[0].reps).toBe(9);
  } finally {
    await Promise.all([deleteApp(a.app), deleteApp(b.app)]);
  }
});

test('Emulator: lost-ack retry z tym samym writeId = sukces alreadyApplied bez podbicia revision', async () => {
  const email = `workout-lostack-${Date.now()}@e2e.test`;
  const uid = await createAuthUser(email);
  await seedActiveUser(uid, email);
  const sessionId = `workout-${uid}-day-1-2026-07-03`;
  await seedDoc(`workouts/${sessionId}`, workoutSeed(uid));

  const client = await connectClient(email, `wl-${Date.now()}`);

  try {
    const first = await saveWorkoutBatchWithRevision(client.db, sessionId, payload(9), {
      expectedRevision: 1,
      writeId: 'write-w',
    });
    expect(first.revision).toBe(2);
    expect(first.alreadyApplied).toBeUndefined();

    // Retry identycznego zapisu (odpowiedź "zginęła"): ten sam writeId, stale expectedRevision.
    const retry = await saveWorkoutBatchWithRevision(client.db, sessionId, payload(9), {
      expectedRevision: 1,
      writeId: 'write-w',
    });
    expect(retry.alreadyApplied).toBe(true);
    expect(retry.revision).toBe(2);

    const saved = await getDoc(doc(client.db, 'workouts', sessionId));
    expect(saved.data()?.revision).toBe(2);
    expect(saved.data()?.lastWriteId).toBe('write-w');
  } finally {
    await deleteApp(client.app);
  }
});

test('Emulator: edycja po final syncu z expectedRevision odczytanym z serwera przechodzi', async () => {
  const email = `workout-edit-${Date.now()}@e2e.test`;
  const uid = await createAuthUser(email);
  await seedActiveUser(uid, email);
  const sessionId = `workout-${uid}-day-1-2026-07-03`;
  await seedDoc(`workouts/${sessionId}`, workoutSeed(uid, { completed: true }));

  const client = await connectClient(email, `we-${Date.now()}`);

  try {
    // Wzorzec Z13: baseline czytany z serwera w momencie zapisu edycji.
    const server = await getDoc(doc(client.db, 'workouts', sessionId));
    const expectedRevision = Math.max(0, Math.floor(Number(server.data()?.revision ?? 0)));
    expect(expectedRevision).toBe(1);

    const result = await saveWorkoutBatchWithRevision(client.db, sessionId, payload(12), {
      expectedRevision,
      writeId: 'write-edit',
    });
    expect(result.revision).toBe(2);

    const saved = await getDoc(doc(client.db, 'workouts', sessionId));
    expect((saved.data()?.exercises as { sets: { reps: number }[] }[])[0].sets[0].reps).toBe(12);
  } finally {
    await deleteApp(client.app);
  }
});

test('Emulator: promocja provisional->remote przez silnik; retry nie duplikuje dokumentu', async () => {
  const email = `workout-promote-${Date.now()}@e2e.test`;
  const uid = await createAuthUser(email);
  await seedActiveUser(uid, email);
  const provisionalId = `local-workout-${uid}-day-1-2026-07-03`;
  const remoteId = `workout-${uid}-day-1-2026-07-03`;

  const client = await connectClient(email, `wp-${Date.now()}`);
  const db = client.db;

  // In-memory magazyn draftów — na siłowni to IndexedDB; silnik dostaje go przez deps.
  const drafts = new Map<string, ActiveWorkoutDraft>();
  drafts.set(provisionalId, {
    sessionId: provisionalId,
    userId: uid,
    dayId: 'day-1',
    date: '2026-07-03',
    cycleId: null,
    sessionOrigin: 'provisional',
    remoteSessionId: null,
    exerciseSets: { 'ex-1': [{ reps: 5, weight: 50, completed: true }] },
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    skippedExercises: [],
    startedAt: 1000,
    finalizedAt: 61000,
    updatedAt: 2000,
    lastFirebaseSyncAt: null,
    dirty: true,
    completedLocally: true,
    finalSyncPending: true,
    version: 1,
  });

  let createSessionCalls = 0;

  const deps: WorkoutSyncDeps = {
    loadDraft: async (_ownerId, sessionId) => drafts.get(sessionId) ?? null,
    saveWorkout: async (sessionId, exercises, options) => {
      try {
        const state = await saveWorkoutBatchWithRevision(db, sessionId, exercises, options);
        return { success: true, ...state };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    getFromServer: async (sessionId) => {
      const snapshot = await getDoc(doc(db, 'workouts', sessionId));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as WorkoutSession) : null;
    },
    createSession: async (dayId, date) => {
      createSessionCalls += 1;
      const session: WorkoutSession = {
        id: remoteId,
        userId: uid,
        dayId,
        date: date ?? '2026-07-03',
        exercises: [],
        completed: false,
        updatedAt: Date.now(),
        revision: 0,
      };
      await setDoc(doc(db, 'workouts', remoteId), { ...session });
      return { session };
    },
    markPromoted: async (_ownerId, remoteSessionId, sessionId, cloudState) => {
      const current = sessionId ? drafts.get(sessionId) : undefined;
      if (!current) return;
      drafts.delete(current.sessionId);
      drafts.set(remoteSessionId, {
        ...current,
        sessionId: remoteSessionId,
        sessionOrigin: 'remote',
        remoteSessionId,
        version: current.version + 1,
        ...(cloudState?.updatedAt !== undefined && { cloudUpdatedAt: cloudState.updatedAt }),
        ...(cloudState?.revision !== undefined && { cloudRevision: cloudState.revision }),
      });
    },
    markSynced: async () => undefined,
    setCloudBaseline: async () => undefined,
    setPendingWrite: async (_ownerId, sessionId, pending) => {
      const current = drafts.get(sessionId);
      if (!current) return;
      drafts.set(sessionId, {
        ...current,
        pendingWriteId: pending ? pending.writeId : null,
        pendingWriteVersion: pending ? pending.version : null,
      });
    },
    clearDraftIfVersion: async (_ownerId, sessionId, expectedVersion) => {
      const current = drafts.get(sessionId);
      if (current && current.version > expectedVersion) return false;
      drafts.delete(sessionId);
      return true;
    },
    queue: { remove: () => undefined },
    isOnline: () => true,
  };

  try {
    const first = await syncWorkoutSession(uid, provisionalId, 'final', deps);
    expect(first.success).toBe(true);
    expect(first.promotedSessionId).toBe(remoteId);
    expect(createSessionCalls).toBe(1);
    // Draft wyczyszczony po udanym finalu.
    expect(drafts.size).toBe(0);

    const saved = await getDoc(doc(db, 'workouts', remoteId));
    expect(saved.exists()).toBe(true);
    expect(saved.data()?.completed).toBe(true);
    expect(saved.data()?.revision).toBe(1);

    // Retry (np. zdublowany event online): brak draftu = skipped, zero duplikatów.
    const second = await syncWorkoutSession(uid, provisionalId, 'final', deps);
    expect(second.success).toBe(true);
    expect(second.skipped).toBe(true);
    expect(createSessionCalls).toBe(1);

    const provisionalDoc = await getDoc(doc(db, 'workouts', provisionalId));
    expect(provisionalDoc.exists()).toBe(false);
  } finally {
    await deleteApp(client.app);
  }
});

test('Emulator: sync orphana po promocji nie nadpisuje nowszej treści treningu (R2-04)', async () => {
  const email = `workout-orphan-${Date.now()}@e2e.test`;
  const uid = await createAuthUser(email);
  await seedActiveUser(uid, email);
  const provisionalId = `local-workout-${uid}-day-1-2026-07-03`;
  const remoteId = `workout-${uid}-day-1-2026-07-03`;
  // Chmura ma nowszą treść (reps=12, revision 3) — wynik trwającego treningu.
  await seedDoc(`workouts/${remoteId}`, workoutSeed(uid, {
    exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 12, weight: 100, completed: true }] }],
    revision: 3,
    updatedAt: 5000,
  }));

  const client = await connectClient(email, `wo-${Date.now()}`);
  const db = client.db;

  const baseDraft: Omit<ActiveWorkoutDraft, 'sessionId' | 'sessionOrigin' | 'remoteSessionId' | 'version' | 'exerciseSets'> = {
    userId: uid,
    dayId: 'day-1',
    date: '2026-07-03',
    cycleId: null,
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    skippedExercises: [],
    startedAt: 1000,
    updatedAt: 2000,
    lastFirebaseSyncAt: null,
    dirty: true,
    completedLocally: false,
    finalSyncPending: false,
  };

  // Lokalne drafty: nowszy remote (odzwierciedla trwający trening) + stary orphan provisional.
  const drafts = new Map<string, ActiveWorkoutDraft>();
  drafts.set(remoteId, {
    ...baseDraft,
    sessionId: remoteId,
    sessionOrigin: 'remote',
    remoteSessionId: remoteId,
    version: 10,
    cloudRevision: 3,
    exerciseSets: { 'ex-1': [{ reps: 12, weight: 100, completed: true }] },
  });
  drafts.set(provisionalId, {
    ...baseDraft,
    sessionId: provisionalId,
    sessionOrigin: 'provisional',
    remoteSessionId: null,
    version: 2,
    exerciseSets: { 'ex-1': [{ reps: 5, weight: 50, completed: true }] },
  });

  const deps: WorkoutSyncDeps = {
    loadDraft: async (_ownerId, sessionId) => drafts.get(sessionId) ?? null,
    saveWorkout: async (sessionId, exercises, options) => {
      try {
        const state = await saveWorkoutBatchWithRevision(db, sessionId, exercises, options);
        return { success: true, ...state };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    getFromServer: async (sessionId) => {
      const snapshot = await getDoc(doc(db, 'workouts', sessionId));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as WorkoutSession) : null;
    },
    createSession: async (dayId, date) => {
      // Deterministyczny id: sesja już istnieje, createWorkoutSession zwraca istniejącą.
      const snapshot = await getDoc(doc(db, 'workouts', remoteId));
      return {
        session: {
          id: remoteId,
          userId: uid,
          dayId,
          date: date ?? '2026-07-03',
          exercises: (snapshot.data()?.exercises ?? []) as WorkoutSession['exercises'],
          completed: false,
          updatedAt: Number(snapshot.data()?.updatedAt ?? 0),
          revision: Number(snapshot.data()?.revision ?? 0),
        },
      };
    },
    // REALNA logika merge promocji z draft-db (Z32): nowsza treść wygrywa.
    markPromoted: async (_ownerId, remoteSessionId, sessionId, cloudState) => {
      const fromDraft = sessionId ? drafts.get(sessionId) ?? null : null;
      const remoteDraft = drafts.get(remoteSessionId) ?? null;
      const next = mergePromotedDraft(fromDraft, remoteDraft, remoteSessionId, cloudState);
      if (sessionId) drafts.delete(sessionId);
      if (next) drafts.set(remoteSessionId, next);
    },
    markSynced: async () => undefined,
    setCloudBaseline: async () => undefined,
    setPendingWrite: async () => undefined,
    clearDraftIfVersion: async (_ownerId, sessionId, expectedVersion) => {
      const current = drafts.get(sessionId);
      if (current && current.version > expectedVersion) return false;
      drafts.delete(sessionId);
      return true;
    },
    queue: { remove: () => undefined },
    isOnline: () => true,
  };

  try {
    const outcome = await syncWorkoutSession(uid, provisionalId, 'checkpoint', deps);
    expect(outcome.success).toBe(true);
    expect(outcome.promotedSessionId).toBe(remoteId);

    // Chmura NIE cofnięta do treści orphana: nowsza treść (reps=12) przetrwała.
    const saved = await getDoc(doc(db, 'workouts', remoteId));
    expect((saved.data()?.exercises as { sets: { reps: number }[] }[])[0].sets[0].reps).toBe(12);

    // Jeden draft lokalnie (remote), orphan nie wskrzeszony.
    expect(drafts.size).toBe(1);
    expect(drafts.get(remoteId)?.exerciseSets['ex-1'][0].reps).toBe(12);
  } finally {
    await deleteApp(client.app);
  }
});
