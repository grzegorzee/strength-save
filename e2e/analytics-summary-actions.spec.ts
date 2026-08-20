// T11 (feedback 2026-08-20): rząd Tydzień/Miesiąc/PDF/CSV/Kopiuj w Podsumowaniu
// łamie się (flex-wrap) zamiast wystawać poza viewport 390px.
// T12: przycisk CSV otwiera ExportWorkoutsDialog (ten sam co Historia/Ustawienia).
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localDaysAgo,
  navigateAndWait,
  setE2EAuthScenario,
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

test.describe('Podsumowanie: rząd akcji (T11)', () => {
  test.beforeEach(async ({ page }) => {
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
    });
    await setE2EWorkouts(page, [
      workout('w-1', localDaysAgo(1)),
      workout('w-2', localDaysAgo(3)),
    ]);
  });

  test('przycisk Kopiuj mieści się w viewport 390px, strona bez poziomego scrolla', async ({ page }) => {
    await navigateAndWait(page, '/analytics?tab=summary');
    await expectPageRendered(page);

    const copyButton = page.getByTestId('analytics-copy');
    await expect(copyButton).toBeVisible();
    const box = await copyButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noHorizontalScroll).toBe(true);
  });

  test('przycisk CSV otwiera dialog eksportu, eksport tworzy blob text/csv (T12)', async ({ page }) => {
    // Spy na createObjectURL — dowód, że plik faktycznie powstał
    // (wzorzec e2e/export-csv-dialog.spec.ts).
    await page.addInitScript(() => {
      const original = URL.createObjectURL.bind(URL);
      (window as unknown as { __csvBlobs: Blob[] }).__csvBlobs = [];
      URL.createObjectURL = (blob: Blob) => {
        (window as unknown as { __csvBlobs: Blob[] }).__csvBlobs.push(blob);
        return original(blob);
      };
    });
    await navigateAndWait(page, '/analytics?tab=summary');
    await expectPageRendered(page);

    const csvButton = page.getByTestId('analytics-export-csv');
    await expect(csvButton).toBeVisible();
    await expect(csvButton).toContainText('CSV');
    await csvButton.click();

    const dialog = page.getByTestId('export-workouts-dialog');
    await expect(dialog).toBeVisible();
    // Domyślnie ostatni tydzień: oba treningi (1 i 3 dni temu) w zakresie.
    await expect(page.getByTestId('export-range-week')).toHaveAttribute('aria-checked', 'true');
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
});
