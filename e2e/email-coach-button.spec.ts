// H-T1: widoczny przycisk "Wyślij do trenera" (pełny button zamiast samej
// ikony) na ukończonym treningu oraz wybór zakresu w dialogu historii.
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localDaysAgo,
  navigateAndWait,
  setE2EWorkouts,
} from './helpers';

const SESSION_DATE = localDaysAgo(1);

const workout = (id: string, date: string) => ({
  id,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date,
  completed: true,
  durationSec: 3600,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie hantli (Lekki skos)',
    sets: [{ reps: 8, weight: 40, completed: true }],
  }],
});

test.describe('Wyślij do trenera (H-T1)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('ukończony trening: pełny button z tekstem, dialog bez selektora zakresu', async ({ page }) => {
    await setE2EWorkouts(page, [workout('w-current', SESSION_DATE)]);
    await navigateAndWait(page, `/workout/day-1?date=${SESSION_DATE}&session=w-current`);
    await expectPageRendered(page);

    const button = page.getByTestId('workout-email');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Wyślij do trenera');

    await button.click();
    await expect(page.getByTestId('email-workout-dialog')).toBeVisible();
    await expect(page.getByTestId('email-range-week')).toHaveCount(0);
  });

  // WP-H (X28): wysyłka historii żyje w Export sheet (wiersz "Wyślij do
  // trenera"); sheet zamyka się PRZED otwarciem dialogu (kontrakt Radix).
  test('historia: Export sheet → do trenera otwiera dialog z dwiema opcjami zakresu (bez opcji wszystko)', async ({ page }) => {
    await setE2EWorkouts(page, [workout('w-current', SESSION_DATE)]);
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);

    await page.getByTestId('history-export').click();
    await expect(page.getByTestId('history-export-sheet')).toBeVisible();
    const button = page.getByTestId('history-email');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Wyślij do trenera');

    await button.click();
    await expect(page.getByTestId('history-export-sheet')).not.toBeVisible();
    await expect(page.getByTestId('email-workout-dialog')).toBeVisible();
    await expect(page.getByTestId('email-range-week')).toBeVisible();
    await expect(page.getByTestId('email-range-last30')).toBeVisible();
    await expect(page.getByTestId('email-range-week')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Ostatni tydzień')).toBeVisible();
    await expect(page.getByText('Ostatnie 30 treningów')).toBeVisible();
  });

  // J-T2: akcja w wierszu Historii wysyła TEN trening (mode='workout',
  // bez selektora zakresu — zakresy dotyczą tylko maila historii).
  test('wiersz historii: akcja Wyślij do trenera otwiera dialog tego treningu bez zakresu', async ({ page }) => {
    await setE2EWorkouts(page, [workout('w-current', SESSION_DATE)]);
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);

    // Fala 2: akcja przeniesiona do menu ⋯ wiersza — najpierw otwarcie menu.
    await page.getByTestId('history-row-menu').first().click();
    const action = page.getByTestId('history-row-email').first();
    await expect(action).toBeVisible();
    await expect(action).toContainText('Wyślij do trenera');

    await action.click();
    await expect(page.getByTestId('email-workout-dialog')).toBeVisible();
    await expect(page.getByTestId('email-range-week')).toHaveCount(0);
    await expect(page.getByTestId('email-range-last30')).toHaveCount(0);
  });
});
