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

  // Audyt akcentu (2026-08-20): aktywne chipy filtrów (Historia: bg-primary,
  // Ćwiczenia: bg-accent) muszą podążać za kolorem przewodnim — regresją była
  // limonka zaszyta przez fitness-cyan/--accent.
  test('akcent #1e90ff: aktywne chipy filtrów nie zostają limonkowe (Historia, Ćwiczenia)', async ({ page }) => {
    const LIME = 'rgb(206, 252, 34)';
    await page.addInitScript(() => localStorage.setItem('ss-accent-color', '#1e90ff'));

    await navigateAndWait(page, '/history');
    await expectPageRendered(page);
    // --accent podąża za --primary (chipy Kinetic, badge secondary).
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { primary: style.getPropertyValue('--primary').trim(), accent: style.getPropertyValue('--accent').trim() };
    });
    expect(tokens.primary).not.toBe('73 97% 56%');
    expect(tokens.accent).toBe(tokens.primary);

    const historyChip = page.getByRole('button', { name: /^wszystkie$/i }).first();
    await expect(historyChip).toBeVisible();
    expect(await historyChip.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(LIME);

    await navigateAndWait(page, '/exercises');
    await expectPageRendered(page);
    const exercisesChip = page.getByRole('button', { name: /^wszystkie$/i }).first();
    await expect(exercisesChip).toBeVisible();
    expect(await exercisesChip.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(LIME);
  });

  test('własny kolor po hex barwi tokeny i przeżywa reload', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await page.getByTestId('accent-hex-input').fill('#1e90ff');
    await page.getByTestId('accent-hex-apply').click();
    const applied = await primaryVar(page);
    expect(applied).toMatch(/^\d+ \d+% \d+%$/);
    expect(applied).not.toBe('73 97% 56%');

    await page.reload();
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe(applied);

    await navigateAndWait(page, '/profile');
    await page.getByTestId('accent-lime').click();
    expect(await primaryVar(page)).toBe('73 97% 56%');
  });
});
