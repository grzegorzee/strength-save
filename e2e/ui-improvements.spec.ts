import { test, expect } from '@playwright/test';
import { blockFirebase } from './helpers';
import { expectPageRendered } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('sidebar has current navigation items (with history, no Plan dnia, no AI Coach)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    // Count nav links in the sidebar
    const navLinks = page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link');
    await expect(navLinks).toHaveCount(9);

    // Verify specific items are present
    const labels = await navLinks.allTextContents();
    const joinedLabels = labels.join(' ');
    expect(joinedLabels).toContain('Dashboard');
    expect(joinedLabels).toContain('Plan');
    expect(joinedLabels).toContain('Historia');
    expect(joinedLabels).toContain('Ćwiczenia');
    expect(joinedLabels).toContain('Analityka');
    expect(joinedLabels).toContain('Pomiary ciała');
    expect(joinedLabels).toContain('Osiągnięcia');
    expect(joinedLabels).toContain('Cykle');
    expect(joinedLabels).toContain('Profil');

    // Verify removed items are NOT present
    expect(joinedLabels).not.toContain('Plan dnia');
    expect(joinedLabels).not.toContain('AI Coach');
  });

  test('mobile has no sidebar drawer and keeps sidebar-only links out of keyboard focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    // Od build 46 (938aadb) nie ma już mobilnego hamburgera/drawera — sidebar
    // 'Nawigacja główna' renderuje się wyłącznie na desktopie (md+).
    await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toHaveCount(0);

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const focusedHref = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      // Linki tylko-sidebarowe (history/measurements/achievements/cycles) nie istnieją
      // na mobile; analytics jest teraz w dolnym pasku.
      expect(focusedHref).not.toBe('#/history');
      expect(focusedHref).not.toBe('#/measurements');
      expect(focusedHref).not.toBe('#/achievements');
      expect(focusedHref).not.toBe('#/cycles');
    }
  });

  test('mobile workout keeps focused mode free of bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/workout/day-1');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    await expect(page.getByRole('navigation', { name: 'Nawigacja mobilna' })).toHaveCount(0);
    await expect(page.locator('.exercise-card').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Rozpocznij trening|Start workout/i })).toBeVisible();
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
