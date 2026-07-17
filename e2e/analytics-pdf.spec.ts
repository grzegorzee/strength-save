import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
  setE2EWorkouts,
} from './helpers';

// M20: przycisk PDF w Podsumowaniu generuje raport lokalnie (jsPDF lazy chunk).
// W Chromium bez navigator.share leci fallback download — sprawdzamy nazwę
// pliku i nagłówek %PDF (dowód, że to prawdziwy PDF, nie pusty blob).

test('raport treningowy PDF pobiera się z Podsumowania', async ({ page }) => {
  await setE2EAuthScenario(page, 'active-admin');
  await blockFirebase(page);
  await setE2EWorkouts(page, [{
    id: 'pdf-1',
    userId: 'e2e-test-user',
    dayId: 'day-1',
    date: '2026-07-10',
    completed: true,
    durationSec: 3600,
    exercises: [{ exerciseId: 'ex-1-1', sets: [{ reps: 10, weight: 50, completed: true }] }],
  }]);

  await navigateAndWait(page, '/analytics?tab=summary');
  await expectPageRendered(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^strength-save-raport-\d{4}-\d{2}-\d{2}\.pdf$/);
  const path = await download.path();
  const header = readFileSync(path).subarray(0, 5).toString('latin1');
  expect(header).toBe('%PDF-');
});
