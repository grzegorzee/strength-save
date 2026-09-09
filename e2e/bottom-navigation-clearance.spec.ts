import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, skipPreStartWarmup } from './helpers';

test('przerwa pozostaje nad całym navem po obrocie i powiększeniu tekstu', async ({ page }) => {
  await blockFirebase(page);
  await page.addInitScript(() => {
    localStorage.setItem('app-language', 'pl');
    localStorage.setItem('fittracker_first_workout_tour_v1', '1');
    localStorage.setItem('fittracker_e2e_flag_workoutTimers', 'true');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await navigateAndWait(page, '/workout/day-1');
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
  await skipPreStartWarmup(page);

  const card = page.locator('.exercise-card').first();
  await card.getByLabel(/Set 1, (kg|lbs)/).fill('20');
  await card.getByLabel(/Set 1, Powt\./).fill('5');
  await card.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
  const rest = page.getByTestId('rest-bar');
  const nav = page.getByRole('navigation', { name: /mobil/i });
  await expect(rest).toBeVisible();

  for (const { width, height, fontSize } of [
    { width: 390, height: 844, fontSize: '16px' },
    { width: 844, height: 390, fontSize: '16px' },
    { width: 320, height: 568, fontSize: '32px' },
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async size => {
      document.documentElement.style.fontSize = size;
      await document.fonts.ready;
    }, fontSize);
    await expect(nav).toBeVisible();
    await expect.poll(async () => {
      const navRect = await nav.boundingBox();
      const restRect = await rest.boundingBox();
      return navRect && restRect ? navRect.y - (restRect.y + restRect.height) : -1;
    }, { message: `${width}×${height}/${fontSize}: pasek musi zostawić 8px nad całym navem` }).toBeGreaterThanOrEqual(7.5);

    const navGeometry = await nav.getByRole('link').evaluateAll(links => links.map(link => {
      const bounds = link.getBoundingClientRect();
      const icon = link.querySelector('svg')!.getBoundingClientRect();
      const label = link.lastElementChild!.getBoundingClientRect();
      const navBounds = link.closest('nav')!.getBoundingClientRect();
      return { iconFits: icon.left >= bounds.left - 0.5 && icon.right <= bounds.right + 0.5, labelBottomClearance: navBounds.bottom - label.bottom };
    }));
    expect(navGeometry).toHaveLength(5);
    expect(navGeometry.every(item => item.iconFits && item.labelBottomClearance >= 4)).toBe(true);

    const settings = await page.getByTestId('rest-bar-settings').boundingBox();
    const expand = await page.getByTestId('rest-bar-expand').boundingBox();
    expect(settings).not.toBeNull();
    expect(expand).not.toBeNull();
    // At larger text sizes actions may form a new row; neither layout may cover the clock/settings.
    const overlapsHorizontally = settings!.x < expand!.x + expand!.width && settings!.x + settings!.width > expand!.x;
    const overlapsVertically = settings!.y < expand!.y + expand!.height && settings!.y + settings!.height > expand!.y;
    expect(overlapsHorizontally && overlapsVertically).toBe(false);
  }
});
