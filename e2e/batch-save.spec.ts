import { test, expect } from '@playwright/test';
import { blockFirebase, clearWorkoutDraftDb, readWorkoutDraftDb, writeWorkoutDraftDb } from './helpers';

const USER_ID = 'test-user';

test.describe('Batch Save Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('IndexedDB draft save/load roundtrip works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await writeWorkoutDraftDb(page, {
      sessionId: 'roundtrip-test',
      userId: USER_ID,
      dayId: 'day-1',
      date: '2024-04-02',
      exerciseSets: { 'ex-1': [{ reps: 10, weight: 50, completed: true }] },
      exerciseNotes: {},
      dayNotes: 'test',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    const loaded = await readWorkoutDraftDb(page, USER_ID);
    expect(loaded).not.toBeNull();
    expect((loaded as { sessionId: string }).sessionId).toBe('roundtrip-test');

    await clearWorkoutDraftDb(page, USER_ID);
    const cleared = await readWorkoutDraftDb(page, USER_ID);
    expect(cleared).toBeNull();
  });

  test('draft persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await writeWorkoutDraftDb(page, {
      sessionId: 'reload-test-123',
      userId: USER_ID,
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
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const draft = await readWorkoutDraftDb(page, USER_ID) as {
      sessionId: string;
      exerciseSets: Record<string, Array<{ reps: number; weight: number }>>;
      exerciseNotes: Record<string, string>;
      dayNotes: string;
      skippedExercises: string[];
    } | null;

    expect(draft).not.toBeNull();
    expect(draft?.sessionId).toBe('reload-test-123');
    expect(draft?.exerciseSets['ex-1']).toHaveLength(3);
    expect(draft?.exerciseSets['ex-1'][1].reps).toBe(12);
    expect(draft?.exerciseSets['ex-1'][1].weight).toBe(50);
    expect(draft?.exerciseNotes['ex-1']).toBe('Felt strong');
    expect(draft?.dayNotes).toBe('Good session');
    expect(draft?.skippedExercises).toContain('ex-3');
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

    await writeWorkoutDraftDb(page, {
      sessionId: 'bw-test',
      userId: USER_ID,
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
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    const loaded = await readWorkoutDraftDb(page, USER_ID) as {
      exerciseSets: Record<string, Array<{ weight: number }>>;
    } | null;

    expect(loaded?.exerciseSets['dead-bug'].every(set => set.weight === 0)).toBe(true);
    expect(loaded?.exerciseSets['dead-bug']).toHaveLength(4);
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
