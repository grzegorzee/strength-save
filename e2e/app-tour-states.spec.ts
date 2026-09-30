// Przewodnik NIGDY nie otwiera ani nie dotyka prawdziwych sesji i przechodzi do
// końca na KAŻDYM stanie konta (zgłoszenie z iOS 152: konto z ukończonym
// dzisiejszym treningiem, replay z Profilu, spotlight „Otwórz sesję” otwierał
// PRZYSZŁĄ sesję bez odhaczania i przewodnik utykał; zasada 6).
//
// Sterownik jest celowo niezależny od wersji UI: czyta `data-step` przewodnika
// i robi to, o co krok prosi. Niezmienniki sprawdzane na każdym kroku:
// URL nigdy nie jest prawdziwą sesją (/workout/*), a po przewodniku dane
// treningowe (mock workouts, plan, szkice IDB + fallback) są bajt w bajt te same.
import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  openProfileSection,
  setE2EAuthScenario,
  setE2EPlanMeta,
  setE2EWorkouts,
} from './helpers';

const E2E_UID = 'e2e-test-user';
const LOCAL_KEY = `fittracker_app_tour_v2:${E2E_UID}`;
const MONDAY = '2026-07-20';
const TUESDAY = '2026-07-21';

const clockAt = (iso: string) => new Date(`${iso}T10:00:00`).getTime();

const completedToday = {
  id: 'w-today-done',
  userId: E2E_UID,
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date: MONDAY,
  completed: true,
  durationSec: 3600,
  exercises: [{ exerciseId: 'ex-1-1', name: 'Wyciskanie hantli (Lekki skos)', sets: [{ reps: 8, weight: 40, completed: true }] }],
};

/** Stan danych treningowych: klucze mocka + szkice (IDB i fallback localStorage). */
const snapshotTrainingData = (page: Page) => page.evaluate(async (uid) => {
  const keys = Object.keys(localStorage)
    .filter((k) => k.startsWith('fittracker_e2e_') || k.startsWith('fittracker_workout_draft') || k.startsWith('fittracker_promoted'))
    .sort();
  const ls = Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));
  const idb = await new Promise<unknown>((resolve) => {
    const req = indexedDB.open('strength-save-db');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('workoutDrafts')) { resolve([]); return; }
      const all = db.transaction('workoutDrafts', 'readonly').objectStore('workoutDrafts').getAll();
      all.onsuccess = () => resolve((all.result as Array<{ userId?: string }>).filter((d) => d.userId === uid));
      all.onerror = () => resolve('error');
    };
    req.onerror = () => resolve('error');
  });
  return JSON.stringify({ ls, idb });
}, E2E_UID);

const localTour = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), LOCAL_KEY);

const replayFromProfile = async (page: Page) => {
  await navigateAndWait(page, '/profile');
  await expectPageRendered(page);
  await openProfileSection(page, 'account');
  await page.getByText('Pokaż przewodnik ponownie').click();
};

/**
 * Prowadzi przewodnik do końca, robiąc to, o co prosi bieżący krok. Na każdym
 * kroku: URL nie jest prawdziwą sesją. Zwraca listę odwiedzonych kroków.
 */
const driveTourToEnd = async (page: Page): Promise<string[]> => {
  const seen: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    expect(page.url(), `krok ${seen.at(-1) ?? 'start'}: przewodnik otworzył prawdziwą sesję`).not.toMatch(/#\/workout\//);
    const tour = page.getByTestId('first-workout-tour');
    if (await tour.count() === 0) {
      const state = await localTour(page);
      if (state?.stage === 'done') return seen;
      if (await page.getByTestId('practice-confirm-finish').isVisible().catch(() => false)) {
        await page.getByTestId('practice-confirm-finish').click();
        continue;
      }
      if (await page.getByTestId('practice-show-tabs').isVisible().catch(() => false)) {
        await page.getByTestId('practice-show-tabs').click();
        continue;
      }
      await page.waitForTimeout(250);
      continue;
    }
    const step = await tour.getAttribute('data-step');
    if (step && seen.at(-1) !== step) seen.push(step);
    const next = page.getByTestId('tour-next');
    if (step === 'set-check') {
      await page.locator('[data-tour="set-check"]').first().click();
    } else if (step === 'finish') {
      await page.locator('[data-tour="finish"]').first().click();
    } else if (step?.startsWith('tab-') && step !== 'tabs-done') {
      await page.locator(`[data-tour="nav-${step.slice(4)}"]`).first().click();
    } else if (await next.isVisible().catch(() => false)) {
      await next.click();
    } else if (step === 'start') {
      // v1 (build 152): spotlight na hero Dashboardu.
      await page.locator('[data-tour="start-workout"]').first().click();
    } else {
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`przewodnik nie doszedł do końca, kroki: ${seen.join(' > ')}`);
};

const prepare = async (page: Page, iso: string) => {
  await page.clock.install({ time: clockAt(iso) });
  await blockFirebase(page);
  await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  await setE2EAuthScenario(page, 'active-user');
};

const EXPECTED_STEPS = [
  'welcome', 'set-inputs', 'set-check', 'first-set-done', 'exercise-menu', 'finish',
  'tab-plan', 'tab-history', 'tab-progress', 'tab-profile', 'tabs-done',
];

const runReplayScenario = async (page: Page) => {
  await replayFromProfile(page);
  await expectPageRendered(page);
  const before = await snapshotTrainingData(page);
  const steps = await driveTourToEnd(page);
  expect(steps).toEqual(EXPECTED_STEPS);
  expect(await localTour(page)).toMatchObject({ stage: 'done', outcome: 'done' });
  expect(await snapshotTrainingData(page)).toBe(before);
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
};

test.describe('Przewodnik na każdym stanie konta (replay z Profilu)', () => {
  test.afterEach(async ({ page }) => {
    await clearWorkoutDraftDb(page, E2E_UID).catch(() => undefined);
  });

  test('(b) zgłoszenie 152: dzisiejszy trening ukończony -> przewodnik do końca, bez prawdziwej sesji', async ({ page }) => {
    await prepare(page, MONDAY);
    await setE2EWorkouts(page, [completedToday]);
    await runReplayScenario(page);
  });

  test('(c) dzień wolny', async ({ page }) => {
    await prepare(page, TUESDAY);
    await setE2EWorkouts(page, [completedToday]);
    await runReplayScenario(page);
  });

  test('(d) urlop', async ({ page }) => {
    await prepare(page, MONDAY);
    await setE2EPlanMeta(page, {
      vacation: { startDate: '2026-07-18', endDate: '2026-07-26', activity: 'none', extendedWeeks: 0 },
    });
    await setE2EWorkouts(page, [completedToday]);
    await runReplayScenario(page);
  });

  test('(e) brak planu', async ({ page }) => {
    await prepare(page, MONDAY);
    await setE2EPlanMeta(page, { days: [] });
    await setE2EWorkouts(page, []);
    await runReplayScenario(page);
  });
});

test.describe('Przewodnik nowego konta: plan startuje w przyszłym tygodniu', () => {
  test('(a) auto-start, dziś brak dnia planu, przewodnik do końca bez zapisów', async ({ page }) => {
    await prepare(page, MONDAY);
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-tour-seed-cleared')) {
        localStorage.removeItem('fittracker_first_workout_tour_v1');
        sessionStorage.setItem('e2e-tour-seed-cleared', '1');
      }
    });
    await setE2EPlanMeta(page, { startDate: '2026-07-27' });
    await setE2EWorkouts(page, []);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    const before = await snapshotTrainingData(page);
    const steps = await driveTourToEnd(page);
    expect(steps).toEqual(EXPECTED_STEPS);
    expect(await snapshotTrainingData(page)).toBe(before);
  });
});

test.describe('(f) trening w toku: przewodnik go nie dotyka (sekwencja, zasada 5)', () => {
  test('start realnego treningu -> odhaczenie -> wyjście -> replay -> próba -> powrót: wszystko na miejscu -> zakończenie', async ({ page }) => {
    await prepare(page, MONDAY);
    await setE2EWorkouts(page, []);
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening/ }).click();
    await page.getByTestId('prestart-skip').click();
    const card = page.locator('.exercise-card').first();
    await card.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('42.5');
    await card.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('7');
    await card.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(card.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
    const cardsBefore = await page.locator('.exercise-card').count();
    await page.waitForTimeout(1500); // autozapis szkicu

    await replayFromProfile(page);
    const before = await snapshotTrainingData(page);
    expect(before).toContain('42.5');
    const steps = await driveTourToEnd(page);
    expect(steps).toEqual(EXPECTED_STEPS);
    // Szkic prawdziwego treningu bajt w bajt nietknięty.
    expect(await snapshotTrainingData(page)).toBe(before);

    // Powrót do realnego treningu: odhaczona seria i komplet ćwiczeń.
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await expect(page.locator('.exercise-card')).toHaveCount(cardsBefore);
    const back = page.locator('.exercise-card').first();
    await expect(back.getByRole('textbox', { name: /Set 1, kg/ }).first()).toHaveValue('42.5');
    await expect(back.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

    // Zakończenie (offline, wzorzec workout-milestone.spec): sekwencja domyka się.
    await page.context().setOffline(true);
    await page.getByTestId('finish-workout').click();
    await page.getByRole('button', { name: 'Tak, zakończ' }).click();
    await expect(page.getByText(/Trening ukończony|Ukończyłeś 1\. trening/).first()).toBeVisible({ timeout: 15_000 });
    await page.context().setOffline(false);
    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
