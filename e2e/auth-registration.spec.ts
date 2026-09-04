import { test, expect } from '@playwright/test';
import { navigateAndWait, expectPageRendered, setE2EAuthScenario } from './helpers';

test.describe('Auth and registration flows', () => {
  // Redesign 2026-08-20: pierwszy ekran = Kontynuuj z Apple/Google + email niżej.
  test('unauthenticated user sees social-first login, invite hint and waitlist form', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await page.goto('./#/?invite=INVITE42');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'Strength Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kontynuuj z Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kontynuuj z Apple' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kontynuuj z emailem' })).toBeVisible();
    await expect(page.getByText('Wykryto kod zaproszenia:')).toBeVisible();
    await expect(page.getByText('Chcesz trafić na waitlistę lub dostać invite?')).toBeVisible();
  });

  test('register route starts social-first and opens email registration form', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, '/register');

    await expect(page.getByRole('button', { name: 'Kontynuuj z Google' })).toBeVisible();
    await page.getByRole('button', { name: 'Kontynuuj z emailem' }).click();
    await expect(page.getByRole('button', { name: 'Załóż konto i wyślij kod' })).toBeVisible();
    await expect(page.getByPlaceholder('Powtórz hasło')).toBeVisible();
  });

  test('login screen supports waitlist submit flow in E2E mode', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, '/register');

    await page.getByPlaceholder('Email').fill('waitlist@test.com');
    await page.getByPlaceholder('Imię / nazwa').fill('Waitlist User');
    await page.getByPlaceholder('Notatka lub kontekst').fill('Proszę o invite do testów');
    await page.getByRole('button', { name: 'Zapisz na waitlistę' }).click();

    await expect(page.getByText('Twoje zgłoszenie zostało zapisane.').first()).toBeVisible();
  });

  test('email path toggles between sign in and registration', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, '/login');

    await page.getByRole('button', { name: 'Kontynuuj z emailem' }).click();
    await expect(page.getByRole('button', { name: 'Zaloguj przez email' })).toBeVisible();
    await page.getByRole('button', { name: 'Nie masz konta? Zarejestruj się' }).click();
    await expect(page.getByRole('button', { name: 'Załóż konto i wyślij kod' })).toBeVisible();
    await page.getByRole('button', { name: 'Masz już konto? Zaloguj się' }).click();
    await expect(page.getByRole('button', { name: 'Zaloguj przez email' })).toBeVisible();
  });

  test('authenticated user visiting login is redirected to dashboard', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/login');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('header').getByText(/^(Dzisiaj|Today)$/)).toBeVisible();
  });

  test('pending verification user sees email verification gate', async ({ page }) => {
    await setE2EAuthScenario(page, 'pending-verification', { email: 'pending@test.com' });
    await navigateAndWait(page, '/');

    await expect(page.getByRole('heading', { name: 'Potwierdź adres email' })).toBeVisible();
    await expect(page.getByText('pending@test.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Potwierdź kod' })).toBeDisabled();

    await page.getByPlaceholder('Kod 6-cyfrowy').fill('123456');
    await expect(page.getByRole('button', { name: 'Potwierdź kod' })).toBeEnabled();
  });

  test('suspended account sees blocked screen', async ({ page }) => {
    await setE2EAuthScenario(page, 'suspended', { email: 'blocked@test.com' });
    await navigateAndWait(page, '/');

    await expect(page.getByRole('heading', { name: 'Konto jest zawieszone' })).toBeVisible();
    await expect(page.getByText('blocked@test.com')).toBeVisible();
  });

  test('new invited user lands in onboarding', async ({ page }) => {
    await setE2EAuthScenario(page, 'new-invited-user', { displayName: 'Invite Tester' });
    await navigateAndWait(page, '/');

    // X33 WP-8: konto z imieniem wita po imieniu (bez imienia: "Witaj w Strength Save").
    await expect(page.getByRole('heading', { name: 'Cześć, Invite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dalej' })).toBeVisible();
  });

  test('admin dashboard renders invite, waitlist and audit sections', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-admin');
    await navigateAndWait(page, '/admin');

    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Panel admina' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invite' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Waitlista' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit auth' })).toBeVisible();
    await expect(page.getByText('invite@test.com')).toBeVisible();
    await expect(page.getByText('waitlist@test.com')).toBeVisible();
  });

  test('admin push send shows delivery diagnostics in E2E mode', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-admin');
    await navigateAndWait(page, '/admin');

    await expectPageRendered(page);
    await page.getByPlaceholder('Tytuł powiadomienia').fill('Test push');
    await page.getByPlaceholder('Treść powiadomienia').fill('Treść testowa');
    await page.getByRole('button', { name: 'Wyślij push' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Wyślij' }).click();

    await expect(page.getByTestId('admin-comms-result')).toContainText('Dostarczono do 1/1');
    await expect(page.getByTestId('admin-comms-result')).toContainText('Błędy: 0');
    await expect(page.getByTestId('admin-comms-result')).toContainText('Martwe tokeny: 0');
  });
});
