import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  localToday,
  navigateAndWait,
  readWorkoutDraftDb,
} from './helpers';

// Z141 (X18A): edycja planu dnia W TRAKCIE treningu nie może skasować odhaczonych
// serii. Root cause incydentu 2026-07-24: ?autostart=true żył w historii
// przeglądarki — powrót (back) z /plan/edit montował WorkoutDay na świeżo,
// autostart widział sessionId=null i startował trening NA ŻYWEJ SESJI.
// Test sekwencji (reguła 5 CLAUDE.md): start → serie → /plan/edit → back → wszystko na miejscu.

const E2E_UID = 'e2e-test-user';
const ADDED_EXERCISE = 'Wyciskanie sztangi na ławce płaskiej';

type DraftShape = {
  sessionId?: string;
  version?: number;
  exerciseSets?: Record<string, Array<{ completed?: boolean; weight?: number; reps?: number }>>;
} | null;

const countCompletedSets = (draft: DraftShape): number => {
  if (!draft?.exerciseSets) return 0;
  return Object.values(draft.exerciseSets)
    .flat()
    .filter((set) => set.completed === true).length;
};

// Odhacza 2 pierwsze serie pierwszego ćwiczenia z wpisanymi wartościami
// i czeka, aż draft z 2 seriami wyląduje w IndexedDB.
const checkTwoSets = async (page: Page) => {
  const firstCard = page.locator('.exercise-card').first();
  await expect(firstCard).toBeVisible();

  await firstCard.getByRole('spinbutton', { name: /Set 1, kg/ }).first().fill('100');
  await firstCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('8');
  await firstCard.getByRole('spinbutton', { name: /Set 2, kg/ }).first().fill('102.5');
  await firstCard.getByRole('spinbutton', { name: /Set 2, Powt\./ }).first().fill('6');

  // Po kliknięciu przycisk zmienia aria-label na "Odznacz serię" — first()
  // za każdym razem trafia w kolejną nieodhaczoną serię.
  await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(2);

  await expect.poll(
    async () => countCompletedSets(await readWorkoutDraftDb(page, E2E_UID) as DraftShape),
    { message: 'draft z 2 odhaczonymi seriami ma trafić do IndexedDB' },
  ).toBe(2);
};

const addExerciseInPlanEditor = async (page: Page) => {
  await expect(page.getByRole('heading', { name: 'Edytuj plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/Szukaj|Find/).fill('wyciskanie sztangi na lawce plaskiej');
  await dialog.getByText(ADDED_EXERCISE).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(ADDED_EXERCISE).first()).toBeVisible();
};

const expectWorkoutIntactAfterBack = async (page: Page, draftBefore: DraftShape) => {
  const firstCard = page.locator('.exercise-card').first();
  await expect(firstCard).toBeVisible();

  // Serie NADAL odhaczone, wartości nietknięte.
  await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(2);
  await expect(firstCard.getByRole('spinbutton', { name: /Set 1, kg/ }).first()).toHaveValue('100');
  await expect(firstCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first()).toHaveValue('8');
  await expect(firstCard.getByRole('spinbutton', { name: /Set 2, kg/ }).first()).toHaveValue('102.5');

  // Nowe ćwiczenie z planu widoczne na liście dnia (merge plan+draft).
  await expect(page.getByRole('heading', { name: ADDED_EXERCISE })).toBeVisible();

  // Draft: ta sama sesja, wersja niezresetowana, serie na miejscu.
  const draftAfter = await readWorkoutDraftDb(page, E2E_UID) as DraftShape;
  expect(draftAfter?.sessionId).toBe(draftBefore?.sessionId);
  expect(draftAfter?.version ?? 0).toBeGreaterThanOrEqual(draftBefore?.version ?? 0);
  expect(countCompletedSets(draftAfter)).toBe(2);
};

test.describe('Edycja planu dnia w trakcie treningu (Z141)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('start z autostart → 2 serie → /plan/edit → dodanie ćwiczenia → back → serie nietknięte', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    await checkTwoSets(page);

    // Krok 3 Z141.1: parametr autostart znika z URL po konsumpcji.
    await expect(page).not.toHaveURL(/autostart/);

    const draftBefore = await readWorkoutDraftDb(page, E2E_UID) as DraftShape;
    expect(draftBefore?.sessionId).toBeTruthy();

    await page.getByRole('button', { name: 'Edytuj plan dnia' }).click();
    await addExerciseInPlanEditor(page);

    // Powrót przez HISTORIĘ (nie nowa nawigacja) — dokładnie ścieżka z incydentu.
    await page.goBack();
    await expectWorkoutIntactAfterBack(page, draftBefore);

    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('wariant offline (sesja provisional): back z /plan/edit nie kasuje serii', async ({ page }) => {
    const today = localToday();
    // Rozgrzanie lazy chunków (WorkoutDay, PlanEditor) ONLINE — offline dynamic
    // import z dev servera by padł, a w produkcji chunki są w cache PWA.
    await navigateAndWait(page, `/workout/day-1?date=${today}`);
    await navigateAndWait(page, '/plan/edit');
    await expect(page.getByRole('heading', { name: 'Edytuj plan' })).toBeVisible();
    await clearWorkoutDraftDb(page, E2E_UID);

    await page.context().setOffline(true);

    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    await checkTwoSets(page);

    const draftBefore = await readWorkoutDraftDb(page, E2E_UID) as DraftShape;
    expect(draftBefore?.sessionId).toBeTruthy();

    await page.getByRole('button', { name: 'Edytuj plan dnia' }).click();
    await addExerciseInPlanEditor(page);

    await page.goBack();
    await expectWorkoutIntactAfterBack(page, draftBefore);

    await page.context().setOffline(false);
    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
