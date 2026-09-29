import { test, expect, type Page } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  addDays, completeWizard, dashboardGreeting, ensureSessionStarted, loginThroughUi, provisionVerifiedProUser,
  queryDocs, readDoc, todayIso, weekdayOf,
} from './support';

// Release e2e 5 (F5, wariant A): „Twoje liczby”. Trening siłowy dziś przez UI
// + cardio dodane ręcznie w UI (jedno sprzed pierwszego treningu, dwa po) →
// licznik aktywności liczony od pierwszego treningu („od {data}”), rozbicie
// cardio na źródła i typy, przypis o starszych. Stan: manual_activities
// (rules), workouts i agregat allTime (trigger Functions).

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

async function addCardio(page: Page, typeLabel: string, date: string, minutes: string) {
  await page.getByTestId('add-cardio-open').click();
  await page.getByTestId('cardio-type-grid').getByRole('button', { name: typeLabel, exact: true }).click();
  await page.getByTestId('cardio-minutes').fill(minutes);
  await page.getByTestId('cardio-date').fill(date);
  await page.getByTestId('cardio-save').click();
  await expect(page.getByTestId('cardio-save')).toBeHidden();
}

const plShortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
};

test('R5: trening + cardio ręczne → „Twoje liczby” od daty pierwszego treningu z rozbiciem', async ({ page }) => {
  test.setTimeout(120_000);
  const user = await provisionVerifiedProUser('r5-stats');
  const today = todayIso();
  await loginThroughUi(page, user.email);
  await completeWizard(page, {
    weekdays: [weekdayOf(today), weekdayOf(addDays(today, 2)), weekdayOf(addDays(today, 4))],
    firstWorkout: today,
  });

  // Trening siłowy dziś: jedna seria na pierwszym ćwiczeniu, zakończenie.
  await page.getByTestId('dashboard-primary-action').click();
  await ensureSessionStarted(page);
  const card = page.locator('.exercise-card').first();
  const kg = card.getByRole('textbox', { name: /Set 1, kg$/ });
  if (await kg.count()) await kg.fill('20');
  const reps = card.getByRole('spinbutton', { name: /Set 1, Powt\./ });
  if (await reps.count()) await reps.fill('10');
  await card.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await page.getByRole('button', { name: 'Zakończ trening' }).click();
  await page.getByRole('button', { name: 'Tak, zakończ' }).click();
  await expect.poll(async () => (await queryDocs('workouts', 'userId', user.uid)).filter((w) => w.data.completed === true).length, {
    timeout: 20_000,
  }).toBe(1);

  // Cardio ręczne: jedno sprzed pierwszego treningu (poza licznikiem), dwa od dziś.
  await page.goto('./#/');
  await expect(dashboardGreeting(page)).toBeVisible();
  await addCardio(page, 'Pływanie', addDays(today, -5), '30');
  await addCardio(page, 'Pływanie', today, '40');
  await addCardio(page, 'Bieg', today, '25');
  await expect.poll(async () => (await queryDocs('manual_activities', 'userId', user.uid))
    .map((a) => `${a.data.type}@${a.data.date}`).sort(), { timeout: 10_000 })
    .toEqual([`Run@${today}`, `Swim@${addDays(today, -5)}`, `Swim@${today}`].sort());

  // Agregat all-time z triggera: 1 trening.
  await expect.poll(async () => ((await readDoc(`users/${user.uid}/aggregates/allTime`))?.totals as { workoutCount?: number } | undefined)?.workoutCount, {
    timeout: 20_000,
  }).toBe(1);

  // „Twoje liczby”: 1 siłowy + 2 cardio = 3 aktywności od dziś; starsze w przypisie.
  await page.getByTestId('header-workout-count').click();
  const stats = page.getByTestId('all-time-stats');
  await expect(stats).toBeVisible();
  await expect(stats.getByTestId('stat-workouts')).toContainText('1');
  await expect(stats.getByTestId('stat-activities')).toHaveText('3');
  await expect(stats.getByTestId('stat-activities-since')).toHaveText(`od ${plShortDate(today)}`);
  await expect(stats.getByTestId('stat-cardio')).toContainText('2');
  await expect(stats.getByTestId('stat-source-manual')).toContainText('2');
  await expect(stats.getByTestId('stat-type-Swim')).toContainText('Pływanie');
  await expect(stats.getByTestId('stat-type-Swim')).toContainText('1');
  await expect(stats.getByTestId('stat-type-Run')).toContainText('Bieg');
  await expect(stats.getByTestId('stats-notes')).toContainText('Starsze aktywności (1)');
  await expect(stats.getByTestId('stats-notes')).not.toContainText('Strava');
});
