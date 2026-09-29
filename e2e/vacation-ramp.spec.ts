import { expect, test } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localDaysAgo,
  localToday,
  navigateAndWait,
  setE2EPlanMeta,
  setE2EWorkouts,
  skipPreStartWarmupIfShown,
} from './helpers';

// F2+F3 (2026-09-29): urlop właściciela 22-27.09. F2: w trakcie urlopu
// Dashboard pokazywał "Rozpocznij trening". F3: po urlopie push obiecał ~85%,
// a prefill wpisał 100% (40 kg zamiast 34).

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const PL_WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

const offsetDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayWeeksAgo = (weeks: number) => {
  const d = offsetDate(-7 * weeks);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
};

const EXERCISE = { id: 'day-f3-ex-1', name: 'Wyciskanie E2E', sets: '3 x 8', instructions: [] };
const todayDay = {
  id: 'day-f3',
  dayName: 'Dzień F3',
  weekday: WEEKDAYS[new Date().getDay()],
  focus: 'Push',
  exercises: [EXERCISE],
};

test.describe('Urlop (F2) i rampa po urlopie (F3)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('F2: w trakcie urlopu Dashboard pokazuje kartę przerwy bez CTA treningu', async ({ page }) => {
    // Urlop od przedwczoraj do pojutrza; dzisiejszy dzień planu wypada w urlopie.
    await setE2EPlanMeta(page, {
      days: [todayDay],
      durationWeeks: 9,
      startDate: mondayWeeksAgo(3),
      vacation: { startDate: localDaysAgo(2), endDate: iso(offsetDate(2)), activity: 'none', extendedWeeks: 1 },
    });

    await navigateAndWait(page, '/');
    await expectPageRendered(page);

    const hero = page.getByTestId('break-hero');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('Przerwa do');
    await expect(page.getByTestId('dashboard-primary-action')).toHaveCount(0);
    // Następny trening = ten sam dzień tygodnia za tydzień (pierwszy po urlopie).
    await expect(page.getByTestId('break-next')).toContainText(PL_WEEKDAYS[offsetDate(7).getDay()]);
    await expect(page.getByTestId('break-next')).toContainText(String(offsetDate(7).getDate()));
  });

  test('F3: pierwszy trening po urlopie ma prefill 85% ciężaru sprzed urlopu (40 -> 34)', async ({ page }) => {
    const today = localToday();
    await setE2EPlanMeta(page, {
      days: [todayDay],
      durationWeeks: 9,
      startDate: mondayWeeksAgo(3),
      progression: { enabled: true, deloadEveryWeeks: 5 },
      vacation: { startDate: localDaysAgo(6), endDate: localDaysAgo(1), activity: 'none', extendedWeeks: 1 },
    });
    await setE2EWorkouts(page, [{
      id: 'pre-vacation',
      userId: 'e2e-test-user',
      dayId: 'day-f3',
      date: localDaysAgo(7),
      completed: true,
      exercises: [{
        exerciseId: EXERCISE.id,
        name: EXERCISE.name,
        sets: [1, 2, 3].map(() => ({ reps: 8, weight: 40, completed: true })),
      }],
    }]);

    await navigateAndWait(page, `/workout/day-f3?date=${today}`);
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozpocznij trening/i }).click();
    await skipPreStartWarmupIfShown(page);

    const card = page.locator('.exercise-card').first();
    await expect(card.getByLabel(/Set 1, kg/).first()).toHaveValue('34', { timeout: 7000 });
    await expect(card.getByLabel(/Set 3, kg/).first()).toHaveValue('34');
    await expect(card.getByTestId('exercise-card-target')).toContainText('34');
  });
});
