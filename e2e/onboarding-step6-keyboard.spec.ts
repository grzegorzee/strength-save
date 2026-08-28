import { expect, test, type Page } from '@playwright/test';
import { advanceWizardToStep6, blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

const CASES = [
  { width: 320, height: 568, keyboardInset: 280 },
  { width: 375, height: 667, keyboardInset: 300 },
] as const;

const openStartStep = async (page: Page) => {
  await blockFirebase(page);
  await setE2EAuthScenario(page, 'active-admin');
  await navigateAndWait(page, '/new-plan');
  await advanceWizardToStep6(page);
};

test.describe('krok 6 onboardingu nad klawiaturą', () => {
  for (const viewport of CASES) {
    test(`${viewport.width}x${viewport.height}: aktywna nazwa nie jest zasłonięta przez akcje ani klawiaturę`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openStartStep(page);

      const name = page.getByTestId('ob-plan-name');
      await name.focus();
      await page.evaluate((keyboardInset) => {
        document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
      }, viewport.keyboardInset);

      await expect.poll(async () => page.evaluate(({ height, keyboardInset }) => {
        const input = document.querySelector<HTMLElement>('[data-testid="ob-plan-name"]')?.getBoundingClientRect();
        const actions = document.querySelector<HTMLElement>('[data-testid="ob-start-actions"]')?.getBoundingClientRect();
        if (!input || !actions) return null;
        const visibleBottom = height - keyboardInset;
        return {
          inputTop: Math.round(input.top),
          inputBottom: Math.round(input.bottom),
          actionsTop: Math.round(actions.top),
          actionsBottom: Math.round(actions.bottom),
          visibleBottom,
          inputVisible: input.top >= 0,
          inputAboveActions: input.bottom <= actions.top - 8,
          actionsAboveKeyboard: actions.bottom <= visibleBottom + 1,
        };
      }, viewport)).toMatchObject({
        inputVisible: true,
        inputAboveActions: true,
        actionsAboveKeyboard: true,
      });

      // Stary przepływ pozostaje aktywny: wpisanie nazwy nie blokuje podglądu.
      await name.fill('Plan bez zasłoniętego pola');
      await name.press('Enter');
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--keyboard-inset', '0px');
      });
      await expect(page.getByTestId('ob-start-preview')).toBeVisible();
      await page.getByTestId('ob-start-preview').click();
      await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
    });
  }
});
