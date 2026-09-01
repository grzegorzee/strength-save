import { test, expect } from '@playwright/test';
import { blockFirebase, expectPageRendered, navigateAndWait } from './helpers';

const themeState = (page: import('@playwright/test').Page) => page.evaluate(() => ({
  accent: localStorage.getItem('ss-accent-color'),
  palette: localStorage.getItem('ss-palette-theme-v2'),
  dataAccent: document.documentElement.dataset.accent,
  dataPalette: document.documentElement.dataset.palette,
  primary: document.documentElement.style.getPropertyValue('--primary'),
}));

test.describe('Pojedynczy kolor aplikacji bez palet', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('Profil pokazuje wybór pojedynczego koloru, ale nie palety', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await expect(page.getByTestId('palette-theme-picker')).toHaveCount(0);
    await page.getByTestId('profile-toggle-accent').click();
    await expect(page.getByTestId('accent-swatches')).toBeVisible();
    await page.getByTestId('accent-indigo').click();
    expect(await themeState(page)).toMatchObject({
      accent: 'indigo',
      palette: null,
      dataAccent: 'indigo',
    });
  });

  test('cold start usuwa dawną paletę, ale zachowuje pojedynczy akcent', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ss-accent-color', 'indigo');
      localStorage.setItem('ss-palette-theme-v2', JSON.stringify({
        version: 2,
        id: 'glacier',
        source: 'preset',
        primary: '#38bdf8',
        supportA: '#818cf8',
        supportB: '#2dd4bf',
      }));
    });
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await themeState(page)).toEqual({
      accent: 'indigo',
      palette: null,
      dataAccent: 'indigo',
      dataPalette: undefined,
      primary: '235 86% 65%',
    });
  });
});
