import { test, expect } from '@playwright/test';
import { blockFirebase, expectHashRoute, navigateAndWait, setE2EAuthScenario } from './helpers';

// D-T1/X51: dolny pasek prowadzi do Postępów. Legacy /analytics przekierowuje
// do wspólnego ekranu i zachowuje wybór zakładki w query.
test.describe('Nawigacja Postępów', () => {
  test('mobile tab bar otwiera Postępy z głównym segmentem trzech widoków', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/');

    const mobileNav = page.getByRole('navigation', { name: 'Nawigacja mobilna' });
    await expect(mobileNav.getByRole('link', { name: /Historia/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Dzisiaj/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Analityka/i })).toHaveCount(0);
    await mobileNav.getByRole('link', { name: 'Postępy', exact: true }).click();

    await expectHashRoute(page, '/achievements');
    const progressTabs = page.getByRole('tablist', { name: 'Postępy' });
    await expect(progressTabs.getByRole('tab')).toHaveCount(3);
    await expect(progressTabs.getByRole('tab', { name: 'Podsumowanie', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(progressTabs.getByRole('tab', { name: 'Wykresy', exact: true })).toBeVisible();
    await expect(progressTabs.getByRole('tab', { name: 'Rekordy', exact: true })).toBeVisible();
  });

  test('legacy /analytics przekierowuje na właściwy segment Postępów', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/analytics');

    await expectHashRoute(page, '/achievements?view=analytics');
    await expect(page.getByTestId('progress-view-summary')).toHaveAttribute('aria-selected', 'true');

    // Jawny parametr nie ginie podczas redirectu.
    await navigateAndWait(page, '/analytics?tab=charts');
    await expectHashRoute(page, '/achievements?view=analytics&tab=charts');
    await expect(page.getByTestId('progress-view-charts')).toHaveAttribute('aria-selected', 'true');
  });
});
