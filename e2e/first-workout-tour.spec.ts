// WP-E (X37): tour pierwszego treningu, 3 spotlighty. Świeży user (konto tuż po
// onboardingu = scenariusz active-user, bez historii treningów) startuje
// /workout/day-1 z przycisku, pomija arkusz rozgrzewki, widzi 3 kroki, Pomiń
// zapisuje klucz; po reloadzie (resume sesji) toura nie ma. Desktop md+ bez toura.
//
// Uwaga: onboarding new-user w mock E2E nie kończy się Dashboardem (zapis profilu
// idzie do zablokowanego Firestore, patrz full-app X34 (a)), dlatego stan "po
// onboardingu" symuluje active-user + setE2EWorkouts([]) (wzorzec onboarding-accent).
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
  setE2EWorkouts,
  skipPreStartWarmupIfShown,
} from './helpers';

const E2E_UID = 'e2e-test-user';
const TOUR_KEY = 'fittracker_first_workout_tour_v1';

// playwright.config seeduje klucz "widziane" (tour zasłaniałby sesję w każdym
// specu na 390 px). Tu czyścimy go RAZ na kontekst (sessionStorage przeżywa
// reload), żeby drugi load po Pomiń zachował zapis toura.
const clearTourSeedOnce = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(({ key }) => {
    if (!sessionStorage.getItem('e2e-tour-seed-cleared')) {
      localStorage.removeItem(key);
      sessionStorage.setItem('e2e-tour-seed-cleared', '1');
    }
  }, { key: TOUR_KEY });
};

const startFreshWorkout = async (page: import('@playwright/test').Page) => {
  await navigateAndWait(page, '/workout/day-1');
  await expectPageRendered(page);
  await clearWorkoutDraftDb(page, E2E_UID);
  await page.reload();
  await expectPageRendered(page);
  await page.getByRole('button', { name: /Rozpocznij trening/ }).click();
  await skipPreStartWarmupIfShown(page);
  await expect(page.getByTestId('session-stats')).toBeVisible();
};

test.describe('Tour pierwszego treningu (WP-E X37)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await clearTourSeedOnce(page);
    await setE2EAuthScenario(page, 'active-user');
    await setE2EWorkouts(page, []);
  });

  test('świeży user: 3 kroki po starcie, Pomiń zapisuje klucz, po reloadzie brak toura', async ({ page }) => {
    await startFreshWorkout(page);

    // Krok 1: inputy pierwszej aktywnej serii; Dalej i Pomiń widoczne.
    const step1 = page.getByTestId('tour-step-1');
    await expect(step1).toBeVisible();
    await expect(step1).toContainText('Wpisz ciężar i powtórzenia');
    await expect(page.getByTestId('tour-next')).toBeVisible();
    await expect(page.getByTestId('tour-skip')).toBeVisible();
    // Cel spotlightu = aktywna seria PIERWSZEGO ćwiczenia (każda karta znaczy
    // swoją aktywną serię; tour bierze pierwszą w DOM). Cel zostaje
    // interaktywny (wycięcie, nie blokada): wpis w input przechodzi.
    const firstTarget = page.locator('[data-tour="set-inputs"]').first();
    await expect(firstTarget).toBeVisible();
    expect(await firstTarget.evaluate((el) => !!el.closest('[id^="exercise-card-"]')
      && el.closest('[id^="exercise-card-"]') === document.querySelector('[id^="exercise-card-"]'))).toBe(true);
    await firstTarget.locator('input').first().fill('40');
    await expect(firstTarget.locator('input').first()).toHaveValue('40');
    // Z47: pierwszy wpis w sesji zapisuje lastTouchedExerciseId i WorkoutDay
    // przewija do tej karty 300/900 ms później (istniejące zachowanie, poza
    // pakietem). Odczekujemy, żeby ten scroll nie nadpisał scrollu kroku 3.
    await page.waitForTimeout(1200);

    await page.getByTestId('tour-next').click();
    const step2 = page.getByTestId('tour-step-2');
    await expect(step2).toBeVisible();
    await expect(step2).toContainText('Odhacz serię tym przyciskiem');

    await page.getByTestId('tour-next').click();
    const step3 = page.getByTestId('tour-step-3');
    await expect(step3).toBeVisible();
    await expect(step3).toContainText('Tu kończysz trening');
    // Krok 3 przewija do przycisku Zakończ (cel w viewport).
    await expect(page.getByTestId('finish-workout')).toBeInViewport();

    // Pomiń zawsze widoczne: zamyka i zapisuje klucz.
    await page.getByTestId('tour-skip').click();
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), TOUR_KEY)).toBe('1');

    // Zero poziomego scrolla przy tourze i po nim (zasada 7).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Reload = resume sesji: toura nie ma, sesja trwa.
    await page.reload();
    await expectPageRendered(page);
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('Dalej x3 kończy tour i zapisuje klucz', async ({ page }) => {
    await startFreshWorkout(page);
    await expect(page.getByTestId('tour-step-1')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-2')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-3')).toBeVisible();
    await expect(page.getByTestId('tour-next')).toHaveText('Gotowe');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), TOUR_KEY)).toBe('1');
  });

  test('desktop md+ (sidebar): bez toura', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await startFreshWorkout(page);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });
});

test.describe('Tour pierwszego treningu: niezmiennik dla usera z historią', () => {
  test('user z ukończonym treningiem nie widzi toura mimo braku klucza', async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await clearTourSeedOnce(page);
    await setE2EAuthScenario(page, 'active-user');
    // Kształt jak w all-time-stats.spec (mock workout-read-store).
    await setE2EWorkouts(page, [{
      id: 'w-done-1',
      userId: E2E_UID,
      dayId: 'day-2',
      dayName: 'Wtorek',
      date: '2026-01-06',
      completed: true,
      durationSec: 3600,
      exercises: [{
        exerciseId: 'ex-2-1',
        name: 'Przysiad ze sztangą',
        sets: [{ reps: 5, weight: 80, completed: true }],
      }],
    }]);
    await startFreshWorkout(page);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });
});
