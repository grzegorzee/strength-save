import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectHashRoute,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
  writeWorkoutDraftDb,
} from './helpers';

// Z88: każdy nieukończony DZISIEJSZY szkic = "Kontynuuj trening" na Dashboardzie,
// także w pełni zsynchronizowany (dirty=false, remote) — scenariusz "wyszedłem
// z aplikacji w trakcie treningu, autosave zdążył". Przed Z88 karta pokazywała
// "Rozpocznij trening" i user tracił kontekst sesji.

const E2E_UID = 'e2e-test-user';
// Poniedziałek = dzień treningowy defaultPlan (day-1). Zegar strony zamrożony,
// żeby spec przechodził niezależnie od dnia uruchomienia.
const MONDAY = '2026-07-20';
const MONDAY_MS = new Date(`${MONDAY}T10:00:00`).getTime();

const draftBase = {
  userId: E2E_UID,
  dayId: 'day-1',
  date: MONDAY,
  cycleId: null,
  sessionOrigin: 'remote',
  exerciseSets: {
    'ex-1-1': [
      { reps: 8, weight: 100, completed: true },
      { reps: 8, weight: 100, completed: true },
      { reps: 8, weight: 100, completed: false },
    ],
  },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: MONDAY_MS - 30 * 60 * 1000,
  updatedAt: MONDAY_MS - 5 * 60 * 1000,
  lastFirebaseSyncAt: MONDAY_MS - 5 * 60 * 1000,
  version: 3,
};

test.describe('Kontynuuj trening po wyjściu z aplikacji (Z88)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
  });

  test('w pełni zsynchronizowany dzisiejszy szkic pokazuje Kontynuuj trening i wraca do sesji', async ({ page }) => {
    await navigateAndWait(page, '/');
    const sessionId = `workout-${E2E_UID}-day-1-${MONDAY}`;
    await writeWorkoutDraftDb(page, {
      ...draftBase,
      sessionId,
      remoteSessionId: sessionId,
      dirty: false,
      completedLocally: false,
      finalSyncPending: false,
    });

    await page.reload();
    await expectPageRendered(page);

    const continueButton = page.getByRole('button', { name: 'Kontynuuj trening' });
    await expect(continueButton).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rozpocznij trening' })).toHaveCount(0);

    await continueButton.click();
    await expectHashRoute(page, `/workout/day-1?date=${MONDAY}&session=${sessionId}`);

    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('szkic ukończony lokalnie NIE pokazuje Kontynuuj trening', async ({ page }) => {
    await navigateAndWait(page, '/');
    const sessionId = `workout-${E2E_UID}-day-1-${MONDAY}`;
    await writeWorkoutDraftDb(page, {
      ...draftBase,
      sessionId,
      remoteSessionId: sessionId,
      dirty: false,
      completedLocally: true,
      finalSyncPending: false,
    });

    await page.reload();
    await expectPageRendered(page);

    await expect(page.getByRole('button', { name: 'Kontynuuj trening' })).toHaveCount(0);

    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
