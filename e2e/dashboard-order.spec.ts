import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait } from './helpers';

// PRO-E T3: hero-first — sekcje Dashboardu w ustalonej kolejności pionowej.
// Asercja na podzbiorze sekcji zawsze obecnych w mocku e2e; warunkowe
// (baner stanu, upsell, strava-km, last-pr) weryfikowane ręcznie.

test.describe('Dashboard hero-first (PRO-E)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('sekcje Dashboardu w kolejności hero-first', async ({ page }) => {
    await navigateAndWait(page, '/');
    const ids = ['dash-greeting', 'dash-hero', 'week-card', 'dash-stats', 'dash-week-section', 'dash-actions'];
    const positions: number[] = [];
    for (const id of ids) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, id).not.toBeNull();
      positions.push(box!.y);
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
