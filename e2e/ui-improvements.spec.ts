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
    // D-T4: Analityka scalona z Postępami (bez osobnej pozycji).
    await expect(navLinks).toHaveCount(8);

    // Verify specific items are present
    const labels = await navLinks.allTextContents();
    const joinedLabels = labels.join(' ');
    expect(joinedLabels).toContain('Dzisiaj');
    expect(joinedLabels).toContain('Plan');
    expect(joinedLabels).toContain('Historia');
    expect(joinedLabels).toContain('Ćwiczenia');
    expect(joinedLabels).not.toContain('Analityka');
    expect(joinedLabels).toContain('Pomiary');
    // PRO-B T3: /achievements ma wspólny labelKey nav.progress ('Postępy').
    expect(joinedLabels).toContain('Postępy');
    expect(joinedLabels).toContain('Cykle');
    expect(joinedLabels).toContain('Profil');

    // Verify removed items are NOT present
    expect(joinedLabels).not.toContain('Plan dnia');
    expect(joinedLabels).not.toContain('AI Coach');
  });

  test('mobile has six root links and keeps sidebar-only links out of keyboard focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    // Od build 46 (938aadb) nie ma już mobilnego hamburgera/drawera — sidebar
    // 'Nawigacja główna' renderuje się wyłącznie na desktopie (md+).
    await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toHaveCount(0);
    const mobileNavLinks = page.getByRole('navigation', { name: 'Nawigacja mobilna' }).getByRole('link');
    await expect(mobileNavLinks).toHaveCount(6);
    await expect(mobileNavLinks.filter({ hasText: 'Profil' })).toHaveAttribute('href', '#/profile');

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const focusedHref = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      // D-T1/X51: Profil jest szóstym rootem (2026-09-04: Pomiary po Dzisiaj) i może dostać fokus. Tylko linki
      // desktopowego sidebara nie istnieją na mobile.
      expect(focusedHref).not.toBe('#/analytics');
      expect(focusedHref).not.toBe('#/exercises');
      expect(focusedHref).not.toBe('#/cycles');
    }
  });

  // X29 WP-D: decyzja produktowa odwrocona — bottom nav jest widoczny TAKZE w
  // sesji (wyjscie do Dashboardu/Planu bez szukania strzalki wstecz); header
  // pozostaje ukryty (fokus), a paski sesji dokuja NAD navem
  // (e2e/mobile-nav-reachability.spec.ts pilnuje geometrii bbox).
  test('mobile workout keeps bottom navigation visible with hidden header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/workout/day-1');
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);

    await expect(page.getByRole('navigation', { name: 'Nawigacja mobilna' })).toBeVisible();
    await expect(page.getByTestId('header-avatar')).toHaveCount(0);
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

    // One of the three states must be visible.
    // Runna p.1 B2: dzień wolny = karta "Dzień regeneracji" (nie "Dzisiaj wolne").
    const trainingCard = page.locator('text=Rozpocznij trening');
    const restCard = page.locator('text=/Dzisiaj wolne|Dzień regeneracji/');
    const completedCard = page.locator('text=Trening ukończony');

    const hasTraining = await trainingCard.count();
    const hasRest = await restCard.count();
    const hasCompleted = await completedCard.count();

    expect(hasTraining + hasRest + hasCompleted).toBeGreaterThan(0);
  });
});
