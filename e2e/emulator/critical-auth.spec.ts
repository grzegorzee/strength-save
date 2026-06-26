import { test, expect, type Page } from '@playwright/test';

// Krytyczny flow na realnym Auth + Firestore (emulatory, prawdziwe firestore.rules):
// logowanie email/hasło i rozjazd statusów konta (active → dashboard,
// pending_verification → bramka weryfikacji email).
// Functions emulator nie jest podnoszony — syncUserProfile pada (connection refused),
// app musi zbudować profil z seedowanego dokumentu users/{uid} (real rules read).

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8081';
// Musi zgadzać się z VITE_FIREBASE_PROJECT_ID z .env (SDK adresuje emulator per projectId).
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

async function seedUserProfile(uid: string, profile: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(
    Object.entries(profile).map(([k, v]) => [k, toFirestoreValue(v)]),
  );
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Emulator: token "owner" = admin SDK bypass rules (tak tworzy profile produkcja).
        Authorization: 'Bearer owner',
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!res.ok) {
    throw new Error(`Firestore emulator seed failed: ${res.status} ${await res.text()}`);
  }
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
  if (!res.ok) throw new Error(`Firestore emulator seed failed (${path}): ${res.status} ${await res.text()}`);
}

async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore emulator read failed (${path}): ${res.status}`);
  return await res.json() as Record<string, unknown>;
}

async function loginThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('./#/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('tab', { name: 'Email + hasło' }).click();
  // Na stronie jest też pole email waitlisty — zawęź do panelu logowania.
  const panel = page.getByRole('tabpanel', { name: 'Email + hasło' });
  await panel.getByPlaceholder('Email').fill(email);
  await panel.getByPlaceholder('Hasło', { exact: true }).fill(PASSWORD);
  await panel.getByRole('button', { name: 'Zaloguj przez email' }).click();
}

test.describe('Emulator critical: auth + rules', () => {
  test('aktywny user loguje się i widzi dashboard (real auth + rules read profilu)', async ({ page }) => {
    const email = `active-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    await seedUserProfile(uid, {
      uid,
      email,
      displayName: 'E2E Active',
      role: 'user',
      status: 'active',
      onboardingCompleted: true,
      access: { enabled: true },
      registration: { source: 'email' },
    });

    await loginThroughUi(page, email);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Rozpocznij trening|Dzisiaj wolne|Trening ukończony/i)).toBeVisible();
  });

  test('pending_verification user trafia na bramkę weryfikacji, nie na dashboard', async ({ page }) => {
    const email = `pending-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    await seedUserProfile(uid, {
      uid,
      email,
      displayName: 'E2E Pending',
      role: 'user',
      status: 'pending_verification',
      onboardingCompleted: false,
      access: { enabled: true },
      registration: { source: 'email' },
    });

    await loginThroughUi(page, email);

    await expect(page.getByText('Potwierdź adres email')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('start treningu zapisuje sesję przez realne Firestore Rules', async ({ page }) => {
    const email = `workout-start-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    const today = new Date().toISOString().slice(0, 10);
    const dayId = 'day-e2e';
    const days = [{
      id: dayId,
      dayName: 'E2E workout',
      weekday: 'monday',
      focus: 'Push',
      exercises: [{ id: 'exercise-e2e', name: 'Przysiad', sets: '3 x 5', instructions: [] }],
    }];

    await seedUserProfile(uid, {
      uid, email, displayName: 'E2E Workout', role: 'user', status: 'active',
      onboardingCompleted: true, access: { enabled: true }, registration: { source: 'email' },
    });
    await seedDoc(`training_plans/${uid}`, { days, durationWeeks: 12, startDate: today, updatedAt: new Date().toISOString() });
    await seedDoc(`plan_cycles/cycle-${uid}`, {
      userId: uid, days, durationWeeks: 12, startDate: today, status: 'active', createdAt: new Date().toISOString(),
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
    });

    await loginThroughUi(page, email);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await page.goto(`./#/workout/${dayId}?date=${today}&autostart=true`);
    await expect(page.getByText('Trening rozpoczęty!', { exact: true })).toBeVisible({ timeout: 15000 });

    const workoutId = `workout-${uid}-${dayId}-${today}`;
    await expect.poll(async () => JSON.stringify((await readDoc(`workouts/${workoutId}`))?.fields ?? {}), {
      timeout: 10000,
    }).toContain(uid);
  });
});
