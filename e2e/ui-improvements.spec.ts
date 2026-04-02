import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
    await page.route('**/identitytoolkit.googleapis.com/**', (route) => route.abort());
    await page.route('**/securetoken.googleapis.com/**', (route) => route.abort());
  });

  test('sidebar has 6 navigation items (no Plan dnia, no AI Coach)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Count nav links in the sidebar
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBe(6);

    // Verify specific items are present
    const labels = await navLinks.allTextContents();
    const joinedLabels = labels.join(' ');
    expect(joinedLabels).toContain('Dashboard');
    expect(joinedLabels).toContain('Plan treningowy');
    expect(joinedLabels).toContain('Analityka');
    expect(joinedLabels).toContain('Osiągnięcia');
    expect(joinedLabels).toContain('Cykle');

    // Verify removed items are NOT present
    expect(joinedLabels).not.toContain('Plan dnia');
    expect(joinedLabels).not.toContain('AI Coach');
  });
});

test.describe('Dashboard start workout card', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
    await page.route('**/identitytoolkit.googleapis.com/**', (route) => route.abort());
    await page.route('**/securetoken.googleapis.com/**', (route) => route.abort());
  });

  test('shows training, rest, or completed card on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // One of the three states must be visible
    const trainingCard = page.locator('text=Rozpocznij trening');
    const restCard = page.locator('text=Dzisiaj wolne');
    const completedCard = page.locator('text=Trening ukończony');

    const hasTraining = await trainingCard.count() > 0;
    const hasRest = await restCard.count() > 0;
    const hasCompleted = await completedCard.count() > 0;

    expect(hasTraining || hasRest || hasCompleted).toBe(true);
  });
});
