// E-T1 (bug z buildu 107): PR-y sesji liczone z danych — wejście w UKOŃCZONY
// trening (remount, bez przepływu finish) pokazuje rekordy, a share dostaje
// niepuste prs. Wcześniej sessionPRs (useState) po remount = zawsze 0.
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localDaysAgo,
  navigateAndWait,
  setE2EWorkouts,
} from './helpers';

const PREV_DATE = localDaysAgo(6);
const SESSION_DATE = localDaysAgo(1);

const workout = (id: string, date: string, weight: number) => ({
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
    sets: [{ reps: 8, weight, completed: true }],
  }],
});

test.describe('PR-y po remount ukończonego treningu (E-T1)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  });

  test('ukończony trening otwarty z zimna pokazuje Nowe rekordy i hero Rekord w share', async ({ page }) => {
    await setE2EWorkouts(page, [
      workout('w-prev', PREV_DATE, 40),
      workout('w-current', SESSION_DATE, 45),
    ]);
    await navigateAndWait(page, `/workout/day-1?date=${SESSION_DATE}&session=w-current`);
    await expectPageRendered(page);

    // Sekcja rekordów w podsumowaniu (renderuje się tylko przy prs.length > 0).
    await expect(page.getByText('Nowe rekordy')).toBeVisible();
    await expect(page.getByText('Wyciskanie hantli (Lekki skos)').first()).toBeVisible();
  });

  test('regresja: sesja bez poprawy nie pokazuje sekcji rekordów', async ({ page }) => {
    await setE2EWorkouts(page, [
      workout('w-prev', PREV_DATE, 50),
      workout('w-current', SESSION_DATE, 45),
    ]);
    await navigateAndWait(page, `/workout/day-1?date=${SESSION_DATE}&session=w-current`);
    await expectPageRendered(page);

    await expect(page.getByText('Nowe rekordy')).toHaveCount(0);
  });
});
