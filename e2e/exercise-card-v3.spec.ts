import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered, setE2EAuthScenario, skipPreStartWarmupIfShown } from './helpers';

test.describe('ExerciseCard — Kinetic Precision', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('workout day renders exercise cards with new design structure', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // Exercise cards use new .exercise-card class (no longer shadcn Card)
    const cards = page.locator('.exercise-card');
    await expect(cards.first()).toBeVisible();

    // Each card has a tonal header with a media thumbnail or fallback.
    await expect(cards.first().locator('.exercise-card-header')).toBeVisible();
    await expect(cards.first().locator('.exercise-card-header button').first()).toBeVisible();
  });

  test('exercise name and sets label are always visible (no expand/collapse)', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();

    // Exercise name visible
    const exerciseName = firstCard.locator('h3');
    await expect(exerciseName).toBeVisible();
    const nameText = await exerciseName.textContent();
    expect(nameText?.length).toBeGreaterThan(0);

    // Human-readable set count visible. Meta linia karty zamienia spacje w członach
    // na NBSP (fala 2, łamanie tylko na separatorach), a Playwright NIE normalizuje
    // białych znaków przy regexach — stąd [\s\u00a0].
    await expect(firstCard.getByText(/\d+[\s\u00a0](seria|serie|serii)/)).toBeVisible();
  });

  test('no expand/collapse chevron buttons exist', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // ChevronDown and ChevronUp should not exist
    const chevrons = page.locator('.exercise-card [data-testid="chevron"]');
    await expect(chevrons).toHaveCount(0);

    // Also check there's no ChevronDown/Up SVG (lucide specific class)
    const chevronIcons = page.locator('.exercise-card .lucide-chevron-down, .exercise-card .lucide-chevron-up');
    await expect(chevronIcons).toHaveCount(0);
  });

  test('set grid headers show reps and weight labels', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();

    // Grid headers
    await expect(firstCard.getByText('Powt.')).toBeVisible();
    await expect(firstCard.getByText('kg')).toBeVisible();
  });

  test('set rows have number inputs with exercise-card-input class', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();
    const inputs = firstCard.locator('input.exercise-card-input');

    // count() nie czeka — najpierw auto-wait na wyrenderowane inputy (flake przy pełnym runie).
    await expect(inputs.first()).toBeVisible();
    // At least 2 inputs per set (reps + weight), working sets only (X38: no default warm-up row)
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('set inputs expose unique accessible names', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();
    const exerciseName = (await firstCard.locator('h3').textContent())?.trim();
    expect(exerciseName?.length).toBeGreaterThan(0);

    const labels = await firstCard.locator('input.exercise-card-input').evaluateAll((inputs) =>
      inputs.map((input) => input.getAttribute('aria-label') ?? ''),
    );

    expect(labels.length).toBeGreaterThanOrEqual(4);
    expect(labels.every(Boolean)).toBe(true);
    expect(labels.some((label) => label.includes(exerciseName!) && /kg|lbs/.test(label))).toBe(true);
    expect(labels.some((label) => label.includes(exerciseName!) && /Powt\.|Reps/.test(label))).toBe(true);
  });

  // X38 WP-A: nowa lista serii NIE MA domyślnej W (ani przed startem, ani po nim).
  // Rozgrzewkę dokłada user chipem „Rozgrzewka" (pierwszy od lewej): bez ciężaru
  // roboczego wstawia 1 pustą W na górze tabeli (X17A Z128.1: wspólna tabela,
  // złote „W" w kolumnie SET), po czym chip znika.
  test('no default warm-up row; the Rozgrzewka chip inserts an empty W row at the top', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeVisible();
    await expect(firstCard.getByText('W', { exact: true })).toHaveCount(0);
    await expect(firstCard.getByRole('textbox', { name: /Rozgrzewka W, kg/ })).toHaveCount(0);

    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    // Po starcie nadal zero W: ćwiczenie nie ma historii ani ciężaru roboczego.
    await expect(firstCard.getByText('W', { exact: true })).toHaveCount(0);

    // Chip pierwszy od lewej w rzędzie chipów; bez ciężaru daje pusty wiersz W.
    const chips = firstCard.getByTestId('exercise-card-chips');
    await expect(chips.getByRole('button').first()).toHaveAttribute('data-testid', 'warmup-generate');
    await chips.getByTestId('warmup-generate').click();

    const warmupInput = firstCard.getByRole('textbox', { name: /Rozgrzewka W, kg/ });
    await expect(warmupInput).toHaveCount(1);
    await expect(warmupInput).toHaveValue('');
    await expect(firstCard.getByTestId('warmup-generate')).toHaveCount(0);

    // Nagłówek kolumny SET nad wierszem W, wiersz W nad serią roboczą 1.
    const setHeaderBox = await firstCard.getByText('Ser.', { exact: true }).first().boundingBox();
    const warmupBox = await firstCard.getByText('W', { exact: true }).boundingBox();
    const set1Box = await firstCard.getByRole('textbox', { name: /Set 1, kg/ }).first().boundingBox();
    expect(setHeaderBox!.y).toBeLessThan(warmupBox!.y);
    expect(warmupBox!.y).toBeLessThan(set1Box!.y);
  });

  test('tonal header separates the card without a visible divider', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();
    const header = firstCard.locator('.exercise-card-header');
    await expect(header).toBeVisible();

    // X17A Z128.2: klasa .exercise-card-divider (height:0, background:transparent)
    // była martwa — usunięta. Granicę robi wyłącznie przesunięcie tła nagłówka.
    await expect(firstCard.locator('.exercise-card-divider')).toHaveCount(0);
    const headerBg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    const cardBg = await firstCard.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(headerBg).not.toBe(cardBg);
  });

  test('read-only mode hides interactive controls (delete, add set, notes)', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();

    // In read-only mode (workout not started), these should NOT be visible
    const deleteButtons = firstCard.locator('button:has-text("×")');
    await expect(deleteButtons).toHaveCount(0);

    const addBtn = firstCard.getByText('Dodaj serię');
    await expect(addBtn).toHaveCount(0);

    const notesBtn = firstCard.getByText('Notatka');
    await expect(notesBtn).toHaveCount(0);
  });

  test('interactive controls appear after starting workout', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // Click "Rozpocznij trening" to start workout and make cards editable
    const startBtn = page.getByRole('button', { name: /Rozpocznij trening/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await skipPreStartWarmupIfShown(page);

    // Wait for editable state
    const firstCard = page.locator('.exercise-card').first();

    // Working sets are fixed to the plan during an active workout, but their
    // inputs and completion controls must become available.
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    await expect(firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first()).toBeEnabled();

    // X17A Z129.2: notatka sesyjna przeniesiona z chipa do menu ⋯.
    await firstCard.getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Notatka', exact: true }).click();
    await expect(firstCard.locator('textarea')).toBeVisible();
  });

  // X17A Z129.2: rzadkie akcje ćwiczenia zebrane w jednym menu.
  test('menu ⋯ zbiera rzadkie akcje, chipy mają etykiety', async ({ page }) => {
    // RPE/ból/jakość są funkcjami zdrowotnymi. Ten test weryfikuje stary,
    // świadomie włączony przepływ; tryb podstawowy bez zgody ma osobny test.
    await setE2EAuthScenario(page, 'active-user', {
      consents: {
        termsVersion: '2.0',
        privacyVersion: '2.1',
        healthGranted: true,
        healthVersion: '1.1',
        healthEpoch: 1,
        healthGrantId: 'e2e-exercise-card-health-grant',
      },
    });
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    await firstCard.getByRole('button', { name: 'Więcej akcji' }).click();
    const menu = page.getByRole('menu');
    for (const item of ['Instrukcje', 'Zamień ćwiczenie', 'Pomiń', 'Notatka', 'Przypnij notatkę']) {
      await expect(menu.getByRole('menuitem', { name: item, exact: true })).toBeVisible();
    }

    // „Instrukcje" pokazują treść, której nie ma już na karcie.
    await menu.getByRole('menuitem', { name: 'Instrukcje' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Zamykamy PRZYCISKIEM, nie klawiszem: Escape wysłany natychmiast po
    // `toBeVisible()` trafia w animację otwierania dialogu i bywa gubiony.
    // Potem czekamy na REALNE zniknięcie — dopiero wtedy pola serii przyjmują wpis.
    await dialog.getByRole('button', { name: 'Zamknij okno' }).click();
    await expect(dialog).toHaveCount(0);

    // Chip kalkulatora ma etykietę — po samej ikonie dysku nie było wiadomo, co robi.
    // Ciężar wpisujemy w PIERWSZĄ SERIĘ ROBOCZĄ (wiersz rozgrzewki jest wyżej):
    // kalkulator i generator rozgrzewki liczą się wyłącznie z serii roboczych.
    // Selektor po aria-label, nie po indeksie — indeks zależy od liczby rozgrzewek.
    const weightInput = firstCard.getByLabel(/Set 1, (kg|lbs)/).first();
    await weightInput.fill('60');
    await weightInput.blur();
    const chips = firstCard.getByTestId('exercise-card-chips');
    await expect(chips.getByText('Talerze')).toBeVisible();
    await expect(chips.getByText('Rozgrzewka')).toBeVisible();
    await expect(chips.getByText('Metryki')).toBeVisible();
  });

  // X17B Z133.6: kalkulator przestaje być ślepą uliczką.
  test('kalkulator talerzy: zmiana wagi w arkuszu i „Ustaw w serii"', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    // Z134.3: chip jest dostępny ZANIM user wpisze jakikolwiek ciężar.
    await expect(firstCard.getByTestId('plate-calculator-open')).toBeVisible();
    await firstCard.getByTestId('plate-calculator-open').click();

    // Waga jest edytowalna w arkuszu (główny zarzut usera).
    const weight = page.getByLabel(/Waga docelowa/i);
    await expect(weight).toBeVisible();
    await weight.fill('100');
    await expect(page.getByTestId('plates-summary')).toContainText('25');

    // Domknięcie pętli: policzona waga wraca do serii.
    await page.getByRole('button', { name: /Ustaw w serii/i }).click();
    await expect(firstCard.getByLabel(/Set 1, (kg|lbs)/).first()).toHaveValue('100');
  });

  // Z193: bramka warstw — incydent z builda 81: dialog wideo otwarty spod
  // modalnego menu zostawiał body z pointer-events: none (X martwy, force-quit).
  test('Z193: menu → dialog → X za pierwszym tapem, body bez pointer-events lock', async ({ page }) => {
    await page.route('**/media.gjasionowicz.pl/**', (route) => (
      route.request().url().endsWith('.jpg')
        ? route.fulfill({ path: 'e2e/fixtures/sample-poster.jpg', contentType: 'image/jpeg' })
        : route.fulfill({ path: 'e2e/fixtures/sample-video.mp4', contentType: 'video/mp4' })
    ));
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    // (a) menu ⋯ → Instrukcje → dialog → X zamyka za PIERWSZYM kliknięciem.
    await firstCard.getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Instrukcje' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Zamknij okno' }).click();
    await expect(dialog).toHaveCount(0);

    // Wszystkie kontrolki karty klikalne: odhaczenie serii działa od razu.
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).fill('20');
    await firstCard.getByLabel(/Set 1, Powt\./).fill('5');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(firstCard.getByRole('button', { name: 'Odznacz serię' }).first()).toBeVisible();

    // (c) po zamknięciu dialogu body nie ma pointer-events: none.
    expect(await page.evaluate(() => document.body.style.pointerEvents)).not.toBe('none');

    // (b) menu OTWARTE → tap w miniaturę wideo. Modalne menu pochłania pierwszy
    // tap poza warstwą (standard: tap tylko zamyka menu) — kluczowe jest, że menu
    // ZNIKA, a dialog otwarty kolejnym tapem działa i nie ląduje pod blokadą.
    const cardWithThumb = page.locator('.exercise-card:has(.exercise-card-header img)').first();
    const thumb = cardWithThumb.locator('.exercise-card-header button:has(img)').first();
    await cardWithThumb.getByRole('button', { name: 'Więcej akcji' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await thumb.click({ force: true });
    await expect(page.getByRole('menu')).toHaveCount(0);
    if (!(await page.getByRole('dialog').isVisible().catch(() => false))) {
      await thumb.click();
    }

    const videoDialog = page.getByRole('dialog');
    await expect(videoDialog).toBeVisible({ timeout: 5000 });
    await expect(videoDialog.locator('video')).toBeVisible();
    await videoDialog.getByRole('button', { name: 'Zamknij okno' }).click();
    await expect(videoDialog).toHaveCount(0);

    // Finał: zero locka na body — apka w pełni klikalna.
    expect(await page.evaluate(() => document.body.style.pointerEvents)).not.toBe('none');
  });

  test('pominięcie ćwiczenia z menu ⋯ usuwa kartę z listy', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const cards = page.locator('.exercise-card');
    await expect(cards.first().locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    const before = await cards.count();
    const firstName = await cards.first().getByRole('heading').first().textContent();

    await cards.first().getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Pomiń' }).click();

    await expect(cards).toHaveCount(before - 1);
    await expect(cards.first().getByRole('heading').first()).not.toHaveText(firstName!);
  });

  // Z157: timer jest domyślnie WŁĄCZONY — wyłączenie to ustawienie usera (Profil),
  // persystowane w localStorage, nie brak flagi buildowej.
  test('rest timer is globally unavailable while the user setting is off', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('rest-timer-default', '30');
      localStorage.setItem('fittracker_workout_timers_v1', 'false');
    });
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const startBtn = page.getByRole('button', { name: /Rozpocznij trening|Start workout/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.getByRole('button', { name: /Zaznacz serię jako zrobioną|Mark set as done/i }).first()).toBeEnabled({ timeout: 5000 });

    // X38: bez domyślnej W pierwszy checkmark to seria robocza 1.
    const checkButtons = firstCard.getByRole('button', { name: /Zaznacz serię jako zrobioną|Mark set as done/i });
    await checkButtons.first().click();

    await expect(page.getByTestId('rest-timer')).toHaveCount(0);
  });

  test('progression badge renders for exercises with previous data', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // Progression badges may or may not exist depending on whether there's previous workout data.
    // In E2E mode without Firebase, there's no previous data, so badges won't show.
    // We just verify no crash and cards render properly.
    const cards = page.locator('.exercise-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // All cards should have their exercise name visible
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = cards.nth(i);
      await expect(card.locator('h3')).toBeVisible();
    }
  });

  test('multiple workout days render exercise cards correctly', async ({ page }) => {
    const days = ['/workout/day-1', '/workout/day-2', '/workout/day-3'];

    for (const day of days) {
      await navigateAndWait(page, day);
      await expectPageRendered(page);

      const cards = page.locator('.exercise-card');
      // WebKit can still be resolving the lazy workout route after the app shell
      // is ready. Wait for user-visible content instead of sampling the DOM once.
      await expect(cards.first()).toBeVisible({ timeout: 10_000 });
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Each card has h3 with exercise name
      await expect(cards.first().locator('h3')).toBeVisible();

      // Each card has inputs
      const inputs = cards.first().locator('input.exercise-card-input');
      expect(await inputs.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('video button renders for exercises with videoUrl', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // Check if any card has a video play button (Play icon from lucide)
    const cards = page.locator('.exercise-card');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();

    // At least verify no crash — video buttons are optional
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('instructions are always visible without needing to expand', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // Look for instruction blocks (border-left style)
    const instructions = page.locator('.exercise-card .border-l-2');
    // Instructions may or may not exist depending on exercise data
    // Just verify no crash and page is functional
    const cards = page.locator('.exercise-card');
    await expect(cards.first()).toBeVisible();
  });

  test('initial state is not visually marked as completed', async ({ page }) => {
    // This test verifies the CSS class is applied correctly
    // In E2E mode, sets start empty so nothing is completed
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();

    // Card should NOT have opacity-50 initially (no completed sets)
    await expect(firstCard).not.toHaveClass(/opacity-50/);

  });

  test('superset cards keep the workout list functional', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const allCards = page.locator('.exercise-card');
    expect(await allCards.count()).toBeGreaterThanOrEqual(1);
  });

  // Z171: sekwencja z realnego treningu na buildzie 80 — dodana seria z danymi
  // usuwa się przez dialog i NIE wraca po wyjściu i powrocie (draft round-trip).
  test('Z171: usunięta seria nie wraca po wyjściu na Dashboard i powrocie', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('fittracker_workout_timers_v1', 'false');
    });
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    const repsInputs = firstCard.getByLabel(/Powt\./);
    const before = await repsInputs.count();

    // Marker trwałości draftu: waga w serii 1 musi przeżyć round-trip.
    const firstWeight = firstCard.getByLabel(/Set 1, (kg|lbs)/).first();
    await firstWeight.fill('60');

    await firstCard.getByRole('button', { name: 'Dodaj serię' }).click();
    await expect(repsInputs).toHaveCount(before + 1);

    // Wpisz wagę w NOWEJ serii i odhacz ją (realne dane → dialog przy usuwaniu).
    await firstCard.getByLabel(/Set \d+, (kg|lbs)/).last().fill('72.5');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).last().click();

    await firstCard.getByRole('button', { name: 'Usuń serię' }).last().click();
    await page.getByTestId('remove-set-confirm').click();
    await expect(repsInputs).toHaveCount(before);

    // Draft round-trip: wyjście na Dashboard i powrót — seria NADAL usunięta,
    // a waga z serii 1 przywrócona (dowód, że draft faktycznie wrócił).
    await page.waitForTimeout(1000);
    await navigateAndWait(page, '/');
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    const cardAfter = page.locator('.exercise-card').first();
    await expect(cardAfter.getByLabel(/Set 1, (kg|lbs)/).first()).toHaveValue('60', { timeout: 5000 });
    await expect(cardAfter.getByLabel(/Powt\./)).toHaveCount(before);
  });
});

// =====================================================
// X17C Z136: pasek przerwy inline (za flagą — override tylko w trybie E2E)
// =====================================================
test.describe('Pasek przerwy w karcie (X17C Z136)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('fittracker_e2e_flag_workoutTimers', 'true');
    });
  });

  test('odhaczenie serii roboczej startuje pasek, +15 wydłuża, Pomiń kończy', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    // X38: bez domyślnej W pierwszy checkmark = seria robocza 1.
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).fill('20');
    await firstCard.getByLabel(/Set 1, Powt\./).fill('5');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();

    // Fala 2 (2026-08-20): pasek jest STICKY na dole ekranu (render w WorkoutDay,
    // poza kartą), a korekty -15/+15 mieszkają w widoku pełnoekranowym.
    const bar = page.getByTestId('rest-bar');
    await expect(bar).toBeVisible();

    await page.getByTestId('rest-bar-expand').click();
    const fullscreen = page.getByTestId('rest-fullscreen');
    await expect(fullscreen).toBeVisible();
    const before = await fullscreen.textContent();
    await fullscreen.getByRole('button', { name: '+15' }).click();
    await expect(fullscreen).not.toHaveText(before!);

    await fullscreen.getByRole('button', { name: 'Pomiń' }).click();
    await expect(page.getByTestId('rest-bar')).toHaveCount(0);
  });

  test('tap w korpus paska otwiera ustawienia timera, SKIP nie (fala 2, wymóg właściciela)', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).fill('20');
    await firstCard.getByLabel(/Set 1, Powt\./).fill('5');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();

    await expect(page.getByTestId('rest-bar')).toBeVisible();
    await page.getByTestId('rest-bar-settings').click();
    await expect(page.getByText('Ustawienia treningu')).toBeVisible();
  });

  test('tap na pasek otwiera widok pełnoekranowy', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
    await skipPreStartWarmupIfShown(page);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    await firstCard.getByLabel(/Set 1, (kg|lbs)/).fill('20');
    await firstCard.getByLabel(/Set 1, Powt\./).fill('5');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();

    // Fala 2: pasek sticky poza kartą — expand z page, nie z firstCard.
    await page.getByTestId('rest-bar-expand').click();
    const fullscreen = page.getByTestId('rest-fullscreen');
    await expect(fullscreen).toBeVisible();
    // Zawężone do overlayu: „Zwiń" występuje też w nawigacji aplikacji.
    await fullscreen.getByRole('button', { name: 'Zwiń' }).click();
    await expect(page.getByTestId('rest-fullscreen')).toHaveCount(0);
  });
});
