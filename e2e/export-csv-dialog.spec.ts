// J-T5 (doprecyzowanie właściciela 2026-08-20): eksport CSV z wyborem zakresu.
// Dwa punkty wejścia (Historia, Profil → Twoje dane) otwierają ten sam dialog;
// eksport nie rzuca i tworzy blob URL text/csv (spy na URL.createObjectURL).
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localDaysAgo,
  navigateAndWait,
  setE2EWorkouts,
} from './helpers';

const workout = (id: string, date: string) => ({
  id,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  date,
  completed: true,
  durationSec: 3600,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie hantli (Lekki skos)',
    sets: [{ reps: 8, weight: 40, completed: true }],
  }],
});

test.describe('Eksport CSV z wyborem zakresu (J-T5)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      // Spy na createObjectURL — dowód, że plik faktycznie powstał.
      const original = URL.createObjectURL.bind(URL);
      (window as unknown as { __csvBlobs: Blob[] }).__csvBlobs = [];
      URL.createObjectURL = (blob: Blob) => {
        (window as unknown as { __csvBlobs: Blob[] }).__csvBlobs.push(blob);
        return original(blob);
      };
    });
  });

  // WP-H (X28): w Historii jeden Export (bottom sheet 2c) zamiast dialogu CSV;
  // format CSV idzie tą samą ścieżką generacji (workout-csv-download).
  test('Historia: Export sheet, zakres Cała historia, CSV tworzy blob text/csv', async ({ page }) => {
    await setE2EWorkouts(page, [
      workout('w-1', localDaysAgo(1)),
      workout('w-2', localDaysAgo(40)),
    ]);
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);

    const button = page.getByTestId('history-export');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Eksport');
    await button.click();

    const sheet = page.getByTestId('history-export-sheet');
    await expect(sheet).toBeVisible();
    // Bez PERIOD i bez aktywnego cyklu domyślny zakres = Cała historia.
    await expect(page.getByTestId('export-scope-all')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('export-scope-period')).toBeDisabled();

    await page.getByTestId('export-format-csv').click();
    await expect
      .poll(async () => page.evaluate(() =>
        (window as unknown as { __csvBlobs: Blob[] }).__csvBlobs
          .filter((b) => b.type.includes('text/csv')).length))
      .toBeGreaterThan(0);
    const csvText = await page.evaluate(async () => {
      const blobs = (window as unknown as { __csvBlobs: Blob[] }).__csvBlobs;
      return blobs[blobs.length - 1].text();
    });
    expect(csvText).toContain('date,day,focus,exercise');
    expect(csvText).toContain('Wyciskanie hantli (Lekki skos)');
    await expect(sheet).not.toBeVisible();
  });

  test('Profil → Twoje dane: przycisk otwiera ten sam dialog', async ({ page }) => {
    await setE2EWorkouts(page, [workout('w-1', localDaysAgo(1))]);
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);

    const button = page.getByTestId('data-export-csv');
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    await expect(button).toContainText('Eksport treningów (CSV)');
    await button.click();

    await expect(page.getByTestId('export-workouts-dialog')).toBeVisible();
    await expect(page.getByTestId('export-preview')).toContainText('1');
  });
});
