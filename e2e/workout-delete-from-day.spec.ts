// Z161: usuwanie ZAPISANEGO treningu z widoku treningu (WorkoutDay), z potwierdzeniem.
// Ta sama ścieżka co Historia: deleteWorkoutEverywhere (dokument + szkic + kolejka),
// nigdy goły deleteDoc. Trening W TOKU nie ma opcji usuwania (niezmiennik).
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectHashRoute,
  expectPageRendered,
  localDaysAgo,
  navigateAndWait,
  setE2EWorkouts,
  skipPreStartWarmupIfShown,
} from './helpers';

const WORKOUT_ID = 'w-del-1';
const WORKOUT_DATE = localDaysAgo(1);

const completedWorkout = () => ({
  id: WORKOUT_ID,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date: WORKOUT_DATE,
  completed: true,
  durationSec: 3600,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie hantli (Lekki skos)',
    sets: [
      { reps: 8, weight: 40, completed: true },
      { reps: 8, weight: 40, completed: true },
    ],
  }],
});

const seededWorkoutIds = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const raw = window.localStorage.getItem('fittracker_e2e_workouts');
  return raw ? (JSON.parse(raw) as Array<{ id: string }>).map((w) => w.id) : [];
});

test.describe('Usuwanie treningu z widoku treningu (Z161)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('zapisany trening: Usuń → dialog → Anuluj nic nie zmienia → potwierdź → redirect do historii', async ({ page }) => {
    await setE2EWorkouts(page, [completedWorkout()]);
    await navigateAndWait(page, `/workout/day-1?date=${WORKOUT_DATE}&session=${WORKOUT_ID}`);
    await expectPageRendered(page);

    const deleteButton = page.getByTestId('workout-delete');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const dialog = page.getByTestId('workout-delete-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(WORKOUT_DATE);

    // Anuluj: dialog znika, trening zostaje.
    await dialog.getByRole('button', { name: /Anuluj|Cancel/ }).click();
    await expect(dialog).toHaveCount(0);
    expect(await seededWorkoutIds(page)).toContain(WORKOUT_ID);

    // Ponownie: potwierdzenie usuwa i przekierowuje do historii.
    await deleteButton.click();
    await page.getByTestId('workout-delete-confirm').click();
    await expectHashRoute(page, '/history');
    await expectPageRendered(page);

    expect(await seededWorkoutIds(page)).not.toContain(WORKOUT_ID);
    await expect(page.getByTestId('history-delete')).toHaveCount(0);
  });

  test('niezmiennik: trening W TOKU nie renderuje akcji usuwania', async ({ page }) => {
    await setE2EWorkouts(page, []);
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const startBtn = page.getByRole('button', { name: /Rozpocznij trening|Start workout/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.getByRole('button', { name: /Zaznacz serię jako zrobioną|Mark set as done/i }).first()).toBeEnabled({ timeout: 5000 });

    await expect(page.getByTestId('workout-delete')).toHaveCount(0);
  });
});
