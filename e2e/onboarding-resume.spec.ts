import { expect, test } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

const DRAFT_KEY = 'CapacitorStorage.strength-save:onboarding-draft:v1:e2e-test-user';

test.describe('Onboarding odporny na restart WebView', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'new-user', {
      consents: {
        termsVersion: '2.0',
        privacyVersion: '2.1',
        healthGranted: true,
        healthVersion: '1.0',
        marketingGranted: false,
        marketingVersion: '1.0',
      },
    });
  });

  test('reload na kroku dni zachowuje krok i odpowiedzi, bez ponownego interstitialu', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();

    await expect(page.getByText('Ile dni treningowych w tygodniu?')).toBeVisible();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await expect(page.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await expect.poll(async () => page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const value = JSON.parse(raw) as { wizardStep?: number; daysPerWeek?: number };
      return `${value.wizardStep}:${value.daysPerWeek}`;
    }, DRAFT_KEY)).toBe('4:3');

    await page.reload();
    await expect(page.getByText('Ile dni treningowych w tygodniu?')).toBeVisible();
    await expect(page.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ob-matching')).toHaveCount(0);
  });
});
