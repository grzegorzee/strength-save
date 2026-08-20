// J-T5 (doprecyzowanie właściciela 2026-08-20): eksport CSV z wyborem zakresu.
// Dwa punkty wejścia (Historia, Ustawienia → Dane) otwierają ten sam dialog;
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

  test('Historia: dialog, wybór Ostatnie 10, eksport tworzy blob text/csv', async ({ page }) => {
    await setE2EWorkouts(page, [
      workout('w-1', localDaysAgo(1)),
      workout('w-2', localDaysAgo(40)),
    ]);
    await navigateAndWait(page, '/history');
    await expectPageRendered(page);

    const button = page.getByTestId('history-export-csv');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Eksport CSV');
    await button.click();

    const dialog = page.getByTestId('export-workouts-dialog');
    await expect(dialog).toBeVisible();
    // Domyślnie ostatni tydzień: stary trening (40 dni) poza zakresem.
    await expect(page.getByTestId('export-range-week')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('export-preview')).toContainText('1');

    // Ostatnie 10 treningów: wchodzą oba.
    await page.getByTestId('export-range-last10').click();
    await expect(page.getByTestId('export-preview')).toContainText('2');

    await page.getByTestId('export-submit').click();
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
    await expect(dialog).not.toBeVisible();
  });

  test('Ustawienia → Dane: przycisk otwiera ten sam dialog', async ({ page }) => {
    await setE2EWorkouts(page, [workout('w-1', localDaysAgo(1))]);
    await navigateAndWait(page, '/settings');
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
