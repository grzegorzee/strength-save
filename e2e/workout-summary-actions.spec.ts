// Fala 2 (2026-08-20, plan/summary.md par. 5): niezmiennik funkcji podsumowania —
// redesign to nowa prezentacja, więc completed view renderuje JEDNOCZEŚNIE komplet
// akcji: Edytuj, Popraw serie, Udostępnij, Wyślij do trenera, Wróć do dashboardu,
// Usuń trening (wzorzec workout-day-view: "stary przepływ nadal ma wszystko").
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  localDaysAgo,
  navigateAndWait,
  setE2EWorkouts,
} from './helpers';

const WORKOUT_ID = 'w-sum-1';
const WORKOUT_DATE = localDaysAgo(1);
const PREV_DATE = localDaysAgo(8);

const completedWorkout = (id: string, date: string, weight: number) => ({
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
    sets: [
      { reps: 8, weight, completed: true },
      { reps: 8, weight, completed: true },
    ],
  }],
});

test.describe('Podsumowanie treningu: komplet akcji po redesignie (fala 2)', () => {
  test('wszystkie akcje ekranu widoczne jednocześnie + hero z paskami porównania', async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await setE2EWorkouts(page, [
      completedWorkout(WORKOUT_ID, WORKOUT_DATE, 40),
      completedWorkout('w-sum-prev', PREV_DATE, 35),
    ]);
    await navigateAndWait(page, `/workout/day-1?date=${WORKOUT_DATE}&session=${WORKOUT_ID}`);

    // Komplet akcji (inwentarz par. 1) — wszystkie NARAZ, bez rozwijania czegokolwiek.
    await expect(page.getByRole('button', { name: 'Edytuj' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Popraw serie' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Udostępnij' })).toBeVisible();
    await expect(page.getByTestId('workout-email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Wróć do dashboardu/i })).toBeVisible();
    await expect(page.getByTestId('workout-delete')).toBeVisible();

    // Hero: paski porównania z poprzednią sesją tego dnia (dane w seedzie).
    await expect(page.getByText('Dziś')).toBeVisible();
    await expect(page.getByText(/vs /)).toBeVisible();

    // Lista ćwiczeń z licznikiem i kolumną tonażu (first: nazwa jest też w kaflu PR).
    await expect(page.getByText('Ćwiczenia (1)')).toBeVisible();
    await expect(page.getByText('Wyciskanie hantli (Lekki skos)').first()).toBeVisible();
    await expect(page.getByText('2/2 serii')).toBeVisible();
  });
});
