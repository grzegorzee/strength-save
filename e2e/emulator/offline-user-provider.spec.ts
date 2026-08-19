import { expect, test, type Page } from '@playwright/test';

// A-T5: prawdziwy useAuth + UserProvider + persistent Firestore cache.
// Ten plik działa wyłącznie w e2e:emulator (VITE_E2E_MODE nie jest ustawione).
const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8081';
const PROJECT_ID = 'fittracker-workouts';
const PASSWORD = 'offline-profile-password-123';

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

const toFirestoreValue = (value: unknown): FirestoreValue => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value !== null && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toFirestoreValue(item)]),
        ),
      },
    };
  }
  throw new Error(`Unsupported value: ${String(value)}`);
};

const createAuthUser = async (email: string): Promise<string> => {
  const response = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  if (!response.ok) throw new Error(`Auth seed failed: ${response.status} ${await response.text()}`);
  return (await response.json() as { localId: string }).localId;
};

const seedProfile = async (uid: string, email: string, status: 'active' | 'suspended') => {
  const profile = {
    uid,
    email,
    displayName: `Cached ${status}`,
    role: 'user',
    status,
    onboardingCompleted: true,
    access: { enabled: true },
    registration: { source: 'email' },
    notifications: { welcomeSentAt: new Date().toISOString() },
    consents: {
      termsVersion: '2.0', privacyVersion: '2.0', healthGranted: true,
      healthVersion: '1.0', marketingGranted: false, marketingVersion: '1.0',
    },
  };
  const fields = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, toFirestoreValue(value)]));
  const response = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error(`Profile seed failed: ${response.status} ${await response.text()}`);
};

const login = async (page: Page, email: string) => {
  await page.goto('./#/login');
  await page.getByRole('tab', { name: /Email \+ (hasło|password)/i }).click();
  const panel = page.getByRole('tabpanel', { name: /Email \+ (hasło|password)/i });
  await panel.getByPlaceholder('Email').fill(email);
  await panel.getByPlaceholder(/Hasło|Password/i, { exact: true }).fill(PASSWORD);
  await panel.getByRole('button', { name: /Zaloguj przez email|Sign in with email/i }).click();
};

const blockAllBackend = async (page: Page) => {
  await page.route('http://127.0.0.1:8081/**', (route) => route.abort());
  await page.route('http://127.0.0.1:9099/**', (route) => route.abort());
  await page.route('http://127.0.0.1:5001/**', (route) => route.abort());
};

test.describe('UserProvider offline cache bez bypassu E2E', () => {
  test('cached active po odcięciu backendu nadal widzi Dashboard', async ({ page }) => {
    const email = `cached-active-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    await seedProfile(uid, email, 'active');
    await login(page, email);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('fittracker_e2e_auth_state'))).toBeNull();

    await blockAllBackend(page);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 });
  });

  test('cached suspended pozostaje fail-closed po odcięciu backendu', async ({ page }) => {
    const email = `cached-suspended-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    await seedProfile(uid, email, 'suspended');
    await login(page, email);
    await expect(page.getByRole('heading', { name: /Konto jest zawieszone|Account suspended/i })).toBeVisible({ timeout: 15_000 });

    await blockAllBackend(page);
    await page.reload();

    await expect(page.getByRole('heading', { name: /Konto jest zawieszone|Account suspended/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('auth bez cached profilu nie dostaje dostępu, gdy sync callable jest offline', async ({ page }) => {
    const email = `no-cache-${Date.now()}@e2e.test`;
    await createAuthUser(email);
    await page.route('http://127.0.0.1:5001/**', (route) => route.abort());

    await login(page, email);

    await expect(page.getByRole('heading', { name: /Nie udało się wczytać profilu|Profile could not load/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
  });
});
