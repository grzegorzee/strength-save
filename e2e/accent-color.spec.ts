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

  // Plan I (2026-08-20): paleta wg wzoru właściciela — cyan zastąpiony przez
  // sky #29b6f6 ('199 92% 56%'), stare id działają dalej przez aliasy.
  test('wybór sky barwi tokeny, działa na Dashboard i przeżywa reload; limonka wraca do domyślnych', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);

    await page.getByTestId('profile-toggle-accent').click();
    await expect(page.getByTestId('accent-swatches')).toBeVisible();
    await page.getByTestId('accent-sky').click();
    expect(await primaryVar(page)).toBe('199 92% 56%');

    // Cała aplikacja: Dashboard czyta te same tokeny.
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('199 92% 56%');

    // Reload: kolor nakładany od splashu (localStorage).
    await page.reload();
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('199 92% 56%');

    // Powrót do limonki = czyste tokeny z index.css.
    await navigateAndWait(page, '/profile');
    await page.getByTestId('profile-toggle-accent').click();
    await page.getByTestId('accent-lime').click();
    expect(await primaryVar(page)).toBe('73 97% 56%');
  });

  test('stare id z localStorage (cyan) aplikuje następcę (sky) od splashu', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ss-accent-color', 'cyan'));
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('199 92% 56%');
  });

  test('mały ekran 320 px: wszystkie legacy swatche mają co najmniej 44×44', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 667 });
    await navigateAndWait(page, '/profile');
    await page.getByTestId('profile-toggle-accent').click();
    const boxes = await page.getByTestId('accent-swatches').getByRole('radio').evaluateAll((radios) =>
      radios.map((radio) => {
        const rect = radio.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('ciemny akcent palety (indigo) dostaje jasny foreground na CTA', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ss-accent-color', 'indigo'));
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        primary: style.getPropertyValue('--primary').trim(),
        foreground: style.getPropertyValue('--primary-foreground').trim(),
      };
    });
    expect(tokens.primary).toBe('235 86% 65%');
    expect(tokens.foreground).toBe('0 0% 100%');
  });

  // Audyt akcentu (2026-08-20): aktywne chipy filtrów (Historia: bg-primary,
  // Ćwiczenia: bg-accent) muszą podążać za kolorem przewodnim — regresją była
  // limonka zaszyta przez fitness-cyan/--accent.
  test('akcent #1e90ff: aktywne chipy filtrów nie zostają limonkowe (Historia, Ćwiczenia)', async ({ page }) => {
    const LIME = 'rgb(206, 252, 34)';
    await page.addInitScript(() => localStorage.setItem('ss-accent-color', '#1e90ff'));

    // WP-H (X28): chipy statusu Historii żyją w pełnej liście (?list=all).
    await navigateAndWait(page, '/history?list=all');
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

    // X27 WP-E: chip "Wszystkie" żyje w widoku grupy (poziom 2) i nosi licznik.
    await navigateAndWait(page, '/exercises?group=chest');
    await expectPageRendered(page);
    const exercisesChip = page.getByRole('button', { name: /^wszystkie \d+$/i }).first();
    await expect(exercisesChip).toBeVisible();
    expect(await exercisesChip.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(LIME);
  });

  test('własny kolor po hex barwi tokeny i przeżywa reload', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await page.getByTestId('profile-toggle-accent').click();
    await page.getByTestId('accent-hex-input').fill('#1e90ff');
    await page.getByTestId('accent-hex-apply').click();
    const applied = await primaryVar(page);
    expect(applied).toMatch(/^\d+ \d+% \d+%$/);
    expect(applied).not.toBe('73 97% 56%');

    await page.reload();
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe(applied);

    await navigateAndWait(page, '/profile');
    await page.getByTestId('profile-toggle-accent').click();
    await page.getByTestId('accent-lime').click();
    expect(await primaryVar(page)).toBe('73 97% 56%');
  });
});
