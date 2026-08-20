// F-T2: kolor przewodni — wybór w Profilu barwi tokeny całej aplikacji
// i przeżywa reload (localStorage od splashu).
import { test, expect } from '@playwright/test';
import { blockFirebase, expectPageRendered, navigateAndWait } from './helpers';

const primaryVar = (page: import('@playwright/test').Page) => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());

test.describe('Kolor przewodni aplikacji (F-T2)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('wybór cyjanu barwi tokeny, działa na Dashboard i przeżywa reload; limonka wraca do domyślnych', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);

    await expect(page.getByTestId('accent-swatches')).toBeVisible();
    await page.getByTestId('accent-cyan').click();
    expect(await primaryVar(page)).toBe('187 86% 53%');

    // Cała aplikacja: Dashboard czyta te same tokeny.
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('187 86% 53%');

    // Reload: kolor nakładany od splashu (localStorage).
    await page.reload();
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('187 86% 53%');

    // Powrót do limonki = czyste tokeny z index.css.
    await navigateAndWait(page, '/profile');
    await page.getByTestId('accent-lime').click();
    expect(await primaryVar(page)).toBe('73 97% 56%');
  });
});
