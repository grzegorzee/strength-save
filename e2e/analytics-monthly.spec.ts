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

test('karta Miesiące: treningi, czas i jawny brak pomiaru czasu', async ({ page }) => {
  await setE2EAuthScenario(page, 'active-admin');
  await blockFirebase(page);
  await setE2EWorkouts(page, [
    workout('m-1', `${CURRENT}-01`, { durationSec: 3600 }),
    workout('m-2', `${CURRENT}-02`),
    workout('m-3', `${PREVIOUS}-01`, { durationSec: 1800 }),
  ]);

  await navigateAndWait(page, '/analytics?tab=summary');
  await expectPageRendered(page);

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
