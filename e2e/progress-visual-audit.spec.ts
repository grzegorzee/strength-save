import { expect, test } from '@playwright/test';
import {
  blockFirebase,
  localDaysAgo,
  navigateAndWait,
  setE2EAuthScenario,
  setE2EWorkouts,
} from './helpers';

const workout = (id: string, daysAgo: number, weight: number, reps: number) => ({
  id,
  userId: 'e2e-test-user',
  dayId: 'day-1',
  date: localDaysAgo(daysAgo),
  completed: true,
  durationSec: 3300,
  exercises: [
    {
      exerciseId: 'ex-1-1',
      sets: [
        { reps, weight, completed: true },
        { reps, weight, completed: true },
        { reps, weight, completed: true },
      ],
    },
  ],
});

test('wizualny smoke Postępów na iPhonie', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  await blockFirebase(page);
  await setE2EAuthScenario(page, 'active-user');
  await setE2EWorkouts(page, [
    workout('visual-1', 1, 82.5, 8),
    workout('visual-2', 4, 80, 8),
    workout('visual-3', 8, 77.5, 10),
    workout('visual-4', 11, 75, 10),
    workout('visual-5', 15, 72.5, 10),
    workout('visual-6', 18, 70, 12),
  ]);

  const screenshots = [
    { route: '/achievements', marker: 'analytics-summary-scoreboard', file: 'results.png' },
    { route: '/achievements?view=analytics&tab=charts', marker: 'monthly-overview-card', file: 'charts.png' },
    { route: '/achievements?view=records', marker: 'records-scoreboard', file: 'records.png' },
  ] as const;

  for (const shot of screenshots) {
    await navigateAndWait(page, shot.route);
    await expect(page.getByTestId(shot.marker)).toBeVisible();
    await page.screenshot({ path: `audit/shots/2026-08-31-x72/${shot.file}`, fullPage: true });
  }

  await navigateAndWait(page, '/achievements?view=records&section=badges');
  await expect(page.getByRole('heading', { level: 1, name: 'Odznaki' })).toBeVisible();
  await expect(page.getByTestId('group-hero')).toHaveCount(0);
  await page.screenshot({ path: 'audit/shots/2026-08-31-x72/badges.png', fullPage: true });
});
