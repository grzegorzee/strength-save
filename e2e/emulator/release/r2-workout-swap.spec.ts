import { test, expect, type Locator, type Page } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  addDays, cardTitles, completeWizard, ensureSessionStarted, dashboardGreeting, loginThroughUi, provisionVerifiedProUser,
  readDoc, readPlan, skipWarmupIfShown, todayIso, weekdayOf, workoutsOf,
} from './support';

// Release e2e 2 (sekwencja z zasady 5): trening z planu → serie → zamiana
// „tylko dziś” i „na stałe” (pozycja zachowana, stare znika) → wyjście →
// szybki trening → powrót do planu (komplet) → dokończenie → sync (callable
// syncWorkoutV2 + rules) → Historia w kolejności planu → plan w Firestore
// zmieniony tylko przez „na stałe”.

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const TODAY_PICK = 'Wiosłowanie hantlem jednorącz (Laty)';
const PLAN_PICK = 'Pompki';
const ADHOC_PICK = 'Wiosłowanie hantlami na ławce (przodem)';

async function swapCardAt(page: Page, index: number, pick: string, scope: 'Tylko dziś' | 'Na stałe w planie') {
  const card = page.locator('.exercise-card').nth(index);
  await card.getByRole('button', { name: 'Więcej akcji' }).click();
  await page.getByRole('menuitem', { name: 'Zamień ćwiczenie' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/Szukaj|Find/).fill(pick);
  await dialog.getByText(pick, { exact: true }).first().click();
  await dialog.getByRole('button', { name: scope }).click();
  await expect(dialog).toBeHidden();
}

/** Odhacza pierwszą niezrobioną serię karty (kg jeśli pole istnieje, powtórzenia). */
async function completeNextSet(card: Locator, kg: string, reps: string) {
  const done = card.getByRole('button', { name: 'Odznacz serię' });
  const before = await done.count();
  const setNo = before + 1;
  const kgField = card.getByRole('textbox', { name: new RegExp(`Set ${setNo}, kg$`) });
  if (await kgField.count()) await kgField.first().fill(kg);
  const repsField = card.getByRole('spinbutton', { name: new RegExp(`Set ${setNo}, Powt\\.`) });
  if (await repsField.count()) await repsField.first().fill(reps);
  await card.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await expect(done).toHaveCount(before + 1);
}

test('R2: plan → serie → swap dziś/na stałe → szybki trening → powrót → koniec → sync → Historia → plan', async ({ page }) => {
  test.slow();
  const user = await provisionVerifiedProUser('r2-swap');
  const today = todayIso();
  await loginThroughUi(page, user.email);
  await completeWizard(page, {
    weekdays: [weekdayOf(today), weekdayOf(addDays(today, 2)), weekdayOf(addDays(today, 4))],
    firstWorkout: today,
  });

  const planBefore = await readPlan(user.uid);
  const todayDay = planBefore.days.find((d) => d.weekday === weekdayOf(today))!;
  expect(todayDay, 'dzisiejszy dzień planu').toBeTruthy();
  const planNames = todayDay.exercises.map((e) => e.name);
  expect(planNames.length, 'dzień z co najmniej 4 ćwiczeniami').toBeGreaterThanOrEqual(4);
  expect(planNames).not.toContain(TODAY_PICK);
  expect(planNames).not.toContain(PLAN_PICK);
  const otherDaysBefore = JSON.stringify(planBefore.days.filter((d) => d.id !== todayDay.id));

  // Start z Dashboardu (CTA dnia) → ekran treningu → start sesji.
  await page.getByTestId('dashboard-primary-action').click();
  await expect(page).toHaveURL(new RegExp(`#/workout/${todayDay.id}`));
  await ensureSessionStarted(page);
  await expect.poll(() => cardTitles(page)).toEqual(planNames);

  const cards = page.locator('.exercise-card');
  await completeNextSet(cards.nth(0), '20', '10');

  const expected = [...planNames];
  expected[1] = TODAY_PICK;
  expected[2] = PLAN_PICK;
  await swapCardAt(page, 1, TODAY_PICK, 'Tylko dziś');
  await swapCardAt(page, 2, PLAN_PICK, 'Na stałe w planie');
  await expect.poll(() => cardTitles(page)).toEqual(expected);
  await completeNextSet(cards.nth(1), '16', '10');

  // Plan w Firestore: tylko pozycja 3 zmieniona („na stałe”), pozycja 2 bez zmian.
  await expect.poll(async () => (await readPlan(user.uid)).days.find((d) => d.id === todayDay.id)!.exercises.map((e) => e.name), {
    timeout: 10_000,
  }).toEqual([planNames[0], planNames[1], PLAN_PICK, ...planNames.slice(3)]);

  // Wyjście → szybki trening obok (dokłada, nie podmienia).
  await page.goto('./#/');
  await expect(dashboardGreeting(page)).toBeVisible();
  await page.getByTestId('quick-workout-start').click();
  await expect(page).toHaveURL(/adhoc-/);
  await skipWarmupIfShown(page);
  await page.getByTestId('adhoc-add-exercise').click();
  const picker = page.getByRole('dialog');
  await picker.getByPlaceholder(/Szukaj|Find/).fill('wioslowanie hantlami');
  await picker.getByText(ADHOC_PICK).click();
  await expect(page.getByRole('heading', { name: ADHOC_PICK })).toBeVisible();

  // Powrót do planu: komplet ćwiczeń, zamiany na swoich pozycjach, zrobione serie zostały.
  await page.goto(`./#/workout/${todayDay.id}?date=${today}`);
  await expect.poll(() => cardTitles(page)).toEqual(expected);
  await expect(cards.nth(0).getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
  await expect(cards.nth(1).getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

  // Dokończenie: seria na zamianie „na stałe” i na ostatnim ćwiczeniu, potem koniec.
  await completeNextSet(cards.nth(2), '0', '12');
  await completeNextSet(cards.nth(expected.length - 1), '20', '10');
  await page.getByRole('button', { name: 'Zakończ trening' }).click();
  await page.getByRole('button', { name: 'Tak, zakończ' }).click();

  // Sync: dokument sesji ukończony, ćwiczenia w kolejności dnia, bez starych nazw.
  const sessionId = `workout-${user.uid}-${todayDay.id}-${today}`;
  await expect.poll(async () => (await readDoc(`workouts/${sessionId}`))?.completed, { timeout: 20_000 }).toBe(true);
  const session = await readDoc(`workouts/${sessionId}`) as { exercises: Array<{ name: string; sets: Array<{ completed?: boolean }> }> };
  const savedNames = session.exercises.map((e) => e.name);
  expect(savedNames.filter((n) => expected.includes(n))).toEqual(expected.filter((n) => savedNames.includes(n)));
  for (const name of [TODAY_PICK, PLAN_PICK, planNames[0], planNames[planNames.length - 1]]) expect(savedNames).toContain(name);
  expect(savedNames).not.toContain(planNames[1]);
  expect(savedNames).not.toContain(planNames[2]);
  expect(savedNames.indexOf(TODAY_PICK)).toBeLessThan(savedNames.indexOf(PLAN_PICK));
  expect(savedNames.indexOf(planNames[0])).toBeLessThan(savedNames.indexOf(TODAY_PICK));
  // Szybki trening to osobny dokument; nie wszedł do sesji planu.
  expect(savedNames).not.toContain(ADHOC_PICK);
  const all = await workoutsOf(user.uid);
  expect(all.filter((w) => w.data.completed === true).map((w) => w.id)).toEqual([sessionId]);

  // Historia: jeden ukończony trening, otwarty pokazuje kolejność dnia.
  await page.goto('./#/history');
  const rows = page.getByTestId('history-session-row');
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  // Wiersz sesji planu (tytuł = focus dnia); szybki trening bez serii to osobny wiersz.
  const planRow = rows.filter({ has: page.getByTestId('history-session-title').getByText(todayDay.focus, { exact: true }) });
  await expect(planRow).toHaveCount(1);
  await planRow.getByTestId('history-session-open').click();
  // Podsumowanie sesji z Historii: lista ćwiczeń w kolejności dnia, bez zamienionych.
  await expect(page.getByText(`Ćwiczenia (${expected.length})`, { exact: true })).toBeVisible({ timeout: 15_000 });
  const ys: number[] = [];
  for (const name of expected) {
    const box = await page.getByText(name, { exact: true }).first().boundingBox();
    expect(box, name).not.toBeNull();
    ys.push(box!.y);
  }
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
  await expect(page.getByText(planNames[1], { exact: true })).toHaveCount(0);
  await expect(page.getByText(planNames[2], { exact: true })).toHaveCount(0);

  // Plan: tylko „na stałe” zmienione, pozostałe dni nietknięte.
  const planAfter = await readPlan(user.uid);
  expect(planAfter.days.find((d) => d.id === todayDay.id)!.exercises.map((e) => e.name))
    .toEqual([planNames[0], planNames[1], PLAN_PICK, ...planNames.slice(3)]);
  expect(JSON.stringify(planAfter.days.filter((d) => d.id !== todayDay.id))).toBe(otherDaysBefore);
});
