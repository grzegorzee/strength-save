import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectHashRoute,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
} from './helpers';

// Z90: po wycince hamburgera i drawera KAŻDA strona musi być osiągalna na telefonie
// (viewport 390x844 z playwright.config). Spec przechodzi PRZED wycinką (dowód, że
// dojścia istnieją niezależnie od drawera) i PO wycince.

test.describe('Osiągalność tras mobile bez drawera (Z90)', () => {
  test.beforeEach(async ({ page }) => {
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
  });

  test('bottom nav: Plan, Analityka, Ćwiczenia, Profil', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    const bottomNav = page.locator('nav[aria-label="Nawigacja mobilna"]');
    await expect(bottomNav).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Plan' }).click();
    await expectHashRoute(page, '/plan');
    await bottomNav.getByRole('link', { name: 'Analityka' }).click();
    await expectHashRoute(page, '/analytics');
    await bottomNav.getByRole('link', { name: 'Ćwiczenia' }).click();
    await expectHashRoute(page, '/exercises');
    await bottomNav.getByRole('link', { name: 'Profil' }).click();
    await expectHashRoute(page, '/profile');
  });

  test('z Profilu: Ustawienia, Historia, Pomiary, Osiągnięcia, Admin', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);

    await page.getByRole('button', { name: 'Historia', exact: true }).click();
    await expectHashRoute(page, '/history');

    await navigateAndWait(page, '/profile');
    await page.getByRole('button', { name: 'Pomiary ciała', exact: true }).click();
    await expectHashRoute(page, '/measurements');

    await navigateAndWait(page, '/profile');
    await page.getByRole('button', { name: 'Osiągnięcia', exact: true }).click();
    await expectHashRoute(page, '/achievements');

    await navigateAndWait(page, '/profile');
    await page.getByRole('button', { name: 'Ustawienia zaawansowane', exact: true }).click();
    await expectHashRoute(page, '/settings');

    // Admin widoczny, bo scenariusz e2e to active-admin.
    await navigateAndWait(page, '/profile');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await expectHashRoute(page, '/admin');
  });

  test('z Dashboardu: Cykle (karta planu)', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await page.getByRole('button', { name: 'Cykle' }).click();
    await expectHashRoute(page, '/cycles');
  });

  // TODO(Z90.3): po wycince hamburgera dodać asercję, że przycisk otwarcia menu
  // nie istnieje w headerze na viewport mobilnym.
});
