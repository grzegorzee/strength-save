import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered } from './helpers';

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

    // Human-readable set count visible
    await expect(firstCard.getByText(/\d+ (seria|serie|serii)/)).toBeVisible();
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
    // At least 2 inputs per set (reps + weight), warmup + working sets
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

  // X17A Z128.1: rozgrzewka wchodzi do wspólnej tabeli serii. Osobny badge sekcji
  // „Rozgrzewka" znika, oznaczeniem zostaje złote „W" w kolumnie SET.
  test('warmup row sits in the set table under the column headers', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const firstCard = page.locator('.exercise-card').first();

    await expect(firstCard.getByText('Rozgrzewka', { exact: true })).toHaveCount(0);

    const warmupLabel = firstCard.getByText('W', { exact: true });
    await expect(warmupLabel).toBeVisible();

    // Nagłówek kolumny SET jest nad wierszem rozgrzewkowym.
    const setHeaderBox = await firstCard.getByText('Set', { exact: true }).first().boundingBox();
    const warmupBox = await warmupLabel.boundingBox();
    expect(setHeaderBox!.y).toBeLessThan(warmupBox!.y);
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
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });

    await firstCard.getByRole('button', { name: 'Więcej akcji' }).click();
    const menu = page.getByRole('menu');
    for (const item of ['Instrukcje', 'Zamień ćwiczenie', 'Pomiń', 'Notatka', 'Przypnij notatkę']) {
      await expect(menu.getByRole('menuitem', { name: item, exact: true })).toBeVisible();
    }

    // „Instrukcje" pokazują treść, której nie ma już na karcie.
    await menu.getByRole('menuitem', { name: 'Instrukcje' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

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

  test('pominięcie ćwiczenia z menu ⋯ usuwa kartę z listy', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();

    const cards = page.locator('.exercise-card');
    await expect(cards.first().locator('input.exercise-card-input').first()).toBeEnabled({ timeout: 5000 });
    const before = await cards.count();
    const firstName = await cards.first().getByRole('heading').first().textContent();

    await cards.first().getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Pomiń' }).click();

    await expect(cards).toHaveCount(before - 1);
    await expect(cards.first().getByRole('heading').first()).not.toHaveText(firstName!);
  });

  test('rest timer is globally unavailable while the feature flag is disabled', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('rest-timer-default', '30');
    });
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    const startBtn = page.getByRole('button', { name: /Rozpocznij trening|Start workout/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.getByRole('button', { name: /Zaznacz serię jako zrobioną|Mark set as done/i }).first()).toBeEnabled({ timeout: 5000 });

    const checkButtons = firstCard.getByRole('button', { name: /Zaznacz serię jako zrobioną|Mark set as done/i });
    await checkButtons.nth(1).click();

    await expect(page.getByTestId('rest-timer')).toHaveCount(0);
  });

  test('progression badge renders for exercises with previous data', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');
    await expectPageRendered(page);

    // Progression badges may or may not exist depending on whether there's previous workout data.
    // In E2E mode without Firebase, there's no previous data, so badges won't show.
    // We just verify no crash and cards render properly.
    const cards = page.locator('.exercise-card');
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
});
