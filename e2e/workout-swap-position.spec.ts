import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  localToday,
  navigateAndWait,
  readWorkoutDraftDb,
  skipPreStartWarmup,
} from './helpers';

// F4 (2026-09-29): zamiana ćwiczenia W TRAKCIE treningu. Produkcja 28.09:
// "Na stałe" na pozycji 3 zmieniało tylko plan, nowe ćwiczenie lądowało na końcu
// listy (i historii), a stare zostawało w sesji. Sekwencja (zasada 5):
// start → zamiana "tylko dziś" → zamiana "na stałe" → wyjście → powrót → reload
// (hydracja z IDB) → odhaczenie serii → kolejność kart i kluczy draftu = kolejność dnia.

const E2E_UID = 'e2e-test-user';
const TODAY_PICK = 'Wiosłowanie hantlem jednorącz (Laty)';
const PLAN_PICK = 'Pompki';

type DraftShape = {
  sessionId?: string;
  exerciseSets?: Record<string, Array<{ completed?: boolean }>>;
  exerciseNames?: Record<string, string>;
} | null;

const cardTitles = async (page: Page): Promise<string[]> => {
  const cards = page.locator('.exercise-card');
  const count = await cards.count();
  const titles: string[] = [];
  for (let index = 0; index < count; index += 1) {
    titles.push(((await cards.nth(index).getByRole('heading').first().textContent()) ?? '').trim());
  }
  return titles;
};

const swapCardAt = async (page: Page, index: number, pick: string, scope: 'Tylko dziś' | 'Na stałe w planie') => {
  const card = page.locator('.exercise-card').nth(index);
  await card.getByRole('button', { name: 'Więcej akcji' }).click();
  await page.getByRole('menuitem', { name: 'Zamień ćwiczenie' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/Szukaj|Find/).fill(pick);
  await dialog.getByText(pick, { exact: true }).first().click();
  await dialog.getByRole('button', { name: scope }).click();
  await expect(dialog).toBeHidden();
};

test.describe('F4: zamiana ćwiczenia w trakcie treningu zostaje na swojej pozycji', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('tylko dziś + na stałe → wyjście → powrót → reload → odhaczenie: kolejność dnia bez starych ćwiczeń', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    await skipPreStartWarmup(page);

    await expect(page.locator('.exercise-card').first()).toBeVisible();
    const before = await cardTitles(page);
    expect(before.length, 'dzień testowy musi mieć co najmniej 5 ćwiczeń').toBeGreaterThanOrEqual(5);
    expect(before).not.toContain(TODAY_PICK);
    expect(before).not.toContain(PLAN_PICK);

    const expected = [...before];
    expected[2] = TODAY_PICK;
    expected[4] = PLAN_PICK;

    await swapCardAt(page, 2, TODAY_PICK, 'Tylko dziś');
    await expect.poll(() => cardTitles(page)).toEqual([...before.slice(0, 2), TODAY_PICK, ...before.slice(3)]);

    await swapCardAt(page, 4, PLAN_PICK, 'Na stałe w planie');
    await expect.poll(() => cardTitles(page)).toEqual(expected);

    // Wyjście z ekranu i powrót (nowy mount WorkoutDay, dzień z planu + draft).
    await navigateAndWait(page, '/');
    await navigateAndWait(page, `/workout/day-1?date=${today}`);
    await expect.poll(() => cardTitles(page)).toEqual(expected);

    // Reload = stan Reacta ginie, jedynym źródłem jest IndexedDB.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect.poll(() => cardTitles(page)).toEqual(expected);

    // Odhaczenie serii na karcie zamienionej na stałe.
    const planCard = page.locator('.exercise-card').nth(4);
    await planCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('12');
    await planCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(planCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

    // Klucze draftu (źródło payloadu historii) w kolejności dnia.
    await expect.poll(async () => {
      const draft = await readWorkoutDraftDb(page, E2E_UID) as DraftShape;
      return Object.keys(draft?.exerciseSets ?? {}).map((id) => draft?.exerciseNames?.[id] ?? id);
    }).toEqual(expected);

    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('zamiana ćwiczenia z odhaczoną serią: stare zostaje (z serią) tuż przed nowym, po reloadzie też', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    await skipPreStartWarmup(page);
    await expect(page.locator('.exercise-card').first()).toBeVisible();
    const before = await cardTitles(page);

    const oldCard = page.locator('.exercise-card').nth(2);
    await oldCard.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('30');
    await oldCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('10');
    await oldCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(oldCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

    await swapCardAt(page, 2, TODAY_PICK, 'Tylko dziś');
    const expected = [...before.slice(0, 3), TODAY_PICK, ...before.slice(3)];
    await expect.poll(() => cardTitles(page)).toEqual(expected);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect.poll(() => cardTitles(page)).toEqual(expected);
    const keptCard = page.locator('.exercise-card').nth(2);
    await expect(keptCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
    await expect(keptCard.getByRole('textbox', { name: /Set 1, kg/ }).first()).toHaveValue('30');

    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
