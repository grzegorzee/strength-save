import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, clearWorkoutDraftDb, readWorkoutDraftDb, writeWorkoutDraftDb, setE2EWorkouts, setE2ECustomExercises, setE2EAuthScenario , localToday, localDaysAgo, setE2EPlanMeta } from './helpers';

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
    // Z118: sekcja Zdrowie tylko natywnie (web = no-op bridge, ukryta, zero crashy).
    await expect(page.getByTestId('health-settings')).toHaveCount(0);
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

    test('narzedzia naprawcze widoczne tylko dla admina (Z90.4)', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/settings');
    await expectPageRendered(page);
    await expect(page.getByText('Backup i przywracanie')).toBeVisible();
    await expect(page.getByText('Narzędzia naprawcze')).toHaveCount(0);

    await setE2EAuthScenario(page, 'active-admin');
    // Zmiana samego hasha nie przeładowuje dokumentu — reload wykonuje initScript admina.
    await page.reload();
    await expect(page.getByText('Narzędzia naprawcze')).toBeVisible();
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

    const today = localToday();
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

// =====================================================
// 11x. WSPÓLNY EXERCISE PICKER (Z69)
// =====================================================
test.describe('ExercisePicker (Z69)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('PlanEditor: picker otwiera się z szukajką i chipami kategorii', async ({ page }) => {
    await navigateAndWait(page, '/plan/edit');
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wioslowanie');
    await expect(dialog.getByText('Wiosłowanie hantlami na ławce (przodem)')).toBeVisible();
    await expect(dialog.getByText('Wyciskanie sztangi na ławce płaskiej')).toBeHidden();
  });

  test('WorkoutDay: swap "tylko dziś" przez picker podmienia ćwiczenie lokalnie', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    await expect(page.locator('.exercise-card').first()).toBeVisible();

    // X17A Z129.2: „Zamień ćwiczenie" przeniesione z przycisków pod kartą do menu ⋯.
    await page.locator('.exercise-card').first().getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Zamień ćwiczenie' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wyciskanie sztangi na lawce plaskiej');
    await dialog.getByText('Wyciskanie sztangi na ławce płaskiej').click();
    await dialog.getByRole('button', { name: 'Tylko dziś' }).click();

    await expect(page.getByRole('heading', { name: 'Wyciskanie sztangi na ławce płaskiej' })).toBeVisible();
  });
});

// =====================================================
// 11t. ONBOARDING Z PODGLĄDEM (Z73)
// =====================================================
test.describe('Onboarding z podglądem (Z73)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'new-user');
  });

  test('wybór planu w onboardingu pokazuje podgląd PRZED zapisem, swap działa', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();

    // Krok 5: zatwierdzenie prowadzi do PODGLĄDU planu, nie od razu do zapisu.
    await page.getByRole('button', { name: 'Podgląd planu' }).click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();

    // Swap w podglądzie otwiera picker.
    await page.getByRole('button', { name: 'Zamień', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

// =====================================================
// 11t2. BUILDER STARTUJE Z SZABLONU (Z73b)
// =====================================================
test.describe('Builder z szablonu (Z73)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('Zacznij od szablonu kopiuje dni szablonu do buildera', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await page.getByRole('button', { name: 'Ułóż własny' }).click();
    await page.getByRole('button', { name: 'Zacznij od szablonu' }).click();
    await page.getByText('Żelazny Fundament').click();

    // Dni szablonu 2-dniowego wylądowały w edytorze buildera.
    await expect(page.getByText('Dzień 1')).toBeVisible();
    await expect(page.getByText('Dzień 2')).toBeVisible();
    await expect(page.getByText('Przysiad goblet').first()).toBeVisible();
  });
});

// =====================================================
// 11u. WYBÓR 6 DNI (Z72)
// =====================================================
test.describe('Wybór 6 dni (Z72)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('wizard z 6 dniami rekomenduje plan 6-dniowy bez ostrzeżenia', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await page.getByRole('button', { name: 'Zmień ustawienia' }).click();
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: '6', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();

    await expect(page.getByText('Push Pull Legs ×2').first()).toBeVisible();
    await expect(page.getByText('Legs B', { exact: false })).toBeVisible();
    await expect(page.getByText(/Ten plan ma \d+ dni treningowych/)).toBeHidden();
  });

  test('poziom elite nie istnieje w wizardzie', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await page.getByRole('button', { name: 'Zmień ustawienia' }).click();
    await expect(page.getByText('Elita')).toBeHidden();
    await expect(page.getByText('Zaawansowany', { exact: false }).first()).toBeVisible();
  });
});

// =====================================================
// 11v. WŁASNE ĆWICZENIA (Z71)
// =====================================================
test.describe('Własne ćwiczenia (Z71)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('formularz w pickerze tworzy własne ćwiczenie i dodaje je do planu (builder)', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    await page.getByRole('button', { name: 'Ułóż własny' }).click();
    await page.getByRole('button', { name: 'Zacznij od zera' }).click();
    await page.getByRole('button', { name: /Dodaj dzień/ }).click();
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Dodaj własne ćwiczenie' }).click();
    await dialog.getByPlaceholder(/Nazwa ćwiczenia/).fill('Moje wiosłowanie');
    // exact + .last(): "Plecy" to też chip filtra kategorii nad formularzem, a bez exact
    // substring-match łapie itemy listy (kategoria w opisie pozycji).
    await dialog.getByRole('button', { name: 'Plecy', exact: true }).last().click();
    await dialog.getByRole('button', { name: 'Zapisz i wybierz' }).click();

    // Własne ćwiczenie wylądowało w dniu planu (.first(): portal dialogu może jeszcze wisieć w DOM).
    await expect(page.getByText('Moje wiosłowanie').first()).toBeVisible();
  });

  test('wstrzyknięte własne ćwiczenia widoczne w sekcji Twoje ćwiczenia (PlanEditor)', async ({ page }) => {
    await setE2ECustomExercises(page, [
      { id: 'custom-e2e-1', name: 'Moja maszyna do barków', category: 'shoulders', type: 'isolation', isBodyweight: false, instructions: [] },
    ]);
    await navigateAndWait(page, '/plan/edit');
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Twoje ćwiczenia')).toBeVisible();
    await expect(dialog.getByText('Moja maszyna do barków')).toBeVisible();
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
    await page.getByRole('button', { name: 'Zacznij od zera' }).click();

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

  test('instrukcje z menu ⋯ prowadzą do szczegółów i wracają bez utraty treningu', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText('Poniedziałek', { exact: false })).toBeVisible();

    // X17A Z129.2: ikona Info zniknęła z nagłówka karty — instrukcje otwiera menu ⋯,
    // a dialog daje przejście do pełnych szczegółów ćwiczenia.
    await page.locator('.exercise-card').first().getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Instrukcje' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Szczegóły ćwiczenia' }).click();
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
// 11s. NOTATKI WRACAJĄ DO USERA (Z74)
// =====================================================
test.describe('Notatki (Z74)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('ostatnia notatka z poprzedniej sesji widoczna na karcie ćwiczenia', async ({ page }) => {
    await setE2EWorkouts(page, [{
      id: 'notes-history-1',
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: '2026-06-30',
      completed: true,
      exercises: [{
        exerciseId: 'ex-1-1',
        name: 'Wyciskanie hantli (Lekki skos)',
        notes: 'pas za luźny',
        sets: [{ reps: 8, weight: 30, completed: true }],
      }],
    }]);

    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText(/Ostatnio: „pas za luźny”/).first()).toBeVisible({ timeout: 7000 });
  });

  test('rozwinięcie wpisu historii pokazuje serie, metryki, notatki i czas trwania (Z74+Z80)', async ({ page }) => {
    await setE2EWorkouts(page, [{
      id: 'notes-history-2',
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: '2026-06-30',
      completed: true,
      notes: 'ciężki dzień, mało snu',
      durationSec: 4320,
      exercises: [{
        exerciseId: 'ex-1-1',
        name: 'Wyciskanie hantli (Lekki skos)',
        notes: 'pas za luźny',
        rpe: 8.5,
        pain: 2,
        sets: [{ reps: 8, weight: 30, completed: true }],
      }],
    }]);

    await navigateAndWait(page, '/history');
    // Wiersz: czas trwania widoczny od razu (Z80).
    await expect(page.getByText('1h 12m')).toBeVisible();

    await page.getByRole('button', { name: 'Szczegóły' }).first().click();
    await expect(page.getByText('ciężki dzień, mało snu')).toBeVisible();
    await expect(page.getByText('pas za luźny')).toBeVisible();
    await expect(page.getByText(/RPE:/)).toBeVisible();
    await expect(page.getByText(/8×30/)).toBeVisible();
  });
});

// =====================================================
// 11a2. PRZYPIĘTE NOTATKI PER ĆWICZENIE (Z103)
// =====================================================
test.describe('Przypięte notatki (Z103)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('notatka przypięta w treningu jest widoczna w kolejnej sesji i w szczegółach ćwiczenia', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1?autostart=true');
    await clearWorkoutDraftDb(page, 'e2e-test-user');

    // X17A Z129.2: pusta przypięta notatka nie zaśmieca już karty — zakłada się ją
    // z menu ⋯, a sekcja pojawia się w karcie dopiero gdy notatka ma treść.
    await expect(page.getByTestId('pinned-note-section')).toHaveCount(0);
    await page.locator('.exercise-card').first().getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Przypnij notatkę' }).click();

    const firstSection = page.getByTestId('pinned-note-section').first();
    await page.getByTestId('pinned-note-input').fill('pas na 3 dziurkę');
    await page.getByTestId('pinned-note-machine-input').fill('siedzisko 4');
    await page.getByTestId('pinned-note-save').click();
    await expect(firstSection.getByTestId('pinned-note-text')).toHaveText('pas na 3 dziurkę');

    // "Kolejny trening" z tym ćwiczeniem: czysty draft + zimny start strony treningu.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('pinned-note-text').first()).toHaveText('pas na 3 dziurkę');
    await expect(page.getByTestId('pinned-note-machine').first()).toContainText('siedzisko 4');

    // Trwała także w szczegółach ćwiczenia (biblioteka).
    await navigateAndWait(page, '/exercise/wyciskanie-hantli-lekki-skos');
    await expect(page.getByTestId('pinned-note-text')).toHaveText('pas na 3 dziurkę');
  });
});

// =====================================================
// 11a3. SZYBKI TRENING BEZ PLANU (Z104)
// =====================================================
test.describe('Szybki trening (Z104)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('start z Dashboardu, dodanie 2 ćwiczeń, serie i zakończenie lokalne', async ({ page }) => {
    await navigateAndWait(page, '/');
    await clearWorkoutDraftDb(page, 'e2e-test-user');

    await page.getByTestId('quick-workout-start').click();
    await expect(page).toHaveURL(/adhoc-/);
    await expect(page.getByRole('heading', { name: /Szybki trening/i }).first()).toBeVisible();

    // Dodaj 2 ćwiczenia w locie przez wspólny picker (Z69).
    await page.getByTestId('adhoc-add-exercise').click();
    const dialog1 = page.getByRole('dialog');
    await dialog1.getByPlaceholder(/Szukaj|Find/).fill('wyciskanie sztangi na lawce plaskiej');
    await dialog1.getByText('Wyciskanie sztangi na ławce płaskiej').click();
    await expect(page.getByRole('heading', { name: 'Wyciskanie sztangi na ławce płaskiej' })).toBeVisible();

    await page.getByTestId('adhoc-add-exercise').click();
    const dialog2 = page.getByRole('dialog');
    await dialog2.getByPlaceholder(/Szukaj|Find/).fill('wioslowanie hantlami');
    await dialog2.getByText('Wiosłowanie hantlami na ławce (przodem)').click();
    await expect(page.getByRole('heading', { name: 'Wiosłowanie hantlami na ławce (przodem)' })).toBeVisible();

    // Odhacz pierwszą serię ROBOCZĄ (nie warmup) pierwszego ćwiczenia.
    await page.getByRole('spinbutton', { name: 'Wyciskanie sztangi na ławce płaskiej, Set 1, kg' }).fill('60');
    await page.getByRole('spinbutton', { name: 'Wyciskanie sztangi na ławce płaskiej, Set 1, Powt.' }).fill('8');
    // Kolejność checkmarków w karcie: [0]=rozgrzewka W, [1]=Set 1.
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).nth(1).click();

    // Przycisk "Zakończ trening" dostępny (finalny sync w mock e2e nie domknie się —
    // Firestore zablokowany bez timeoutu — ścieżkę finalSyncPending pokrywa test Z49).
    await expect(page.getByRole('button', { name: 'Zakończ trening' })).toBeVisible();

    // Draft w IndexedDB: 2 ćwiczenia, snapshot nazw i dnia, odhaczona seria robocza
    // (zapis draftu jest asynchroniczny — poll).
    type DraftShape = {
      dayId?: string; dayName?: string;
      exerciseSets?: Record<string, { completed: boolean; isWarmup?: boolean }[]>;
      exerciseNames?: Record<string, string>;
    } | null;
    await expect.poll(async () => {
      const draft = await readWorkoutDraftDb(page, 'e2e-test-user') as DraftShape;
      return Object.values(draft?.exerciseSets ?? {}).flat().filter((s) => s.completed && !s.isWarmup).length;
    }, { timeout: 10000 }).toBeGreaterThanOrEqual(1);

    const draft = await readWorkoutDraftDb(page, 'e2e-test-user') as DraftShape;
    expect(draft).not.toBeNull();
    expect(draft!.dayId).toMatch(/^adhoc-/);
    expect(draft!.dayName).toBe('Szybki trening');
    expect(Object.keys(draft!.exerciseSets ?? {})).toHaveLength(2);
    expect(Object.values(draft!.exerciseNames ?? {})).toContain('Wyciskanie sztangi na ławce płaskiej');
    expect(Object.values(draft!.exerciseNames ?? {})).toContain('Wiosłowanie hantlami na ławce (przodem)');
  });

  test('trening ad-hoc widoczny w historii z nazwą "Szybki trening" (snapshot+resolver)', async ({ page }) => {
    await setE2EWorkouts(page, [{
      id: 'adhoc-history-1',
      userId: 'e2e-test-user',
      dayId: 'adhoc-2026-07-10-1752130000000',
      dayName: 'Szybki trening',
      dayFocus: '',
      date: '2026-07-10',
      completed: true,
      durationSec: 1800,
      exercises: [{
        exerciseId: 'adhoc-ex-wyciskanie-sztangi-na-lawce-plaskiej',
        name: 'Wyciskanie sztangi na ławce płaskiej',
        sets: [{ reps: 8, weight: 60, completed: true }],
      }],
    }]);

    await navigateAndWait(page, '/history');
    await expect(page.getByText('Szybki trening').first()).toBeVisible();
    await page.getByRole('button', { name: 'Szczegóły' }).first().click();
    await expect(page.getByText('Wyciskanie sztangi na ławce płaskiej')).toBeVisible();
  });

  test('szkic ad-hoc przeżywa zimny start i wraca do treningu (auto-resume)', async ({ page }) => {
    await navigateAndWait(page, '/');
    const today = localToday();
    const adhocDayId = `adhoc-${today}-1752130000001`;
    await writeWorkoutDraftDb(page, {
      sessionId: `local-workout-e2e-test-user-${adhocDayId}-${today}`,
      userId: 'e2e-test-user',
      dayId: adhocDayId,
      date: today,
      cycleId: null,
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      exerciseSets: { 'adhoc-ex-przysiad': [{ reps: 5, weight: 100, completed: true }] },
      exerciseNames: { 'adhoc-ex-przysiad': 'Przysiad ze sztangą (High Bar)' },
      exerciseNotes: {},
      dayNotes: '',
      dayName: 'Szybki trening',
      dayFocus: '',
      skippedExercises: [],
      lastTouchedExerciseId: 'adhoc-ex-przysiad',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    // Zimny start Dashboardu = auto-resume (Z49) do treningu ad-hoc.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(new RegExp(adhocDayId), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Szybki trening/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Przysiad ze sztangą (High Bar)' })).toBeVisible();
  });
});

// =====================================================
// 11a4. TYPY SERII: CZAS / DYSTANS / ASYSTA (Z105)
// =====================================================
test.describe('Typy serii (Z105)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('plank (czas), farmer walk (kg+dystans+czas) i asysta renderują właściwe pola; zapis do draftu', async ({ page }) => {
    await navigateAndWait(page, '/');
    await clearWorkoutDraftDb(page, 'e2e-test-user');
    await page.getByTestId('quick-workout-start').click();
    await expect(page).toHaveURL(/adhoc-/);

    // Plank: typ duration — kolumna Czas, bez kolumny kg/Powt.
    await page.getByTestId('adhoc-add-exercise').click();
    let dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('plank');
    await dialog.getByText('Plank', { exact: true }).click();
    const plankCard = page.locator('.exercise-card').first();
    await expect(plankCard.getByText('Czas', { exact: true })).toBeVisible();
    const plankTime = plankCard.getByRole('textbox', { name: /Plank, Set 1, Czas/ });
    await plankTime.fill('1:30');
    await plankTime.blur();

    // Spacer farmera: kg + dystans + czas.
    await page.getByTestId('adhoc-add-exercise').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('spacer farmera');
    await dialog.getByText("Spacer farmera (Farmer's Walk)").click();
    const farmerCard = page.locator('.exercise-card').nth(1);
    await expect(farmerCard.getByText('Dystans', { exact: true })).toBeVisible();
    await farmerCard.getByRole('spinbutton', { name: /Set 1, kg/ }).fill('24');
    await farmerCard.getByRole('spinbutton', { name: /Set 1, Dystans/ }).fill('40');

    // Podciąganie wspomagane: asysta + powtórzenia.
    await page.getByTestId('adhoc-add-exercise').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wspomagane');
    await dialog.getByText('Podciąganie wspomagane na maszynie').click();
    const assistCard = page.locator('.exercise-card').nth(2);
    await expect(assistCard.getByText('Asysta', { exact: true })).toBeVisible();
    await assistCard.getByRole('spinbutton', { name: /Set 1, Asysta/ }).fill('25');
    await assistCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).fill('8');

    // Draft w IndexedDB ma nowe pola (poll — zapis async).
    type DraftShape = { exerciseSets?: Record<string, { durationSec?: number; distanceM?: number; assistWeight?: number }[]> } | null;
    await expect.poll(async () => {
      const draft = await readWorkoutDraftDb(page, 'e2e-test-user') as DraftShape;
      const all = Object.values(draft?.exerciseSets ?? {}).flat();
      return {
        duration: all.some((s) => s.durationSec === 90),
        distance: all.some((s) => s.distanceM === 40),
        assist: all.some((s) => s.assistWeight === 25),
      };
    }, { timeout: 10000 }).toEqual({ duration: true, distance: true, assist: true });
  });

  test('historia renderuje etykiety czasu/dystansu/asysty zamiast 0×0', async ({ page }) => {
    await setE2EWorkouts(page, [{
      id: 'tracked-history-1',
      userId: 'e2e-test-user',
      dayId: 'adhoc-2026-07-11-1752130000002',
      dayName: 'Szybki trening',
      dayFocus: '',
      date: '2026-07-11',
      completed: true,
      exercises: [
        {
          exerciseId: 'adhoc-ex-plank',
          name: 'Plank',
          sets: [{ reps: 0, weight: 0, completed: true, durationSec: 90 }],
        },
        {
          exerciseId: 'adhoc-ex-spacer-farmera',
          name: "Spacer farmera (Farmer's Walk)",
          sets: [{ reps: 0, weight: 24, completed: true, distanceM: 40, durationSec: 60 }],
        },
        {
          exerciseId: 'adhoc-ex-podciaganie-wspomagane',
          name: 'Podciąganie wspomagane na maszynie',
          sets: [{ reps: 8, weight: 0, completed: true, assistWeight: 25 }],
        },
      ],
    }]);

    await navigateAndWait(page, '/history');
    await page.getByRole('button', { name: 'Szczegóły' }).first().click();
    await expect(page.getByText('1:30', { exact: true })).toBeVisible();
    await expect(page.getByText('24 kg · 40 m · 1:00')).toBeVisible();
    await expect(page.getByText('8×-25 kg')).toBeVisible();
  });
});

// =====================================================
// 11a5. KALKULATOR TALERZY (Z107)
// =====================================================
test.describe('Kalkulator talerzy (Z107)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('otwiera się z karty ćwiczenia i pokazuje poprawny rozkład na stronę', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByRole('spinbutton', { name: /Set 1, kg/ }).first().fill('100');

    await firstCard.getByTestId('plate-calculator-open').click();
    // 100 kg na gryfie 20: 40 kg na stronę = 25 + 15 (default inventory).
    await expect(page.getByTestId('plates-summary')).toContainText('1×25 + 1×15');
    await expect(page.getByTestId('plates-visual')).toBeVisible();
  });

  test('generator rozgrzewki %1RM wstawia serie rozgrzewkowe i nie duplikuje się (Z108)', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByRole('spinbutton', { name: /Set 1, kg/ }).first().fill('100');

    await firstCard.getByTestId('warmup-generate').click();
    // Schemat: gryf 20 x10, 50 x8, 70 x5, 90 x2 — 4 wiersze rozgrzewkowe.
    await expect(firstCard.getByRole('spinbutton', { name: /Rozgrzewka W, kg/ })).toHaveCount(4);
    // Po wygenerowaniu (wypełnione warmupy) przycisk znika — brak duplikacji.
    await expect(firstCard.getByTestId('warmup-generate')).toHaveCount(0);
  });
});

// =====================================================
// 11a6. IMPORT CSV STRONG/HEVY (Z110)
// =====================================================
test.describe('Import CSV (Z110)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('pełny scenariusz: import fixture Strong, idempotencja 2x, historia, cofnięcie', async ({ page }) => {
    await navigateAndWait(page, '/settings');

    // Krok 1: wybór pliku
    await page.getByTestId('import-wizard-open').click();
    await page.getByTestId('import-file-input').setInputFiles('src/test/fixtures/strong-sample.csv');

    // Krok 2: podsumowanie + auto-mapowanie (fixture: 3 treningi, 1 uszkodzony wiersz)
    await expect(page.getByTestId('import-summary')).toContainText('3');
    await expect(page.getByTestId('import-summary')).toContainText('Strong');
    await expect(page.getByTestId('import-summary')).toContainText('Pominięto 1');
    await expect(page.getByTestId('import-mapping-stats')).toContainText('Auto-zmapowano 7 z 7');
    await page.getByTestId('import-to-confirm').click();

    // Krok 3: potwierdzenie z checkboxem (zero zapisów bez zgody)
    const writeBtn = page.getByTestId('import-write');
    await expect(writeBtn).toBeDisabled();
    await page.getByTestId('import-confirm-checkbox').click();
    await writeBtn.click();
    await expect(page.getByTestId('import-done')).toContainText('3');
    await page.getByRole('button', { name: 'Zamknij' }).click();

    // Historia pokazuje zaimportowane treningi ze snapshotem nazwy dnia.
    await navigateAndWait(page, '/history');
    await expect(page.getByText('Poniedziałek — Góra')).toBeVisible();
    await expect(page.getByText('Środa — Dół')).toBeVisible();

    // Idempotencja: ten sam plik drugi raz => te same id, liczba treningów bez zmian.
    await navigateAndWait(page, '/settings');
    await page.getByTestId('import-wizard-open').click();
    await page.getByTestId('import-file-input').setInputFiles('src/test/fixtures/strong-sample.csv');
    await page.getByTestId('import-to-confirm').click();
    await page.getByTestId('import-confirm-checkbox').click();
    await page.getByTestId('import-write').click();
    await expect(page.getByTestId('import-done')).toBeVisible();
    const workoutsAfterSecond = await page.evaluate(() => {
      const raw = window.localStorage.getItem('fittracker_e2e_workouts');
      return raw ? (JSON.parse(raw) as unknown[]).length : 0;
    });
    expect(workoutsAfterSecond).toBe(3);
    await page.getByRole('button', { name: 'Zamknij' }).click();

    // Cofnięcie: historia importów -> Cofnij -> treningi znikają.
    await page.getByTestId('import-wizard-open').click();
    await expect(page.getByTestId('import-history-entry').first()).toBeVisible();
    await page.getByTestId('import-undo').first().click();
    await expect(page.getByTestId('import-history-entry')).toHaveCount(0);
    const workoutsAfterUndo = await page.evaluate(() => {
      const raw = window.localStorage.getItem('fittracker_e2e_workouts');
      return raw ? (JSON.parse(raw) as unknown[]).length : 0;
    });
    expect(workoutsAfterUndo).toBe(0);
  });

  test('zaimportowane treningi zasilają rekordy i heatmapę (snapshot+resolver)', async ({ page }) => {
    // Seed przez mechanizm E2E — kształt identyczny jak buildImportedSessions.
    await setE2EWorkouts(page, [{
      id: 'imported-testbatch-1',
      userId: 'e2e-test-user',
      dayId: 'imported-testbatch-1',
      date: '2026-05-04',
      completed: true,
      dayName: 'Import — Góra',
      importBatchId: 'testbatch',
      exercises: [{
        exerciseId: 'imported-ex-1',
        name: 'Wyciskanie sztangi na ławce płaskiej',
        sets: [{ reps: 8, weight: 80, completed: true }],
      }],
    }]);
    await navigateAndWait(page, '/achievements');
    await expect(page.getByText('Wyciskanie sztangi na ławce płaskiej').first()).toBeVisible();
  });
});

// =====================================================
// 11a7. RĘCZNE CARDIO (Z112)
// =====================================================
test.describe('Ręczne cardio (Z112)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('dodaj Bieżnia 30 min z Dashboardu, widoczny w kalendarzu, edytuj czas, usuń', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Dodanie: typ Bieżnia + 30 minut (default typ = Treadmill).
    await page.getByTestId('add-cardio-open').click();
    await page.getByTestId('cardio-minutes').fill('30');
    await page.getByTestId('cardio-save').click();

    // Widoczny na Dashboardzie (karta manualna z badge Ręczny).
    const card = page.getByTestId('manual-activity-card').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Bieżnia');
    await expect(card).toContainText('Ręczny');
    await expect(card).toContainText('30m');

    // Widoczny w kalendarzu (TrainingPlan).
    await navigateAndWait(page, '/plan');
    await expect(page.getByTestId('manual-activity-card').first()).toBeVisible();

    // Edycja czasu z karty (klik otwiera dialog edycji).
    await page.getByTestId('manual-activity-card').first().click();
    await page.getByTestId('cardio-minutes').fill('45');
    await page.getByTestId('cardio-save').click();
    await expect(page.getByTestId('manual-activity-card').first()).toContainText('45m');

    // Usunięcie z potwierdzeniem.
    await page.getByTestId('manual-activity-card').first().click();
    await page.getByTestId('cardio-delete').click();
    await page.getByRole('button', { name: 'Usuń', exact: true }).last().click();
    await expect(page.getByTestId('manual-activity-card')).toHaveCount(0);
  });
});

// =====================================================
// 11a8. MANUALNE CARDIO W ANALITYCE (Z113)
// =====================================================
test.describe('Manualne cardio w analityce (Z113)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('bieg manualny 5 km wchodzi do podsumowania tygodnia', async ({ page }) => {
    const today = localToday();
    await page.addInitScript(({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data));
    }, {
      key: 'fittracker_e2e_manual_activities',
      data: [{
        id: 'ma-1', userId: 'e2e-test-user', type: 'Run', date: today,
        movingTime: 1800, distance: 5000, perceivedIntensity: 'moderate', createdAt: 1,
      }],
    });

    await navigateAndWait(page, '/analytics');
    await page.getByRole('tab', { name: 'Tygodnie' }).click();
    await expect(page.getByText('5 km').first()).toBeVisible();
  });
});

// =====================================================
// 11a9. OBCIĄŻENIE HYBRYDOWE (Z115)
// =====================================================
test.describe('Obciążenie hybrydowe (Z115)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  const strengthSeed = (date: string) => ({
    id: `hyb-${date}`, userId: 'e2e-test-user', dayId: `hyb-${date}`, date,
    completed: true, dayName: 'Nogi', durationSec: 3600,
    exercises: [{
      exerciseId: 'ex-legs',
      name: 'Przysiad ze sztangą (High Bar)',
      rpe: 8,
      sets: [
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
      ],
    }],
  });

  test('siła + manual cardio: karta hybrydowa, pasek dnia i wskazówka interferencji z dismiss', async ({ page }) => {
    const today = localToday();
    await setE2EWorkouts(page, [strengthSeed(today)]);
    await page.addInitScript(({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data));
    }, {
      key: 'fittracker_e2e_manual_activities',
      data: [{
        id: 'ma-hyb', userId: 'e2e-test-user', type: 'Run', date: today,
        movingTime: 2400, perceivedIntensity: 'hard', createdAt: 1,
      }],
    });

    // Dashboard: pasek tygodnia + banner interferencji (nogi + intensywny bieg tego samego dnia).
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('hybrid-week-strip')).toBeVisible();
    await expect(page.getByTestId('interference-banner')).toBeVisible();
    await page.getByTestId('interference-dismiss').click();
    await expect(page.getByTestId('interference-banner')).toHaveCount(0);
    // Dismiss przeżywa reload (localStorage per para).
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('hybrid-week-strip')).toBeVisible();
    await expect(page.getByTestId('interference-banner')).toHaveCount(0);

    // Analytics: karta hybrydowa z podziałem procentowym (zakładka Podsumowanie).
    await navigateAndWait(page, '/analytics');
    await page.getByRole('tab', { name: 'Podsum.' }).click();
    await expect(page.getByTestId('hybrid-load-card')).toBeVisible();
    await expect(page.getByTestId('hybrid-week-split')).toBeVisible();
  });

  test('konto tylko-siłowe: karta hybrydowa z samą siłą, bez crasha', async ({ page }) => {
    const today = localToday();
    await setE2EWorkouts(page, [strengthSeed(today)]);
    await navigateAndWait(page, '/analytics');
    await page.getByRole('tab', { name: 'Podsum.' }).click();
    await expect(page.getByTestId('hybrid-load-card')).toBeVisible();
    await expect(page.getByTestId('hybrid-week-split')).toContainText('100%');
  });
});

// =====================================================
// 11a10. PROGRESJA PROGRAMOWA — CELE TYGODNIA (Z120)
// =====================================================
test.describe('Cele tygodnia (Z120)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  // Poniedziałek tygodnia przesuniętego o shiftDays od dziś (lokalnie, jak apka).
  const mondayOfWeek = (shiftDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + shiftDays);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const historyWorkout = (date: string, reps: number) => ({
    id: `prog-${date}`, userId: 'e2e-test-user', dayId: 'day-1', date,
    completed: true, dayName: 'Poniedziałek',
    exercises: [{
      exerciseId: 'ex-1-1',
      name: 'Wyciskanie hantli (Lekki skos)',
      sets: [
        { reps, weight: 60, completed: true },
        { reps, weight: 60, completed: true },
        { reps, weight: 60, completed: true },
      ],
    }],
  });

  test('dowieziona góra zakresu => badge celu tygodnia z podbitym ciężarem i pre-fill z celu', async ({ page }) => {
    // Plan wystartował tydzień temu (bieżący tydzień = 2), historia z zeszłego tygodnia: 3x8@60 (góra zakresu 6-8).
    await setE2EPlanMeta(page, {
      startDate: mondayOfWeek(-7),
      progression: { enabled: true, deloadEveryWeeks: 5 },
    });
    await setE2EWorkouts(page, [historyWorkout(localDaysAgo(7), 8)]);

    await navigateAndWait(page, '/workout/day-1');
    // Badge "Cel tygodnia" z celem double progression: +2.5 kg (compound), reps do dołu zakresu.
    const badge = page.getByText(/Cel tygodnia:/).first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('62.5 kg');
    await expect(badge).toContainText('×6');

    // Pre-fill startu treningu używa celu (waga 62.5, powtórzenia 6), nie kopii poprzedniego (60×8).
    await page.getByRole('button', { name: /Rozpocznij trening/ }).click();
    const card = page.locator('.exercise-card').first();
    await expect(card.getByRole('spinbutton', { name: /Set 2, kg/ })).toHaveValue('62.5');
    await expect(card.getByRole('spinbutton', { name: /Set 2, Powt\./ })).toHaveValue('6');
  });

  test('wynik w środku zakresu => cel utrzymania (ten sam ciężar, +1 powtórzenie)', async ({ page }) => {
    await setE2EPlanMeta(page, {
      startDate: mondayOfWeek(-7),
      progression: { enabled: true, deloadEveryWeeks: 5 },
    });
    await setE2EWorkouts(page, [historyWorkout(localDaysAgo(7), 7)]);

    await navigateAndWait(page, '/workout/day-1');
    const badge = page.getByText(/Cel tygodnia:/).first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('60 kg');
    await expect(badge).toContainText('×8');
  });

  test('bez konfiguracji progresji brak badge celu tygodnia (silnik wyłączony)', async ({ page }) => {
    await setE2EWorkouts(page, [historyWorkout(localDaysAgo(7), 8)]);
    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByRole('heading', { name: 'Poniedziałek' })).toBeVisible();
    await expect(page.getByText(/Cel tygodnia:/)).toHaveCount(0);
  });

  test('Z121: programowy tydzień deload — banner [Zastosuj] => badge aktywny i cele deloadowe w treningu', async ({ page }) => {
    // Start 4 tygodnie temu => bieżący tydzień = 5 = programowy deload (co 5).
    await setE2EPlanMeta(page, {
      startDate: mondayOfWeek(-28),
      progression: { enabled: true, deloadEveryWeeks: 5 },
    });
    await setE2EWorkouts(page, [historyWorkout(localDaysAgo(7), 8)]);

    await navigateAndWait(page, '/');
    await expect(page.getByTestId('deload-banner')).toBeVisible();
    await page.getByTestId('deload-apply').click();
    await expect(page.getByTestId('deload-active-badge')).toBeVisible();
    await expect(page.getByTestId('deload-banner')).toHaveCount(0);

    // Trening: badge wariantu deloadowego (mniej serii, lżej).
    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByText(/Tydzień deload:/).first()).toBeVisible();
  });

  test('Z121: raport target vs actual za zeszły tydzień na Dashboardzie', async ({ page }) => {
    // Start 2 tygodnie temu => bieżący tydzień = 3, raport za tydzień 2.
    // Tydzień 1: 3x8@60 (góra zakresu) => cel tygodnia 2 = 62.5 ×6; tydzień 2: 60×8 => rozjazd.
    await setE2EPlanMeta(page, {
      startDate: mondayOfWeek(-14),
      progression: { enabled: true, deloadEveryWeeks: 5 },
    });
    await setE2EWorkouts(page, [
      historyWorkout(localDaysAgo(14), 8),
      { ...historyWorkout(localDaysAgo(7), 8), id: 'prog-week2' },
    ]);

    await navigateAndWait(page, '/');
    await expect(page.getByTestId('week-report-card')).toBeVisible();
    await expect(page.getByTestId('week-report-summary')).toContainText('(0/1)');
    await expect(page.getByText(/62.5.*×6/).first()).toBeVisible();
  });
});

// =====================================================
// 11a11. PAROWANIE ZEGARKA GARMIN (Z125)
// =====================================================
test.describe('Parowanie Garmin (Z125)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('sekcja w Ustawieniach: kod parowania z odliczaniem, lista urządzeń i odłączanie', async ({ page }) => {
    await page.addInitScript(({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data));
    }, {
      key: 'fittracker_e2e_garmin_devices',
      data: [{ deviceId: 'abc123def456', label: 'Fenix 8', createdAt: 1, lastUsedAt: 1752960000000 }],
    });

    await navigateAndWait(page, '/settings');
    const section = page.getByTestId('garmin-settings');
    await expect(section).toBeVisible();

    // Kod parowania (mock: 123456) z odliczaniem TTL.
    await section.getByTestId('garmin-pair-start').click();
    await expect(section.getByTestId('garmin-pair-code')).toContainText('123456');
    await expect(section.getByTestId('garmin-pair-code')).toContainText(/Wygasa za/);

    // Lista urządzeń + odłączenie.
    await expect(section.getByTestId('garmin-device-row')).toHaveCount(1);
    await expect(section.getByTestId('garmin-device-row')).toContainText('Fenix 8');
    await section.getByTestId('garmin-device-revoke').click();
    await expect(section.getByTestId('garmin-device-row')).toHaveCount(0);
  });
});

// =====================================================
// 11a12. REGRESJA INCYDENTU 2026-07-20: ćwiczenia planu nie znikają
// =====================================================
test.describe('Ćwiczenia planu nie znikają przy częściowym szkicu (incydent 2026-07-20)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('szkic z JEDNYM ćwiczeniem => dzień planu nadal pokazuje wszystkie ćwiczenia', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, '/');
    // Szkic jak po powrocie z szybkiego treningu: tylko pierwsze ćwiczenie dotknięte.
    await writeWorkoutDraftDb(page, {
      sessionId: `workout-e2e-test-user-day-1-${today}`,
      userId: 'e2e-test-user',
      dayId: 'day-1',
      date: today,
      cycleId: null,
      sessionOrigin: 'remote',
      remoteSessionId: `workout-e2e-test-user-day-1-${today}`,
      exerciseSets: { 'ex-1-1': [{ reps: 6, weight: 60, completed: true }] },
      exerciseNotes: {},
      exerciseMetrics: {},
      exerciseNames: {},
      dayNotes: '',
      dayName: 'Poniedziałek',
      skippedExercises: [],
      lastTouchedExerciseId: 'ex-1-1',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    await navigateAndWait(page, '/workout/day-1');
    await expect(page.getByRole('heading', { name: 'Poniedziałek' })).toBeVisible();
    // Przed fixem renderowała się DOKŁADNIE jedna karta ćwiczenia (reszta planu znikała).
    const cards = page.locator('.exercise-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(1);
  });

  // X17A Z131: pełna sekwencja z reguły 5 w CLAUDE.md, przejechana przez UI na
  // NOWYM układzie karty. Większość realnych bugów siedzi w przejściach między
  // stanami, nie w pojedynczym ekranie.
  test('sekwencja: plan → wyjście → szybki trening → powrót — komplet ćwiczeń i nowy układ', async ({ page }) => {
    await navigateAndWait(page, '/');
    await clearWorkoutDraftDb(page, 'e2e-test-user');

    // 1. Start treningu z planu i zalogowanie jednej serii roboczej.
    await navigateAndWait(page, '/workout/day-1');
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    const planCards = page.locator('.exercise-card');
    await expect(planCards.first().locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    const planExerciseCount = await planCards.count();
    expect(planExerciseCount).toBeGreaterThan(1);

    const firstCard = planCards.first();
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).first().fill('62.5');
    await firstCard.getByLabel(/Set 1, Powt\./).first().fill('7');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).nth(1).click();
    await expect(page.getByTestId('session-stats')).toContainText('1');

    // 2. Wyjście z treningu i szybki trening obok.
    await navigateAndWait(page, '/');
    await page.getByTestId('quick-workout-start').click();
    await expect(page).toHaveURL(/adhoc-/);
    await page.getByTestId('adhoc-add-exercise').click();
    const picker = page.getByRole('dialog');
    await picker.getByPlaceholder(/Szukaj|Find/).fill('wioslowanie hantlami');
    await picker.getByText('Wiosłowanie hantlami na ławce (przodem)').click();
    await expect(page.getByRole('heading', { name: 'Wiosłowanie hantlami na ławce (przodem)' })).toBeVisible();

    // 3. Powrót do treningu z planu — TU przepadały ćwiczenia w incydencie 2026-07-20.
    await navigateAndWait(page, '/workout/day-1');
    await expect(planCards.first()).toBeVisible();
    expect(await planCards.count()).toBe(planExerciseCount);

    // Zalogowana seria PRZEŻYWA przerwanie w szkicu (to jest gwarancja po incydencie
    // 2026-07-20). Uwaga: ekran po powrocie pokazuje sesję jako niewznowioną, więc
    // pola są puste do czasu wznowienia — osobne znalezisko, patrz ODŁOŻONE w
    // docs/PLAN-X17A-2026-07-20.md. Dane sprawdzamy u ŹRÓDŁA, nie po widoku.
    const draft = await readWorkoutDraftDb(page, 'e2e-test-user', `local-workout-e2e-test-user-day-1-${localToday()}`) as {
      exerciseSets?: Record<string, { reps: number; weight: number; completed?: boolean; isWarmup?: boolean }[]>;
    } | null;
    expect(draft).not.toBeNull();
    expect(Object.keys(draft!.exerciseSets ?? {})).toHaveLength(planExerciseCount);
    const logged = Object.values(draft!.exerciseSets ?? {}).flat().find((s) => s.completed && !s.isWarmup);
    expect(logged).toMatchObject({ weight: 62.5, reps: 7 });

    // 4. Nowy układ X17A na miejscu po powrocie: nagłówki kolumn nad rozgrzewką,
    // „Dodaj serię" pod seriami, menu ⋯ w nagłówku, trzy metryki sesji.
    // Wznowienie sesji i dopiero potem asercje na układ w trybie edycji.
    await page.getByRole('button', { name: /Rozpocznij trening|Kontynuuj|Start workout/i }).first().click();
    const backCard = planCards.first();
    await expect(backCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    const setHeader = await backCard.getByText('Set', { exact: true }).first().boundingBox();
    const warmupLabel = await backCard.getByText('W', { exact: true }).first().boundingBox();
    const addSet = await backCard.getByRole('button', { name: /Dodaj serię/i }).boundingBox();
    expect(setHeader!.y).toBeLessThan(warmupLabel!.y);
    expect(warmupLabel!.y).toBeLessThan(addSet!.y);
    await expect(backCard.getByRole('button', { name: 'Więcej akcji' })).toBeVisible();
    await expect(page.getByTestId('session-stats')).toBeVisible();

    // 5. Trening da się domknąć (finalny sync w mock e2e nie przechodzi — Firestore
    // zablokowany — ale przycisk zakończenia musi być dostępny).
    await expect(page.getByRole('button', { name: 'Zakończ trening' })).toBeVisible();
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

    const today = localToday();
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

    const today = localToday();
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
