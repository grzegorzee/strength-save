import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered } from './helpers';

// Z176: 7 autoodtwarzanych <video> naraz zabijało dekodery iOS (nieruchome klatki),
// a przyciemnienie backdrop-filter NA wideo to znany freeze WebKit. Miniatury mają
// stać (poster-like), animacja gra dopiero w dialogu — z twardym startem i
// fallbackiem controls (reguła 6: user zawsze ma przycisk play).

test.describe('Wideo ćwiczeń (Z176)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    // Wszystkie animacje CDN → lokalne fixtures, zero sieci.
    // Z195: postery jpg dostają obrazek, mp4 dostają klip (1 s testsrc).
    await page.route('**/media.gjasionowicz.pl/**', (route) => (
      route.request().url().endsWith('.jpg')
        ? route.fulfill({ path: 'e2e/fixtures/sample-poster.jpg', contentType: 'image/jpeg' })
        : route.fulfill({ path: 'e2e/fixtures/sample-video.mp4', contentType: 'video/mp4' })
    ));
  });

  test('miniatury na treningu to postery JPEG — zero dekoderów wideo na liście (Z195)', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const thumbs = page.locator('.exercise-card-header img[src$=".jpg"]');
    await expect(thumbs.first()).toBeVisible();
    expect(await thumbs.count()).toBeGreaterThanOrEqual(1);

    // Twardy niezmiennik Z195: na liście treningu nie ma ŻADNEGO <video>.
    await expect(page.locator('.exercise-card-header video')).toHaveCount(0);
  });

  test('dialog animacji: po otwarciu wideo gra ALBO pokazuje controls (fallback)', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstThumb = page.locator('.exercise-card-header button:has(img)').first();
    await firstThumb.click();

    const dialogVideo = page.getByRole('dialog').locator('video');
    await expect(dialogVideo).toBeVisible();
    await page.waitForTimeout(1500);

    const state = await dialogVideo.evaluate((v: HTMLVideoElement) => ({
      currentTime: v.currentTime,
      controls: v.controls,
    }));
    // Twardy start LUB widoczny przycisk play — oba są sukcesem (reguła 6).
    expect(state.currentTime > 0 || state.controls).toBe(true);
  });

  test('biblioteka: podgląd startuje z tapnięcia w miniaturę, bez hovera', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    await expectPageRendered(page);

    // Przed tapnięciem: miniatury bez grającego wideo (ikona play).
    const rows = page.locator('[data-testid="exercise-preview-thumb"]');
    await expect(rows.first()).toBeVisible();

    await rows.first().click();
    const preview = rows.first().locator('video');
    await expect(preview).toBeVisible({ timeout: 3000 });

    // Tap w drugą miniaturę wyłącza pierwszą (max 1 aktywny podgląd).
    await rows.nth(1).click();
    await expect(rows.nth(1).locator('video')).toBeVisible({ timeout: 3000 });
    await expect(rows.first().locator('video')).toHaveCount(0);
  });
});
