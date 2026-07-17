import { test, expect } from '@playwright/test';
import { blockFirebase, expectHashRoute, expectPageRendered, navigateAndWait, setE2EAuthScenario } from './helpers';

// Z97: symetryczne wejście/wyjście panelu admina. Zwykły user nie wchodzi w ogóle
// (AdminRoute -> redirect), admin widzi sticky pasek i wraca przyciskiem.

test('zwykły user na /admin dostaje redirect na Dashboard', async ({ page }) => {
  await setE2EAuthScenario(page, 'active-user');
  await blockFirebase(page);
  await navigateAndWait(page, '/admin');
  await expectHashRoute(page, '/');
});

test('admin widzi pasek panelu i wraca przyciskiem do aplikacji', async ({ page }) => {
  await setE2EAuthScenario(page, 'active-admin');
  await blockFirebase(page);
  await navigateAndWait(page, '/admin');
  await expectPageRendered(page);

  await expect(page.locator('span.text-fitness-warning', { hasText: 'Panel admina' })).toBeVisible();
  await page.getByRole('button', { name: 'Wróć do aplikacji' }).click();
  await expectHashRoute(page, '/');
});
