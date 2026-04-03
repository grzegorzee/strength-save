import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, clearWorkoutDraftDb, readWorkoutDraftDb, writeWorkoutDraftDb } from './helpers';

// =====================================================
// 1. ALL PAGES LOAD WITHOUT CRASHES
// =====================================================
test.describe('Page Load Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('Dashboard (/) loads', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    // Should show greeting
    const greeting = page.locator('h1');
    await expect(greeting.first()).toBeVisible();
  });

  test('Training Plan (/plan) loads', async ({ page }) => {
    await navigateAndWait(page, '/plan');
    await expectPageRendered(page);
  });

  test('Exercise Library (/exercises) loads', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Biblioteka ćwiczeń' })).toBeVisible();
  });

  test('Workout History (/history) loads', async ({ page }) => {
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Historia treningów' })).toBeVisible();
  });

  test('Analytics (/analytics) loads', async ({ page }) => {
    await navigateAndWait(page, '/analytics');
    await expectPageRendered(page);
  });

  test('Achievements (/achievements) loads', async ({ page }) => {
    await navigateAndWait(page, '/achievements');
    await expectPageRendered(page);
  });

  test('Cycles (/cycles) loads', async ({ page }) => {
    await navigateAndWait(page, '/cycles');
    await expectPageRendered(page);
  });

  test('DayPlan (/day) loads (hidden route)', async ({ page }) => {
    await navigateAndWait(page, '/day');
    await expectPageRendered(page);
  });

  test('Unknown route shows 404 or redirects', async ({ page }) => {
    await navigateAndWait(page, '/ai');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('Settings (/settings) loads', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectPageRendered(page);
    await expect(page.getByText('Backup i przywracanie')).toBeVisible();
  });

  test('Workout Day (/workout/day-1) loads', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();
  });

  test('Plan Editor (/plan/edit) loads', async ({ page }) => {
    await navigateAndWait(page, '/plan/edit');
    await expectPageRendered(page);
  });

  test('New Plan (/new-plan) loads', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await expectPageRendered(page);
  });

  test('404 page for unknown route', async ({ page }) => {
    await navigateAndWait(page, '/nonexistent-route');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to Home/i })).toBeVisible();
  });

  test('Legacy routes redirect to analytics', async ({ page }) => {
    for (const path of ['/stats', '/summary', '/progress', '/measurements']) {
      await navigateAndWait(page, path);
      await expectPageRendered(page);
      await expect(page.getByRole('main').getByRole('heading', { name: 'Analityka' })).toBeVisible();
    }
  });
});

// =====================================================
// 2. NAVIGATION FLOW
// =====================================================
test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('can navigate between all main pages', async ({ page }) => {
    // Navigate directly via URL (sidebar may be collapsed on mobile viewport)
    const mainRoutes = ['/', '/plan', '/history', '/exercises', '/analytics', '/achievements', '/cycles'];

    for (const route of mainRoutes) {
      await navigateAndWait(page, route);
      await expectPageRendered(page);
    }
  });

  test('back button works after navigation', async ({ page }) => {
    await navigateAndWait(page, '/');
    // Navigate to achievements
    await navigateAndWait(page, '/achievements');
    await expectPageRendered(page);
    // Go back
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await expectPageRendered(page);
  });
});

// =====================================================
// 3. DASHBOARD FEATURES
// =====================================================
test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('shows today training card (training/rest/completed)', async ({ page }) => {
    await navigateAndWait(page, '/');
    const dashboardBody = page.locator('body');
    await expect(dashboardBody).toContainText(/Rozpocznij trening|Dzisiaj wolne|Trening ukończony/i);
  });

  test('shows stat cards', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expect(page.locator('text=Treningi').first()).toBeVisible();
    await expect(page.locator('text=Tonaż').first()).toBeVisible();
    await expect(page.locator('text=Waga').first()).toBeVisible();
    await expect(page.locator('text=Streak').first()).toBeVisible();
  });

  test('shows greeting with user name', async ({ page }) => {
    await navigateAndWait(page, '/');
    // E2E mock user is "E2E Tester"
    const greeting = page.locator('h1').first();
    await expect(greeting).toBeVisible();
    await expect(page.getByText('Co dalej z planem?')).toBeVisible();
  });

  test('settings allow self-service export for regular user flow', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectPageRendered(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Eksportuj kopię' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^fittracker-backup-.*\.json$/);
  });
});

// =====================================================
// 4. WORKOUT DAY PAGE
// =====================================================
test.describe('Workout Day', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('day-1 shows training day name and exercises', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();
  });

  test('day-2 loads without error', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-2');
    await expectPageRendered(page);
    await expect(page.getByText('Środa', { exact: false })).toBeVisible();
  });

  test('day-3 loads without error', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-3');
    await expectPageRendered(page);
    await expect(page.getByText('Piątek', { exact: false })).toBeVisible();
  });

  test('invalid day shows error message', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-999');
    await expectPageRendered(page);
    await expect(page.locator('text=Nie znaleziono dnia treningowego')).toBeVisible();
  });
});

// =====================================================
// 5. EXERCISE LIBRARY
// =====================================================
test.describe('Exercise Library', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('shows exercise categories', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: 'Biblioteka ćwiczeń' })).toBeVisible();
  });

  test('exercises are clickable/expandable', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    // Try clicking first exercise card
    const firstCard = page.locator('[class*="card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expectPageRendered(page);
  });
});

// =====================================================
// 6. ANALYTICS TABS
// =====================================================
test.describe('Analytics Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('all main tabs are accessible', async ({ page }) => {
    await navigateAndWait(page, '/analytics');
    await expectPageRendered(page);

    // Check for tab triggers
    const tabLabels = ['Podsum.', 'Wykresy', 'Pomiary', 'Tygodnie'];
    for (const label of tabLabels) {
      const tab = page.getByRole('tab', { name: label });
      await expect(tab).toBeVisible();
      await tab.click();
      await expectPageRendered(page);
    }
  });

  test('charts sub-tabs work', async ({ page }) => {
    await navigateAndWait(page, '/analytics');

    // Click "Wykresy" tab
    const chartsTab = page.getByRole('tab', { name: 'Wykresy' });
    await expect(chartsTab).toBeVisible();
    await chartsTab.click();

    // Try sub-tabs
    const subTabs = ['Treningi', 'Tonaż', 'Waga', 'Seria', 'Progresja'];
    for (const label of subTabs) {
      const subTab = page.getByText(label, { exact: true }).first();
      await expect(subTab).toBeVisible();
      await subTab.click();
      await expectPageRendered(page);
    }
  });
});

// =====================================================
// 7. ACHIEVEMENTS
// =====================================================
test.describe('Achievements', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('loads with sections visible', async ({ page }) => {
    await navigateAndWait(page, '/achievements');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Osiągnięcia' })).toBeVisible();
  });
});

// =====================================================
// 8. CYCLES
// =====================================================
test.describe('Cycles', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('shows page title', async ({ page }) => {
    await navigateAndWait(page, '/cycles');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Cykle treningowe' })).toBeVisible();
  });

  test('shows active plan card when plan exists', async ({ page }) => {
    await navigateAndWait(page, '/cycles');
    await expect(page.getByRole('main').getByText('Aktualny plan')).toBeVisible();
    await expectPageRendered(page);
  });
});

// =====================================================
// 9. SETTINGS
// =====================================================
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('shows user info section', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectPageRendered(page);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Ustawienia' })).toBeVisible();
  });
});

// =====================================================
// 10. BODYWEIGHT EXERCISE DETECTION
// =====================================================
test.describe('Bodyweight Exercises', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('exercise library includes bodyweight exercises', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: 'Biblioteka ćwiczeń' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Brzuch' })).toBeVisible();
  });
});

// =====================================================
// 11. RESPONSIVE / MOBILE
// =====================================================
test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('dashboard renders on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
  });

  test('analytics renders on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateAndWait(page, '/analytics');
    await expectPageRendered(page);
  });

  test('workout day renders on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();
  });
});

// =====================================================
// 12. ERROR HANDLING
// =====================================================
test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('no console errors on dashboard load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('net::ERR') && !msg.text().includes('Firebase') && !msg.text().includes('firestore')) {
        consoleErrors.push(msg.text());
      }
    });

    await navigateAndWait(page, '/');
    // Filter out expected Firebase errors (since we block them)
    const unexpectedErrors = consoleErrors.filter(e =>
      !e.includes('Firebase') &&
      !e.includes('firestore') &&
      !e.includes('auth') &&
      !e.includes('network') &&
      !e.includes('ERR_BLOCKED')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('no unhandled JS exceptions on page navigation', async ({ page }) => {
    const exceptions: string[] = [];
    page.on('pageerror', (err) => {
      exceptions.push(err.message);
    });

    // Navigate through all main pages
    const pages = ['/', '/plan', '/exercises', '/analytics', '/achievements', '/cycles'];
    for (const path of pages) {
      await navigateAndWait(page, path);
    }

    // Filter out Firebase-related exceptions
    const unexpectedExceptions = exceptions.filter(e =>
      !e.includes('Firebase') &&
      !e.includes('firestore') &&
      !e.includes('auth')
    );
    expect(unexpectedExceptions).toHaveLength(0);
  });
});

// =====================================================
// 13. LOCALSTORAGE PERSISTENCE
// =====================================================
test.describe('LocalStorage', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('sidebar collapse state persists', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await navigateAndWait(page, '/');

    // Check if collapse button exists and click it
    const collapseBtn = page.locator('nav button.hidden.md\\:flex').first();
    await expect(collapseBtn).toBeVisible();

    const initialState = await page.evaluate(() => localStorage.getItem('sidebar-collapsed'));
    await collapseBtn.click();
    const newState = await page.evaluate(() => localStorage.getItem('sidebar-collapsed'));
    expect(newState).not.toBe(initialState);
  });

  test('workout draft IndexedDB operations work', async ({ page }) => {
    await navigateAndWait(page, '/');

    await writeWorkoutDraftDb(page, {
      sessionId: 'persistence-test',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2024-04-02',
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: 'persistence-test',
      exerciseSets: { 'ex-1': [{ reps: 10, weight: 50, completed: true }] },
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

    const loaded = await readWorkoutDraftDb(page, 'test-user') as { sessionId: string } | null;
    expect(loaded?.sessionId).toBe('persistence-test');

    await clearWorkoutDraftDb(page, 'test-user');
    const cleared = await readWorkoutDraftDb(page, 'test-user');
    expect(cleared).toBeNull();
  });
});
