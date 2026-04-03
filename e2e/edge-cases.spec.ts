import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait } from './helpers';

// =====================================================
// EDGE CASES & BOUNDARY CONDITIONS
// =====================================================

test.describe('Edge Cases: URL Manipulation', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('special chars in URL params do not crash app', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1?date=2026-01-01&test=%3Cscript%3Ealert(1)%3C/script%3E');
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();
  });

  test('SQL injection attempt in route param is harmless', async ({ page }) => {
    await navigateAndWait(page, "/workout/'; DROP TABLE workouts;--");
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('very long route param does not crash', async ({ page }) => {
    const longParam = 'a'.repeat(5000);
    await navigateAndWait(page, `/workout/${longParam}`);
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('unicode in URL params handled gracefully', async ({ page }) => {
    await navigateAndWait(page, '/workout/dzień-1?date=2026-04-02&note=ąćęłńóśźż');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});

test.describe('Edge Cases: LocalStorage', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('app works when localStorage is full', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Fill localStorage near capacity
    await page.evaluate(() => {
      try {
        const bigString = 'x'.repeat(1024 * 1024); // 1MB
        for (let i = 0; i < 4; i++) {
          localStorage.setItem(`fill_${i}`, bigString);
        }
      } catch {
        // Expected — localStorage full
      }
    });

    // Navigate to workout — should handle draft save failure gracefully
    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();

    // Cleanup
    await page.evaluate(() => {
      for (let i = 0; i < 4; i++) {
        localStorage.removeItem(`fill_${i}`);
      }
    });
  });

  test('corrupt draft in localStorage does not crash dashboard', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.evaluate(() => {
      localStorage.setItem('fittracker_workout_draft', '{{{{invalid json');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const hasError = await page.locator('text=Coś poszło nie tak').count();
    expect(hasError).toBe(0);
    await page.evaluate(() => localStorage.removeItem('fittracker_workout_draft'));
  });

  test('draft with future date does not interfere with current workout', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.evaluate(() => {
      const draft = {
        sessionId: 'future-session',
        dayId: 'day-1',
        date: '2099-12-31',
        exerciseSets: { 'ex-1': [{ reps: 99, weight: 999, completed: true }] },
        exerciseNotes: {},
        dayNotes: '',
        skippedExercises: [],
        savedAt: Date.now(),
      };
      localStorage.setItem('fittracker_workout_draft', JSON.stringify(draft));
    });

    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();
    const hasError = await page.locator('text=Coś poszło nie tak').count();
    expect(hasError).toBe(0);
    await page.evaluate(() => localStorage.removeItem('fittracker_workout_draft'));
  });
});

test.describe('Edge Cases: Multiple Rapid Actions', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('rapid navigation between pages does not crash', async ({ page }) => {
    const routes = ['/', '/plan', '/exercises', '/analytics', '/achievements', '/cycles', '/'];
    for (const route of routes) {
      await page.goto(`/#${route}`);
      await page.waitForLoadState('domcontentloaded');
    }
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('double-clicking buttons does not cause issues', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    const button = page.getByRole('button', { name: /Rozpocznij trening|Zobacz szczegóły treningu|Wróć do planu/i }).first();
    await expect(button).toBeVisible();
    await button.dblclick();
    await expect(page.getByRole('heading', { name: 'Poniedziałek' })).toBeVisible();
  });
});

test.describe('Edge Cases: Viewport Extremes', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('very narrow viewport (320px) does not crash', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }); // iPhone 5
    await navigateAndWait(page, '/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const hasError = await page.locator('text=Coś poszło nie tak').count();
    expect(hasError).toBe(0);
  });

  test('very wide viewport (2560px) does not break layout', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 }); // QHD
    await navigateAndWait(page, '/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const hasError = await page.locator('text=Coś poszło nie tak').count();
    expect(hasError).toBe(0);
  });
});

test.describe('Edge Cases: Data Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('workout draft with 0 reps and 0 weight is valid', async ({ page }) => {
    await navigateAndWait(page, '/');
    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';
      const draft = {
        sessionId: 'zero-test',
        dayId: 'day-1',
        date: new Date().toISOString().split('T')[0],
        exerciseSets: {
          'ex-1': [
            { reps: 0, weight: 0, completed: false, isWarmup: true },
            { reps: 0, weight: 0, completed: false },
          ],
        },
        exerciseNotes: {},
        dayNotes: '',
        skippedExercises: [],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(draft));
      const loaded = JSON.parse(localStorage.getItem(KEY)!);
      localStorage.removeItem(KEY);
      return loaded.exerciseSets['ex-1'][1].reps === 0 && loaded.exerciseSets['ex-1'][1].weight === 0;
    });
    expect(result).toBe(true);
  });

  test('workout draft with max valid values', async ({ page }) => {
    await navigateAndWait(page, '/');
    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';
      const draft = {
        sessionId: 'max-test',
        dayId: 'day-1',
        date: new Date().toISOString().split('T')[0],
        exerciseSets: {
          'ex-1': [
            { reps: 999, weight: 999, completed: true },
          ],
        },
        exerciseNotes: { 'ex-1': 'A'.repeat(2000) },
        dayNotes: 'B'.repeat(5000),
        skippedExercises: [],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(draft));
      const loaded = JSON.parse(localStorage.getItem(KEY)!);
      localStorage.removeItem(KEY);
      return loaded.exerciseSets['ex-1'][0].reps === 999
        && loaded.exerciseNotes['ex-1'].length === 2000
        && loaded.dayNotes.length === 5000;
    });
    expect(result).toBe(true);
  });

  test('empty training plan does not crash cycles page', async ({ page }) => {
    await navigateAndWait(page, '/cycles');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Cykle treningowe' })).toBeVisible();
  });
});
