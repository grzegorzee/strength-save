// X17D Z139.5: ekran „Twoje liczby" otwierany z licznika treningów w nagłówku.
import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, setE2EWorkouts } from './helpers';

const workout = (id: string, date: string, durationSec: number, weight: number, reps: number) => ({
  id,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date,
  completed: true,
  durationSec,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie hantli (Lekki skos)',
    sets: [
      { reps: 10, weight: 20, completed: true, isWarmup: true },
      { reps, weight, completed: true },
      { reps, weight, completed: true },
    ],
  }],
});

test.describe('Twoje liczby (X17D Z139)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('tap w licznik treningów otwiera arkusz z liczbami zgodnymi z historią', async ({ page }) => {
    // 2 treningi po 1 h, każdy 2 serie robocze 100 kg x 5 => 2000 kg tonażu.
    await setE2EWorkouts(page, [
      workout('w1', '2026-07-01', 3600, 100, 5),
      workout('w2', '2026-07-08', 3600, 100, 5),
    ]);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);

    const counter = page.getByTestId('header-workout-count');
    await expect(counter).toBeVisible();
    await expect(counter).toContainText('2');
    await counter.click();

    const stats = page.getByTestId('all-time-stats');
    await expect(stats).toBeVisible();
    await expect(stats.getByTestId('stat-workouts')).toContainText('2');
    // 2 x 3600 s = 2 h
    await expect(stats.getByTestId('stat-time')).toContainText('2 h');
    // Tonaż BEZ rozgrzewki: 4 serie robocze x 100 kg x 5 = 2000 kg.
    await expect(stats.getByTestId('stat-tonnage')).toContainText('2000');
    // Serie robocze: 4 (rozgrzewki się nie liczą).
    await expect(stats).toContainText('Serie');
  });

  test('pusta historia pokazuje zachętę, nie zera bez kontekstu', async ({ page }) => {
    await setE2EWorkouts(page, []);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);

    await page.getByTestId('header-workout-count').click();
    await expect(page.getByTestId('stats-empty')).toBeVisible();
  });

  test('licznik w nagłówku jest dostępny z klawiatury', async ({ page }) => {
    await setE2EWorkouts(page, [workout('w1', '2026-07-01', 3600, 100, 5)]);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);

    const counter = page.getByTestId('header-workout-count');
    await counter.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('all-time-stats')).toBeVisible();
  });
});
