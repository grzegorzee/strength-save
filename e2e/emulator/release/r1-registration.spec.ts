import { test, expect, type Page } from '@playwright/test';
import { LEGAL_VERSIONS } from '../../../src/lib/legal-versions';
import { installEmulatorAppCheck } from '../app-check';
import {
  PASSWORD, addDays, authUserExists, completeWizard, createInviteCode, dashboardGreeting,
  grantProComp, queryDocs, readDoc, todayIso, uidForEmail, verificationCodeFrom, waitForEmail, weekdayOf,
} from './support';

// Release e2e 1: rejestracja emailem przez UI (zaproszenie admina, bo web jest
// invite-only) → kod weryfikacji z maila (skrzynka emulatora) → zgody → kreator
// → wybór planu → PRO comp (grant admina) → paywall przepuszcza → Dashboard.
// Wariant EN. Konto jednorazowe: usunięcie konta z bramki → znika z Auth.

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const L = {
  pl: {
    email: 'Kontynuuj z emailem', toRegister: 'Nie masz konta? Zarejestruj się', password: 'Hasło',
    repeat: 'Powtórz hasło', create: 'Załóż konto i wyślij kod', gate: 'Potwierdź adres email',
    code: 'Kod 6-cyfrowy', verify: 'Potwierdź kod',
  },
  en: {
    email: 'Continue with email', toRegister: "Don't have an account? Sign up", password: 'Password',
    repeat: 'Repeat password', create: 'Create account and send code', gate: 'Confirm your email address',
    code: '6-digit code', verify: 'Confirm code',
  },
} as const;

async function registerThroughUi(page: Page, email: string, lang: 'pl' | 'en'): Promise<string> {
  const inviteCode = await createInviteCode();
  if (lang === 'en') await page.addInitScript(() => localStorage.setItem('app-language', 'en'));
  await page.goto(`./#/?invite=${inviteCode}`);
  await page.waitForLoadState('domcontentloaded');
  const t = L[lang];
  await page.getByRole('button', { name: t.email }).click();
  await page.getByRole('button', { name: t.toRegister }).click();
  await page.getByPlaceholder('Email').first().fill(email);
  await page.getByPlaceholder(t.password, { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder(t.repeat).fill(PASSWORD);
  const startedAt = new Date().toISOString();
  await page.getByRole('button', { name: t.create }).click();

  await expect(page.getByRole('heading', { name: t.gate })).toBeVisible({ timeout: 20_000 });
  const uid = await uidForEmail(email);
  expect(uid).not.toBeNull();
  // Profil utworzony produkcyjnym syncUserProfile: konto czeka na weryfikację.
  await expect.poll(async () => (await readDoc(`users/${uid}`))?.status, { timeout: 10_000 }).toBe('pending_verification');
  expect(await readDoc(`users/${uid}`)).toMatchObject({ access: { enabled: false }, language: lang });
  // redeemInvite (po syncUserProfile) oznacza źródło rejestracji zaproszeniem.
  await expect.poll(async () => ((await readDoc(`users/${uid}`))?.registration as { source?: string } | undefined)?.source, {
    timeout: 10_000,
  }).toBe('invite-email');
  // Bramka sama wysyła kod; mail w języku usera leży w skrzynce emulatora.
  const mail = await waitForEmail(email, /\d{6}/, startedAt);
  if (lang === 'en') expect(mail.subject).toMatch(/code/i);
  return uid!;
}

async function verifyCodeInUi(page: Page, email: string, lang: 'pl' | 'en'): Promise<void> {
  const mail = await waitForEmail(email, /\d{6}/);
  await page.getByPlaceholder(L[lang].code).fill(verificationCodeFrom(mail));
  await page.getByRole('button', { name: L[lang].verify }).click();
}

for (const lang of ['pl', 'en'] as const) {
  test(`R1 ${lang.toUpperCase()}: rejestracja email → kod → zgody → kreator → plan → PRO comp → Dashboard`, async ({ page }) => {
    test.slow();
    const email = `r1-${lang}-${Date.now()}@e2e.test`;
    const uid = await registerThroughUi(page, email, lang);

    await verifyCodeInUi(page, email, lang);
    await expect(page.getByTestId('plan-wizard-root')).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await readDoc(`users/${uid}`))?.status, { timeout: 10_000 }).toBe('active');
    const verified = await readDoc(`users/${uid}`);
    expect(verified).toMatchObject({ access: { enabled: true }, verification: { emailVerifiedAt: expect.any(String) } });
    // Zaproszenie zużyte przez redeemInvite (registration.inviteId).
    const inviteId = (verified?.registration as { inviteId?: string }).inviteId;
    expect(inviteId).toBeTruthy();
    expect(await readDoc(`invites/${inviteId}`)).toMatchObject({ status: 'redeemed', redeemedBy: uid });

    // PRO comp: grant admina (produkcyjny callable) zanim user dojdzie do paywalla.
    await grantProComp(uid);

    const today = todayIso();
    const weekdays = [weekdayOf(today), weekdayOf(addDays(today, 2)), weekdayOf(addDays(today, 4))];
    await completeWizard(page, { weekdays, firstWorkout: today, lang });

    // Paywall przy aktywnym PRO nie ma czego sprzedać: przekierowuje na Dashboard.
    await page.goto('./#/paywall');
    await expect(page).toHaveURL(/#\/$/, { timeout: 15_000 });
    await expect(dashboardGreeting(page)).toBeVisible();
    await expect(page.getByTestId('dashboard-primary-action')).toBeVisible();
    await expect(page.getByTestId('dashboard-primary-action')).toHaveText(lang === 'pl' ? /Otwórz|Rozpocznij|Zobacz/ : /Open|Start|View/);

    // Stan Firestore: profil po onboardingu, zgody z serwera, plan z dniami tygodnia, aktywny cykl.
    const profile = await readDoc(`users/${uid}`);
    expect(profile).toMatchObject({
      status: 'active', onboardingCompleted: true, language: lang,
      subscription: { tier: 'comp' },
      consents: { termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy },
    });
    const plan = await readDoc(`training_plans/${uid}`) as { days: Array<{ weekday: string; exercises: unknown[] }>; startDate: string };
    expect(plan.days.map((d) => d.weekday).sort()).toEqual([...weekdays].sort());
    expect(plan.days.every((d) => d.exercises.length > 0)).toBe(true);
    const cycles = await queryDocs('plan_cycles', 'userId', uid);
    expect(cycles.filter((c) => c.data.status === 'active')).toHaveLength(1);
    expect(cycles[0].data.endDate ?? '').toBe('');
  });
}

test('R1 konto jednorazowe: usunięcie konta z bramki weryfikacji → konto znika z Auth', async ({ page }) => {
  const email = `r1-delete-${Date.now()}@e2e.test`;
  const uid = await registerThroughUi(page, email, 'pl');
  expect(await authUserExists(uid)).toBe(true);

  const deletion = page.waitForResponse((r) => r.url().endsWith('/deleteOwnAccount') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Usuń konto i wszystkie dane' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Usuń trwale' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Wpisz USUŃ, aby potwierdzić/).fill('USUŃ');
  await confirm.click();
  expect((await deletion).status()).toBe(200);

  // UI: sesja zamknięta, ekran logowania.
  await expect(page.getByRole('button', { name: 'Kontynuuj z emailem' })).toBeVisible({ timeout: 15_000 });
  // Auth: konto usunięte od razu; dane czekają na purge (operacja usunięcia).
  await expect.poll(() => authUserExists(uid), { timeout: 10_000 }).toBe(false);
  expect(await readDoc(`users/${uid}`)).toMatchObject({
    status: 'deleted', access: { enabled: false }, deletionPending: { requestedBy: uid },
  });
  expect(await readDoc(`deletion_operations/${uid}`)).toMatchObject({ state: 'scheduled', authDeletedAt: expect.any(String) });
});
