// T11 (feedback 2026-08-20): rząd Tydzień/Miesiąc/PDF/Kopiuj w Podsumowaniu
// łamie się (flex-wrap) zamiast wystawać poza viewport 390px.
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localDaysAgo,
  navigateAndWait,
  setE2EAuthScenario,
  setE2EWorkouts,
} from './helpers';

const workout = (id: string, date: string) => ({
  id,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date,
  completed: true,
  durationSec: 3600,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie hantli (Lekki skos)',
    sets: [{ reps: 8, weight: 40, completed: true }],
  }],
});

test.describe('Podsumowanie: rząd akcji (T11)', () => {
  test.beforeEach(async ({ page }) => {
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
    });
    await setE2EWorkouts(page, [
      workout('w-1', localDaysAgo(1)),
      workout('w-2', localDaysAgo(3)),
    ]);
  });

  test('przycisk Kopiuj mieści się w viewport 390px, strona bez poziomego scrolla', async ({ page }) => {
    await navigateAndWait(page, '/analytics?tab=summary');
    await expectPageRendered(page);

    const copyButton = page.getByTestId('analytics-copy');
    await expect(copyButton).toBeVisible();
    const box = await copyButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noHorizontalScroll).toBe(true);
  });
});
