import { test, expect } from '@playwright/test';
import { auditScreenshotPath, blockFirebase, navigateAndWait, writeWorkoutDraftDb, writeWorkoutSyncQueue, readWorkoutDraftDb } from './helpers';

const exercises = [
  'Przysiad ze sztangą', 'Martwy Ciąg Rumuński (RDL)', 'Ściąganie drążka wyciągu górnego',
  'Wykroki chodzone', 'Wznosy hantli bokiem w opadzie tułowia', 'Rozpiętki na maszynie',
].map((name, index) => ({
  id: `feedback-ex-${index}`, name, sets: '3 x 12-15', instructions: [],
  ...(index >= 4 ? { isSuperset: true, supersetGroup: 'pair-one' } : {}),
}));

test.beforeEach(async ({ page }) => {
  await blockFirebase(page);
  await page.clock.setFixedTime(new Date('2026-09-09T10:00:00+02:00'));
  await page.addInitScript(({ exercises }) => {
    localStorage.setItem('app-language', 'pl');
    localStorage.setItem('fittracker_e2e_plan', JSON.stringify({
      startDate: '2026-09-07', durationWeeks: 10, name: 'Full Body',
      days: [
        { id: 'day-a', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Full Body A', exercises },
        { id: 'day-b', dayName: 'Środa', weekday: 'wednesday', focus: 'Full Body B', exercises },
        { id: 'day-c', dayName: 'Piątek', weekday: 'friday', focus: 'Full Body C', exercises },
      ],
    }));
    localStorage.setItem('fittracker_e2e_workouts', '[]');
    localStorage.setItem('fittracker_e2e_manual_activities', JSON.stringify([
      { id: 'swim-one', userId: 'e2e-test-user', type: 'Swim', date: '2026-09-08', movingTime: 2400, createdAt: 1 },
    ]));
    localStorage.setItem('fittracker_lapse_dismissed_v1', JSON.stringify(['2026-09-07', '2026-09-08', 'week:2026-09-07']));
  }, { exercises });
});

for (const viewport of [{ width: 393, height: 852 }, { width: 375, height: 667 }]) {
  test(`Dzisiaj mieści się bez przewijania ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('dashboard-primary-action')).toBeVisible();
    await expect(page.getByTestId('dash-week-cardio')).toHaveCount(0);
    const actions = await page.getByTestId('dash-actions').boundingBox();
    const nav = await page.getByRole('navigation', { name: 'Nawigacja mobilna' }).boundingBox();
    expect(actions).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(nav!.y - 4);
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, viewport: innerHeight }));
    expect(size.scroll).toBeLessThanOrEqual(size.viewport + 1);
    await page.screenshot({ path: auditScreenshotPath(`feedback-today-${viewport.width}.png`), fullPage: true });
    await page.getByTestId('add-cardio-open').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}

test('Plan dnia: pełne nazwy superserii i pojedynczy powrót', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await navigateAndWait(page, '/day');
  await expect(page.getByText('Full Body B', { exact: true })).toBeVisible();
  await expect(page.getByTestId('back-bar')).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Ćwiczenia', exact: true })).toContainText('5A');
  await expect(page.getByRole('list', { name: 'Ćwiczenia', exact: true })).toContainText('5B');
  for (const name of exercises.map(e => e.name)) {
    const label = page.getByRole('list', { name: 'Ćwiczenia', exact: true }).locator('li').filter({ hasText: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).locator('p').first();
    await label.scrollIntoViewIfNeeded();
    const readable = await label.evaluate(el => {
      const style = getComputedStyle(el);
      return { width: el.clientWidth, scroll: el.scrollWidth, overflow: style.textOverflow };
    });
    expect(readable.width).toBeGreaterThan(130);
    expect(readable.scroll).toBeLessThanOrEqual(readable.width + 1);
    expect(readable.overflow).not.toBe('ellipsis');
  }
  await page.screenshot({ path: auditScreenshotPath('feedback-day-plan.png'), fullPage: true });
});

for (const state of ['completed', 'rest'] as const) {
  test(`Dzisiaj ${state}: szybkie akcje nad nawigacją z obszarami bezpiecznymi iPhone'a`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    if (state === 'rest') await page.clock.setFixedTime(new Date('2026-09-10T10:00:00+02:00'));
    await page.addInitScript(({ state }) => {
      if (state === 'completed') localStorage.setItem('fittracker_e2e_workouts', JSON.stringify([{
        id: 'finished-wednesday', userId: 'e2e-test-user', dayId: 'day-b', date: '2026-09-09',
        completed: true, durationSec: 3600, revision: 1,
        exercises: [{ exerciseId: 'feedback-ex-0', name: 'Przysiad ze sztangą', sets: [{ weight: 80, reps: 6, completed: true }] }],
      }]));
      localStorage.setItem('fittracker_lapse_dismissed_v1', JSON.stringify(['2026-09-07', '2026-09-08', '2026-09-09', 'week:2026-09-07']));
    }, { state });
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('dash-actions')).toBeVisible();
    await page.addStyleTag({ content: 'header { padding-top: 59px !important; } nav[aria-label="Nawigacja mobilna"] { bottom: 46px !important; }' });
    await page.evaluate(() => dispatchEvent(new Event('resize')));
    await expect.poll(async () => {
      const actions = await page.getByTestId('dash-actions').boundingBox();
      const nav = await page.getByRole('navigation', { name: 'Nawigacja mobilna' }).boundingBox();
      return actions!.y + actions!.height <= nav!.y - 4;
    }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.screenshot({ path: auditScreenshotPath(`feedback-today-${state}-insets.png`), fullPage: true });
  });
}

test('Plan: pływanie pozostaje na osi czasu i w podsumowaniu tygodnia', async ({ page }) => {
  await navigateAndWait(page, '/plan');
  await expect(page.getByTestId('manual-activity-card')).toHaveCount(1);
  await expect(page.getByTestId('manual-activity-card')).toContainText('Pływanie');
  await expect(page.getByTestId('plan-activity-summary')).toContainText('Cardio: 1 · 40 min');
  await expect(page.getByTestId('plan-activity-summary')).toContainText('Aktywności: 1');
  await page.screenshot({ path: auditScreenshotPath('feedback-plan-cardio.png'), fullPage: true });
});


test('Dzisiaj: kompaktowe bezpośrednie ponowienie synchronizacji zachowuje zapis po błędzie', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await navigateAndWait(page, '/');
  const sessionId = 'feedback-pending';
  await writeWorkoutDraftDb(page, {
    sessionId, userId: 'e2e-test-user', dayId: 'day-b', date: '2026-09-09', cycleId: null,
    sessionOrigin: 'remote', remoteSessionId: sessionId,
    exerciseSets: { 'feedback-ex-0': [{ weight: 80, reps: 6, completed: true }] },
    exerciseNotes: {}, exerciseNames: { 'feedback-ex-0': 'Przysiad ze sztangą' }, exerciseMetrics: {},
    dayNotes: '', skippedExercises: [], startedAt: Date.now() - 3600000, updatedAt: Date.now(),
    lastFirebaseSyncAt: null, version: 1, dirty: true, completedLocally: true, finalSyncPending: true,
  });
  await writeWorkoutSyncQueue(page, 'e2e-test-user', [{
    queueId: sessionId, sessionId, userId: 'e2e-test-user', dayId: 'day-b', date: '2026-09-09',
    sessionOrigin: 'remote', dirty: true, finalSyncPending: true, updatedAt: Date.now(),
    retryCount: 1, lastError: 'permission-denied', permanent: true,
  }]);
  await page.evaluate(() => dispatchEvent(new Event('strength-save-workout-sync-state-changed')));
  const banner = page.getByTestId('dashboard-sync-banner');
  await expect(banner).toBeVisible();
  await expect(banner).not.toContainText(/Sync Center|retry all/);
  const retry = banner.getByRole('button', { name: 'Synchronizuj teraz' });
  await expect(retry).toBeVisible();
  const box = await banner.boundingBox();
  expect(box!.height).toBeLessThan(140);
  await page.screenshot({ path: auditScreenshotPath('feedback-today-sync.png'), fullPage: true });
  await retry.click();
  await expect(retry).toBeEnabled({ timeout: 30000 });
  await expect(banner).toBeVisible();
  expect(page.url()).not.toContain('/profile');
  const draft = await readWorkoutDraftDb(page, 'e2e-test-user', sessionId);
  expect(draft.exerciseSets['feedback-ex-0'][0]).toMatchObject({ weight: 80, reps: 6, completed: true });
});

test('Twoje liczby: pływanie zwiększa aktywności oraz czas cardio', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await navigateAndWait(page, '/');
  await page.getByTestId('header-workout-count').click();
  await expect(page.getByTestId('stat-activities')).toContainText('1');
  await expect(page.getByTestId('stat-workouts')).toContainText('0');
  await expect(page.getByTestId('stat-cardio')).toContainText('1');
  await expect(page.getByTestId('stat-cardio-time')).toContainText('40 min');
  await expect(page.getByTestId('stats-empty')).toHaveCount(0);
  await expect.poll(() => page.getByRole('dialog').evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(853);
  await page.screenshot({ path: auditScreenshotPath('feedback-cardio-stats.png'), fullPage: true });
});
