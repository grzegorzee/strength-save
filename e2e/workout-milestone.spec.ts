import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  localDaysAgo,
  localToday,
  navigateAndWait,
  setE2EWorkouts,
} from './helpers';

// WP-F (X37, RESEARCH sekcja 5): celebracja pierwszego treningu i kamieni
// milowych (1, 10, 25, 50...). Zwykły trening = dotychczasowa celebracja bez
// banera (niezmiennik). Numer porządkowy treningu w podsumowaniu.
//
// Mock e2e: finalny zapis do Firestore wisi (route abort, SDK retry bez
// timeoutu), więc do widoku ukończenia dochodzimy sesją PROVISIONAL offline:
// silnik syncu zwraca OFFLINE od razu, WorkoutDay kończy trening lokalnie
// (finalSyncPending) i pokazuje sekwencję completion jak przy sukcesie.

const E2E_UID = 'e2e-test-user';

const completedWorkout = (i: number) => ({
  id: `w-ms-${i}`,
  userId: E2E_UID,
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date: localDaysAgo(i + 1),
  completed: true,
  durationSec: 3600,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie hantli (Lekki skos)',
    sets: [{ reps: 8, weight: 40, completed: true }],
  }],
});

const seedCompletedWorkouts = (count: number) => Array.from({ length: count }, (_, i) => completedWorkout(i));

const navigateWithinLoadedApp = async (page: Page, route: string) => {
  await page.evaluate((nextRoute) => {
    window.location.hash = `#${nextRoute}`;
  }, route);
  const pathname = route.split('?')[0];
  await expect(page).toHaveURL(new RegExp(`/#${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`));
};

// Rozgrzanie lazy chunku WorkoutDay ONLINE, potem offline autostart sesji
// provisional, jedna seria robocza, "Zakończ trening" + potwierdzenie.
const finishOfflineWorkout = async (page: Page) => {
  const today = localToday();
  await navigateAndWait(page, `/workout/day-1?date=${today}`);
  await expect(page.getByRole('button', { name: 'Rozpocznij trening' })).toBeEnabled();
  await clearWorkoutDraftDb(page, E2E_UID);

  await page.context().setOffline(true);
  await navigateWithinLoadedApp(page, `/workout/day-1?date=${today}&autostart=true`);

  const firstCard = page.locator('.exercise-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('40');
  await firstCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('8');
  await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

  await page.getByTestId('finish-workout').click();
  await page.getByRole('button', { name: 'Tak, zakończ' }).click();
};

test.describe('Celebracje: pierwszy trening + kamienie milowe (WP-F)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test.afterEach(async ({ page }) => {
    await page.context().setOffline(false);
    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('świeży user (0 treningów) kończy pierwszy trening: baner "Ukończyłeś 1. trening!" + Trening nr 1', async ({ page }) => {
    await finishOfflineWorkout(page);

    const banner = page.getByTestId('workout-milestone-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Ukończyłeś 1. trening!');
    await expect(page.getByText('Trening ukończony!')).toBeVisible();

    // Zasada 6: celebracja ma wyjście bez czekania (tap w overlay; X w rogu
    // bywa pod toastem "zapisano lokalnie") i prowadzi do oceny, potem podsumowanie.
    await banner.click();
    await expect(banner).toBeHidden();
    await page.getByRole('button', { name: 'Pomiń ocenę' }).click();
    await expect(page.getByTestId('workout-ordinal')).toHaveText('Trening nr 1');
  });

  test('user z 9 treningami kończy dziesiąty: baner "10. trening za Tobą!"', async ({ page }) => {
    await setE2EWorkouts(page, seedCompletedWorkouts(9));
    await finishOfflineWorkout(page);

    const banner = page.getByTestId('workout-milestone-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('10. trening za Tobą!');
    // Sam znika po 2,5 s (deadline ścienny), bez klikania.
    await expect(banner).toBeHidden({ timeout: 5000 });
    await page.getByRole('button', { name: 'Pomiń ocenę' }).click();
    await expect(page.getByTestId('workout-ordinal')).toHaveText('Trening nr 10');
  });

  test('niezmiennik: trzeci trening bez banera, zwykła celebracja i numer w podsumowaniu', async ({ page }) => {
    await setE2EWorkouts(page, seedCompletedWorkouts(2));
    await finishOfflineWorkout(page);

    await expect(page.getByText('Trening ukończony!')).toBeVisible();
    await expect(page.getByTestId('workout-milestone-banner')).toHaveCount(0);
    // Dotychczasowa celebracja bez PR: AutoAdvance (1,2 s) sam przechodzi do oceny.
    await expect(page.getByText('Jak było?')).toBeVisible();
    await page.getByRole('button', { name: 'Pomiń ocenę' }).click();
    await expect(page.getByTestId('workout-ordinal')).toHaveText('Trening nr 3');
  });
});
