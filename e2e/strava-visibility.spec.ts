import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario, openProfileSection } from './helpers';

// Strava tylko dla admina (feature flag canUseStrava w UserContext):
// zwykły user nie widzi żadnych wejść Strava (Wykresy, karta w Profilu),
// admin widzi wszystkie.
test.describe('Strava visibility (feature flag)', () => {
  test('active-user does not see Strava anywhere', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');

    await navigateAndWait(page, '/achievements');
    await expect(page.getByTestId('progress-view-summary')).toBeVisible();
    await page.getByRole('tab', { name: 'Wykresy' }).click();
    await expect(page.getByTestId('analytics-strava-link')).toHaveCount(0);

    await navigateAndWait(page, '/profile');
    await expect(page.getByText('Połączenia')).toBeVisible();
    await expect(page.getByText('Strava')).toHaveCount(0);

    await navigateAndWait(page, '/');
    await expect(page.locator('header').getByText(/^(Dzisiaj|Today)$/)).toBeVisible();
    await expect(page.getByText('Strava')).toHaveCount(0);
  });

  test('active-admin opens Strava from Charts and sees Profile connection card', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');

    await navigateAndWait(page, '/achievements');
    await page.getByRole('tab', { name: 'Wykresy' }).click();
    await page.getByTestId('analytics-strava-link').click();
    await expect(page).toHaveURL(/#\/achievements\?view=analytics&tab=strava$/);
    await expect(page.getByText('Połącz ze Stravą')).toBeVisible();

    await navigateAndWait(page, '/profile');
    // X36: Strava w zwijanej sekcji "Urządzenia i połączenia".
    await openProfileSection(page, 'devices');
    await expect(page.getByTestId('strava-connection-card')).toBeVisible();
  });
});
