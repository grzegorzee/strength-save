import { test, expect } from '@playwright/test';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from 'firebase/firestore';
import type { TrainingDay } from '../../src/data/trainingPlan';
import { saveTrainingPlanWithRevision } from '../../src/lib/training-plan-save';

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

const plan = (exerciseName: string): TrainingDay[] => [
  {
    id: 'day-1',
    dayName: 'Poniedziałek',
    weekday: 'monday',
    focus: 'Push',
    exercises: [{ id: 'ex-1', name: exerciseName, sets: '3x8', instructions: [] }],
  },
];

const connectClient = async (email: string, appName: string): Promise<{ app: FirebaseApp; db: ReturnType<typeof getFirestore> }> => {
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, appName);
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_EMULATOR, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  await signInWithEmailAndPassword(auth, email, PASSWORD);
  return { app, db };
};

test('Emulator: dwie równoległe edycje planu — stale revision dostaje PLAN_CONFLICT', async () => {
  const email = `plan-conflict-${Date.now()}@e2e.test`;
  const uid = await createAuthUser(email);
  await seedDoc(`users/${uid}`, {
    uid,
    email,
    displayName: 'Plan Conflict',
    role: 'user',
    status: 'active',
    access: { enabled: true },
  });
  await seedDoc(`training_plans/${uid}`, {
    days: plan('Bench'),
    durationWeeks: 12,
    startDate: '2026-06-01',
    revision: 0,
  });

  const a = await connectClient(email, `plan-conflict-a-${Date.now()}`);
  const b = await connectClient(email, `plan-conflict-b-${Date.now()}`);

  try {
    await saveTrainingPlanWithRevision(a.db, {
      userId: uid,
      newPlan: plan('Bench A'),
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-06-01',
    });
    await expect(saveTrainingPlanWithRevision(b.db, {
      userId: uid,
      newPlan: plan('Bench B'),
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-06-01',
    })).rejects.toThrow('PLAN_CONFLICT');

    const saved = await getDoc(doc(a.db, 'training_plans', uid));
    expect(saved.data()?.revision).toBe(1);
    expect((saved.data()?.days as TrainingDay[])[0].exercises[0].name).toBe('Bench A');
  } finally {
    await Promise.all([deleteApp(a.app), deleteApp(b.app)]);
  }
});
