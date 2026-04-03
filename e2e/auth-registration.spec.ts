import { test, expect } from '@playwright/test';
import { navigateAndWait, expectPageRendered, setE2EAuthScenario } from './helpers';

test.describe('Auth and registration flows', () => {
  test('unauthenticated user sees login, invite hint and waitlist form', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await page.goto('./#/?invite=INVITE42');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'FitTracker' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Google' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Email + hasło' })).toBeVisible();
    await expect(page.getByText('Wykryto kod zaproszenia:')).toBeVisible();
    await expect(page.getByText('Chcesz trafić na waitlistę lub dostać invite?')).toBeVisible();
  });

  test('email registration screen supports waitlist submit flow in E2E mode', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, '/');

    await page.getByRole('tab', { name: 'Email + hasło' }).click();
    await page.getByRole('button', { name: 'Rejestracja' }).click();
    await page.getByPlaceholder('Email').nth(1).fill('waitlist@test.com');
    await page.getByPlaceholder('Imię / nazwa').fill('Waitlist User');
    await page.getByPlaceholder('Notatka lub kontekst').fill('Proszę o invite do testów');
    await page.getByRole('button', { name: 'Zapisz na waitlistę' }).click();

    await expect(page.getByText('Twoje zgłoszenie zostało zapisane.').first()).toBeVisible();
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

  test('new invited user lands in onboarding with invite-aware copy', async ({ page }) => {
    await setE2EAuthScenario(page, 'new-invited-user', { displayName: 'Invite Tester' });
    await navigateAndWait(page, '/');

    await expect(page.getByRole('heading', { name: 'Cześć, Invite!' })).toBeVisible();
    await expect(page.getByText(/Wchodzisz z invite/)).toBeVisible();
    await expect(page.getByText('Jaki jest Twój cel?')).toBeVisible();
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
});
