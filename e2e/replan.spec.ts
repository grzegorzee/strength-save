import { test, expect } from '@playwright/test';
import { setE2EAuthScenario, setE2ECycles, blockFirebase } from './helpers';

// Pełnoekranowy replan (/new-plan) + ekran podsumowania zakończonego cyklu (closeout).

const day = (i: number) => ({
  id: `d${i}`,
  dayName: `Dzień ${i}`,
  focus: 'Push',
  exercises: [{ id: `e${i}`, name: 'Wyciskanie sztangi', sets: '4x8' }],
});

const completedCycle = {
  id: 'e2e-cycle-1',
  userId: 'e2e-user',
  days: [day(1), day(2), day(3), day(4)],
  durationWeeks: 8,
  startDate: '2026-03-02',
  endDate: '2026-04-26',
  status: 'completed',
  createdAt: '2026-03-02T00:00:00.000Z',
  stats: { totalWorkouts: 28, totalTonnage: 45200, prs: [{ exerciseName: 'Przysiad', weight: 120, estimated1RM: 140 }], completionRate: 88, expectedWorkouts: 32 },
};

test.describe('Replan', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');
  });

  test('replan renderuje się pełnoekranowo (bez nagłówka appki)', async ({ page }) => {
    await page.goto('./#/new-plan');
    await page.waitForLoadState('domcontentloaded');
    // Poczekaj na content wizarda (po lazy-load / Suspense).
    await expect(page.getByRole('button', { name: /Browse plans|Przeglądaj plany/ })).toBeVisible();
    // Pełny ekran = brak AppHeader (banner) aplikacji.
    await expect(page.getByRole('banner')).toHaveCount(0);
    expect(await page.locator('text=Coś poszło nie tak').count()).toBe(0);
    await page.screenshot({ path: '/tmp/replan-fullscreen.png' });
  });

  test('closeout pokazuje podsumowanie zakończonego cyklu', async ({ page }) => {
    await setE2ECycles(page, [completedCycle]);
    await page.goto('./#/new-plan?fromCycle=e2e-cycle-1');
    await page.waitForLoadState('domcontentloaded');
    // Przycisk wyboru nowego planu kończy ekran closeout.
    await expect(page.getByRole('button', { name: /Choose|Wybierz|new plan|nowy plan/i })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    // Statystyki muszą pochodzić ze snapshotu cyklu (stats), nie z przeliczenia pustych workouts.
    await expect(page.getByText('28/32')).toBeVisible();
    await expect(page.getByText('88%')).toBeVisible();
    await page.screenshot({ path: '/tmp/replan-closeout.png' });
  });
});
