import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, expectHashRoute, clearWorkoutDraftDb, readWorkoutDraftDb, writeWorkoutDraftDb, setE2EWorkouts, setE2EMeasurements, setE2ECustomExercises, setE2EAuthScenario , localToday, localDaysAgo, setE2EPlanMeta, skipPreStartWarmupIfShown, plWeekdayName, advanceWizardToStep5, advanceWizardToStep6, passOnboardingWelcome, waitForMatchingToFinish, openProfileSection } from './helpers';

// X30 WP-L: /workout/day-N bez ?date= renderuje się na dziś, a domyślna nazwa
// dnia planu podąża za datą (nagłówek "Wtorek" we wtorek, nie "Poniedziałek").
const todayDayName = () => plWeekdayName(localToday());

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
    // X27 WP-E: poziom 1 to siatka kafli grup mięśniowych (tytuł strony niesie AppHeader).
    await expect(page.getByTestId('exercise-group-tile').first()).toBeVisible();
  });

  test('Workout History (/history) loads', async ({ page }) => {
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);
    // Naprawa r1 (2026-08-21): tytuł Historii niesie wyłącznie AppHeader (poza
    // main); etykieta zakładki jest krótka, żeby mieściła się w jednej linii.
    await expect(page.getByRole('heading', { name: 'Historia', exact: true })).toBeVisible();
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

  test('Settings (/settings) redirects to Profile with former sections (X35b)', async ({ page }) => {
    await navigateAndWait(page, '/settings');
    await expectHashRoute(page, '/profile');
    await expectPageRendered(page);
    await expect(page.getByText('Backup i przywracanie')).toBeVisible();
    // Z118: sekcja Zdrowie tylko natywnie (web = no-op bridge, ukryta, zero crashy).
    await expect(page.getByTestId('health-settings')).toHaveCount(0);
  });

  test('/settings?section=notifications lands on the Profile notifications anchor (deep link z powiadomienia)', async ({ page }) => {
    await navigateAndWait(page, '/settings?section=notifications');
    await expect(page).toHaveURL(/\/#\/profile\?section=notifications$/);
    await expect(page.locator('#profile-notifications')).toBeInViewport();
  });

  test('Workout Day (/workout/day-1) loads', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
  });

  test('Plan Editor (/plan/edit) loads', async ({ page }) => {
    await navigateAndWait(page, '/plan/edit');
    await expectPageRendered(page);
  });

  test('New Plan (/new-plan) loads', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    // X32: replan startuje od kroku 2 ("Określ swój poziom"); X33: krok 5A = "Dwa plany na N dni w tygodniu".
    await expect(page.getByRole('heading', { name: /Witaj w Strength Save|Określ swój poziom|Dwa plany na \d dni w tygodniu/ })).toBeVisible();
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
    // Runna p.1 B2: dzień wolny = karta "Dzień regeneracji" (nie "Dzisiaj wolne").
    await expect(dashboardBody).toContainText(/Rozpocznij trening|Dzisiaj wolne|Trening ukończony|Dzień regeneracji/i);
  });

  test('D-T2: kafle statystyk zeszły z Dashboardu (dom: Postępy/Twoje liczby)', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('dash-stats')).toHaveCount(0);
    await expect(page.getByTestId('dash-week-section')).toHaveCount(0);
    // Kompaktowy tydzień i szybkie akcje zostają.
    await expect(page.getByTestId('week-card')).toBeVisible();
    await expect(page.getByTestId('quick-workout-start')).toBeVisible();
  });

  test('shows greeting with user name', async ({ page }) => {
    await navigateAndWait(page, '/');
    // E2E mock user is "E2E Tester"
    const greeting = page.locator('h1').first();
    await expect(greeting).toBeVisible();
    // D-T2: nagłówek pełnego tygodnia zszedł do Planu; hero + WeekCard zostają.
    await expect(page.getByTestId('dash-hero')).toBeVisible();
  });

    test('narzedzia naprawcze tylko na /admin; onboarding od nowa dla kazdego na /cycles (Z90.4 + X35b)', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await expect(page.getByText('Backup i przywracanie')).toBeVisible();
    await expect(page.getByText('Narzędzia naprawcze')).toHaveCount(0);
    // Z242 → X35b: reset onboardingu dla każdego usera, na stronie Cykle (sekcja Plan).
    await navigateAndWait(page, '/cycles');
    await expect(page.getByTestId('cycles-reset-onboarding')).toBeVisible();

    await setE2EAuthScenario(page, 'active-admin');
    // Zmiana samego hasha nie przeładowuje dokumentu — reload wykonuje initScript admina,
    // dopiero potem wejście na /admin (AdminRoute widzi już admina).
    await page.reload();
    await navigateAndWait(page, '/admin');
    await expect(page.getByText('Narzędzia naprawcze')).toBeVisible();
  });

test('profile allows self-service export for regular user flow', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);

    await openProfileSection(page, 'backup');
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

  // X30 WP-L: bez ?date= każdy dzień planu renderuje się na dziś, więc nagłówek
  // to nazwa dzisiejszego dnia tygodnia (nie "Poniedziałek"/"Środa"/"Piątek").
  test('day-1 shows training day name and exercises', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });

  test('day-2 loads without error', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-2');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
  });

  test('day-3 loads without error', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-3');
    await expectPageRendered(page);
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
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
    // X27 WP-E: kategorie to kafle grup mięśniowych na poziomie 1.
    await expect(page.getByRole('heading', { name: 'Ćwiczenia' }).first()).toBeVisible();
    await expect(page.getByTestId('exercise-group-tile').first()).toBeVisible();
  });

  test('exercises are clickable/expandable', async ({ page }) => {
    await navigateAndWait(page, '/exercises');
    // X27 WP-E: lista ćwiczeń żyje w widoku grupy — najpierw kafel, potem wiersz.
    await page.getByTestId('exercise-group-tile').first().click();
    const firstExercise = page.getByTestId('group-exercise-row').first();
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

    // X28 WP-D: zakładka Wykresy = menu kafli (jeden wykres na raz, ?chart=).
    // Wejście w wykres przez kafel, powrót do menu glass-backiem "Wstecz".
    const charts = ['Treningi', 'Tonaż', 'Waga', 'Seria', 'Progresja'];
    for (const label of charts) {
      const tile = page.getByText(label, { exact: true }).first();
      await expect(tile).toBeVisible();
      await tile.click();
      await expectPageRendered(page);
      await page.getByRole('button', { name: 'Wstecz' }).click();
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
    await expect(page.getByRole('main').getByRole('heading', { name: 'Postępy' })).toBeVisible();
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
test.describe('Settings (X35b: sekcje w Profilu)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('Profil ma wszystkie sekcje X36 w kolejnosci, ustawienia zwiniete do jednej linii', async ({ page }) => {
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    // X36: etykieta zwijanej sekcji siedzi w h2 > button > [data-section-label].
    const labels = await page.getByRole('main').locator('h2').evaluateAll((headings) =>
      headings.map((h) => (h.querySelector('[data-section-label]') ?? h).textContent?.trim()));
    expect(labels).toEqual([
      'Osiągnięcia', 'Kolor przewodni aplikacji', 'Trening', 'Timer i przerwy', 'Kalkulator talerzy',
      'Trener', 'Urządzenia i połączenia', 'Powiadomienia', 'Subskrypcja', 'Twoje dane',
      'Backup i przywracanie', 'Zgody i prywatność', 'Konto i pomoc',
    ]);
    // Wszystkie sekcje ustawień zwiniete: 12 wierszy, zero zamontowanych kart.
    await expect(page.locator('section[data-state="closed"]')).toHaveCount(12);
    await expect(page.getByTestId('device-settings')).toHaveCount(0);
    // Rozwiniecie i zwiniecie jednej sekcji nie rusza pozostalych.
    await openProfileSection(page, 'timer');
    await expect(page.getByLabel('Timer przerwy')).toBeVisible();
    await expect(page.locator('section[data-state="closed"]')).toHaveCount(11);
    await page.getByTestId('profile-toggle-timer').click();
    await expect(page.locator('section[data-state="closed"]')).toHaveCount(12);
    // Profil bez dolnego paska Wstecz (strzalka w naglowku zostaje).
    await expect(page.getByTestId('back-bar')).toHaveCount(0);
    await expect(page.locator('header').getByRole('button', { name: 'Wstecz' })).toBeVisible();
    // Bez duplikatu wejscia do edycji imienia (tylko naglowek tozsamosci).
    await expect(page.getByText('Imię i avatar')).toHaveCount(0);
    await expect(page.getByText('Ustawienia zaawansowane')).toHaveCount(0);
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
    // X27: chipy kategorii zastąpione kaflami grup; wejście w grupę pokazuje
    // filtr "Masa ciała" (ćwiczenia bodyweight są w bibliotece).
    // X35a WP-H: filtr ma licznik ("Masa ciała N").
    const tile = page.getByTestId('exercise-group-tile').filter({ hasText: 'Brzuch' });
    await expect(tile).toBeVisible();
    await tile.click();
    await expect(page.getByRole('button', { name: /^Masa ciała \d+$/ })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
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
    // Toast autostartu (TOAST_REMOVE_DELAY=1000000 wisi do zamknięcia) przechwytuje
    // klik w menuitem na webkit — poczekaj aż się pojawi i zamknij go najpierw.
    const autostartToastClose = page.locator('[toast-close]').first();
    await autostartToastClose.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await autostartToastClose.isVisible().catch(() => false)) {
      await autostartToastClose.click();
      await autostartToastClose.waitFor({ state: 'hidden' });
    }
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
    // Pakiet prawny v2: krok 1 wymaga 3 rozdzielonych zgód (regulamin+wiek,
    // privacy, zdrowie art. 9); marketing jest opcjonalny i zostaje pusty.
    await expect(page.getByRole('button', { name: 'Dalej', exact: true })).toBeDisabled();
    await page.getByTestId('consent-terms').click();
    await page.getByTestId('consent-privacy').click();
    await expect(page.getByRole('button', { name: 'Dalej', exact: true })).toBeDisabled();
    await page.getByTestId('consent-health').click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    // X34: krok 5A (wybór) -> 6/6 (Start planu) -> "Podgląd planu".
    await advanceWizardToStep6(page);
    await page.getByTestId('ob-start-preview').click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();

    // Swap w podglądzie otwiera picker.
    await page.getByRole('button', { name: 'Zamień', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  // X34 (a): onboarding 1 -> 6 z celem Redukcja; przerywnik faktycznie widoczny;
  // 5A bez podsumowania / "Zmień ustawienia"; 6/6 z CTA "Zacznij redukcję", który
  // zapisuje BEZ podglądu (w mock E2E Firestore jest zablokowany, więc sam zapis
  // nie kończy się Dashboardem; pełną ścieżkę do Dashboardu pokrywa spec
  // emulatorowy e2e/emulator/plan-lifecycle.spec.ts).
  test('X34 (a): onboarding 1-6, przerywnik 3,5 s, 5A odchudzone, "Zacznij redukcję" bez podglądu', async ({ page }) => {
    await navigateAndWait(page, '/');
    await passOnboardingWelcome(page);
    await expect(page.getByText('02 / 06')).toBeVisible();
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByRole('button', { name: 'Redukcja', exact: false }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    const shownAt = Date.now();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();

    // Przerywnik: nakładka z tytułem, wiersze wchodzą kolejno, pasek; >= 3 s na ekranie.
    const overlay = page.getByTestId('ob-matching');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText('Dobieram plany')).toBeVisible();
    await expect(overlay.getByTestId('ob-matching-row')).toHaveCount(3, { timeout: 4000 });
    await expect(overlay.getByTestId('ob-matching-row').nth(2)).toContainText('3 dni/tydz');
    await waitForMatchingToFinish(page);
    expect(Date.now() - shownAt).toBeGreaterThanOrEqual(3000);

    // 5A: tylko wybór.
    await expect(page.getByText('05 / 06')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plany na 3 dni w tygodniu' })).toBeVisible();
    await expect(page.getByTestId('plan-choice-recommended')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('plan-choice-alternative')).toBeVisible();
    await expect(page.getByText('Zmień ustawienia')).toHaveCount(0);
    await expect(page.getByText(/Pierwszy trening/)).toHaveCount(0);
    await expect(page.getByTestId('ob-plan-name')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Zaczynam ten plan' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Podgląd planu' })).toHaveCount(0);

    // 6/6 (X34b): chipy dni treningowych na gorze, kafle, nazwa na dole, CTA celu.
    await page.getByTestId('ob-match-next').click();
    await expect(page.getByTestId('ob-start-step')).toBeVisible();
    await expect(page.getByText('06 / 06')).toBeVisible();
    await expect(page.getByTestId('ob-plan-name')).not.toHaveValue('');
    await expect(page.getByTestId('ob-duration-tiles').getByRole('button', { pressed: true })).toHaveCount(1);
    const chips = page.getByTestId('ob-first-workout-chips').getByRole('button');
    await expect(chips).toHaveCount(8);
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
    // Kolejnosc sekcji: pierwszy trening -> dlugosc -> nazwa.
    const order = await page.evaluate(() => {
      const top = (id: string) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top ?? -1;
      return [top('ob-first-workout-chips'), top('ob-duration-tiles'), top('ob-plan-name')];
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
    const cta = page.getByTestId('ob-start-cta');
    await expect(cta).toHaveText(/Zacznij redukcję/);
    await expect(cta).toBeEnabled();

    // Główny CTA = zapis od razu: żadnego podglądu, kreator zostaje na 6/6 w stanie zapisu.
    await cta.click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toHaveCount(0);
    await expect(page.getByTestId('ob-start-step')).toBeVisible();
  });

  // X34 (b): 6/6 -> Podgląd -> "Wybierz inny plan" -> 5A (karta zaznaczona, bez
  // przerywnika) -> karta 2 -> 6/6 (defaulty karty 2) -> Podgląd -> "Zatwierdź i zacznij".
  test('X34 (b): podgląd -> Wybierz inny plan -> 5A -> karta 2 -> 6/6 -> podgląd -> Zatwierdź i zacznij', async ({ page }) => {
    await navigateAndWait(page, '/');
    await passOnboardingWelcome(page);
    await advanceWizardToStep6(page);
    await page.getByTestId('ob-plan-name').fill('Moja nazwa');
    await page.getByTestId('ob-first-workout-chips').getByRole('button').nth(1).click();
    await page.getByTestId('ob-start-preview').click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
    await expect(page.getByTestId('plan-preview-confirm')).toHaveText(/Zatwierdź i zacznij/);

    await page.getByTestId('plan-preview-choose-other').click();
    await expect(page.getByText('05 / 06')).toBeVisible();
    await expect(page.getByTestId('ob-matching')).toHaveCount(0);
    await expect(page.getByTestId('plan-choice-recommended')).toHaveAttribute('aria-pressed', 'true');

    // Bez zmiany karty ustawienia z 6/6 wracają 1:1.
    await page.getByTestId('ob-match-next').click();
    await expect(page.getByTestId('ob-plan-name')).toHaveValue('Moja nazwa');
    await expect(page.getByTestId('ob-first-workout-chips').getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Wstecz' }).click();

    // Karta 2 -> 6/6 z nazwą szablonu karty 2.
    const second = page.getByTestId('plan-choice-alternative');
    const secondName = (await second.getByTestId('plan-choice-name').textContent())?.trim() ?? '';
    await second.click();
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('ob-match-next').click();
    await expect(page.getByTestId('ob-plan-name')).toHaveValue(secondName);
    await expect(page.getByTestId('ob-first-workout-chips').getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('ob-start-preview').click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
    const confirm = page.getByTestId('plan-preview-confirm');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    // Zatwierdzenie = zapis (w mock E2E bez Dashboardu, patrz komentarz w (a)); kreator nie wraca.
    await expect(page.getByTestId('ob-start-step')).toHaveCount(0);
    await expect(page.getByTestId('plan-choice-recommended')).toHaveCount(0);
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
    // X32: start od kroku 2; "Ułóż własny plan" jest w kroku 5A (X33).
    await advanceWizardToStep5(page);
    await page.getByRole('button', { name: 'Ułóż własny plan' }).click();
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
    // X32: /new-plan startuje od kroku 2 (poziom), bez "Zmień ustawienia".
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: '6', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();

    // X33: rekomendacja = karta "Polecany" (nazwa + meta "{weeks} tyg. · 6 dni · ..."),
    // lista dni szablonu ("Legs B") zniknęła z kroku 5.
    const recommendedCard = page.getByTestId('plan-choice-recommended');
    await expect(recommendedCard.getByText('Push Pull Legs ×2')).toBeVisible();
    await expect(recommendedCard.getByTestId('plan-choice-meta')).toContainText('6 dni');
    await expect(page.getByText(/Ten plan ma \d+ dni treningowych/)).toBeHidden();
  });

  test('poziom elite nie istnieje w wizardzie', async ({ page }) => {
    await navigateAndWait(page, '/new-plan');
    // X32: krok 2 (poziom) jest ekranem startowym /new-plan.
    await expect(page.getByRole('heading', { name: 'Określ swój poziom' })).toBeVisible();
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
    await advanceWizardToStep5(page);
    await page.getByRole('button', { name: 'Ułóż własny plan' }).click();
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
    await advanceWizardToStep5(page);
    await page.getByRole('button', { name: 'Ułóż własny plan' }).click();
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
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();

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

  test('D-T2: pomiary osiągalne z sidebara (kafel wagi zszedł z Dashboardu)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await navigateAndWait(page, '/');
    await page.getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('link', { name: 'Pomiary ciała' }).click();
    await expect(page).toHaveURL(/#\/measurements$/);
  });

  test('D-T1: Historia z bottom nav, cykle z Planu', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.locator('nav[aria-label="Nawigacja mobilna"]')
      .getByRole('link', { name: 'Historia' }).click();
    await expect(page).toHaveURL(/#\/history$/);

    // FIX-B T5: Cykle przeniesione z karty planu Dashboardu na stronę Planu.
    await navigateAndWait(page, '/plan');
    await page.getByTestId('plan-cycles-link').click();
    await expect(page).toHaveURL(/#\/cycles$/);
  });

  test('Analytics progresja: link Wszystkie rekordy', async ({ page }) => {
    await navigateAndWait(page, '/analytics');
    await page.getByRole('tab', { name: 'Wykresy' }).click();
    await page.getByText('Progresja', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Wszystkie rekordy' }).click();
    // X36: Analityka domyślna w Postępach — rekordy pod ?view=records.
    await expect(page).toHaveURL(/#\/achievements\?view=records&section=records$/);
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

    await page.getByTestId('history-row-menu').first().click();
    await page.getByRole('menuitem', { name: 'Szczegóły' }).click();
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
    await page.getByRole('textbox', { name: 'Wyciskanie sztangi na ławce płaskiej, Set 1, kg' }).fill('60');
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
    await page.getByTestId('history-row-menu').first().click();
    await page.getByRole('menuitem', { name: 'Szczegóły' }).click();
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
    await farmerCard.getByRole('textbox', { name: /Set 1, kg/ }).fill('24');
    // Bug 6 (X30): dystans to DecimalInput (type="text") — textbox, nie spinbutton.
    await farmerCard.getByRole('textbox', { name: /Set 1, Dystans/ }).fill('40');

    // Podciąganie wspomagane: asysta + powtórzenia.
    await page.getByTestId('adhoc-add-exercise').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/Szukaj|Find/).fill('wspomagane');
    await dialog.getByText('Podciąganie wspomagane na maszynie').click();
    const assistCard = page.locator('.exercise-card').nth(2);
    await expect(assistCard.getByText('Asysta', { exact: true })).toBeVisible();
    await assistCard.getByRole('textbox', { name: /Set 1, Asysta/ }).fill('25');
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
    await page.getByTestId('history-row-menu').first().click();
    await page.getByRole('menuitem', { name: 'Szczegóły' }).click();
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
    await firstCard.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('100');

    await firstCard.getByTestId('plate-calculator-open').click();
    // 100 kg na gryfie 20: 40 kg na stronę = 25 + 15 (default inventory).
    await expect(page.getByTestId('plates-summary')).toContainText('1×25 + 1×15');
    await expect(page.getByTestId('plates-visual')).toBeVisible();
  });

  test('generator rozgrzewki %1RM wstawia serie rozgrzewkowe i nie duplikuje się (Z108)', async ({ page }) => {
    const today = localToday();
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('100');

    await firstCard.getByTestId('warmup-generate').click();
    // Schemat: gryf 20 x10, 50 x8, 70 x5, 90 x2 — 4 wiersze rozgrzewkowe.
    await expect(firstCard.getByRole('textbox', { name: /Rozgrzewka W, kg/ })).toHaveCount(4);
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
    await navigateAndWait(page, '/profile');
    await openProfileSection(page, 'backup');

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
    await page.getByRole('button', { name: 'Zamknij', exact: true }).click();

    // Historia pokazuje zaimportowane treningi ze snapshotem nazwy dnia.
    await navigateAndWait(page, '/history');
    await expect(page.getByText('Poniedziałek — Góra')).toBeVisible();
    await expect(page.getByText('Środa — Dół')).toBeVisible();

    // Idempotencja: ten sam plik drugi raz => te same id, liczba treningów bez zmian.
    await navigateAndWait(page, '/profile');
    await openProfileSection(page, 'backup');
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
    await page.getByRole('button', { name: 'Zamknij', exact: true }).click();

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

  test('zaimportowane treningi zasilają rekordy (snapshot+resolver)', async ({ page }) => {
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
    await navigateAndWait(page, '/achievements?view=records');
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

  test('dodaj Bieżnia 30 min z Dashboardu, widoczny w Planie, edytuj czas, usuń', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Dodanie: typ Bieżnia + 30 minut (default typ = Treadmill).
    await page.getByTestId('add-cardio-open').click();
    await page.getByTestId('cardio-minutes').fill('30');
    await page.getByTestId('cardio-save').click();

    // D-T2/D-T3: karty cardio mają dom na Planie (timeline zszedł z Dashboardu).
    await navigateAndWait(page, '/plan');
    const card = page.getByTestId('manual-activity-card').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Bieżnia');
    await expect(card).toContainText('Ręczny');
    await expect(card).toContainText('30m');

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

    // D-T3: pasek tygodnia hybrydowego mieszka na Planie (dom tygodnia).
    await navigateAndWait(page, '/plan');
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
    await skipPreStartWarmupIfShown(page);
    const card = page.locator('.exercise-card').first();
    await expect(card.getByRole('textbox', { name: /Set 2, kg/ })).toHaveValue('62.5');
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
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
    await expect(page.getByText(/Cel tygodnia:/)).toHaveCount(0);
  });

  test('Z121: programowy tydzień deload — banner [Zastosuj] => badge aktywny i cele deloadowe w treningu', async ({ page }) => {
    // Start 4 tygodnie temu => bieżący tydzień = 5 = programowy deload (co 5).
    await setE2EPlanMeta(page, {
      startDate: mondayOfWeek(-28),
      progression: { enabled: true, deloadEveryWeeks: 5 },
    });
    await setE2EWorkouts(page, [historyWorkout(localDaysAgo(7), 8)]);

    // D-T3: decyzja deload mieszka na Planie (dom tygodnia planu).
    await navigateAndWait(page, '/plan');
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

  test('sekcja Urządzenia w Profilu: kod parowania z odliczaniem, lista urządzeń i odłączanie', async ({ page }) => {
    await page.addInitScript(({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data));
    }, {
      key: 'fittracker_e2e_garmin_devices',
      data: [{ deviceId: 'abc123def456', label: 'Fenix 8', createdAt: 1, lastUsedAt: 1752960000000 }],
    });

    await navigateAndWait(page, '/profile');
    // Z227: Garmin i Apple Watch są w jednym panelu urządzeń i entitlementu.
    // X36: panel w zwijanej sekcji "Urządzenia i połączenia".
    await openProfileSection(page, 'devices');
    const section = page.getByTestId('device-settings');
    await expect(section).toBeVisible();

    // Kod parowania (mock: 123456) z odliczaniem TTL.
    await section.getByTestId('garmin-pair-start').click();
    await expect(section.getByTestId('garmin-pair-code')).toContainText('123456');
    await expect(section.getByTestId('garmin-pair-code')).toContainText(/Wygasa za/);

    // Lista urządzeń + odłączenie.
    await expect(section.getByTestId('linked-device-row')).toHaveCount(1);
    await expect(section.getByTestId('linked-device-row')).toContainText('Fenix 8');
    await section.getByTestId('linked-device-unlink').click();
    await expect(section.getByTestId('linked-device-row')).toHaveCount(0);
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
    await expect(page.getByRole('heading', { name: todayDayName() })).toBeVisible();
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
    await skipPreStartWarmupIfShown(page);
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
    // Retryowane toHaveCount: zmiana parametru trasy (adhoc -> day-1) w tym samym
    // komponencie przechodzi przez chwilowe 0 kart; jednorazowy count() na webkit
    // trafiał w ten stan (fałszywy fail).
    await expect(planCards).toHaveCount(planExerciseCount);

    // Zalogowana seria PRZEŻYWA przerwanie w szkicu (to jest gwarancja po incydencie
    // 2026-07-20). Dane sprawdzamy u ŹRÓDŁA, nie po widoku.
    const draft = await readWorkoutDraftDb(page, 'e2e-test-user', `local-workout-e2e-test-user-day-1-${localToday()}`) as {
      exerciseSets?: Record<string, { reps: number; weight: number; completed?: boolean; isWarmup?: boolean }[]>;
    } | null;
    expect(draft).not.toBeNull();
    expect(Object.keys(draft!.exerciseSets ?? {})).toHaveLength(planExerciseCount);
    const logged = Object.values(draft!.exerciseSets ?? {}).flat().find((s) => s.completed && !s.isWarmup);
    expect(logged).toMatchObject({ weight: 62.5, reps: 7 });

    // 4. Nowy układ X17A na miejscu po powrocie: nagłówki kolumn nad rozgrzewką,
    // „Dodaj serię" pod seriami, menu ⋯ w nagłówku, trzy metryki sesji.
    // X30 (bug 4, draft per strona treningu): powrót z szybkiego treningu HYDRUJE
    // żywą sesję planu od razu — tryb edycji z zalogowaną serią w polach, bez
    // ponownego "Kontynuuj" (dawne "pola puste do wznowienia" było znaleziskiem
    // z docs/PLAN-X17A-2026-07-20.md, naprawionym w X30).
    const backCard = planCards.first();
    await expect(backCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    await expect(backCard.getByLabel(/Set 1, (kg|lbs)/).first()).toHaveValue('62.5');
    await expect(backCard.getByLabel(/Set 1, Powt\./).first()).toHaveValue('7');

    const setHeader = await backCard.getByText('Ser.', { exact: true }).first().boundingBox();
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

// =====================================================
// 13. POMIARY (WP-G, X35a)
// =====================================================
test.describe('Pomiary (WP-G X35a)', () => {
  const e2eMeasurements = (earlierKg: number, laterKg: number) => [
    { id: 'm-earlier', userId: 'e2e-user', date: localDaysAgo(14), weight: earlierKg, waist: 90, recordedAt: Date.now() - 14 * 86_400_000 },
    { id: 'm-later', userId: 'e2e-user', date: localDaysAgo(7), weight: laterKg, waist: 88, recordedAt: Date.now() - 7 * 86_400_000 },
  ];

  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  // p.4: popup "Zrób pomiary" po onboardingu. W mocku E2E zapis onboardingu nie
  // dochodzi do Dashboardu (Firestore zablokowany), więc e2e startuje od redirectu
  // /?welcome=1; pełną sekwencję od kroku 1 pokrywa vitest
  // (onboarding-measure-prompt-sequence.test.tsx).
  test('popup pomiarów po onboardingu: /?welcome=1 bez pomiarów -> "Tak, dodaj pomiary" -> /measurements', async ({ page }) => {
    await page.goto('./#/?welcome=1');
    await page.waitForLoadState('domcontentloaded');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Dodać pomiary ciała?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Tak, dodaj pomiary' }).click();
    await expect(page).toHaveURL(/#\/measurements$/);
    await expectPageRendered(page);
  });

  test('popup pomiarów: "Nie teraz" zamyka bez nawigacji; user z pomiarem popupu nie widzi', async ({ page }) => {
    await page.goto('./#/?welcome=1');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Nie teraz' }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page).not.toHaveURL(/#\/measurements/);

    await setE2EMeasurements(page, e2eMeasurements(84, 83));
    await page.goto('./#/?welcome=1');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('dash-greeting')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  // p.3: ton delty wagi wg celu usera (fat_loss: spadek = success; build_muscle:
  // spadek = destructive); talia zawsze wg celu pola (spadek = success).
  test('delty wagi wg celu: fat_loss spadek wagi = success (wiersz + badge trendu), talia w dół = success', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { trainingProfile: { objective: 'fat_loss' } });
    await setE2EMeasurements(page, e2eMeasurements(84, 83));
    await navigateAndWait(page, '/measurements');
    const row = page.getByTestId('measurement-row-m-later');
    await expect(row.getByTestId('measurement-delta-weight')).toHaveAttribute('data-tone', 'success');
    await expect(row.getByTestId('measurement-delta-weight')).toHaveText(/-1/);
    await expect(row.getByTestId('measurement-delta-waist')).toHaveAttribute('data-tone', 'success');
    await expect(page.getByTestId('measurement-weight-trend')).toHaveAttribute('data-tone', 'success');
  });

  // Osobne testy per wariant: store mock czyta seed raz na dokument (goto na ten
  // sam URL z inną tylko częścią hash nie przeładowuje strony).
  test('delty wagi wg celu: build_muscle spadek wagi = destructive (talia w dół nadal success)', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { trainingProfile: { objective: 'build_muscle' } });
    await setE2EMeasurements(page, e2eMeasurements(84, 83));
    await navigateAndWait(page, '/measurements');
    const row = page.getByTestId('measurement-row-m-later');
    await expect(row.getByTestId('measurement-delta-weight')).toHaveAttribute('data-tone', 'destructive');
    await expect(row.getByTestId('measurement-delta-waist')).toHaveAttribute('data-tone', 'success');
    await expect(page.getByTestId('measurement-weight-trend')).toHaveAttribute('data-tone', 'destructive');
  });

  test('delty wagi wg celu: build_muscle wzrost wagi = success', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user', { trainingProfile: { objective: 'build_muscle' } });
    await setE2EMeasurements(page, e2eMeasurements(83, 84.5));
    await navigateAndWait(page, '/measurements');
    const row = page.getByTestId('measurement-row-m-later');
    await expect(row.getByTestId('measurement-delta-weight')).toHaveAttribute('data-tone', 'success');
    await expect(row.getByTestId('measurement-delta-weight')).toHaveText(/\+1\.5/);
    await expect(page.getByTestId('measurement-weight-trend')).toHaveAttribute('data-tone', 'success');
  });

  test('delty wagi wg celu: bez celu w profilu = neutral (wiersz i badge)', async ({ page }) => {
    await setE2EAuthScenario(page, 'active-user');
    await setE2EMeasurements(page, e2eMeasurements(84, 83));
    await navigateAndWait(page, '/measurements');
    const row = page.getByTestId('measurement-row-m-later');
    await expect(row.getByTestId('measurement-delta-weight')).toHaveAttribute('data-tone', 'neutral');
    await expect(page.getByTestId('measurement-weight-trend')).toHaveAttribute('data-tone', 'neutral');
  });

  // p.1-2: arkusz edycji od dołu bez poziomego overflow, focus na polu wagi (nie na dacie).
  test('edycja pomiaru: arkusz od dołu bez poziomego przewijania, focus na wadze, data i godzina w osobnych wierszach', async ({ page }) => {
    await setE2EMeasurements(page, e2eMeasurements(84, 83));
    await navigateAndWait(page, '/measurements');
    await page.getByTestId('measurement-row-m-later').click();
    const sheet = page.getByTestId('measurement-edit-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId('measurement-edit-weight')).toHaveValue('83');

    const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset?.testid ?? null);
    expect(focused).toBe('measurement-edit-weight');

    const overflow = await sheet.evaluate((el) => ({
      sheet: el.scrollWidth - el.clientWidth,
      doc: document.documentElement.scrollWidth - window.innerWidth,
    }));
    expect(overflow.sheet).toBeLessThanOrEqual(0);
    expect(overflow.doc).toBeLessThanOrEqual(0);

    // Data i godzina jedna pod drugą (osobne wiersze), na całą szerokość arkusza.
    const rows = await page.evaluate(() => {
      const box = (id: string) => document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
      const sheetBox = document.querySelector('[data-testid="measurement-edit-sheet"]')!.getBoundingClientRect();
      const d = box('measurement-edit-date-row');
      const t = box('measurement-edit-time-row');
      return { dateTop: d.top, timeTop: t.top, dateWidth: d.width, timeWidth: t.width, sheetWidth: sheetBox.width };
    });
    expect(rows.timeTop).toBeGreaterThan(rows.dateTop);
    expect(rows.dateWidth).toBeGreaterThan(rows.sheetWidth * 0.8);
    expect(rows.timeWidth).toBeGreaterThan(rows.sheetWidth * 0.8);

    // Kontrakty WP-M bez zmian: przyciski Usuń wpis + Zapisz obecne.
    await expect(sheet.getByTestId('measurement-edit-delete')).toBeVisible();
    await expect(sheet.getByTestId('measurement-edit-save')).toBeVisible();
  });
});
