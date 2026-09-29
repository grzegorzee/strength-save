import { test, expect, type Locator, type Page } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import { openProfileSection } from '../../helpers';
import {
  addDays, completeWizard, connectClient, dashboardGreeting, ensureSessionStarted, loginThroughUi, noonOf,
  provisionVerifiedProUser, readDoc, readPlan, todayIso, weekdayOf, type ProvisionedUser,
} from './support';
import { runReminderAt } from './reminder';

// Release e2e 3: urlop. Pełna przerwa: trening przed urlopem 40 kg × 8 →
// urlop w UI (T+1..T+6) → w trakcie Dashboard z kartą przerwy bez CTA →
// produkcyjne przypomnienie (loadery Firestore z functions/lib) = 0 pushy →
// po urlopie (T+7, ten sam dzień planu) prefill = rampa 85% (34 kg) → zapis →
// druga sesja 92% (37 kg). Wariant „tylko główne boje”: dni nie są blokowane.
// Czas po urlopie = page.clock (zegar przeglądarki); backend dostaje realny czas.

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const PUSH_TOKEN = (uid: string) => `release-e2e-fcm-${uid}`;

async function setupUserWithPlan(page: Page, prefix: string): Promise<{ user: ProvisionedUser; today: string; dayId: string }> {
  const user = await provisionVerifiedProUser(prefix);
  const today = todayIso();
  await loginThroughUi(page, user.email);
  // Dni planu: T, T+2, T+4 → T+7 to znów dzień „T” (pierwszy trening po urlopie).
  await completeWizard(page, {
    weekdays: [weekdayOf(today), weekdayOf(addDays(today, 2)), weekdayOf(addDays(today, 4))],
    firstWorkout: today,
  });
  const plan = await readPlan(user.uid);
  const dayId = plan.days.find((d) => d.weekday === weekdayOf(today))!.id;
  // Token push przez produkcyjny callable (jak apka po zgodzie na powiadomienia).
  const client = await connectClient(user.email);
  try {
    await client.call('registerPushToken', { token: PUSH_TOKEN(user.uid), deviceId: 'release-e2e' });
  } finally {
    await client.close();
  }
  return { user, today, dayId };
}

async function enableVacation(page: Page, from: string, to: string, activity: 'none' | 'mains_only'): Promise<void> {
  await page.goto('./#/profile');
  await openProfileSection(page, 'training');
  await page.getByRole('button', { name: /Urlop \/ wyjazd/ }).click();
  const dialog = page.getByTestId('vac-dialog');
  await expect(dialog).toBeVisible();
  for (const iso of [from, to]) {
    const day = dialog.locator(`[data-day="${iso}"]`);
    if (!(await day.isVisible().catch(() => false))) await dialog.getByTestId('vac-calendar-next').click();
    await day.click();
  }
  await dialog.getByTestId(`vac-activity-${activity}`).click();
  await expect(dialog.getByTestId('vac-summary')).toBeVisible();
  await dialog.getByTestId('vac-enable').click();
  await expect(dialog).toBeHidden();
}

/** Karta pierwszego ćwiczenia z polem kg (ćwiczenie z ciężarem). */
async function firstWeightedCard(page: Page): Promise<{ card: Locator; name: string }> {
  const cards = page.locator('.exercise-card');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    if (await card.getByRole('textbox', { name: /Set 1, kg$/ }).count()) {
      const name = ((await card.getByRole('heading').first().textContent()) ?? '').trim();
      return { card, name };
    }
  }
  throw new Error('Brak ćwiczenia z ciężarem w dniu planu');
}

/** Świeże uruchomienie apki w danym dniu (zegar przeglądarki; backend ma realny czas). */
async function openAppAt(page: Page, iso: string) {
  await page.clock.setFixedTime(noonOf(iso));
  await page.goto('./#/');
  await page.reload();
}

async function finishWorkout(page: Page) {
  await page.getByRole('button', { name: 'Zakończ trening' }).click();
  await page.getByRole('button', { name: 'Tak, zakończ' }).click();
}

async function completedSetsOf(sessionPath: string, exerciseName: string) {
  const session = await readDoc(sessionPath) as { completed?: boolean; exercises?: Array<{ name: string; sets: Array<{ weight: number; reps: number; completed?: boolean; isWarmup?: boolean }> }> } | null;
  if (!session?.completed) return null;
  return session.exercises?.find((e) => e.name === exerciseName)?.sets
    .filter((s) => s.completed && !s.isWarmup).map((s) => [s.weight, s.reps]) ?? null;
}

async function userTimeZone(uid: string): Promise<string> {
  const tz = (await readDoc(`users/${uid}`))?.timeZone;
  return typeof tz === 'string' && tz ? tz : 'Europe/Warsaw';
}

test('R3 urlop pełna przerwa: przerwa na Dashboardzie, 0 pushy, rampa 34 → 37 kg po urlopie', async ({ page }) => {
  test.setTimeout(180_000);
  const { user, today, dayId } = await setupUserWithPlan(page, 'r3-vac');
  const tz = await userTimeZone(user.uid);

  // 1. Trening przed urlopem (dziś): ćwiczenie z ciężarem 40 kg × 8 w każdej serii.
  await page.getByTestId('dashboard-primary-action').click();
  await ensureSessionStarted(page);
  const { card, name } = await firstWeightedCard(page);
  const setCount = await card.getByRole('textbox', { name: /Set \d+, kg$/ }).count();
  for (let set = 1; set <= setCount; set += 1) {
    await card.getByRole('textbox', { name: new RegExp(`Set ${set}, kg$`) }).fill('40');
    await card.getByRole('spinbutton', { name: new RegExp(`Set ${set}, Powt\\.`) }).fill('8');
    await card.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(card.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(set);
  }
  await finishWorkout(page);
  const firstSession = `workouts/workout-${user.uid}-${dayId}-${today}`;
  await expect.poll(() => completedSetsOf(firstSession, name), { timeout: 20_000 })
    .toEqual(Array.from({ length: setCount }, () => [40, 8]));

  // 2. Urlop w UI: T+1..T+6, pełna przerwa. Firestore: vacation + plan wydłużony.
  const durationBefore = (await readPlan(user.uid)).durationWeeks as number;
  const vacFrom = addDays(today, 1);
  const vacTo = addDays(today, 6);
  await enableVacation(page, vacFrom, vacTo, 'none');
  await expect.poll(async () => (await readPlan(user.uid)).vacation, { timeout: 10_000 })
    .toMatchObject({ startDate: vacFrom, endDate: vacTo, activity: 'none' });
  expect((await readPlan(user.uid)).durationWeeks).toBe(durationBefore + 1);

  // 3. W trakcie urlopu (T+2 = dzień planu): karta przerwy, brak CTA treningu.
  const inVacation = addDays(today, 2);
  await openAppAt(page, inVacation);
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('break-hero')).toContainText('Przerwa do');
  await expect(page.getByTestId('dashboard-primary-action')).toHaveCount(0);
  await expect(page.getByTestId('break-next')).toContainText(String(noonOf(addDays(today, 7)).getDate()));

  // 4. Produkcyjne przypomnienie na 07:00 każdego dnia urlopu z planem: 0 pushy.
  for (const date of [addDays(today, 2), addDays(today, 4)]) {
    const run = await runReminderAt(date, tz);
    expect(run.pushedTokens, `push w urlopie ${date}`).not.toContain(PUSH_TOKEN(user.uid));
  }
  // Kontrola (test nie jest pusty): pierwszy dzień planu po urlopie dostaje push.
  const afterRun = await runReminderAt(addDays(today, 7), tz);
  expect(afterRun.pushedTokens).toContain(PUSH_TOKEN(user.uid));

  // 5. Pierwszy trening po urlopie (T+7): prefill = 85% ciężaru sprzed urlopu.
  const back1 = addDays(today, 7);
  await openAppAt(page, back1);
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('break-hero')).toHaveCount(0);
  await page.getByTestId('dashboard-primary-action').click();
  await ensureSessionStarted(page);
  let target = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(target.getByRole('textbox', { name: /Set 1, kg$/ })).toHaveValue('34', { timeout: 10_000 });
  await expect(target.getByTestId('exercise-card-target')).toContainText('34');
  for (let set = 1; set <= setCount; set += 1) {
    await expect(target.getByRole('textbox', { name: new RegExp(`Set ${set}, kg$`) })).toHaveValue('34');
    await target.getByRole('spinbutton', { name: new RegExp(`Set ${set}, Powt\\.`) }).fill('8');
    await target.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(target.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(set);
  }
  await finishWorkout(page);
  await expect.poll(() => completedSetsOf(`workouts/workout-${user.uid}-${dayId}-${back1}`, name), { timeout: 20_000 })
    .toEqual(Array.from({ length: setCount }, () => [34, 8]));

  // 6. Druga sesja po urlopie (T+14): rampa 92% (40 × 0,92 → 37 kg).
  const back2 = addDays(today, 14);
  await openAppAt(page, back2);
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('dashboard-primary-action').click();
  await ensureSessionStarted(page);
  target = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(target.getByRole('textbox', { name: /Set 1, kg$/ })).toHaveValue('37', { timeout: 10_000 });
});

test('R3 urlop „tylko główne boje”: dni nie są zablokowane (Dashboard z treningiem, push wysłany)', async ({ page }) => {
  test.setTimeout(120_000);
  const { user, today } = await setupUserWithPlan(page, 'r3-mains');
  const tz = await userTimeZone(user.uid);
  const vacFrom = addDays(today, 1);
  const vacTo = addDays(today, 6);
  await enableVacation(page, vacFrom, vacTo, 'mains_only');
  await expect.poll(async () => (await readPlan(user.uid)).vacation, { timeout: 10_000 })
    .toMatchObject({ startDate: vacFrom, endDate: vacTo, activity: 'mains_only' });

  const planDayInVacation = addDays(today, 2);
  await openAppAt(page, planDayInVacation);
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('break-hero')).toHaveCount(0);
  await expect(page.getByTestId('dashboard-primary-action')).toBeVisible();

  const run = await runReminderAt(planDayInVacation, tz);
  expect(run.pushedTokens).toContain(PUSH_TOKEN(user.uid));
});
