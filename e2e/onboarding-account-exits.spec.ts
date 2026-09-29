import { test, expect, type Page } from '@playwright/test';
import { blockFirebase, expectHashRoute, navigateAndWait, setE2EAuthScenario } from './helpers';

// 2026-09-29 (audyt R1, onboarding B1-B4, B7): wyjścia z paywalla i bramek,
// usunięcie konta bez zakupu, komunikaty błędów w EN, rejestracja przez UI,
// kod weryfikacji i reset hasła. Mock e2e (VITE_E2E_MODE): callable
// deleteOwnAccount/verifyEmailCode/requestPasswordReset mają odpowiedzi E2E,
// Firebase Auth jest zablokowany na sieci (rejestracja = błąd sieci).

const setLanguage = async (page: Page, lang: 'pl' | 'en') => {
  await page.addInitScript((value) => localStorage.setItem('app-language', value), lang);
};

test.describe('Konto: usunięcie bez zakupu (B1, Apple 5.1.1(v))', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('hard paywall: usunięcie konta z potwierdzeniem słowem USUŃ', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { simulateNative: true, hasWorkouts: false });
    await page.goto('./#/');
    await expectHashRoute(page, '/paywall');

    await page.getByRole('button', { name: 'Usuń konto i wszystkie dane' }).click();
    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', { name: 'Usuń trwale' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Wpisz USUŃ, aby potwierdzić/).fill('KASUJ');
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Wpisz USUŃ, aby potwierdzić/).fill('USUŃ');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    // E2E: callable zwraca sukces, sesja domyka się lokalnie; żadnego błędu.
    await expect(page.getByText('Nie udało się usunąć konta')).toHaveCount(0);
  });

  test('hard paywall, cennik: Wyloguj i Usuń konto obok siebie; Anuluj nic nie usuwa', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { simulateNative: true, hasWorkouts: false });
    await page.goto('./#/paywall');
    await page.getByRole('button', { name: /Odblokuj pełny plan/ }).click();
    await expect(page.getByRole('button', { name: 'Wyloguj' })).toBeVisible();
    await page.getByRole('button', { name: 'Usuń konto i wszystkie dane' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Anuluj' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expectHashRoute(page, '/paywall');
  });

  test('bramka weryfikacji emaila ma ścieżkę usunięcia konta', async ({ page }) => {
    await setE2EAuthScenario(page, 'pending-verification', { email: 'pending@test.com' });
    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Usuń konto i wszystkie dane' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Usuń trwale' })).toBeDisabled();
  });

  test('onboarding krok 1: wstecz pyta zamiast wylogować, z dialogu da się usunąć konto (B7)', async ({ page }) => {
    await setE2EAuthScenario(page, 'new-user', { displayName: 'Nowy Tester' });
    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Wstecz' }).first().click();
    await expect(page.getByText('Wyjść z konfiguracji?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Anuluj' }).click();
    await expect(page.getByTestId('plan-wizard-root')).toBeVisible();

    await page.getByRole('button', { name: 'Wstecz' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Usuń konto i wszystkie dane' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Usuń trwale' })).toBeDisabled();
  });
});

test.describe('Miękki paywall zawsze ma wyjście (B4)', () => {
  test('fail-open po słabej sieci: wejście przez replace, offline, strzałka wstecz wychodzi na dashboard', async ({ page, context }) => {
    await blockFirebase(page);
    // hasWorkouts=true = wynik fail-open useHardPaywall (tryb miękki ze strzałką).
    await setE2EAuthScenario(page, 'active-user', { simulateNative: true, hasWorkouts: true });
    await page.goto('./#/paywall');
    await expect(page.getByText('Strength Save PRO')).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Zamknij' }).click();
    await expectHashRoute(page, '/');
    await context.setOffline(false);
  });
});

test.describe('Rejestracja, kod i reset hasła po angielsku (B2, B3)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setLanguage(page, 'en');
  });

  test('rejestracja przez UI bez sieci: przetłumaczony błąd, bez surowego "Firebase:"', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, '/register');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await page.getByPlaceholder('Email').first().fill('new-user@test.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByPlaceholder('Repeat password').fill('secret123');
    await page.getByRole('button', { name: 'Create account and send code' }).click();
    await expect(page.getByText('No network connection. Check your internet and try again.')).toBeVisible();
    await expect(page.getByText(/Firebase:/)).toHaveCount(0);
  });

  test('reset hasła: potwierdzenie wysyłki linku', async ({ page }) => {
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, '/login');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await page.getByPlaceholder('Email').first().fill('someone@test.com');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText('Link sent').first()).toBeVisible();
  });

  test('kod weryfikacji: zły kod po angielsku, dobry kod aktywuje oczekiwanie', async ({ page }) => {
    await setE2EAuthScenario(page, 'pending-verification', { email: 'pending@test.com' });
    await navigateAndWait(page, '/');
    await expect(page.getByRole('heading', { name: 'Confirm your email address' })).toBeVisible();

    await page.getByPlaceholder('6-digit code').fill('000000');
    await page.getByRole('button', { name: 'Confirm code' }).click();
    await expect(page.getByText('Incorrect code. Check the latest email and try again.')).toBeVisible();
    await expect(page.getByText('Nieprawidłowy kod.')).toHaveCount(0);

    await page.getByPlaceholder('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Confirm code' }).click();
    await expect(page.getByTestId('email-gate-awaiting')).toBeVisible();
  });
});
