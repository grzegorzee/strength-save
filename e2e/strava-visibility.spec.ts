import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario, openProfileSection } from './helpers';

// Strava tylko dla admina (feature flag canUseStrava w UserContext):
// zwykły user nie widzi żadnych wejść Strava (Analytics tab, karta w Profilu),
// admin widzi wszystkie.
test.describe('Strava visibility (feature flag)', () => {
  test('active-user does not see Strava anywhere', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');

    await navigateAndWait(page, '/analytics');
    await expect(page.getByRole('tab', { name: 'Podsum.' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Strava' })).toHaveCount(0);

    await navigateAndWait(page, '/profile');
    await expect(page.getByText('Połączenia')).toBeVisible();
    await expect(page.getByText('Strava')).toHaveCount(0);

    await navigateAndWait(page, '/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Strava')).toHaveCount(0);
  });

  test('active-admin sees Strava tab and Profile connection card', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');

    await navigateAndWait(page, '/analytics');
    await expect(page.getByRole('tab', { name: 'Strava' })).toBeVisible();

    await navigateAndWait(page, '/profile');
    // X36: Strava w zwijanej sekcji "Urządzenia i połączenia".
    await openProfileSection(page, 'devices');
    await expect(page.getByTestId('strava-connection-card')).toBeVisible();
  });
});
