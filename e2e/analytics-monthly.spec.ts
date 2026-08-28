import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
  setE2EWorkouts,
} from './helpers';

// Z93: karta "Miesiące" w Analityce (zakładka Podsumowanie) — liczba treningów,
// łączny czas (z jawnym brakiem pomiaru dla treningów sprzed M32) i tonaż.

const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const now = new Date();
const CURRENT = monthKeyOf(now);
const PREVIOUS = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));

const workout = (id: string, date: string, over: Record<string, unknown> = {}) => ({
  id,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{
    exerciseId: 'ex-1-1',
    sets: [{ reps: 10, weight: 50, completed: true }],
  }],
  ...over,
});

test('Wyniki są lekkie, a karta Miesiące pozostaje w szczegółach', async ({ page }) => {
  await setE2EAuthScenario(page, 'active-admin');
  await blockFirebase(page);
  await setE2EWorkouts(page, [
    workout('m-1', `${CURRENT}-01`, { durationSec: 3600 }),
    workout('m-2', `${CURRENT}-02`),
    workout('m-3', `${PREVIOUS}-01`, { durationSec: 1800 }),
  ]);

  await navigateAndWait(page, '/achievements?view=analytics');
  await expectPageRendered(page);

  await expect(page.getByTestId('analytics-summary-insight')).toBeVisible();
  await expect(page.getByTestId('analytics-summary-metric')).toHaveCount(3);
  await expect(page.getByText('Miesiące', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Ukończone treningi', { exact: true })).toHaveCount(0);

  await page.getByTestId('progress-more-trigger').click();
  await page.getByRole('menuitem', { name: 'Szczegóły' }).click();
  await expect(page).toHaveURL(/tab=details/);

  await expect(page.getByText('Miesiące', { exact: true })).toBeVisible();

  // Bieżący miesiąc: 2 treningi, 1 h 0 min, jeden bez zmierzonego czasu.
  await expect(page.getByText('2 treningów')).toBeVisible();
  await expect(page.getByText('1 h 0 min')).toBeVisible();
  await expect(page.getByText('1 bez zmierzonego czasu')).toBeVisible();

  // Poprzedni miesiąc: 1 trening, 30 min.
  await expect(page.getByText('1 treningów')).toBeVisible();
  await expect(page.getByText('30 min', { exact: true })).toBeVisible();

  await page.screenshot({ path: 'tmp/z93-monthly-card.png', fullPage: false });
});

test('320 px / EN: Wyniki zachowują hierarchię i dostęp do szczegółów bez overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem('app-language', 'en'));
  await setE2EAuthScenario(page, 'active-admin');
  await blockFirebase(page);
  await setE2EWorkouts(page, [workout('compact-1', `${CURRENT}-01`, { durationSec: 1800 })]);

  await navigateAndWait(page, '/achievements?view=analytics');
  await expectPageRendered(page);

  await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Charts' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Records' })).toBeVisible();
  await expect(page.getByTestId('analytics-summary-metric')).toHaveCount(3);
  await expect(page.getByText('Completed workouts', { exact: true })).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);

  await page.getByTestId('progress-more-trigger').click();
  await expect(page.getByRole('menuitem', { name: 'Details' })).toBeVisible();
});
