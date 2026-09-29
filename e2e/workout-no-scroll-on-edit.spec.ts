// 2026-09-29 (flake „wszystkie serie wpisane, 1 odhaczona” w WebKit):
// przewinięcie do ostatnio dotkniętego ćwiczenia (Z47) jest dla HYDRACJI
// (reload / powrót po zabiciu apki). W żywej sesji odpalało się 300 i 900 ms
// po pierwszej edycji serii i przesuwało stronę pod palcem; gdy trafiło między
// mousedown a mouseup tapnięcia ✓, odhaczenie ginęło (na siłowni: tap ✓ tuż po
// wpisaniu ciężaru nie działa). Niezmiennik: w trwającej sesji apka nie
// przewija strony sama po edycji serii. Z47 po reloadzie: full-app.spec.ts.
import { test, expect } from '@playwright/test';
import { blockFirebase, clearWorkoutDraftDb, expectPageRendered, navigateAndWait, skipPreStartWarmupIfShown } from './helpers';

test.describe('Żywa sesja: edycja serii nie przewija strony', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('wpisanie ciężaru i powtórzeń nie uruchamia programowego scrolla', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await clearWorkoutDraftDb(page, 'e2e-test-user');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    // Rejestr programowych scrolli (user nie przewija: brak wheel/touch w teście).
    await page.evaluate(() => {
      const w = window as unknown as { __scrolls: number[] };
      w.__scrolls = [];
      window.addEventListener('scroll', () => w.__scrolls.push(Math.round(window.scrollY)), { passive: true });
    });
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).first().fill('60');
    await firstCard.getByLabel(/Set 1, Powt\./).first().fill('8');
    // Okno Z47 (300 i 900 ms) z zapasem.
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { __scrolls: number[] }).__scrolls)).toEqual([]);

    // Tap ✓ zaraz po edycji zostaje zarejestrowany.
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
    await clearWorkoutDraftDb(page, 'e2e-test-user');
  });
});
