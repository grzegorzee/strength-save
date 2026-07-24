import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  localToday,
  navigateAndWait,
  readWorkoutDraftDb,
  setE2ECycles,
} from './helpers';

// Z152 (X19): edycja planu przy AKTYWNYM cyklu nie może podmienić id dni cyklu.
// Root cause: buildActiveCyclePlanPatch nadpisywał cycle.days id-kami planu 1:1
// (day-N kontra `${startDate}-dN`), przez co historia i drafty traciły dni.
// Test SEKWENCJI (reguła 5 CLAUDE.md): cykl → trening z serią → /plan/edit
// (dodaj dzień + ćwiczenie) → back → serie nietknięte, wszystkie id w formacie cyklu.

const E2E_UID = 'e2e-test-user';

// Poniedziałek bieżącego tygodnia lokalnie (ta sama zasada co getStartOfPlanWeek).
const localMonday = (): string => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const START = localMonday();

const cycleDay = (n: number, weekday: string, focus: string) => ({
  id: `${START}-d${n}`,
  dayName: `Dzień ${n}`,
  weekday,
  focus,
  exercises: [
    { id: `ex-${n}-1`, name: 'Wyciskanie sztangi', sets: '3 x 8', instructions: [] },
    { id: `ex-${n}-2`, name: 'Wiosłowanie sztangą', sets: '3 x 10', instructions: [] },
  ],
});

// Stan PO starcie cyklu: plan i cykl trzymają te same id `${START}-dN`.
const cycleDays = [
  cycleDay(1, 'monday', 'Push'),
  cycleDay(2, 'wednesday', 'Pull'),
  cycleDay(3, 'friday', 'Nogi'),
];

const activeCycle = {
  id: 'e2e-active-cycle',
  userId: E2E_UID,
  days: cycleDays,
  durationWeeks: 8,
  startDate: START,
  endDate: null,
  status: 'active',
  createdAt: `${START}T00:00:00.000Z`,
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
};

const setE2EPlan = async (page: Page, days: unknown[]) => {
  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: 'fittracker_e2e_plan', data: { days, durationWeeks: 8, startDate: START } });
};

const readE2EPlanDayIds = async (page: Page): Promise<string[]> => {
  const raw = await page.evaluate(() => window.localStorage.getItem('fittracker_e2e_plan'));
  const parsed = raw ? (JSON.parse(raw) as { days?: Array<{ id: string }> }) : null;
  return (parsed?.days ?? []).map((day) => day.id);
};

type DraftShape = {
  sessionId?: string;
  exerciseSets?: Record<string, Array<{ completed?: boolean }>>;
} | null;

const countCompletedSets = (draft: DraftShape): number => {
  if (!draft?.exerciseSets) return 0;
  return Object.values(draft.exerciseSets).flat().filter((set) => set.completed === true).length;
};

const checkOneSet = async (page: Page) => {
  const firstCard = page.locator('.exercise-card').first();
  await expect(firstCard).toBeVisible();

  await firstCard.getByRole('spinbutton', { name: /Set 1, kg/ }).first().fill('100');
  await firstCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('8');
  await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

  await expect.poll(
    async () => countCompletedSets(await readWorkoutDraftDb(page, E2E_UID) as DraftShape),
    { message: 'draft z odhaczoną serią ma trafić do IndexedDB' },
  ).toBe(1);
};

test.describe('Id dni aktywnego cyklu przy edycji planu (Z152)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2ECycles(page, [activeCycle]);
    await setE2EPlan(page, cycleDays);
  });

  test('cykl → trening z serią → /plan/edit (dzień + ćwiczenie) → back → id w formacie cyklu, serie nietknięte', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/${START}-d1?date=${today}&autostart=true`);
    await checkOneSet(page);

    const draftBefore = await readWorkoutDraftDb(page, E2E_UID) as DraftShape;
    expect(draftBefore?.sessionId).toBeTruthy();

    await page.getByRole('button', { name: 'Edytuj plan dnia' }).click();
    await expect(page.getByRole('heading', { name: 'Edytuj plan' })).toBeVisible();

    // Dodanie DNIA: addPlanDay nadaje day-N — zapis musi to wyrównać do formatu cyklu.
    await page.getByRole('button', { name: /Dodaj dzień/ }).click();

    // Dodanie ćwiczenia do dnia dzisiejszego (pierwszy dzień cyklu).
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wyciskanie sztangi na lawce plaskiej');
    await dialog.getByText('Wyciskanie sztangi na ławce płaskiej').click();
    await expect(dialog).toBeHidden();

    // (b) WSZYSTKIE dni planu w formacie `${START}-dN`, id istniejących bez zmian.
    await expect.poll(async () => readE2EPlanDayIds(page)).toEqual([
      `${START}-d1`, `${START}-d2`, `${START}-d3`, `${START}-d4`,
    ]);

    // (a) Powrót przez historię: serie nietknięte, ta sama sesja draftu.
    await page.goBack();
    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
    await expect(firstCard.getByRole('spinbutton', { name: /Set 1, kg/ }).first()).toHaveValue('100');
    const draftAfter = await readWorkoutDraftDb(page, E2E_UID) as DraftShape;
    expect(draftAfter?.sessionId).toBe(draftBefore?.sessionId);
    expect(countCompletedSets(draftAfter)).toBe(1);

    // (c) Wejście w dzisiejszy dzień działa pod TYM SAMYM URL-em (id niezmienione).
    await navigateAndWait(page, `/workout/${START}-d1?date=${today}`);
    await expect(page.locator('.exercise-card').first()).toBeVisible();

    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('resetToDefault przy aktywnym cyklu: dni default dostają id cyklu, nie day-N', async ({ page }) => {
    await navigateAndWait(page, '/plan/edit');
    await expect(page.getByRole('heading', { name: 'Edytuj plan' })).toBeVisible();

    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset' }).click();

    // Default (day-1..day-3, pn/śr/pt) dopasowany po pozycji + weekday do dni cyklu.
    await expect.poll(async () => readE2EPlanDayIds(page)).toEqual([
      `${START}-d1`, `${START}-d2`, `${START}-d3`,
    ]);
  });
});
