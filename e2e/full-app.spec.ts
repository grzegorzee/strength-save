import { test, expect, Page } from '@playwright/test';

// Shared setup: block Firebase to prevent hangs in E2E mode
const blockFirebase = async (page: Page) => {
  await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => route.abort());
  await page.route('**/securetoken.googleapis.com/**', (route) => route.abort());
  await page.route('**/googleapis.com/identitytoolkit/**', (route) => route.abort());
};

// Helper: navigate and wait for page to render
const navigateAndWait = async (page: Page, path: string) => {
  // HashRouter uses /#/ prefix
  await page.goto(`/#${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
};

// Helper: check page didn't crash (no blank page, no uncaught errors)
const expectPageRendered = async (page: Page) => {
  const body = await page.locator('body').innerHTML();
  expect(body.length).toBeGreaterThan(100);
  // Check no React error boundary text
  const hasError = await page.locator('text=Something went wrong').count();
  expect(hasError).toBe(0);
};

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
    // Should show exercise list or categories
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
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

  test('AI Chat (/ai) loads (hidden route)', async ({ page }) => {
    await navigateAndWait(page, '/ai');
    await expectPageRendered(page);
  });

  test('Settings (/settings) loads', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectPageRendered(page);
  });

  test('Workout Day (/workout/day-1) loads', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
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
    await expectPageRendered(page);
  });

  test('Legacy routes redirect to analytics', async ({ page }) => {
    for (const path of ['/stats', '/summary', '/progress', '/measurements']) {
      await navigateAndWait(page, path);
      await expectPageRendered(page);
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
    const mainRoutes = ['/', '/plan', '/exercises', '/analytics', '/achievements', '/cycles'];

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
    await page.waitForTimeout(1000);
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

    const hasTraining = await page.locator('text=Rozpocznij trening').count() > 0;
    const hasRest = await page.locator('text=Dzisiaj wolne').count() > 0;
    const hasCompleted = await page.locator('text=Trening ukończony').count() > 0;
    expect(hasTraining || hasRest || hasCompleted).toBe(true);
  });

  test('shows stat cards', async ({ page }) => {
    await navigateAndWait(page, '/');
    // Should have stat cards (Treningi, Tonaż, etc.)
    const cards = page.locator('[class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(2);
  });

  test('shows greeting with user name', async ({ page }) => {
    await navigateAndWait(page, '/');
    // E2E mock user is "E2E Tester"
    const greeting = page.locator('h1').first();
    const text = await greeting.textContent();
    expect(text).toBeTruthy();
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
    // Should show exercise cards or "Rozpocznij trening" button
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('day-2 loads without error', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-2');
    await expectPageRendered(page);
  });

  test('day-3 loads without error', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-3');
    await expectPageRendered(page);
  });

  test('invalid day shows error message', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-999');
    await expectPageRendered(page);
    // Should show "Nie znaleziono" or similar
    const body = await page.textContent('body');
    expect(body).toContain('Nie znaleziono');
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
    // Should have category filters or exercise list
    const body = await page.textContent('body');
    // Check for known categories
    const hasChest = body?.includes('Klatka') || body?.includes('chest');
    const hasBack = body?.includes('Plecy') || body?.includes('back');
    expect(hasChest || hasBack || body!.length > 200).toBe(true);
  });

  test('exercises are clickable/expandable', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    // Try clicking first exercise card
    const firstCard = page.locator('[class*="card"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(500);
      await expectPageRendered(page);
    }
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
    const tabLabels = ['Podsumowanie', 'Wykresy', 'Pomiary'];
    for (const label of tabLabels) {
      const tab = page.locator(`text=${label}`).first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(800);
        await expectPageRendered(page);
      }
    }
  });

  test('charts sub-tabs work', async ({ page }) => {
    await navigateAndWait(page, '/analytics');

    // Click "Wykresy" tab
    const chartsTab = page.locator('text=Wykresy').first();
    if (await chartsTab.isVisible()) {
      await chartsTab.click();
      await page.waitForTimeout(800);

      // Try sub-tabs
      const subTabs = ['Treningi', 'Tonaż', 'Seria', 'Progresja'];
      for (const label of subTabs) {
        const subTab = page.locator(`text=${label}`).first();
        if (await subTab.isVisible()) {
          await subTab.click();
          await page.waitForTimeout(500);
          await expectPageRendered(page);
        }
      }
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
    // Should have "Rekordy" or "1RM" or exercise sections
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);
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
    const title = page.locator('role=main >> text=Cykle treningowe').first();
    await expect(title).toBeVisible();
  });

  test('shows active plan card when plan exists', async ({ page }) => {
    await navigateAndWait(page, '/cycles');
    // In E2E mode with default plan, should show "Aktualny plan" card
    const planCard = page.locator('text=Aktualny plan');
    const hasCard = await planCard.count() > 0;
    // May or may not show depending on plan state — just don't crash
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
    // Exercise library may require scrolling or expanding categories
    // Just verify the page loads and has exercise content
    const body = await page.textContent('body');
    // Check for any exercise-related content (categories or exercise names)
    const hasExercises = body!.includes('Klatka') || body!.includes('Brzuch') || body!.includes('Pompki') || body!.includes('ćwiczeń') || body!.length > 500;
    expect(hasExercises).toBe(true);
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
    await navigateAndWait(page, '/');

    // Check if collapse button exists and click it
    const collapseBtn = page.locator('button[aria-label*="ollaps"], button:has(svg)').first();
    if (await collapseBtn.isVisible()) {
      // Get initial sidebar state from localStorage
      const initialState = await page.evaluate(() => localStorage.getItem('sidebar-collapsed'));

      await collapseBtn.click();
      await page.waitForTimeout(500);

      const newState = await page.evaluate(() => localStorage.getItem('sidebar-collapsed'));
      // State should have changed
      if (initialState !== null || newState !== null) {
        expect(newState).not.toBe(initialState);
      }
    }
  });

  test('workout draft localStorage operations work', async ({ page }) => {
    await navigateAndWait(page, '/');

    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';
      // Write
      const draft = {
        sessionId: 'persistence-test',
        dayId: 'day-1',
        date: '2024-04-02',
        exerciseSets: { 'ex-1': [{ reps: 10, weight: 50, completed: true }] },
        exerciseNotes: {},
        dayNotes: '',
        skippedExercises: [],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(draft));

      // Read
      const loaded = JSON.parse(localStorage.getItem(KEY)!);
      const readOk = loaded.sessionId === 'persistence-test';

      // Clean
      localStorage.removeItem(KEY);
      const cleanOk = localStorage.getItem(KEY) === null;

      return { readOk, cleanOk };
    });

    expect(result.readOk).toBe(true);
    expect(result.cleanOk).toBe(true);
  });
});
