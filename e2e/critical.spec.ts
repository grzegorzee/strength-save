import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, expectHashRoute, openProfileSection, localToday, plWeekdayName } from './helpers';

test.describe('Critical Routing and Shell', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('dashboard renders app shell and today card', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Dzisiaj' }),
    ).toBeVisible();
    // Runna p.1 B2: dzień wolny = karta "Dzień regeneracji" (nie "Dzisiaj wolne").
    await expect(page.getByText(/Rozpocznij trening|Dzisiaj wolne|Trening ukończony|Dzień regeneracji/i)).toBeVisible();
    // D-T2: pełna sekcja tygodnia zeszła do Planu; Dashboard ma kompaktowy WeekCard.
    await expect(page.getByTestId('week-card')).toBeVisible();
  });

  test('hash route renders 404 page inside app shell', async ({ page }) => {
    await navigateAndWait(page, '/__missing-route__');
    await expectHashRoute(page, '/__missing-route__');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Wróć do strony głównej|Return to Home/i })).toBeVisible();
  });

  test('plan page shows current plan title and schedule summary', async ({ page }) => {
    await navigateAndWait(page, '/plan');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Plan treningowy' })).toBeVisible();
    await expect(page.getByText(/tygodniowy program/i)).toBeVisible();
    await expect(page.getByText(/Tydzień \d+\/\d+/)).toBeVisible();
  });

  test('training day pages render their plan day heading', async ({ page }) => {
    // X30 WP-L: nagłówek sesji podąża za DATĄ (bez ?date= = dziś), nie za
    // dniem planu; test był datozależny (zielony tylko w poniedziałek).
    for (const route of ['/workout/day-1', '/workout/day-2', '/workout/day-3']) {
      await navigateAndWait(page, route);
      await expectPageRendered(page);
      await expect(page.getByRole('heading', { name: plWeekdayName(localToday()) })).toBeVisible();
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

  test('main Progress segments are clickable without conditional skips', async ({ page }) => {
    await navigateAndWait(page, '/achievements');
    await expectPageRendered(page);

    const tabs = [
      { label: 'Podsumowanie', testId: 'progress-view-summary' },
      { label: 'Wykresy', testId: 'progress-view-charts' },
      { label: 'Rekordy', testId: 'progress-view-records' },
    ];
    for (const { label, testId } of tabs) {
      const tab = page.getByRole('tab', { name: label, exact: true });
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(page.getByTestId(testId)).toHaveAttribute('aria-selected', 'true');
      await expectPageRendered(page);
    }
  });

  test('legacy /settings redirects to Profile with backup section (X35b)', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectHashRoute(page, '/profile');
    await expectPageRendered(page);
    await expect(page.getByText('Backup i przywracanie')).toBeVisible();
    // X36: sekcja zwijana — treść po rozwinięciu.
    await openProfileSection(page, 'backup');
    await expect(page.getByRole('button', { name: 'Eksportuj kopię' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importuj kopię' })).toBeVisible();
  });

  test('history page shows filters and comparison shell', async ({ page }) => {
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);
    // Naprawa r1 (2026-08-21): tytuł Historii niesie wyłącznie AppHeader (poza
    // main); etykieta zakładki jest krótka, żeby mieściła się w jednej linii.
    await expect(page.getByRole('heading', { name: 'Historia', exact: true })).toBeVisible();
    // WP-H (X28): poziom 1 = PERIOD + jeden Export; chipy statusu i ikona
    // filtrów żyją w pełnej liście (?list=all).
    await expect(page.getByTestId('history-period')).toBeVisible();
    await expect(page.getByTestId('history-export')).toBeVisible();

    await navigateAndWait(page, '/history?list=all');
    await expectPageRendered(page);
    await expect(page.getByRole('button', { name: /^wszystkie$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filtry' })).toBeVisible();
  });
});
