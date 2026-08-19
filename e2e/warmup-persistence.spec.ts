import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
  skipPreStartWarmupIfShown,
} from './helpers';

// Z162: scenariusz zgłoszony przez usera — odhaczenia rozgrzewki znikały po zamknięciu
// dialogu i po wyjściu z ekranu treningu. Test klika realną sekwencję:
// start → odhacz 3 → zamknij → otwórz (SĄ) → wyjdź na Dashboard → wróć (SĄ).

const E2E_UID = 'e2e-test-user';
const MONDAY = '2026-07-20';
const MONDAY_MS = new Date(`${MONDAY}T10:00:00`).getTime();

const openWarmup = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /Rozgrzewka/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

// C-T2: pozycje zależą od pierwszego ćwiczenia dnia — klikamy pierwsze 3
// odhaczalne (cardio + 2 dynamiczne) po testid, nie po nazwach.
const toggleFirstItems = async (page: import('@playwright/test').Page, count: number) => {
  for (let i = 0; i < count; i += 1) {
    await page.getByRole('dialog').getByTestId('warmup-item').nth(i).click();
  }
};

const struckCount = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog').locator('.line-through').count();

test.describe('Rozgrzewka: odhaczenia przeżywają zamknięcie dialogu i wyjście z ekranu (Z162)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
  });

  test('odhacz 3 → zamknij → otwórz → wyjdź na Dashboard → wróć: odhaczenia SĄ', async ({ page }) => {
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);

    await page.getByRole('button', { name: /Rozpocznij trening/ }).click();
    // C-T2: świeży start pokazuje prompt; "Tak" startuje sesję i otwiera rozgrzewkę.
    await page.getByTestId('prestart-yes').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 1. Świeża sesja: rozgrzewka czysta.
    expect(await struckCount(page)).toBe(0);

    // 2. Odhaczenie trzech pozycji.
    await toggleFirstItems(page, 3);
    expect(await struckCount(page)).toBe(3);

    // 3. Zamknięcie dialogu (X) i ponowne otwarcie — odhaczenia zostają.
    await page.getByRole('dialog').getByRole('button', { name: 'Zamknij okno' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await openWarmup(page);
    expect(await struckCount(page)).toBe(3);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // 4. Wyjście na Dashboard i powrót do treningu — odhaczenia nadal są (draft sesji).
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);

    await openWarmup(page);
    expect(await struckCount(page)).toBe(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(
        page.getByRole('dialog').getByTestId('warmup-item').nth(i).locator('.line-through'),
      ).toHaveCount(1);
    }

    await page.keyboard.press('Escape');
    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('nowa sesja (draft skasowany) startuje z czystą rozgrzewką', async ({ page }) => {
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening/ }).click();
    await page.getByTestId('prestart-yes').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await toggleFirstItems(page, 1);
    expect(await struckCount(page)).toBe(1);
    await page.keyboard.press('Escape');

    // Koniec treningu = draft znika; kolejna sesja nie dziedziczy odhaczeń.
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Kontynuuj trening/ }).first().click();
    await skipPreStartWarmupIfShown(page);

    await openWarmup(page);
    expect(await struckCount(page)).toBe(0);

    await page.keyboard.press('Escape');
    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
