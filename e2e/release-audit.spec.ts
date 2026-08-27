import { expect, test, type Page } from '@playwright/test';
import { blockFirebase, localDaysAgo, setE2EAuthScenario, setE2EWorkouts } from './helpers';

// Release-readiness audit: dowód renderowania najważniejszych tras dla trzech
// ról i w dwóch orientacjach. To nie zastępuje natywnego smoke (safe-area,
// chooser, background), ale pilnuje białych ekranów, błędów konsoli, NaN i
// poziomego overflow na webowym odpowiedniku WKWebView.

type AuditIssue = { kind: 'console' | 'pageerror'; message: string };

const observeRuntime = (page: Page): AuditIssue[] => {
  const issues: AuditIssue[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Harness świadomie blokuje Firebase, by audyt nie dotknął realnych danych.
    // Odrzucamy wyłącznie wynikający z tego szum transportowy; wyjątki JS i inne
    // console.error nadal są blockerem testu.
    if (text === 'Failed to load resource: net::ERR_FAILED') return;
    if (text.includes('@firebase/firestore:') && text.includes('Could not reach Cloud Firestore backend')) return;
    issues.push({ kind: 'console', message: text });
  });
  page.on('pageerror', (error) => issues.push({ kind: 'pageerror', message: error.message }));
  return issues;
};

const assertHealthyPage = async (page: Page, issues: AuditIssue[], expectsMain = true) => {
  await expect.poll(() => page.locator('#root > *').count()).toBeGreaterThan(0);
  if (expectsMain) await expect(page.getByRole('main')).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length).toBeGreaterThan(20);
  expect(bodyText).not.toMatch(/\bNaN\b/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(issues).toEqual([]);
};

const activeRoutes = [
  ['dashboard', '/'],
  ['plan', '/plan'],
  ['history', '/history'],
  ['progress', '/achievements'],
  ['measurements', '/measurements'],
  ['exercises', '/exercises'],
  ['cycles', '/cycles'],
  ['settings', '/settings'],
  ['workout', '/workout/day-1'],
] as const;

const seedActiveUser = async (page: Page) => {
  await setE2EAuthScenario(page, 'active-user');
  await setE2EWorkouts(page, [1, 4, 9, 16, 24].map((daysAgo, index) => ({
    id: `audit-workout-${index + 1}`,
    userId: 'e2e-test-user',
    dayId: `day-${(index % 3) + 1}`,
    dayName: ['Poniedziałek', 'Środa', 'Piątek'][index % 3],
    date: localDaysAgo(daysAgo),
    completed: true,
    durationSec: 2700 + (index * 300),
    exercises: [{
      exerciseId: 'ex-1-1',
      name: 'Wyciskanie hantli (Lekki skos)',
      sets: [{ reps: 8 + index, weight: 30 + (index * 2.5), completed: true }],
    }],
  })));
};

for (const [name, route] of activeRoutes) {
  test(`audit active-user portrait: ${name}`, async ({ page }) => {
    const issues = observeRuntime(page);
    await blockFirebase(page);
    await seedActiveUser(page);
    await page.goto(`./#${route}`);
    await assertHealthyPage(page, issues);
    await page.screenshot({ path: `audit/shots/2026-08-27/active-user_${name}.png`, fullPage: true });
  });
}

test('audit new-user portrait: onboarding', async ({ page }) => {
  const issues = observeRuntime(page);
  await blockFirebase(page);
  await setE2EAuthScenario(page, 'new-user');
  await page.goto('./#/onboarding');
  await expect(page.getByTestId('consent-terms')).toBeVisible();
  await assertHealthyPage(page, issues, false);
  await page.screenshot({ path: 'audit/shots/2026-08-27/new-user_onboarding.png', fullPage: true });
});

test('audit active-admin portrait: panel', async ({ page }) => {
  const issues = observeRuntime(page);
  await blockFirebase(page);
  await setE2EAuthScenario(page, 'active-admin');
  await page.goto('./#/admin');
  await assertHealthyPage(page, issues);
  await page.screenshot({ path: 'audit/shots/2026-08-27/active-admin_admin.png', fullPage: true });
});

for (const [name, route] of [
  ['dashboard', '/'],
  ['workout', '/workout/day-1'],
  ['history', '/history'],
  ['settings', '/settings'],
] as const) {
  test(`audit active-user landscape: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const issues = observeRuntime(page);
    await blockFirebase(page);
    await seedActiveUser(page);
    await page.goto(`./#${route}`);
    await assertHealthyPage(page, issues);
    await page.screenshot({ path: `audit/shots/2026-08-27/landscape_${name}.png`, fullPage: true });
  });
}
