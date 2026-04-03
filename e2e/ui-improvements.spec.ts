import { test, expect } from '@playwright/test';
import { blockFirebase } from './helpers';
import { expectPageRendered } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('sidebar has 7 navigation items (with history, no Plan dnia, no AI Coach)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    // Count nav links in the sidebar
    const navLinks = page.locator('nav a');
    await expect(navLinks).toHaveCount(7);

    // Verify specific items are present
    const labels = await navLinks.allTextContents();
    const joinedLabels = labels.join(' ');
    expect(joinedLabels).toContain('Dashboard');
    expect(joinedLabels).toContain('Plan treningowy');
    expect(joinedLabels).toContain('Historia');
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
    await blockFirebase(page);
  });

  test('shows training, rest, or completed card on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    // One of the three states must be visible
    const trainingCard = page.locator('text=Rozpocznij trening');
    const restCard = page.locator('text=Dzisiaj wolne');
    const completedCard = page.locator('text=Trening ukończony');

    const hasTraining = await trainingCard.count();
    const hasRest = await restCard.count();
    const hasCompleted = await completedCard.count();

    expect(hasTraining + hasRest + hasCompleted).toBeGreaterThan(0);
  });
});
