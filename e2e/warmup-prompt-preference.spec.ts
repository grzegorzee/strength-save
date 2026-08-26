import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  openProfileSection,
  setE2EAuthScenario,
} from './helpers';

// X37 WP-B: rozgrzewka przed treningiem jest OPCJONALNA (preferences.warmupPrompt,
// cache fittracker_warmup_prompt_v1). Trzy akcje w arkuszu: "Tak, rozgrzewka" /
// "Pomiń dziś" / "Nie proponuj więcej"; przełącznik w Profilu > Trening.
// Niezmiennik: płomyk rozgrzewki w pasku sesji działa także z wyłączonym arkuszem.

const E2E_UID = 'e2e-test-user';
const MONDAY = '2026-07-20';
const MONDAY_MS = new Date(`${MONDAY}T10:00:00`).getTime();
const WARMUP_PROMPT_KEY = 'fittracker_warmup_prompt_v1';

const startButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /Rozpocznij trening/ });

const expectSessionStarted = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('button', { name: 'Zakończ trening' })).toBeVisible({ timeout: 10_000 });
};

test.describe('Rozgrzewka opcjonalna: preferencja warmupPrompt (X37 WP-B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
  });

  test('cache OFF (fittracker_warmup_prompt_v1=false) -> start treningu BEZ arkusza prestart, płomyk rozgrzewki nadal w sesji', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'false'), WARMUP_PROMPT_KEY);
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);

    await startButton(page).click();
    await expectSessionStarted(page);
    await expect(page.getByTestId('prestart-sheet')).toHaveCount(0);

    // Niezmiennik: rozgrzewka osiągalna z paska sesji mimo wyłączonego proponowania.
    const toastClose = page.locator('[toast-close]').first();
    if (await toastClose.isVisible().catch(() => false)) {
      await toastClose.click();
      await toastClose.waitFor({ state: 'hidden' });
    }
    await page.getByRole('button', { name: /Rozgrzewka/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByTestId('warmup-item').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('"Nie proponuj więcej" startuje trening, pisze cache false; drugi start (nowa sesja) bez arkusza', async ({ page }) => {
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);

    await startButton(page).click();
    const sheet = page.getByTestId('prestart-sheet');
    await expect(sheet).toBeVisible();
    // Trzy akcje w jednym arkuszu.
    await expect(sheet.getByTestId('prestart-yes')).toBeVisible();
    await expect(sheet.getByTestId('prestart-skip')).toBeVisible();
    await sheet.getByTestId('prestart-never').click();
    await expect(sheet).toHaveCount(0);
    await expectSessionStarted(page);
    await expect(page.getByText(/Włączysz ją w Profilu > Trening/)).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), WARMUP_PROMPT_KEY)).toBe('false');

    // Nowa sesja (draft skasowany): start prosto do treningu.
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);
    await startButton(page).click();
    await expectSessionStarted(page);
    await expect(page.getByTestId('prestart-sheet')).toHaveCount(0);
    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('Profil > Trening: przełącznik "Proponuj rozgrzewkę" wyłącza i włącza arkusz (cache per urządzenie)', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await openProfileSection(page, 'training');
    const toggle = page.getByTestId('profile-warmup-prompt');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate((key) => localStorage.getItem(key), WARMUP_PROMPT_KEY)).toBe('false');

    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);
    await startButton(page).click();
    await expectSessionStarted(page);
    await expect(page.getByTestId('prestart-sheet')).toHaveCount(0);
    await clearWorkoutDraftDb(page, E2E_UID);

    // Włączenie z powrotem: arkusz wraca przy następnym świeżym starcie.
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await openProfileSection(page, 'training');
    await page.getByTestId('profile-warmup-prompt').click();
    await expect(page.getByTestId('profile-warmup-prompt')).toHaveAttribute('aria-checked', 'true');
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await page.reload();
    await expectPageRendered(page);
    await startButton(page).click();
    await expect(page.getByTestId('prestart-sheet')).toBeVisible();
    await page.getByTestId('prestart-skip').click();
    await expectSessionStarted(page);
    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
