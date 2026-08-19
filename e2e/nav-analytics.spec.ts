import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

// D-T1 (audyt 2026-08-19): dolny pasek = Dzisiaj / Plan / Historia / Postępy /
// Ćwiczenia. Analityka zostaje w sidebarze (desktop) i pod trasą /analytics do
// czasu scalenia z Postępami (D-T4).
test.describe('Bottom nav: docelowa nawigacja D-T1', () => {
  test('mobile tab bar: Historia jest, Analityka poza bottom nav', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/');

    const mobileNav = page.getByRole('navigation', { name: 'Nawigacja mobilna' });
    await expect(mobileNav.getByRole('link', { name: /Historia/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Dzisiaj/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Analityka/i })).toHaveCount(0);
  });

  test('analytics opens on Summary tab by default', async ({ page }) => {
    // FIX-B T6: bez ?tab= otwiera się BIEŻĄCE podsumowanie (weekly digest
    // otwierał się na "randomowym" tygodniu z wejścia z Dashboardu).
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/analytics');

    await expect(page.getByRole('tab', { name: 'Podsum.' })).toHaveAttribute('aria-selected', 'true');

    // Jawny parametr nadal działa
    await navigateAndWait(page, '/analytics?tab=charts');
    await expect(page.getByRole('tab', { name: 'Wykresy' })).toHaveAttribute('aria-selected', 'true');
  });
});
