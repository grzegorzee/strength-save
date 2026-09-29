import { test, expect, type Page } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  addDays, completeWizard, dashboardGreeting, ensureSessionStarted, loginThroughUi, noonOf,
  provisionVerifiedProUser, readDoc, readPlan, todayIso, weekdayOf,
} from './support';

// Release e2e 4 (F6): podciąganie z masą ciała. Sesja 1: dwie serie bez kg
// (sama MC, zaliczone). Sesja 2 (ten sam dzień planu za tydzień): MC × 8 i +10 kg × 8.
// Zapis przez realny sync → Historia „8×MC” / „8×MC +10 kg” → PR za dociążenie
// → agregat all-time (trigger onWorkoutWrittenAggregate w emulatorze Functions)
// liczy tonaż bez masy ciała (tylko dociążenie: 10 × 8 = 80 kg).

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const PULL = 'Podciąganie na drążku';
const LOAD = (set: number) => `${PULL}, Set ${set}, Dociążenie w kg (puste = sama masa ciała)`;
const REPS = (set: number) => `${PULL}, Set ${set}, Powt.`;

/** Podciąganie trafia do planu przez zamianę „na stałe” pierwszej karty
 *  (dodawanie ćwiczeń w locie istnieje tylko w szybkim treningu). */
async function swapFirstCardToPullUpForGood(page: Page) {
  const card = page.locator('.exercise-card').first();
  await card.getByRole('button', { name: 'Więcej akcji' }).click();
  await page.getByRole('menuitem', { name: 'Zamień ćwiczenie' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder(/Szukaj|Find/).fill(PULL);
  await dialog.getByText(PULL, { exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Na stałe w planie' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.exercise-card').first().getByRole('heading', { name: PULL, exact: true })).toBeVisible();
}

async function doSet(page: Page, set: number, reps: string, load: string | null) {
  const card = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: PULL, exact: true }) });
  const loadField = card.getByRole('textbox', { name: LOAD(set) });
  await expect(loadField).toHaveAttribute('placeholder', 'MC');
  if (load !== null) await loadField.fill(load);
  else await expect(loadField).toHaveValue('');
  if (load === '') await expect(loadField).toHaveValue('');
  await card.getByRole('spinbutton', { name: REPS(set) }).fill(reps);
  await card.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await expect(card.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(set);
}

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Zakończ trening' }).click();
  await page.getByRole('button', { name: 'Tak, zakończ' }).click();
}

async function pullSets(path: string) {
  const w = await readDoc(path) as { completed?: boolean; exercises?: Array<{ name: string; sets: Array<{ reps: number; weight: number; completed?: boolean; isWarmup?: boolean }> }> } | null;
  if (!w?.completed) return null;
  return w.exercises?.find((e) => e.name === PULL)?.sets.filter((s) => s.completed && !s.isWarmup).map((s) => [s.weight, s.reps]) ?? null;
}

test('R4: podciąganie MC i MC +10 kg → sync → Historia MC → PR za dociążenie → agregat bez masy ciała', async ({ page }) => {
  test.setTimeout(150_000);
  const user = await provisionVerifiedProUser('r4-bw');
  const today = todayIso();
  await loginThroughUi(page, user.email);
  await completeWizard(page, {
    weekdays: [weekdayOf(today), weekdayOf(addDays(today, 2)), weekdayOf(addDays(today, 4))],
    firstWorkout: today,
  });
  const plan = await readPlan(user.uid);
  const day1 = plan.days.find((d) => d.weekday === weekdayOf(today))!;
  // Druga sesja = ten sam dzień planu tydzień później (podciąganie jest już w planie).
  const day2Date = addDays(today, 7);

  // Sesja 1: każda seria samą masą ciała (bez kg) na górze zakresu powtórzeń planu.
  await page.getByTestId('dashboard-primary-action').click();
  await ensureSessionStarted(page);
  if (!day1.exercises.some((e) => e.name === PULL)) {
    await swapFirstCardToPullUpForGood(page);
    await expect.poll(async () => (await readPlan(user.uid)).days.find((d) => d.id === day1.id)!.exercises.some((e) => e.name === PULL), {
      timeout: 10_000,
    }).toBe(true);
  }
  const pullPlan = (await readPlan(user.uid)).days.find((d) => d.id === day1.id)!.exercises.find((e) => e.name === PULL)!;
  const range = String(pullPlan.sets).match(/(\d+)\s*[x×]\s*(\d+)(?:\s*-\s*(\d+))?/);
  expect(range, `zakres serii podciągania: ${pullPlan.sets}`).not.toBeNull();
  const setCount = Number(range![1]);
  const top = String(range![3] ?? range![2]);
  for (let set = 1; set <= setCount; set += 1) await doSet(page, set, top, null);
  await finish(page);
  const s1 = `workouts/workout-${user.uid}-${day1.id}-${today}`;
  await expect.poll(() => pullSets(s1), { timeout: 20_000 })
    .toEqual(Array.from({ length: setCount }, () => [0, Number(top)]));

  // Sesja 2 (ten sam dzień planu za tydzień): MC, potem +10 kg → PR za dociążenie.
  await page.clock.setFixedTime(noonOf(day2Date));
  await page.goto('./#/');
  await page.reload();
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('dashboard-primary-action').click();
  await ensureSessionStarted(page);
  // Progresja po górze zakresu z samą MC = +2,5 kg DOCIĄŻENIA (nie masa ciała + 2,5).
  const pullCard = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: PULL, exact: true }) });
  await expect(pullCard.getByRole('textbox', { name: LOAD(1) })).toHaveValue('2.5', { timeout: 10_000 });
  // Wszystkie serie jawnie (nieodhaczona seria z prefillem progresji zostałaby przy
  // „Zakończ” odhaczona automatycznie jako 2,5 kg, patrz raport release e2e).
  await doSet(page, 1, top, '');
  await doSet(page, 2, top, '10');
  for (let set = 3; set <= setCount; set += 1) await doSet(page, set, top, '');
  await finish(page);
  await expect(page.getByText(/^Nowe rekordy/).first()).toBeVisible({ timeout: 20_000 });
  const s2 = `workouts/workout-${user.uid}-${day1.id}-${day2Date}`;
  await expect.poll(() => pullSets(s2), { timeout: 20_000 })
    .toEqual([[0, Number(top)], [10, Number(top)], ...Array.from({ length: setCount - 2 }, () => [0, Number(top)])]);

  // Historia: etykiety MC w szczegółach sesji; PR tylko w sesji z dociążeniem.
  await page.goto('./#/history');
  const rows = page.getByTestId('history-session-row');
  await expect(rows).toHaveCount(2, { timeout: 15_000 });
  const metas = await page.getByTestId('history-session-meta').allInnerTexts();
  expect(metas.filter((m) => /\bPR\b/.test(m)), metas.join(' | ')).toHaveLength(1);
  for (let index = 0; index < 2; index += 1) {
    await rows.nth(index).getByTestId('history-row-menu').click();
    await page.getByRole('menuitem', { name: 'Szczegóły' }).click();
  }
  await expect(page.getByText(`${top}×MC +10 kg`, { exact: true })).toHaveCount(1);
  await expect(page.getByText(`${top}×MC`, { exact: true })).toHaveCount(2 * setCount - 1);

  // Agregat all-time (trigger Functions): 2 treningi, tonaż = tylko dociążenie.
  await expect.poll(async () => (await readDoc(`users/${user.uid}/aggregates/allTime`))?.totals, { timeout: 20_000 })
    .toMatchObject({
      workoutCount: 2,
      totalTonnageKg: 10 * Number(top),
      totalSets: 2 * setCount,
      totalReps: Number(top) * 2 * setCount,
    });
});
