import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, clearWorkoutDraftDb, readWorkoutDraftDb, writeWorkoutDraftDb, setE2EWorkouts } from './helpers';

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
    await expect(page.getByRole('main').getByRole('heading', { name: 'Ćwiczenia' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: /Witaj w Iron Zone|Twój precyzyjny protokół/ })).toBeVisible();
  });

  test('404 page for unknown route', async ({ page }) => {
    await navigateAndWait(page, '/nonexistent-route');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Wróć do strony głównej|Return to Home/i })).toBeVisible();
  });

  test('martwe aliasy tras usunięte (Z60): /stats /summary /progress => 404', async ({ page }) => {
    for (const path of ['/stats', '/summary', '/progress']) {
      await navigateAndWait(page, path);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Plan tygodnia' })).toBeVisible();
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

  test('po hydracji draftu widok przewija do ostatnio dotykanego ćwiczenia (Z47)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateAndWait(page, '/workout/day-1');

    const today = new Date().toISOString().split('T')[0];
    await writeWorkoutDraftDb(page, {
      sessionId: `workout-e2e-test-user-day-1-${today}`,
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: today,
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: `workout-e2e-test-user-day-1-${today}`,
      exerciseSets: { 'ex-1-3': [{ reps: 10, weight: 40, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      lastTouchedExerciseId: 'ex-1-3',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    // Przeładowanie strony = zimny start z draftem w IndexedDB (hydracja).
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#exercise-card-ex-1-3')).toBeInViewport({ timeout: 7000 });
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
    await expect(page.getByRole('heading', { name: 'Ćwiczenia' }).first()).toBeVisible();
  });

  test('exercises are clickable/expandable', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    const firstExercise = page.getByRole('button', { name: /Wyciskanie|Pompki|Przysiad/ }).first();
    await expect(firstExercise).toBeVisible();
    await firstExercise.click();
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
    const tabLabels = ['Podsum.', 'Wykresy', 'Strava', 'Tygodnie'];
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
    await expect(page.getByRole('heading', { name: 'Ćwiczenia' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Brzuch', exact: true })).toBeVisible();
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
// 11z. MOBILE DRAWER (Z66)
// =====================================================
test.describe('Mobile drawer (Z66)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('hamburger otwiera drawer, Historia osiągalna na mobile', async ({ page }) => {
    await navigateAndWait(page, '/');
    // Bottom nav ma tylko 5 pozycji — bez drawera Historia jest niewidoczna.
    await expect(page.getByRole('link', { name: 'Historia', exact: true })).not.toBeVisible();

    await page.getByRole('button', { name: 'Otwórz menu' }).click();
    const drawer = page.getByRole('dialog');
    const historyLink = drawer.getByRole('link', { name: 'Historia', exact: true });
    await expect(historyLink).toBeVisible();
    await historyLink.click();
    await expect(page).toHaveURL(/#\/history$/);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Historia treningów' })).toBeVisible();
    // Drawer zamyka się po wyborze pozycji.
    await expect(drawer).not.toBeVisible();
  });

  test('Pomiary i Cykle osiągalne z drawera', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Otwórz menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Pomiary ciała' }).click();
    await expect(page).toHaveURL(/#\/measurements$/);

    await page.getByRole('button', { name: 'Otwórz menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Cykle', exact: true }).click();
    await expect(page).toHaveURL(/#\/cycles$/);
  });
});

// =====================================================
// 11x. WSPÓLNY EXERCISE PICKER (Z69)
// =====================================================
test.describe('ExercisePicker (Z69)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('PlanEditor: picker otwiera się z szukajką i chipami kategorii', async ({ page }) => {
    await navigateAndWait(page, '/plan/edit');
    await page.getByRole('button', { name: 'Dodaj', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wioslowanie');
    await expect(dialog.getByText('Wiosłowanie hantlami na ławce (przodem)')).toBeVisible();
    await expect(dialog.getByText('Wyciskanie sztangi na ławce płaskiej')).toBeHidden();
  });

  test('WorkoutDay: swap "tylko dziś" przez picker podmienia ćwiczenie lokalnie', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    await expect(page.locator('.exercise-card').first()).toBeVisible();

    await page.getByRole('button', { name: 'Zamień' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wyciskanie sztangi na lawce plaskiej');
    await dialog.getByText('Wyciskanie sztangi na ławce płaskiej').click();
    await dialog.getByRole('button', { name: 'Tylko dziś' }).click();

    await expect(page.getByRole('heading', { name: 'Wyciskanie sztangi na ławce płaskiej' })).toBeVisible();
  });
});

// =====================================================
// 11w. PLAN DAYS EDITOR (Z70)
// =====================================================
test.describe('PlanDaysEditor (Z70)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('builder: dodaj dzień, zmień weekday, zduplikuj, usuń', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await page.getByRole('button', { name: 'Ułóż własny' }).click();
    await expect(page.getByRole('heading', { name: 'Twój własny plan' })).toBeVisible();

    // Dodaj dzień 1 (pierwszy wolny weekday = poniedziałek).
    await page.getByRole('button', { name: /Dodaj dzień/ }).click();
    await expect(page.getByText('Dzień 1')).toBeVisible();

    // Zmień weekday na Śr.
    await page.getByRole('button', { name: 'Śr', exact: true }).click();

    // Dodaj ćwiczenie, żeby dzień miał treść do duplikacji.
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('przysiad ze sztanga (high');
    await dialog.getByText('Przysiad ze sztangą (High Bar)').click();

    // Duplikuj dzień — kopia z tym samym ćwiczeniem.
    await page.getByRole('button', { name: 'Duplikuj dzień' }).first().click();
    await expect(page.getByText('Dzień 2')).toBeVisible();
    await expect(page.getByText('Przysiad ze sztangą (High Bar)')).toHaveCount(2);

    // Reorder działa w builderze (luka nr 4): dodaj drugie ćwiczenie i przesuń je w górę.
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).first().click();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('martwy ciag rumunski');
    await dialog.getByText('Martwy Ciąg Rumuński (RDL)').click();
    await page.getByRole('button', { name: 'Przesuń w górę' }).nth(1).click();

    // Usuń zduplikowany dzień.
    await page.getByRole('button', { name: 'Usuń dzień' }).nth(1).click();
    await expect(page.getByText('Dzień 2')).toBeHidden();
    await expect(page.getByText('Przysiad ze sztangą (High Bar)')).toHaveCount(1);
  });

  test('PlanEditor: zarządzanie dniami dostępne (duplikuj/usuń/dodaj dzień, czas trwania)', async ({ page }) => {
    await navigateAndWait(page, '/plan/edit');
    await expect(page.getByRole('button', { name: 'Duplikuj dzień' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usuń dzień' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Dodaj dzień/ })).toBeVisible();
    await expect(page.getByText('Czas trwania planu')).toBeVisible();
  });
});

// =====================================================
// 11y. LINKI KRZYŻOWE (Z67)
// =====================================================
test.describe('Linki krzyżowe (Z67)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('ikona info przy ćwiczeniu otwiera instrukcje i wraca bez utraty treningu', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Szczegóły ćwiczenia' }).first().click();
    await expect(page).toHaveURL(/#\/exercise\//);
    await expect(page.getByRole('heading', { name: 'Instrukcje' })).toBeVisible();

    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/#\/workout\/day-1/);
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });

  test('Dashboard: waga prowadzi do pomiarów', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByText('Waga', { exact: true }).first().click();
    await expect(page).toHaveURL(/#\/measurements$/);
  });

  test('Dashboard: pełna historia i cykle', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Pełna historia' }).click();
    await expect(page).toHaveURL(/#\/history$/);

    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Cykle', exact: true }).click();
    await expect(page).toHaveURL(/#\/cycles$/);
  });

  test('Analytics progresja: link Wszystkie rekordy', async ({ page }) => {
    await navigateAndWait(page, '/analytics');
    await page.getByRole('tab', { name: 'Wykresy' }).click();
    await page.getByText('Progresja', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Wszystkie rekordy' }).click();
    await expect(page).toHaveURL(/#\/achievements$/);
  });
});

// =====================================================
// 11a. ADAPTIVE COACH (Z64)
// =====================================================
test.describe('Adaptive Coach (Z64)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('wysokie RPE w historii => badge "Utrzymaj ciężar" na karcie ćwiczenia', async ({ page }) => {
    await setE2EWorkouts(page, [{
      id: 'coach-history-1',
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: '2026-06-30',
      completed: true,
      exercises: [{
        exerciseId: 'ex-1-1',
        name: 'Wyciskanie hantli (Lekki skos)',
        rpe: 9.5,
        sets: [
          { reps: 8, weight: 30, completed: true },
          { reps: 8, weight: 30, completed: true },
          { reps: 8, weight: 30, completed: true },
        ],
      }],
    }]);

    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText('Utrzymaj ciężar').first()).toBeVisible({ timeout: 7000 });
  });

  test('karta Coach z readiness renderuje się na Dashboardzie', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expect(page.getByText(/Coach/).first()).toBeVisible();
    await expect(page.getByText(/Forma w normie|Świeżość|Spore obciążenie|Przeciążenie/).first()).toBeVisible();
  });
});

// =====================================================
// 11b. AUTO-RESUME AKTYWNEGO TRENINGU (Z49)
// =====================================================
test.describe('Auto-resume (Z49)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('żywy draft przekierowuje z Dashboardu do treningu', async ({ page }) => {
    await navigateAndWait(page, '/');

    const today = new Date().toISOString().split('T')[0];
    await writeWorkoutDraftDb(page, {
      sessionId: `workout-e2e-test-user-day-1-${today}`,
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: today,
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: `workout-e2e-test-user-day-1-${today}`,
      exerciseSets: { 'ex-1-1': [{ reps: 8, weight: 60, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 2,
    });

    // Zimny start: mount apki z żywym draftem = auto-resume do treningu.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/#\/workout\/day-1\?.*session=/, { timeout: 7000 });
  });

  test('draft finalSyncPending zostaje na Dashboardzie z kartą sync', async ({ page }) => {
    await navigateAndWait(page, '/');

    const today = new Date().toISOString().split('T')[0];
    await writeWorkoutDraftDb(page, {
      sessionId: `workout-e2e-test-user-day-1-${today}`,
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: today,
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: `workout-e2e-test-user-day-1-${today}`,
      exerciseSets: { 'ex-1-1': [{ reps: 8, weight: 60, completed: true }] },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: true,
      finalSyncPending: true,
      version: 3,
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Trening zakończony lokalnie')).toBeVisible({ timeout: 7000 });
    await expect(page).toHaveURL(/#\/?$/);
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
