// T6 (2026-09-29): baza ćwiczeń 379, kategoria Kondycja, 16 nowych planów,
// F7 dla początkujących i pytanie "Gdzie trenujesz?" w kreatorze.
import { test, expect, type Page } from '@playwright/test';
import {
  advanceWizardToStep5,
  blockFirebase,
  clearWorkoutDraftDb,
  localToday,
  navigateAndWait,
  setE2EAuthScenario,
  skipPreStartWarmupIfShown,
} from './helpers';

type StoredPlan = { name?: string; days?: Array<{ id: string; exercises: Array<{ name: string; sets: string }> }> };
type StoredSet = { reps: number; weight: number; distanceM?: number; completed?: boolean; isWarmup?: boolean };
type StoredWorkout = { id: string; completed?: boolean; exercises?: Array<{ exerciseId: string; name?: string; sets: StoredSet[] }> };

// Ćwiczenia z podporem na rękach / podnoszeniem masy ciała (F7), których
// początkujący nie dostaje w żadnym proponowanym planie.
const F7_NAMES = [
  'Plank', 'Pompki', 'Podciąganie na drążku', 'Dips (pompki na poręczach)', 'Unoszenie nóg w zwisie',
  'Burpees', 'Mountain Climbers', 'Australijskie podciąganie (Inverted Row)',
];

const readMirrorPlan = (page: Page) => page.evaluate(() => {
  const raw = window.localStorage.getItem('fittracker_e2e_plan');
  return raw ? JSON.parse(raw) as StoredPlan : null;
});

const cardName = async (page: Page, testId: string) =>
  (await page.getByTestId(testId).getByTestId('plan-choice-name').textContent())?.trim() ?? '';

const libraryNames = async (page: Page) => {
  await page.getByRole('button', { name: /Biblioteka planów/ }).click();
  await expect(page.getByTestId('browse-objective-chips')).toBeVisible();
  const names = (await page.getByRole('heading', { level: 2 }).allTextContents()).map((s) => s.trim());
  await page.getByRole('button', { name: 'Wstecz' }).click();
  return names;
};

test.describe('T6: kreator "Gdzie trenujesz?"', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('Hantle w domu (początkujący, 3 dni): tylko plany domowe; zapis planu z hantlami', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await advanceWizardToStep5(page, { levelLabel: 'Początkujący', equipment: 'dumbbells_home', days: 3 });
    const allowed = ['Hantle w Domu', 'Kettlebell Podstawy'];
    expect(allowed).toContain(await cardName(page, 'plan-choice-recommended'));
    expect(allowed).toContain(await cardName(page, 'plan-choice-alternative'));
    expect((await libraryNames(page)).sort()).toEqual([...allowed].sort());

    await page.getByTestId('ob-match-next').click();
    await page.getByTestId('ob-start-cta').click();
    await expect.poll(async () => (await readMirrorPlan(page))?.name ?? null).toBe('Hantle w Domu');
    const plan = await readMirrorPlan(page);
    const names = plan!.days!.flatMap((d) => d.exercises.map((e) => e.name));
    expect(names).toEqual(expect.arrayContaining(['Przysiad z hantlami', 'Wyciskanie hantli nad głowę stojąc', 'Unoszenie nóg leżąc']));
    for (const f7 of F7_NAMES) expect(names).not.toContain(f7);
  });

  test('Masa ciała (średnio zaawansowany, 3 dni): wyłącznie plan bez sprzętu', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await advanceWizardToStep5(page, { levelLabel: 'Średnio zaawansowany', equipment: 'bodyweight', days: 3 });
    expect(await cardName(page, 'plan-choice-recommended')).toBe('Własny Ciężar');
    await expect(page.getByTestId('plan-choice-alternative')).toHaveCount(0);
    expect(await libraryNames(page)).toEqual(['Własny Ciężar']);
  });

  test('Masa ciała + początkujący: brak planu = komunikat z wyjściem, zmiana miejsca prowadzi do planów', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await page.getByText('Początkujący', { exact: true }).click();
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByTestId('ob-equipment-bodyweight').click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await expect(page.getByTestId('ob-no-template')).toBeVisible();
    await expect(page.getByTestId('ob-match-next')).toHaveCount(0);
    await expect(page.getByTestId('ob-no-template-own')).toBeVisible();
    await page.getByTestId('ob-no-template-equipment').click();
    await page.getByTestId('ob-equipment-gym').click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await expect(page.getByTestId('plan-choice-recommended')).toBeVisible();
  });

  test('Siłownia (domyślnie): pełny katalog dla początkującego, w tym plany siłowniane', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await advanceWizardToStep5(page, { levelLabel: 'Początkujący', days: 3 });
    await expect(page.getByTestId('ob-equipment-gym')).toHaveCount(0); // krok 5, pytanie zostało w kroku 3
    const names = await libraryNames(page);
    expect(names).toEqual(expect.arrayContaining(['Siła Fundamentalna', 'Redukcja na Start', 'Hantle w Domu']));
  });
});

test.describe('T6 (F7): początkujący dostaje plan bez planka i podporu na rękach', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  for (const days of [2, 3, 4, 5, 6]) {
    test(`początkujący, ${days} dni: podgląd polecanego planu bez ćwiczeń F7`, async ({ page }) => {
      await navigateAndWait(page, '/new-plan');
      await advanceWizardToStep5(page, { levelLabel: 'Początkujący', days });
      await page.getByTestId('ob-match-next').click();
      await page.getByTestId('ob-start-preview').click();
      await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
      for (const f7 of F7_NAMES) await expect(page.getByText(f7, { exact: true })).toHaveCount(0);
      if (days === 2) await expect(page.getByText('Dead Bug (Robak - Brzuch)', { exact: true }).first()).toBeVisible();
    });
  }
});

test.describe('T6: picker ćwiczeń i kategoria Kondycja', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('PL: /plan/edit -> Dodaj ćwiczenie -> Kondycja -> sanie; wyszukiwarka zna nowe ćwiczenia', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await navigateAndWait(page, '/plan/edit');
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const grid = dialog.getByTestId('picker-category-grid');
    await expect(grid.getByRole('button')).toHaveCount(10);
    await grid.getByRole('button', { name: 'Kondycja' }).click();
    await expect(dialog.getByText('Pchanie sań (Sled Push)')).toBeVisible();
    await expect(dialog.getByText('Rzut piłką lekarską o ścianę (Wall Ball)')).toBeVisible();
    await grid.getByRole('button', { name: 'Wszystkie' }).click();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('pompki na kolanach');
    await expect(dialog.getByText('Pompki na kolanach')).toBeVisible();
  });

  test('EN: Conditioning chip and English names', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app-language', 'en'));
    await navigateAndWait(page, '/plan/edit');
    await page.getByRole('button', { name: /Add exercise/ }).first().click();
    const dialog = page.getByRole('dialog');
    const grid = dialog.getByTestId('picker-category-grid');
    await grid.getByRole('button', { name: 'Conditioning' }).click();
    await expect(dialog.getByText('Sled Push', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Stationary Bike', { exact: true })).toBeVisible();
  });

  test('zakładka Ćwiczenia: kafel Kondycja bez zepsutego obrazka, lista z nowymi ćwiczeniami', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    const failed: string[] = [];
    page.on('response', (r) => { if (r.status() >= 400 && /exercise-groups|plan-templates|muscles/.test(r.url())) failed.push(r.url()); });
    await navigateAndWait(page, '/exercises');
    const tile = page.getByTestId('exercise-group-tile').filter({ hasText: 'Kondycja' });
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('img')).toHaveCount(0);
    await tile.click();
    await expect(page.getByText('Pchanie sań (Sled Push)')).toBeVisible();
    await page.getByText('Pchanie sań (Sled Push)').click();
    // Brak animacji: szczegóły z ilustracją partii (istniejący plik), zero 404 na assetach.
    await expect(page.getByText(/Pchanie sań/).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(failed).toEqual([]);
  });
});

test.describe('T6: trening z nowego planu z saniami (dystans)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('fittracker_e2e_cloud_writes', 'true');
    });
  });

  test('kreator -> Atleta w Trzy Dni -> start dnia z saniami -> 40 kg x 20 m -> zakończenie -> sync -> Historia', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await advanceWizardToStep5(page, { levelLabel: 'Średnio zaawansowany', objectiveLabel: 'Atletyka', days: 3 });
    await page.getByRole('button', { name: /Biblioteka planów/ }).click();
    await page.getByRole('heading', { level: 2, name: 'Atleta w Trzy Dni' }).click();
    await page.getByTestId('ob-match-next').click();
    await page.getByTestId('ob-start-cta').click();
    await expect.poll(async () => (await readMirrorPlan(page))?.name ?? null).toBe('Atleta w Trzy Dni');
    const plan = await readMirrorPlan(page);
    const sledDay = plan!.days!.find((d) => d.exercises.some((e) => e.name === 'Pchanie sań (Sled Push)'))!;
    expect(sledDay.exercises.find((e) => e.name === 'Pchanie sań (Sled Push)')!.sets).toBe('6 x 20 m');

    const today = localToday();
    await clearWorkoutDraftDb(page, 'e2e-test-user');
    await navigateAndWait(page, `/workout/${sledDay.id}`);
    await page.getByRole('button', { name: /Rozpocznij trening/i }).click();
    await skipPreStartWarmupIfShown(page);
    const sled = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: 'Pchanie sań (Sled Push)' }) });
    await expect(sled).toHaveCount(1);
    await sled.scrollIntoViewIfNeeded();
    const distance = sled.getByRole('textbox', { name: /Set 1, Dystans$/ });
    await expect(distance).toHaveAttribute('placeholder', '20');
    await expect(sled.getByRole('textbox', { name: /Dystans$/ })).toHaveCount(6);
    await sled.getByRole('textbox', { name: /Set 1, kg$/ }).fill('40');
    await distance.fill('20');
    await sled.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(sled.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

    await page.getByRole('button', { name: 'Zakończ trening' }).click();
    await page.getByRole('button', { name: 'Tak, zakończ' }).click();

    const sessionId = `workout-e2e-test-user-${sledDay.id}-${today}`;
    await expect.poll(async () => page.evaluate((id) => {
      const all = JSON.parse(localStorage.getItem('fittracker_e2e_workouts') ?? '[]') as StoredWorkout[];
      const w = all.find((x) => x.id === id);
      if (!w?.completed) return null;
      const sets = w.exercises?.find((e) => e.name === 'Pchanie sań (Sled Push)')?.sets ?? [];
      return sets.filter((s) => s.completed && !s.isWarmup).map((s) => [s.weight, s.distanceM ?? 0, s.reps]);
    }, sessionId), { timeout: 15_000 }).toEqual([[40, 20, 0]]);

    await navigateAndWait(page, '/history');
    await expect(page.getByTestId('history-session-row').first()).toBeVisible();
    expect(await page.locator('text=Coś poszło nie tak').count()).toBe(0);
  });
});
