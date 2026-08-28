import { expect, test } from '@playwright/test';
import { blockFirebase, expectPageRendered, navigateAndWait } from './helpers';

const screens = [
  { route: '/plan', shell: 'Plan', redundant: 'Plan treningowy' },
  { route: '/history', shell: 'Historia', redundant: 'Historia' },
  { route: '/achievements', shell: 'Postępy', redundant: 'Postępy' },
  { route: '/cycles', shell: 'Cykle treningowe', redundant: 'Cykle treningowe' },
] as const;

test.describe('jeden tytuł ekranu w mobilnej powłoce', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  for (const screen of screens) {
    test(`${screen.route}: AppHeader jest jedynym tytułem root`, async ({ page }) => {
      await navigateAndWait(page, screen.route);
      await expectPageRendered(page);

      await expect(page.locator('header').getByRole('heading', {
        name: screen.shell,
        exact: true,
      })).toBeVisible();
      await expect(page.getByRole('main').getByRole('heading', {
        name: screen.redundant,
        exact: true,
      })).toHaveCount(0);
    });
  }

  test('/plan zachowuje dynamiczny kontekst tygodnia', async ({ page }) => {
    await navigateAndWait(page, '/plan');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', {
      name: /Tydzień \d+\/\d+/,
    })).toBeVisible();
  });

  test('/history zachowuje stary poprawny przepływ filtrów i eksportu', async ({ page }) => {
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);
    await expect(page.getByTestId('history-period')).toBeVisible();
    await expect(page.getByTestId('history-export')).toBeVisible();
  });
});
