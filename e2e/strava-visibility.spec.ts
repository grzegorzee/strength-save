import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

// Strava tylko dla admina (feature flag canUseStrava w UserContext):
// zwykły user nie widzi żadnych wejść Strava (Analytics tab, Settings karta),
// admin widzi wszystkie.
test.describe('Strava visibility (feature flag)', () => {
  test('active-user does not see Strava anywhere', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');

    await navigateAndWait(page, '/analytics');
    await expect(page.getByRole('tab', { name: 'Podsum.' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Strava' })).toHaveCount(0);

    await navigateAndWait(page, '/settings');
    await expect(page.getByRole('heading', { name: 'Ustawienia' }).first()).toBeVisible();
    await expect(page.getByText('Strava')).toHaveCount(0);

    await navigateAndWait(page, '/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Strava')).toHaveCount(0);
  });

  test('active-admin sees Strava tab and settings card', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');

    await navigateAndWait(page, '/analytics');
    await expect(page.getByRole('tab', { name: 'Strava' })).toBeVisible();

    await navigateAndWait(page, '/settings');
    await expect(page.getByText('Strava').first()).toBeVisible();
  });
});
