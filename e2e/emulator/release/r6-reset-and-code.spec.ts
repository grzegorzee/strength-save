import { test, expect } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  AUTH_EMULATOR, PASSWORD, connectClient, createAuthUser, createInviteCode, dashboardGreeting, loginThroughUi,
  outboxFor, provisionVerifiedProUser, queryDocs, readDoc, verificationCodeFrom, waitForEmail,
} from './support';

// Release e2e 6: kod weryfikacji i reset hasła na realnych callable
// (requestEmailVerificationCode / verifyEmailCode / requestPasswordReset)
// z Auth emulatora. Bez SES: mail ląduje w skrzynce emulatora
// (functions/src/ses-email.ts, tylko FUNCTIONS_EMULATOR + klucz-fixture).

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

test('R6 kod weryfikacji: zły kod liczy próbę, dobry aktywuje konto', async ({ page }) => {
  const email = `r6-code-${Date.now()}@e2e.test`;
  const inviteCode = await createInviteCode();
  const uid = await createAuthUser(email);
  const client = await connectClient(email);
  try {
    await client.call('syncUserProfile', { language: 'pl', inviteCode });
  } finally {
    await client.close();
  }
  const startedAt = new Date().toISOString();
  await loginThroughUi(page, email);
  await expect(page.getByRole('heading', { name: 'Potwierdź adres email' })).toBeVisible({ timeout: 15_000 });
  const mail = await waitForEmail(email, /\d{6}/, startedAt);
  const code = verificationCodeFrom(mail);
  expect(mail.html).toContain(code);

  const wrong = code === '000000' ? '111111' : '000000';
  await page.getByPlaceholder('Kod 6-cyfrowy').fill(wrong);
  await page.getByRole('button', { name: 'Potwierdź kod' }).click();
  await expect(page.getByText('Nieprawidłowy kod. Sprawdź najnowszy mail i spróbuj ponownie.')).toBeVisible();
  const codes = await queryDocs('email_verification_codes', 'uid', uid);
  expect(codes).toHaveLength(1);
  expect(codes[0].data).toMatchObject({ status: 'pending', attempts: 1 });
  expect(JSON.stringify(codes[0].data)).not.toContain(code); // tylko hash

  await page.getByPlaceholder('Kod 6-cyfrowy').fill(code);
  await page.getByRole('button', { name: 'Potwierdź kod' }).click();
  await expect(page.getByTestId('plan-wizard-root')).toBeVisible({ timeout: 20_000 });
  expect(await readDoc(`users/${uid}`)).toMatchObject({ status: 'active', access: { enabled: true } });
  expect((await queryDocs('email_verification_codes', 'uid', uid))[0].data).toMatchObject({ status: 'verified' });
});

test('R6 reset hasła: link z maila zmienia hasło, nowe działa, stare nie; cooldown i brak enumeracji', async ({ page }) => {
  test.setTimeout(120_000);
  const user = await provisionVerifiedProUser('r6-reset');
  const before = new Date().toISOString();

  await page.goto('./#/login');
  await page.getByRole('button', { name: 'Kontynuuj z emailem' }).click();
  await page.getByPlaceholder('Email').first().fill(user.email);
  const reset = page.waitForResponse((r) => r.url().endsWith('/requestPasswordReset') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Reset hasła' }).click();
  expect((await reset).status()).toBe(200);
  await expect(page.getByText('Link wysłany').first()).toBeVisible();

  // Mail: link na auth.strengthsave.app z oobCode wystawionym przez Auth (emulator).
  const mail = await waitForEmail(user.email, /.+/, before);
  const href = mail.html.replace(/&amp;/g, '&').match(/https:\/\/auth\.strengthsave\.app\/__\/auth\/action\?[^"'\s<]+/)?.[0];
  expect(href, 'link resetu w mailu').toBeTruthy();
  const link = new URL(href!);
  expect(link.searchParams.get('mode')).toBe('resetPassword');
  expect(link.searchParams.get('lang')).toBe('pl');
  const oobCode = link.searchParams.get('oobCode')!;

  // Drugi reset w ciągu minuty: cooldown, bez drugiego maila.
  await page.getByRole('button', { name: 'Reset hasła' }).click();
  await expect(page.getByText('Za dużo prób resetu hasła. Odczekaj chwilę i spróbuj ponownie.').first()).toBeVisible();
  expect((await outboxFor(user.email)).filter((m) => m.createdAt > before)).toHaveLength(1);

  // Nieznany adres: ta sama odpowiedź, zero maila (ochrona przed enumeracją kont).
  const ghost = `r6-ghost-${Date.now()}@e2e.test`;
  const admin = await connectClient(user.email);
  try {
    await expect(admin.call('requestPasswordReset', { email: ghost, language: 'pl' })).resolves.toEqual({ sent: true });
  } finally {
    await admin.close();
  }
  expect(await outboxFor(ghost)).toHaveLength(0);

  // Użycie linku (handler Firebase /__/auth/action = accounts:resetPassword).
  const NEW_PASSWORD = 'new-e2e-password-456';
  const applied = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oobCode, newPassword: NEW_PASSWORD }),
  });
  expect(applied.status).toBe(200);

  // Stare hasło odrzucone, nowe loguje (UI) do apki. Formularz email jest otwarty po resecie.
  await page.getByPlaceholder('Hasło', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Zaloguj przez email' }).click();
  await expect(page.getByText('Nieprawidłowy email lub hasło.').first()).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder('Hasło', { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Zaloguj przez email' }).click();
  await expect(page.getByTestId('plan-wizard-root').or(dashboardGreeting(page))).toBeVisible({ timeout: 20_000 });
});
