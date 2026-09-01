// Decyzja 1.0 (2026-09-01): jeden stały kolor marki, bez wyboru palet.
// Niezmiennik (zasada #5): dawny zapis palety lub akcentu nie może zmienić
// motywu ani zepsuć dotychczasowego przepływu onboardingu.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { advanceWizardToStep6, blockFirebase, expectPageRendered, navigateAndWait, setE2EAuthScenario } from './helpers';

// UWAGA: ekran onboardingu (PlanWizard) nie renderuje <main> — helper
// expectPageRendered tu nie działa (wzorzec jak test onboardingu w full-app:
// asercje na realne elementy ekranu). expectPageRendered tylko na Dashboardzie.

const primaryVar = (page: import('@playwright/test').Page) => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());

const expectFullyReachable = async (page: Page, action: Locator) => {
  await expect(action).toBeVisible();
  const [box, viewport] = await Promise.all([
    action.boundingBox(),
    page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
  ]);
  expect(box, 'primary action must have a measurable box').not.toBeNull();
  expect(box!.y, 'top edge must not be clipped').toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, 'bottom edge must not be clipped').toBeLessThanOrEqual(viewport.height + 1);
  expect(box!.x, 'left edge must not be clipped').toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, 'right edge must not be clipped').toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.height, 'primary action must keep a mobile touch target').toBeGreaterThanOrEqual(44);
};

const phoneViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
] as const;

test.describe('Onboarding: stały kolor marki', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await setE2EAuthScenario(page, 'new-user');
  });

  test('nie pokazuje wyboru palety, a lime trzyma się przez kroki wizarda', async ({ page }) => {
    await navigateAndWait(page, '/');

    await expect(page.getByTestId('ob-name-input')).toBeVisible();
    await expect(page.getByTestId('palette-theme-picker')).toHaveCount(0);
    await expect(page.getByTestId('ob-accent-swatches')).toHaveCount(0);
    await expect(page.getByTestId('ob-custom-colors-toggle')).toHaveCount(0);
    expect(await primaryVar(page)).toBe('73 97% 56%');
    expect(await page.evaluate(() => localStorage.getItem('ss-accent-color'))).toBe('lime');

    // Kolor marki trzyma się przez kolejne kroki wizarda aż do podglądu planu.
    await page.getByTestId('ob-personalization-next').click();
    await page.getByTestId('consent-terms').click();
    await page.getByTestId('consent-privacy').click();
    await page.getByTestId('consent-health').click();
    await page.getByTestId('ob-legal-submit').click();
    // X34: 5A (wybór) -> 6/6 (Start planu) -> "Podgląd planu".
    await advanceWizardToStep6(page);
    expect(await primaryVar(page)).toBe('73 97% 56%');
    await page.getByTestId('ob-start-preview').click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
    expect(await primaryVar(page)).toBe('73 97% 56%');
  });

  test('NIEZMIENNIK: bieg bez ustawień koloru przechodzi przez Welcome jak dotąd', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('ob-name-input')).toBeVisible();
    await expect(page.getByTestId('palette-theme-picker')).toHaveCount(0);
    await expect(page.getByTestId('ob-accent-swatches')).toHaveCount(0);
    expect(await primaryVar(page)).toBe('73 97% 56%');
    expect(await page.evaluate(() => localStorage.getItem('ss-accent-color'))).toBe('lime');
    expect(await page.evaluate(() => localStorage.getItem('ss-palette-theme-v2'))).toBeNull();

    await page.getByTestId('ob-personalization-next').click();
    await page.getByTestId('consent-terms').click();
    await page.getByTestId('consent-privacy').click();
    await page.getByTestId('consent-health').click();
    await page.getByTestId('ob-legal-submit').click();
    await expect(page.getByRole('button', { name: 'Następny krok' })).toBeVisible();
    expect(await primaryVar(page)).toBe('73 97% 56%');
    expect(await page.evaluate(() => localStorage.getItem('ss-palette-theme-v2'))).toBeNull();
  });

  test('tryb podstawowy przechodzi dalej bez zaznaczenia funkcji zdrowotnych', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('ob-personalization-next').click();
    await page.getByTestId('consent-terms').click();
    await page.getByTestId('consent-privacy').click();
    await expect(page.getByTestId('consent-health')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('ob-legal-submit')).toBeEnabled();
    await page.getByTestId('ob-legal-submit').click();
    await expect(page.getByRole('button', { name: 'Następny krok' })).toBeVisible();
  });

  for (const viewport of phoneViewports) {
    test(`${viewport.width}×${viewport.height}: pełny CTA pozostaje osiągalny w starym przepływie kroków 1–5`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await navigateAndWait(page, '/');

      const personalizationNext = page.getByTestId('ob-personalization-next');
      await expectFullyReachable(page, personalizationNext);
      await personalizationNext.click();

      const legalSubmit = page.getByTestId('ob-legal-submit');
      await expectFullyReachable(page, legalSubmit);
      await page.getByTestId('consent-terms').click();
      await page.getByTestId('consent-privacy').click();
      await page.getByTestId('consent-health').click();
      await legalSubmit.click();

      const baselineNext = page.getByRole('button', { name: 'Następny krok' });
      await expectFullyReachable(page, baselineNext);
      await baselineNext.click();

      const objectiveNext = page.getByRole('button', { name: 'Dalej', exact: true });
      await expectFullyReachable(page, objectiveNext);
      await objectiveNext.click();

      const protocolNext = page.getByRole('button', { name: 'Dalej', exact: true });
      await expectFullyReachable(page, protocolNext);
      await protocolNext.click();

      const matchNext = page.getByTestId('ob-match-next');
      await expectFullyReachable(page, matchNext);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});

test.describe('Po onboardingu: Dashboard w stałym kolorze marki', () => {
  test('dawny zapis indigo jest normalizowany do lime już od splashu', async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('ss-accent-color', 'indigo');
    });
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('73 97% 56%');
    expect(await page.evaluate(() => localStorage.getItem('ss-accent-color'))).toBe('lime');
    expect(await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim(),
    )).toBe('0 0% 6%');
  });
});
