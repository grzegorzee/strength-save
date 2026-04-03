import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, expectHashRoute } from './helpers';

test.describe('Critical Routing and Shell', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('dashboard renders app shell and today card', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/Rozpocznij trening|Dzisiaj wolne|Trening ukończony/i)).toBeVisible();
    await expect(page.getByText('Co dalej z planem?')).toBeVisible();
  });

  test('hash route renders 404 page inside app shell', async ({ page }) => {
    await navigateAndWait(page, '/__missing-route__');
    await expectHashRoute(page, '/__missing-route__');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to Home/i })).toBeVisible();
  });

  test('plan page shows current plan title and schedule summary', async ({ page }) => {
    await navigateAndWait(page, '/plan');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Plan treningowy' })).toBeVisible();
    await expect(page.getByText(/tygodniowy program/i)).toBeVisible();
    await expect(page.getByText(/Tydzień \d+\/\d+/)).toBeVisible();
  });

  test('training day pages render their specific plan labels', async ({ page }) => {
    const cases = [
      ['/workout/day-1', 'Poniedziałek'],
      ['/workout/day-2', 'Środa'],
      ['/workout/day-3', 'Piątek'],
    ] as const;

    for (const [route, label] of cases) {
      await navigateAndWait(page, route);
      await expectPageRendered(page);
      await expect(page.getByText(label, { exact: false })).toBeVisible();
    }
  });

  test('cycles page shows current active plan summary', async ({ page }) => {
    await navigateAndWait(page, '/cycles');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Cykle treningowe' })).toBeVisible();
    await expect(page.getByText('Aktualny plan')).toBeVisible();
    await expect(page.getByText(/Closeout i progres cyklu|Brak aktywnego closeoutu cyklu/)).toBeVisible();
  });

  test('admin route either shows admin shell or redirects non-admin users', async ({ page }) => {
    await navigateAndWait(page, '/admin');
    await expectPageRendered(page);

    const isAdminRoute = /#\/admin(?:[/?#]|$)/.test(page.url());
    if (isAdminRoute) {
      await expect(page.getByRole('main').getByRole('heading', { name: 'Panel admina' })).toBeVisible();
      await expect(page.getByText('API eksportu')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Generuj klucz' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    }
  });
});

test.describe('Critical Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('analytics tabs are clickable without conditional skips', async ({ page }) => {
    await navigateAndWait(page, '/analytics');
    await expectPageRendered(page);

    const tabs = ['Podsum.', 'Wykresy', 'Pomiary', 'Tygodnie'];
    for (const label of tabs) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
      await page.getByRole('tab', { name: label }).click();
      await expectPageRendered(page);
    }
  });

  test('settings page is reachable from shell', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Ustawienia' })).toBeVisible();
    await expect(page.getByText('Backup i przywracanie')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eksportuj kopię' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importuj kopię' })).toBeVisible();
  });

  test('history page shows filters and comparison shell', async ({ page }) => {
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Historia treningów' })).toBeVisible();
    await expect(page.getByText('Filtry')).toBeVisible();
  });
});
