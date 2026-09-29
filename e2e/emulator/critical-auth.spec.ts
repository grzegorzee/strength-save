import { test, expect, type Page } from '@playwright/test';
import { LEGAL_VERSIONS } from '../../src/lib/legal-versions';
import { dashboardGreeting, installEmulatorAppCheck } from './app-check';

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

// Krytyczny flow na realnym Auth + Firestore + Functions (emulatory,
// prawdziwe firestore.rules i produkcyjny callable syncUserProfile):
// logowanie email/hasło i rozjazd statusów konta (active → dashboard,
// pending_verification → bramka weryfikacji email).

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
  // Redesign 2026-08-20: email za przyciskiem "Kontynuuj z emailem" (bez zakładek).
  await page.getByRole('button', { name: 'Kontynuuj z emailem' }).click();
  // Na stronie jest też pole email waitlisty — formularz logowania jest pierwszy w DOM.
  await page.getByPlaceholder('Email').first().fill(email);
  await page.getByPlaceholder('Hasło', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Zaloguj przez email' }).click();
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
      consents: { termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy },
      access: { enabled: true },
      registration: { source: 'email' },
      notifications: { welcomeSentAt: new Date().toISOString() },
    });

    await loginThroughUi(page, email);

    await expect(dashboardGreeting(page)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Rozpocznij trening|Otwórz sesję|Zobacz trening/ }).first()).toBeVisible();
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
    await expect(dashboardGreeting(page)).toHaveCount(0);
  });

  // B3 (2026-09-29): prawdziwy callable verifyEmailCode pisze tylko po polsku;
  // klient tłumaczy po kodzie / details.reason. User EN nie może zobaczyć PL.
  test('EN: zły kod weryfikacji z realnego backendu = komunikat po angielsku', async ({ page }) => {
    const email = `pending-en-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    await seedUserProfile(uid, {
      uid,
      email,
      displayName: 'E2E Pending EN',
      role: 'user',
      status: 'pending_verification',
      onboardingCompleted: false,
      access: { enabled: true },
      registration: { source: 'email' },
      language: 'en',
    });
    await page.addInitScript(() => localStorage.setItem('app-language', 'en'));

    await page.goto('./#/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await page.getByPlaceholder('Email').first().fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in with email' }).click();

    await expect(page.getByRole('heading', { name: 'Confirm your email address' })).toBeVisible({ timeout: 15000 });
    // Najpierw niech się rozstrzygnie automatyczna wysyłka kodu (w emulatorze
    // SES nie jest skonfigurowany, więc kończy się ogólnym błędem wysyłki).
    await expect(page.getByText(/^(Failed to send the code\.|Resend \(\d+s\))$/)).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('6-digit code').fill('000000');
    await page.getByRole('button', { name: 'Confirm code' }).click();
    // Zależnie od tego, czy emulator zdążył wysłać kod: zły kod albo brak aktywnego kodu.
    await expect(page.getByText(/^(Incorrect code\. Check the latest email and try again\.|This code is no longer active\. Tap Resend to get a new one\.)$/))
      .toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Nieprawidłowy kod|Brak aktywnego kodu|Kod nie/)).toHaveCount(0);
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
      consents: { termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy },
      notifications: { welcomeSentAt: new Date().toISOString() },
    });
    await seedDoc(`training_plans/${uid}`, { days, durationWeeks: 12, startDate: today, updatedAt: new Date().toISOString() });
    await seedDoc(`plan_cycles/cycle-${uid}`, {
      userId: uid, days, durationWeeks: 12, startDate: today, status: 'active', createdAt: new Date().toISOString(),
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
    });

    await loginThroughUi(page, email);
    await expect(dashboardGreeting(page)).toBeVisible({ timeout: 15000 });
    await page.goto(`./#/workout/${dayId}?date=${today}&autostart=true`);
    await expect(page.getByText('Trening rozpoczęty!', { exact: true })).toBeVisible({ timeout: 15000 });
    // A fresh planned phone start offers warmup after persisting the draft.
    // Dismiss through the actual UI before proceeding; retain the default preference.
    await expect(page.getByTestId('prestart-sheet')).toBeVisible();
    await page.getByTestId('prestart-skip').click();
    await expect(page.getByTestId('prestart-sheet')).toBeHidden();

    const workoutId = `workout-${uid}-${dayId}-${today}`;
    await expect.poll(async () => JSON.stringify((await readDoc(`workouts/${workoutId}`))?.fields ?? {}), {
      timeout: 10000,
    }).toContain(uid);
  });
});
