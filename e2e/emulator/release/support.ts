import { expect, type Page } from '@playwright/test';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';
import { EMULATOR_APP_CHECK_TOKEN } from '../app-check';

// Release e2e (2026-09-29): wspólne narzędzia suite'u "release-e2e" na realnym
// Auth + Firestore (prawdziwe firestore.rules) + Functions (emulatory).
//
// Zasada danych: dokumenty usera powstają przez PRODUKCYJNE ścieżki zapisu:
// UI apki (Firestore SDK przez rules) albo callable Functions wołane klientem
// Firebase z tokenem usera/admina. Bezpośredni zapis Admin (Bearer owner) jest
// użyty tylko tam, gdzie produkcja też pisze ręcznie: rola admina (nadawana
// ręcznie w konsoli). Odczyty stanu Firestore idą przez Admin REST (owner).

export const AUTH_EMULATOR = 'http://127.0.0.1:9099';
export const FIRESTORE_EMULATOR = 'http://127.0.0.1:8081';
export const PROJECT_ID = 'fittracker-workouts';
export const PASSWORD = 'e2e-test-password-123';
const DOCS = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ---------- czas lokalny (strefa przeglądarki = strefa procesu testów) ----------

export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string, days: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
};
export const todayIso = (): string => isoDate(new Date());
export const WEEKDAY_VALUES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export const weekdayOf = (iso: string): (typeof WEEKDAY_VALUES)[number] => {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAY_VALUES[new Date(y, m - 1, d).getDay()];
};
/** Południe danego dnia lokalnie (bezpieczne dla page.clock.setFixedTime). */
export const noonOf = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

// ---------- Firestore REST (Admin, tylko odczyt stanu + rola admina) ----------

type FsValue = Record<string, unknown>;

export const fromFs = (value: FsValue): unknown => {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FsValue[] }).values ?? [];
    return values.map(fromFs);
  }
  if ('mapValue' in value) {
    const fields = (value.mapValue as { fields?: Record<string, FsValue> }).fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFs(v)]));
  }
  return undefined;
};

const toFs = (value: unknown): FsValue => {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFs) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toFs(v)])) } };
  }
  throw new Error(`Unsupported Firestore value: ${String(value)}`);
};

export type Doc = Record<string, unknown>;

export async function readDoc(path: string): Promise<Doc | null> {
  const res = await fetch(`${DOCS}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed (${path}): ${res.status} ${await res.text()}`);
  const data = await res.json() as { fields?: Record<string, FsValue> };
  return fromFs({ mapValue: { fields: data.fields ?? {} } }) as Doc;
}

/** Dokumenty kolekcji z polem `field` == value (Admin runQuery, bez indeksów złożonych). */
export async function queryDocs(collection: string, field: string, value: string): Promise<Array<{ id: string; data: Doc }>> {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: toFs(value) } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore query failed (${collection}): ${res.status} ${await res.text()}`);
  const rows = await res.json() as Array<{ document?: { name: string; fields?: Record<string, FsValue> } }>;
  return rows.filter((row) => row.document).map((row) => ({
    id: row.document!.name.split('/').pop()!,
    data: fromFs({ mapValue: { fields: row.document!.fields ?? {} } }) as Doc,
  }));
}

async function adminPatchDoc(path: string, data: Doc): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)]));
  const res = await fetch(`${DOCS}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore admin write failed (${path}): ${res.status} ${await res.text()}`);
}

// ---------- Auth emulator ----------

export async function createAuthUser(email: string): Promise<string> {
  const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`Auth emulator signUp failed: ${res.status} ${await res.text()}`);
  return (await res.json() as { localId: string }).localId;
}

export async function authUserExists(uid: string): Promise<boolean> {
  const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ localId: [uid] }),
  });
  if (!res.ok) throw new Error(`Auth emulator lookup failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { users?: unknown[] };
  return (data.users ?? []).length > 0;
}

export async function uidForEmail(email: string): Promise<string | null> {
  const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ email: [email] }),
  });
  if (!res.ok) throw new Error(`Auth emulator lookup failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { users?: Array<{ localId: string }> };
  return data.users?.[0]?.localId ?? null;
}

// ---------- klient Firebase w procesie testu (callable z tokenem usera) ----------

export interface CallableClient {
  app: FirebaseApp;
  call: <T = unknown>(name: string, data?: unknown) => Promise<T>;
  close: () => Promise<void>;
}

let clientSeq = 0;
export async function connectClient(email: string, password = PASSWORD): Promise<CallableClient> {
  clientSeq += 1;
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, `release-${Date.now()}-${clientSeq}`);
  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: async () => ({ token: EMULATOR_APP_CHECK_TOKEN, expireTimeMillis: Date.now() + 3_600_000 }),
    }),
    isTokenAutoRefreshEnabled: false,
  });
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_EMULATOR, { disableWarnings: true });
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await signInWithEmailAndPassword(auth, email, password);
  return {
    app,
    call: async <T,>(name: string, data?: unknown) => (await httpsCallable(functions, name)(data ?? {})).data as T,
    close: () => deleteApp(app),
  };
}

// ---------- admin (rola nadawana ręcznie, jak w produkcji) ----------

let adminPromise: Promise<CallableClient> | null = null;
export function adminClient(): Promise<CallableClient> {
  if (!adminPromise) {
    adminPromise = (async () => {
      const email = `release-admin-${Date.now()}@e2e.test`;
      const uid = await createAuthUser(email);
      await adminPatchDoc(`users/${uid}`, {
        uid, email, displayName: 'Release Admin', role: 'admin', status: 'active',
        onboardingCompleted: true, access: { enabled: true }, registration: { source: 'email' },
      });
      return connectClient(email);
    })();
  }
  return adminPromise;
}

export async function createInviteCode(cohorts: string[] = []): Promise<string> {
  const admin = await adminClient();
  const result = await admin.call<{ invite: { code: string } }>('createInvite', { note: 'release-e2e', cohorts });
  return result.invite.code;
}

export async function grantProComp(uid: string): Promise<void> {
  const admin = await adminClient();
  await admin.call('adminGrantSubscription', { uid, days: null });
  await expect.poll(async () => (await readDoc(`users/${uid}`))?.subscription, { timeout: 10_000 })
    .toMatchObject({ tier: 'comp' });
}

// ---------- skrzynka maili emulatora (functions/src/ses-email.ts) ----------

export interface OutboxMail { subject: string; html: string; createdAt: string; headers?: Array<{ name: string; value: string }> }

export async function outboxFor(to: string): Promise<OutboxMail[]> {
  return (await queryDocs('emulator_email_outbox', 'to', to.toLowerCase())).map((m) => m.data as unknown as OutboxMail);
}

export async function waitForEmail(to: string, subjectPattern: RegExp, afterIso = ''): Promise<OutboxMail> {
  let found: OutboxMail | null = null;
  await expect.poll(async () => {
    const hit = (await outboxFor(to))
      .filter((m) => m.createdAt > afterIso && subjectPattern.test(m.subject))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    found = hit ?? null;
    return !!hit;
  }, { timeout: 15_000, message: `mail do ${to} (${subjectPattern})` }).toBe(true);
  return found!;
}

export const verificationCodeFrom = (mail: { subject: string }): string => {
  const code = mail.subject.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`Brak 6-cyfrowego kodu w temacie: ${mail.subject}`);
  return code;
};

// ---------- konto PRO gotowe do onboardingu (produkcyjne callable) ----------

export interface ProvisionedUser { uid: string; email: string }

/** Rejestracja przez produkcyjne callable (zaproszenie admina → syncUserProfile →
 *  kod z maila → verifyEmailCode) + grant PRO comp przez admina. Onboarding
 *  (zgody, kreator, plan) test przechodzi już w UI. */
export async function provisionVerifiedProUser(
  prefix: string,
  language: 'pl' | 'en' = 'pl',
  cohorts: string[] = [],
): Promise<ProvisionedUser> {
  const email = `${prefix}-${Date.now()}@e2e.test`;
  const inviteCode = await createInviteCode(cohorts);
  const uid = await createAuthUser(email);
  const client = await connectClient(email);
  try {
    await client.call('syncUserProfile', { language, inviteCode });
    await client.call('redeemInvite', { code: inviteCode });
    const before = new Date().toISOString();
    await client.call('requestEmailVerificationCode', { language });
    const code = verificationCodeFrom(await waitForEmail(email, /\d{6}/, before));
    await client.call('verifyEmailCode', { code });
  } finally {
    await client.close();
  }
  const profile = await readDoc(`users/${uid}`);
  expect(profile).toMatchObject({ status: 'active', access: { enabled: true }, onboardingCompleted: false });
  await grantProComp(uid);
  return { uid, email };
}

// ---------- UI ----------

export async function loginThroughUi(page: Page, email: string, lang: 'pl' | 'en' = 'pl', password = PASSWORD): Promise<void> {
  await page.goto('./#/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: lang === 'pl' ? 'Kontynuuj z emailem' : 'Continue with email' }).click();
  await page.getByPlaceholder('Email').first().fill(email);
  await page.getByPlaceholder(lang === 'pl' ? 'Hasło' : 'Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: lang === 'pl' ? 'Zaloguj przez email' : 'Sign in with email' }).click();
}

export const dashboardGreeting = (page: Page) => page.getByRole('main').getByRole('heading', {
  level: 1,
  name: /^(?:Dzień dobry|Cześć|Dobry wieczór|Good morning|Hi|Good evening|Good afternoon|Hello),/,
});

const WEEKDAY_LABELS: Record<'pl' | 'en', Record<string, string>> = {
  pl: { monday: 'Poniedziałek', tuesday: 'Wtorek', wednesday: 'Środa', thursday: 'Czwartek', friday: 'Piątek', saturday: 'Sobota', sunday: 'Niedziela' },
  en: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
};

/** Kreator od powitania do Dashboardu: zgody (recordConsent), poziom, cel,
 *  protokół (dokładnie `weekdays`), rekomendowany szablon, pierwszy trening = `firstWorkout`.
 *  Odporny na nowy krok sprzętu ("Gdzie trenujesz?"): gdy widoczny, wybiera "Siłownia". */
export async function completeWizard(page: Page, opts: {
  weekdays: string[];
  firstWorkout: string;
  lang?: 'pl' | 'en';
}): Promise<void> {
  const lang = opts.lang ?? 'pl';
  const next = lang === 'pl' ? 'Następny krok' : 'Next step';
  const cont = lang === 'pl' ? 'Dalej' : 'Continue';

  await expect(page.getByTestId('plan-wizard-root')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('ob-personalization-next').click();
  await page.getByTestId('consent-terms').click();
  await page.getByTestId('consent-privacy').click();
  const consent = page.waitForResponse((r) => r.url().endsWith('/recordConsent') && r.request().method() === 'POST');
  await page.getByTestId('ob-legal-submit').click();
  expect((await consent).status()).toBe(200);

  // Krok 2 (poziom) → 3 (cel) → [opcjonalnie: sprzęt] → 4 (protokół).
  await page.getByRole('button', { name: next }).click();
  // Krok sprzętu („Gdzie trenujesz?”) jest opcjonalny dla helpera: gdy widoczny, „Siłownia”.
  const equipment = page.getByTestId('ob-equipment-gym');
  const pickGym = async () => {
    if (await equipment.isVisible().catch(() => false) && (await equipment.getAttribute('aria-pressed')) !== 'true') {
      await equipment.click();
    }
  };
  for (let guard = 0; guard < 4; guard += 1) {
    if (await page.getByRole('button', { name: WEEKDAY_LABELS[lang].monday, exact: true }).isVisible().catch(() => false)) break;
    await pickGym();
    await page.getByRole('button', { name: cont, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: WEEKDAY_LABELS[lang].monday, exact: true })).toBeVisible();

  await page.getByRole('button', { name: String(opts.weekdays.length), exact: true }).click();
  const all = Object.keys(WEEKDAY_LABELS[lang]);
  for (const weekday of all) {
    const button = page.getByRole('button', { name: WEEKDAY_LABELS[lang][weekday], exact: true });
    const pressed = (await button.getAttribute('aria-pressed')) === 'true';
    if (pressed && !opts.weekdays.includes(weekday)) await button.click();
  }
  for (const weekday of opts.weekdays) {
    const button = page.getByRole('button', { name: WEEKDAY_LABELS[lang][weekday], exact: true });
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await pickGym();
  await page.getByRole('button', { name: cont, exact: true }).click();

  await expect(page.getByTestId('plan-choice-recommended')).toBeVisible();
  await page.getByTestId('ob-match-next').click();
  await expect(page.getByTestId('ob-start-step')).toBeVisible();
  await page.locator(`[data-testid="ob-first-workout-chips"] button[data-date="${opts.firstWorkout}"]`).click();
  await expect(page.locator(`[data-testid="ob-first-workout-chips"] button[data-date="${opts.firstWorkout}"]`))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('ob-start-cta').click();
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
}

/** Ekran treningu: sesja startuje sama (CTA Dashboardu) albo przyciskiem
 *  „Rozpocznij trening”; potem ewentualna propozycja rozgrzewki = „Pomiń”. */
export async function ensureSessionStarted(page: Page): Promise<void> {
  const start = page.getByRole('button', { name: /Rozpocznij trening|Start workout/i });
  const prestart = page.getByTestId('prestart-sheet');
  const finish = page.getByRole('button', { name: /Zakończ trening|Finish workout/i });
  await expect(start.or(prestart).or(finish).first()).toBeVisible({ timeout: 15_000 });
  if (await start.isVisible().catch(() => false) && await start.isEnabled().catch(() => false)) {
    await start.click().catch(() => undefined);
  }
  await skipWarmupIfShown(page);
  await expect(finish.first()).toBeVisible({ timeout: 15_000 });
}

/** Zamknięcie propozycji rozgrzewki po starcie świeżej sesji (jeśli się pojawi). */
export async function skipWarmupIfShown(page: Page): Promise<void> {
  const skip = page.getByTestId('prestart-skip');
  try {
    await skip.waitFor({ state: 'visible', timeout: 3000 });
    await skip.click();
    await skip.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // brak promptu
  }
}

export async function cardTitles(page: Page): Promise<string[]> {
  const cards = page.locator('.exercise-card');
  const count = await cards.count();
  const titles: string[] = [];
  for (let index = 0; index < count; index += 1) {
    titles.push(((await cards.nth(index).getByRole('heading').first().textContent()) ?? '').trim());
  }
  return titles;
}

/** Aktywny plan usera (dokument training_plans/{uid}). */
export async function readPlan(uid: string): Promise<{ days: Array<{ id: string; weekday: string; focus: string; dayName: string; exercises: Array<{ id: string; name: string; sets: string }> }> } & Doc> {
  const plan = await readDoc(`training_plans/${uid}`);
  if (!plan) throw new Error(`Brak training_plans/${uid}`);
  return plan as never;
}

export async function workoutsOf(uid: string): Promise<Array<{ id: string; data: Doc }>> {
  return queryDocs('workouts', 'userId', uid);
}
