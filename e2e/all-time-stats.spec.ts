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

  // F5 (2026-09-29, wariant A): licznik od pierwszego treningu siłowego z jawną
  // datą „od", rozbiciem cardio na źródła i typy oraz przypisem o starszych.
  test('licznik aktywności ma datę „od", źródła, typy i przypis o starszych', async ({ page }) => {
    await setE2EWorkouts(page, [
      workout('w1', '2026-01-26', 3600, 100, 5),
      workout('w2', '2026-02-02', 3600, 100, 5),
    ]);
    await page.addInitScript((data) => {
      window.localStorage.setItem('fittracker_e2e_manual_activities', JSON.stringify(data));
    }, [
      { id: 'ma-old', userId: 'e2e-test-user', type: 'Swim', date: '2025-12-01', movingTime: 1800, createdAt: 1 },
      { id: 'ma-1', userId: 'e2e-test-user', type: 'Swim', date: '2026-02-10', movingTime: 1800, createdAt: 2 },
      { id: 'ma-2', userId: 'e2e-test-user', type: 'Run', date: '2026-03-01', movingTime: 1800, createdAt: 3 },
      { id: 'ma-3', userId: 'e2e-test-user', type: 'Swim', date: '2026-04-01', movingTime: 1800, createdAt: 4 },
    ]);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await page.getByTestId('header-workout-count').click();

    const stats = page.getByTestId('all-time-stats');
    await expect(stats.getByTestId('stat-activities')).toHaveText('5');
    await expect(stats.getByTestId('stat-activities-since')).toHaveText('od 26 sty 2026');
    await expect(stats.getByTestId('stat-cardio')).toContainText('3');
    await expect(stats.getByTestId('stat-source-manual')).toContainText('3');
    await expect(stats.getByTestId('stat-type-Swim')).toContainText('Pływanie');
    await expect(stats.getByTestId('stat-type-Swim')).toContainText('2');
    await expect(stats.getByTestId('stat-type-Run')).toContainText('Bieg');
    await expect(stats.getByTestId('stats-notes')).toContainText('Starsze aktywności (1)');
    // Mock e2e nie ma Stravy: zero przypisów o imporcie.
    await expect(stats.getByTestId('stats-notes')).not.toContainText('Strava');
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
