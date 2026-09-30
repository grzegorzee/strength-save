import { test, expect } from '@playwright/test';
import { setE2EAuthScenario, blockFirebase, expectHashRoute } from './helpers';

// Funnel onboardingu wariant B (build 38): świeży user na iOS bez PRO nie widzi apki —
// hard paywall guard przekierowuje każdą trasę na /paywall (teaser → cennik bez wyjścia).
// Native symulowane przez simulateNative w stanie e2e-auth (web ZERO zmian).

const teaserTitle = /Twój plan jest gotowy|Your plan is ready/;
// Z208: teaser bez bezwarunkowej obietnicy dni za darmo (trial copy tylko przy
// potwierdzonym eligible z RC — mock e2e nie ma sklepu, więc copy neutralne).
const teaserCta = /Odblokuj pełny plan|Unlock your full plan/;
const logoutLink = /Wyloguj|Log out/;

test.describe('Hard paywall guard (onboarding wariant B)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('świeży user bez PRO: każda trasa → /paywall, teaser → cennik bez strzałki wstecz', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { simulateNative: true, hasWorkouts: false });

    // Dashboard niedostępny — redirect na paywall z teaserem.
    await page.goto('./#/');
    await expect(page.getByText(teaserTitle)).toBeVisible();
    await expectHashRoute(page, '/paywall');
    await page.screenshot({ path: '/tmp/paywall-teaser.png' });

    // CTA teasera odsłania cennik: bez strzałki wstecz, z linkiem Wyloguj.
    await page.getByRole('button', { name: teaserCta }).click();
    await expect(page.getByText('Strength Save PRO')).toBeVisible();
    await expect(page.getByLabel(/Zamknij|Close/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: logoutLink })).toBeVisible();
    await page.screenshot({ path: '/tmp/paywall-hard.png' });

    // Próba wejścia na inne trasy też kończy się na paywallu.
    for (const path of ['/plan', '/analytics', '/settings']) {
      await page.goto(`./#${path}`);
      await expectHashRoute(page, '/paywall');
    }
  });

  test('user z treningami i wygasłym dostępem: zostaje w apce (read-only, bez redirectu)', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', {
      simulateNative: true,
      hasWorkouts: true,
      subscription: { tier: 'monthly', status: 'expired', expiresAt: '2026-01-01T00:00:00.000Z' },
    });
    await page.goto('./#/');
    await expect(page.getByRole('main')).toBeVisible();
    await expectHashRoute(page, '/');
  });

  // Płatności 2026-09-30: sekwencja z realnym kształtem lustra webhooka (store,
  // environment, willRenew), a nie sam stan końcowy. PRO ze sklepu przepuszcza,
  // EXPIRATION (webhook pisze tier none/expired) u usera bez treningów = hard paywall
  // z wyjściami. "Przywróć zakupy" renderuje się tylko na prawdziwym native
  // (Capacitor.isNativePlatform), więc tu sprawdzamy wylogowanie i usunięcie konta.
  test('sekwencja: PRO ze sklepu przepuszcza → EXPIRATION → hard paywall z wyjściami', async ({ page }) => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    await setE2EAuthScenario(page, 'active-user', {
      simulateNative: true,
      hasWorkouts: false,
      subscription: { tier: 'monthly', status: 'active', expiresAt: future, store: 'APP_STORE', environment: 'SANDBOX', willRenew: true } as never,
    });
    await page.goto('./#/');
    await expect(page.getByRole('main')).toBeVisible();
    await expectHashRoute(page, '/');
    await page.goto('./#/paywall');
    await expectHashRoute(page, '/');

    // Webhook EXPIRATION: dokładnie to, co mapuje revenuecat.ts (tier none, expired).
    await setE2EAuthScenario(page, 'active-user', {
      simulateNative: true,
      hasWorkouts: false,
      subscription: { tier: 'none', status: 'expired', expiresAt: null, store: 'APP_STORE', environment: 'SANDBOX', willRenew: false } as never,
    });
    await page.reload();
    await expectHashRoute(page, '/paywall');
    await page.getByRole('button', { name: teaserCta }).click();
    await expect(page.getByText('Strength Save PRO')).toBeVisible();
    await expect(page.getByLabel(/Zamknij|Close/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: logoutLink })).toBeVisible();
    await expect(page.getByTestId('delete-account-link')).toBeVisible();
    for (const path of ['/plan', '/settings']) {
      await page.goto(`./#${path}`);
      await expectHashRoute(page, '/paywall');
    }
  });

  test('billing_issue w grace period z datą w przyszłości nie blokuje apki', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', {
      simulateNative: true,
      hasWorkouts: false,
      subscription: { tier: 'monthly', status: 'billing_issue', expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
    });
    await page.goto('./#/');
    await expect(page.getByRole('main')).toBeVisible();
    await expectHashRoute(page, '/');
  });

  test('admin: bez redirectu nawet bez treningów', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-admin', { simulateNative: true, hasWorkouts: false });
    await page.goto('./#/');
    await expect(page.getByRole('main')).toBeVisible();
    await expectHashRoute(page, '/');
  });

  test('tier comp: bez redirectu nawet bez treningów', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', {
      simulateNative: true,
      hasWorkouts: false,
      subscription: { tier: 'comp', status: 'active', expiresAt: null },
    });
    await page.goto('./#/');
    await expect(page.getByRole('main')).toBeVisible();
    await expectHashRoute(page, '/');
  });

  test('web (bez symulacji native): zero zmian, bez paywalla', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { hasWorkouts: false });
    await page.goto('./#/');
    await expect(page.getByRole('main')).toBeVisible();
    await expectHashRoute(page, '/');
  });
});
