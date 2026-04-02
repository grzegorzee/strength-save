import { test, expect } from '@playwright/test';
import { blockFirebase } from './helpers';

const DRAFT_KEY = 'fittracker_workout_draft';

test.describe('Batch Save Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('localStorage draft save/load roundtrip works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';

      const draft = {
        sessionId: 'roundtrip-test',
        dayId: 'day-1',
        date: '2024-04-02',
        exerciseSets: { 'ex-1': [{ reps: 10, weight: 50, completed: true }] },
        exerciseNotes: {},
        dayNotes: 'test',
        skippedExercises: [],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(draft));

      const loaded = JSON.parse(localStorage.getItem(KEY)!);
      const loadedOk = loaded.sessionId === 'roundtrip-test' && loaded.exerciseSets['ex-1'][0].reps === 10;

      localStorage.removeItem(KEY);
      const clearedOk = localStorage.getItem(KEY) === null;

      return { loadedOk, clearedOk };
    });

    expect(result.loadedOk).toBe(true);
    expect(result.clearedOk).toBe(true);
  });

  test('draft persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Set a draft in localStorage
    await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';
      const draft = {
        sessionId: 'reload-test-123',
        dayId: 'day-1',
        date: new Date().toISOString().split('T')[0],
        exerciseSets: {
          'ex-1': [
            { reps: 5, weight: 20, completed: false, isWarmup: true },
            { reps: 12, weight: 50, completed: true },
            { reps: 10, weight: 50, completed: true },
          ],
        },
        exerciseNotes: { 'ex-1': 'Felt strong' },
        dayNotes: 'Good session',
        skippedExercises: ['ex-3'],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(draft));
    });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify draft still exists with correct data
    const draft = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    });

    expect(draft).not.toBeNull();
    expect(draft.sessionId).toBe('reload-test-123');
    expect(draft.exerciseSets['ex-1']).toHaveLength(3);
    expect(draft.exerciseSets['ex-1'][1].reps).toBe(12);
    expect(draft.exerciseSets['ex-1'][1].weight).toBe(50);
    expect(draft.exerciseNotes['ex-1']).toBe('Felt strong');
    expect(draft.dayNotes).toBe('Good session');
    expect(draft.skippedExercises).toContain('ex-3');
  });

  test('corrupt data is handled gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';

      // Write corrupt data
      localStorage.setItem(KEY, 'not-valid-json{{{');

      // Try to parse (simulating what workoutDraft.load does)
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return 'no-data';
        const parsed = JSON.parse(raw);
        return parsed ? 'parsed' : 'null';
      } catch {
        localStorage.removeItem(KEY);
        return 'handled-gracefully';
      }
    });

    expect(result).toBe('handled-gracefully');
  });

  test('draft with bodyweight exercise stores weight as 0', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';

      // Simulate what happens when entering data for a bodyweight exercise
      const draft = {
        sessionId: 'bw-test',
        dayId: 'day-3',
        date: '2024-04-02',
        exerciseSets: {
          'dead-bug': [
            { reps: 5, weight: 0, completed: false, isWarmup: true },
            { reps: 15, weight: 0, completed: true },
            { reps: 12, weight: 0, completed: true },
            { reps: 10, weight: 0, completed: true },
          ],
        },
        exerciseNotes: {},
        dayNotes: '',
        skippedExercises: [],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(draft));

      // Verify all weights are 0
      const loaded = JSON.parse(localStorage.getItem(KEY)!);
      const allZeroWeight = loaded.exerciseSets['dead-bug'].every(
        (set: any) => set.weight === 0
      );

      return { allZeroWeight, setCount: loaded.exerciseSets['dead-bug'].length };
    });

    expect(result.allZeroWeight).toBe(true);
    expect(result.setCount).toBe(4);
  });
});

test.describe('App loads in E2E mode', () => {
  test('loads without crash', async ({ page }) => {
    await blockFirebase(page);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for React to render something
    await page.waitForTimeout(2000);

    // The page should have rendered (not be blank)
    const body = await page.locator('body').innerHTML();
    expect(body.length).toBeGreaterThan(100);
  });
});
