import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EPlanMeta, skipPreStartWarmup, readWorkoutDraftDb } from './helpers';

const date = '2026-09-12';

test('Friday moved to Saturday: offline finish then auto-sync clears the summary banner and names Saturday', async ({ page }) => {
  await blockFirebase(page);
  await page.route('**/cloudfunctions.net/**', route => route.abort());
  await page.clock.setFixedTime(new Date(`${date}T10:00:00+02:00`));
  await setE2EPlanMeta(page, {
    startDate: '2026-08-31', durationWeeks: 10,
    scheduleOverrides: { '2026-09-11': null, [date]: 'moved-friday' },
    days: [{ id: 'moved-friday', dayName: 'Piątek', weekday: 'friday', focus: 'Full Body',
      exercises: [{ id: 'moved-rdl', name: 'Martwy Ciąg Rumuński (RDL)', sets: '1 x 8', instructions: [] }],
    }],
  });
  await page.addInitScript(() => {
    localStorage.setItem('app-language', 'pl');
    localStorage.setItem('fittracker_e2e_cloud_writes', 'true');
  });
  await navigateAndWait(page, `/workout/moved-friday?date=${date}`);
  await expect(page.getByRole('heading', { name: 'Sobota', exact: true })).toBeVisible();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
  await skipPreStartWarmup(page);
  const card = page.locator('.exercise-card').first();
  await card.getByRole('textbox', { name: /Set 1, kg/ }).fill('30');
  await card.getByRole('spinbutton', { name: /Set 1, Powt\./ }).fill('10');
  await card.getByRole('button', { name: /^Zaznacz serię/ }).click();
  await expect(card.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
  await page.getByTestId('finish-workout').click();
  await page.getByRole('button', { name: 'Tak, zakończ' }).click();
  await expect(page.getByText('Trening ukończony!')).toBeVisible();
  await page.getByTestId('workout-milestone-banner').click();
  await page.getByRole('button', { name: 'Pomiń ocenę' }).click();
  await expect(page.getByRole('button', { name: 'Synchronizuj teraz', exact: true })).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText('Trening zapisany w chmurze').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Sobota. Wszystko jest już bezpieczne.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Synchronizuj teraz', exact: true })).toHaveCount(0);
  await expect.poll(async () => readWorkoutDraftDb(page, 'e2e-test-user')).toBeNull();
  const workouts = await page.evaluate(() => JSON.parse(localStorage.getItem('fittracker_e2e_workouts') ?? '[]'));
  expect(workouts).toHaveLength(1);
  expect(workouts[0]).toMatchObject({ date, completed: true,
    exercises: [{ exerciseId: 'moved-rdl', sets: [{ weight: 30, reps: 10, completed: true }] }],
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sobota', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Synchronizuj teraz', exact: true })).toHaveCount(0);
});
