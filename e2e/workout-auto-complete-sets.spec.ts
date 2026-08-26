// WP-D (X37, research sekcja 4): przy "Zakończ trening" serie z wpisanymi danymi,
// ale bez odhaczenia, odhaczają się same (Hevy pomija je po cichu; my liczymy
// i mówimy ile). Aktywna seria = wyróżnienie całego wiersza + checkmark "(aktywna)".
// Finalny sync w mock e2e nie domyka się (Firestore zablokowany), więc dowodem
// jest toast + draft w IndexedDB (ta sama ścieżka co ręczne odhaczenie).
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  readWorkoutDraftDb,
  skipPreStartWarmupIfShown,
} from './helpers';

type DraftShape = {
  exerciseSets?: Record<string, { completed: boolean; isWarmup?: boolean; reps?: number; weight?: number }[]>;
} | null;

test.describe('WP-D (X37): aktywna seria i auto-odhaczanie przy Zakończ', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('aktywna seria ma wyróżniony wiersz i checkmark "(aktywna)"; po odhaczeniu przechodzi na następną', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await clearWorkoutDraftDb(page, 'e2e-test-user');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    // Dokładnie jeden aktywny wiersz w karcie, z obrysem i checkmarkiem "(aktywna)".
    const activeRow = firstCard.locator('.set-row-active');
    await expect(activeRow).toHaveCount(1);
    await expect(activeRow.getByRole('button', { name: /\(aktywna\)/ })).toBeVisible();
    await expect(activeRow.getByLabel(/Set 1, Powt\./)).toBeVisible();

    // Odhaczenie serii 1 przenosi wyróżnienie na serię 2.
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).first().fill('60');
    await firstCard.getByLabel(/Set 1, Powt\./).first().fill('8');
    await activeRow.getByRole('button', { name: /\(aktywna\)/ }).click();
    await expect(firstCard.locator('.set-row-active')).toHaveCount(1);
    await expect(firstCard.locator('.set-row-active').getByLabel(/Set 2, Powt\./)).toBeVisible();

    // Zero poziomego scrolla po wyróżnieniu wiersza (pasek akcentu to pseudo-element).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('wszystkie serie wpisane, 1 odhaczona -> Zakończ: toast "Odhaczono N serii" i komplet odhaczeń w drafcie', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await clearWorkoutDraftDb(page, 'e2e-test-user');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    // Wpisz ciężar i powtórzenia we WSZYSTKIE serie robocze pierwszego ćwiczenia.
    const repsInputs = firstCard.getByLabel(/Set \d+, Powt\./);
    const workingCount = await repsInputs.count();
    expect(workingCount).toBeGreaterThanOrEqual(2);
    for (let n = 1; n <= workingCount; n += 1) {
      await firstCard.getByLabel(new RegExp(`Set ${n}, (kg|lbs)`)).first().fill('60');
      await firstCard.getByLabel(new RegExp(`Set ${n}, Powt\\.`)).first().fill('8');
    }

    // Odhacz tylko serię 1 (kolejność checkmarków: [0] = rozgrzewka W, [1] = Set 1).
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).nth(1).click();
    await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
    await expect(page.getByTestId('session-stats')).toContainText('1');

    // Zakończ trening (potwierdzenie inline).
    await page.getByTestId('finish-workout').click();
    await page.getByRole('button', { name: 'Tak, zakończ' }).click();

    // Toast z liczbą auto-odhaczonych serii (wszystkie poza tą odhaczoną ręcznie).
    // `.first()`: Radix duplikuje treść toastu w regionie aria-live.
    await expect(page.getByText(new RegExp(`Odhaczono ${workingCount - 1} seri`)).first()).toBeVisible();

    // Draft (ta sama ścieżka co ręczne odhaczenie): komplet serii roboczych odhaczony,
    // rozgrzewka (pusta) nietknięta.
    await expect.poll(async () => {
      const draft = await readWorkoutDraftDb(page, 'e2e-test-user') as DraftShape;
      const sets = Object.values(draft?.exerciseSets ?? {}).flat();
      return sets.filter((s) => s.completed && !s.isWarmup).length;
    }, { timeout: 10000 }).toBe(workingCount);
    const draft = await readWorkoutDraftDb(page, 'e2e-test-user') as DraftShape;
    const warmups = Object.values(draft?.exerciseSets ?? {}).flat().filter((s) => s.isWarmup);
    expect(warmups.every((s) => !s.completed)).toBe(true);
  });

  test('puste serie zostają puste: Zakończ bez żadnej odhaczonej serii daje toast pustego treningu', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await clearWorkoutDraftDb(page, 'e2e-test-user');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    // Same powtórzenia bez ciężaru to nie komplet danych (weight_reps).
    await firstCard.getByLabel(/Set 1, Powt\./).first().fill('8');

    await page.getByTestId('finish-workout').click();
    await page.getByRole('button', { name: 'Tak, zakończ' }).click();
    await expect(page.getByText('Pusty trening').first()).toBeVisible();
    await expect(page.getByText(/Odhaczono/)).toHaveCount(0);
  });
});
