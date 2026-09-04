import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectHashRoute,
  expectPageRendered,
  localToday,
  navigateAndWait,
  openProfileSection,
  plWeekdayName,
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

  test('bottom nav: Dzisiaj, Plan, Historia, Postępy, Profil; Ćwiczenia z zarządzania planem', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    const bottomNav = page.locator('nav[aria-label="Nawigacja mobilna"]');
    await expect(bottomNav).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Plan' }).click();
    await expectHashRoute(page, '/plan');
    await bottomNav.getByRole('link', { name: 'Historia' }).click();
    await expectHashRoute(page, '/history');
    await bottomNav.getByRole('link', { name: 'Postępy' }).click();
    await expectHashRoute(page, '/achievements');
    await bottomNav.getByRole('link', { name: 'Profil' }).click();
    await expectHashRoute(page, '/profile');
    await bottomNav.getByRole('link', { name: 'Dzisiaj' }).click();
    await expectHashRoute(page, '/');

    await bottomNav.getByRole('link', { name: 'Plan' }).click();
    await page.getByTestId('plan-manage-trigger').click();
    await page.getByRole('menuitem', { name: 'Ćwiczenia' }).click();
    await expectHashRoute(page, '/exercises');
  });

  test('Pomiary z dolnej nawigacji; z Profilu Admin; Historia/Postępy/Pomiary bez duplikacji dolnej nawigacji', async ({ page }) => {
    // 2026-09-04: Pomiary ciała są zakładką główną (po Dzisiaj), nie wierszem w Profilu.
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await page.locator('nav[aria-label="Nawigacja mobilna"]').getByRole('link', { name: 'Pomiary', exact: true }).click();
    await expectHashRoute(page, '/measurements');

    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await openProfileSection(page, 'data');
    await expect(page.getByRole('button', { name: 'Historia', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Postępy', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Pomiary/, exact: false })).toHaveCount(0);

    // Admin widoczny, bo scenariusz e2e to active-admin.
    await navigateAndWait(page, '/profile');
    await openProfileSection(page, 'data');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await expectHashRoute(page, '/admin');
  });

  test('z Planu: Cykle', async ({ page }) => {
    // FIX-B T5: karta planu zniknęła z Dashboardu — Cykle mają stałe wejście na /plan.
    await navigateAndWait(page, '/plan');
    await page.getByTestId('plan-manage-trigger').click();
    await page.getByTestId('plan-cycles-link').click();
    await expectHashRoute(page, '/cycles');
  });

  test('WP-D: nav widoczny w sesji treningowej, nie koliduje z paskiem startu, sekwencja wyjście-powrót', async ({ page }) => {
    // Wejście do sesji: nav ma być widoczny (WP-D — koniec ukrywania w focused flow).
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    const bottomNav = page.locator('nav[aria-label="Nawigacja mobilna"]');
    await expect(bottomNav).toBeVisible();

    // Pasek startu wisi NAD navem: nie zasłania nav, nav nie zasłania przycisku.
    const startButton = page.getByRole('button', { name: 'Rozpocznij trening' });
    await expect(startButton).toBeEnabled();
    const startBar = startButton.locator('xpath=ancestor::div[contains(@class,"fixed")][1]');
    const barBox = await startBar.boundingBox();
    const navBox = await bottomNav.boundingBox();
    expect(barBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(navBox!.y + 1);

    // Sekwencja (zasada 5): wyjście przez nav do Planu i powrót — treść sesji na miejscu.
    await bottomNav.getByRole('link', { name: 'Plan' }).click();
    await expectHashRoute(page, '/plan');
    await page.goBack();
    await expectHashRoute(page, '/workout/day-1');
    // X30 WP-L: nagłówek = dzień daty sesji (dziś), nie dzień planu.
    await expect(page.getByRole('heading', { name: plWeekdayName(localToday()) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rozpocznij trening' })).toBeVisible();
    await expect(bottomNav).toBeVisible();
  });

  test('header bez hamburgera na mobile (Z90.3)', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await expect(page.locator('header button svg.lucide-menu')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Otwórz menu' })).toHaveCount(0);
  });
});
