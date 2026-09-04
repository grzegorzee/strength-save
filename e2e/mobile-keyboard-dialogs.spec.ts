import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  advanceWizardToStep5,
  blockFirebase,
  localToday,
  navigateAndWait,
} from './helpers';

const KEYBOARD_INSET = 300;

const simulateKeyboard = async (page: Page) => {
  await page.evaluate((inset) => {
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
  }, KEYBOARD_INSET);
};

const expectReachableAboveKeyboard = async (page: Page, locator: Locator) => {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(39);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844 - KEYBOARD_INSET + 1);
  const visibleHeight = await locator.evaluate((element, keyboardBottom) => {
    const rect = element.getBoundingClientRect();
    let top = Math.max(0, rect.top);
    let bottom = Math.min(keyboardBottom, rect.bottom);
    let parent = element.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll|hidden|clip)/.test(`${style.overflow} ${style.overflowY}`)) {
        const parentRect = parent.getBoundingClientRect();
        top = Math.max(top, parentRect.top);
        bottom = Math.min(bottom, parentRect.bottom);
      }
      parent = parent.parentElement;
    }
    return Math.max(0, bottom - top);
  }, 844 - KEYBOARD_INSET);
  expect(visibleHeight).toBeGreaterThanOrEqual(39);
  const centerIsHitTarget = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
    return hit === element || (hit !== null && element.contains(hit));
  });
  expect(centerIsHitTarget).toBe(true);
};

test.describe('mobilna klawiatura nie zasłania CTA', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('Profil: zgłoszenie błędu zachowuje pole, X i wysyłkę nad klawiaturą', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await page.getByTestId('profile-toggle-account').click();
    await page.getByText('Zgłoś błąd', { exact: true }).click();
    await page.getByLabel('Co się stało?').fill('Klawiatura nie może zasłaniać przycisku wysłania zgłoszenia.');
    await simulateKeyboard(page);

    const dialog = page.getByTestId('bug-report-dialog');
    await expectReachableAboveKeyboard(page, dialog.getByRole('button', { name: 'Wyślij zgłoszenie' }));
    await expectReachableAboveKeyboard(page, dialog.getByRole('button', { name: 'Zamknij okno' }));
    await page.screenshot({ path: 'audit/shots/2026-08-27/keyboard-report-bug.png', fullPage: false });
  });

  test('własne ćwiczenie: formularz i Zapisz i wybierz są osiągalne', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await advanceWizardToStep5(page);
    await page.getByRole('button', { name: 'Ułóż własny plan' }).click();
    await page.getByRole('button', { name: 'Zacznij od zera' }).click();
    await page.getByRole('button', { name: /Dodaj dzień/ }).click();
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Dodaj własne ćwiczenie' }).click();
    await dialog.getByPlaceholder(/Nazwa ćwiczenia/).fill('Moje ćwiczenie testowe');
    await simulateKeyboard(page);

    await expect(dialog.getByTestId('exercise-picker-scroll')).toHaveCSS('overflow-y', 'auto');
    await expectReachableAboveKeyboard(page, dialog.getByRole('button', { name: 'Zapisz i wybierz' }));
    await page.screenshot({ path: 'audit/shots/2026-08-27/keyboard-custom-exercise.png', fullPage: false });
  });

  test('kalkulator talerzy: pole wagi i Ustaw w serii są osiągalne', async ({ page }) => {
    await navigateAndWait(page, `/workout/day-1?date=${localToday()}&autostart=true`);
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByTestId('plate-calculator-open').click();
    await page.getByLabel(/Waga docelowa/i).fill('100');
    await simulateKeyboard(page);

    const sheet = page.getByRole('dialog');
    await expectReachableAboveKeyboard(page, sheet.getByRole('button', { name: /Ustaw w serii/i }));
    await page.screenshot({ path: 'audit/shots/2026-08-27/keyboard-plate-calculator.png', fullPage: false });
  });

  test('cardio: przewijana treść i Zapisz wpis pozostają nad klawiaturą', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('add-cardio-open').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('cardio-minutes').fill('30');
    await simulateKeyboard(page);

    await expectReachableAboveKeyboard(page, dialog.getByTestId('cardio-save'));
    await expect(dialog.locator('.min-h-0.overflow-y-auto')).toHaveCSS('overflow-y', 'auto');
  });
});
