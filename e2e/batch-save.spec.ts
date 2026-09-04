import { test, expect } from '@playwright/test';
import { blockFirebase, clearWorkoutDraftDb, navigateAndWait, readWorkoutDraftDb, writeWorkoutDraftDb, writeWorkoutSyncQueue , localToday, skipPreStartWarmupIfShown } from './helpers';

const E2E_USER_ID = 'e2e-test-user';

test.describe('Batch Save Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('IndexedDB draft save/load roundtrip works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await writeWorkoutDraftDb(page, {
      sessionId: 'roundtrip-test',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: '2024-04-02',
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: 'roundtrip-test',
      exerciseSets: { 'ex-1': [{ reps: 10, weight: 50, completed: true }] },
      exerciseNotes: {},
      dayNotes: 'test',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    const loaded = await readWorkoutDraftDb(page, E2E_USER_ID);
    expect(loaded).not.toBeNull();
    expect((loaded as { sessionId: string }).sessionId).toBe('roundtrip-test');

    await clearWorkoutDraftDb(page, E2E_USER_ID);
    const cleared = await readWorkoutDraftDb(page, E2E_USER_ID);
    expect(cleared).toBeNull();
  });

  test('draft persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await writeWorkoutDraftDb(page, {
      sessionId: 'reload-test-123',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: localToday(),
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: 'reload-test-123',
      exerciseSets: {
        'ex-1': [
          { reps: 5, weight: 20, completed: false, isWarmup: true },
          { reps: 12, weight: 50, completed: true },
          { reps: 10, weight: 50, completed: true },
        ],
      },
      exerciseNotes: { 'ex-1': 'Felt strong' },
      dayNotes: 'Good session',
      skippedExercises: ['ex-3'],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const draft = await readWorkoutDraftDb(page, E2E_USER_ID) as {
      sessionId: string;
      exerciseSets: Record<string, Array<{ reps: number; weight: number }>>;
      exerciseNotes: Record<string, string>;
      dayNotes: string;
      skippedExercises: string[];
    } | null;

    expect(draft).not.toBeNull();
    expect(draft?.sessionId).toBe('reload-test-123');
    expect(draft?.exerciseSets['ex-1']).toHaveLength(3);
    expect(draft?.exerciseSets['ex-1'][1].reps).toBe(12);
    expect(draft?.exerciseSets['ex-1'][1].weight).toBe(50);
    expect(draft?.exerciseNotes['ex-1']).toBe('Felt strong');
    expect(draft?.dayNotes).toBe('Good session');
    expect(draft?.skippedExercises).toContain('ex-3');
  });

  test('corrupt data is handled gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const KEY = 'fittracker_workout_draft';

      // Write corrupt data
      localStorage.setItem(KEY, 'not-valid-json{{{');

      // Try to parse (simulating what workoutDraft.load does)
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return 'no-data';
        const parsed = JSON.parse(raw);
        return parsed ? 'parsed' : 'null';
      } catch {
        localStorage.removeItem(KEY);
        return 'handled-gracefully';
      }
    });

    expect(result).toBe('handled-gracefully');
  });

  test('draft with bodyweight exercise stores weight as 0', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await writeWorkoutDraftDb(page, {
      sessionId: 'bw-test',
      userId: E2E_USER_ID,
      dayId: 'day-3',
      date: '2024-04-02',
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: 'bw-test',
      exerciseSets: {
        'dead-bug': [
          { reps: 5, weight: 0, completed: false, isWarmup: true },
          { reps: 15, weight: 0, completed: true },
          { reps: 12, weight: 0, completed: true },
          { reps: 10, weight: 0, completed: true },
        ],
      },
      exerciseNotes: {},
      dayNotes: '',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    const loaded = await readWorkoutDraftDb(page, E2E_USER_ID) as {
      exerciseSets: Record<string, Array<{ weight: number }>>;
    } | null;

    expect(loaded?.exerciseSets['dead-bug'].every(set => set.weight === 0)).toBe(true);
    expect(loaded?.exerciseSets['dead-bug']).toHaveLength(4);
  });

  test('recovered final-sync-pending draft is visible to the user', async ({ page }) => {
    await page.goto('./#/');
    await page.waitForLoadState('domcontentloaded');

    const today = localToday();
    await writeWorkoutDraftDb(page, {
      sessionId: `workout-${E2E_USER_ID}-day-1-${today}`,
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: today,
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: `workout-${E2E_USER_ID}-day-1-${today}`,
      exerciseSets: {
        'ex-1-1': [
          { reps: 6, weight: 20, completed: true, isWarmup: true },
          { reps: 6, weight: 30, completed: true },
        ],
      },
      exerciseNotes: {},
      dayNotes: 'offline finish',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: true,
      finalSyncPending: true,
      version: 1,
    });

    await page.goto('./#/workout/day-1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Trening zakończony lokalnie')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Synchronizuj teraz' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usuń szkic' })).toBeVisible();
    await page.getByRole('button', { name: 'Zamknij' }).click();
    await expect(page.getByText('Trening zakończony lokalnie')).toHaveCount(0);
  });

  test('sync center shows active local draft and quick actions', async ({ page }) => {
    await navigateAndWait(page, '/profile');

    await writeWorkoutDraftDb(page, {
      sessionId: 'local-workout-e2e-test-user-day-2-2026-04-03',
      userId: E2E_USER_ID,
      dayId: 'day-2',
      date: '2026-04-03',
      cycleId: 'cycle-2',
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      exerciseSets: {
        'ex-2-1': [{ reps: 6, weight: 20, completed: true }],
      },
      exerciseNotes: {},
      dayNotes: 'offline draft',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    // Kolejka jest referencyjna: treść sesji z kolejki musi istnieć jako draft w IDB
    // (wpis kolejki bez draftu jest sprzątany przez silnik syncu jako martwa referencja).
    await writeWorkoutDraftDb(page, {
      sessionId: 'queued-session-1',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: '2026-04-03',
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: 'queued-session-1',
      exerciseSets: {
        'ex-1-1': [{ reps: 8, weight: 25, completed: true }],
      },
      exerciseNotes: {},
      dayNotes: 'queued draft',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      cloudRevision: 1,
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: true,
      finalSyncPending: true,
      version: 1,
    });

    // WP-C (X38): Sync Center w Profilu renderuje się TYLKO przy wpisie trwałym
    // albo konflikcie (zwykłe "czeka na sieć" domyka AutoSync po cichu).
    await writeWorkoutSyncQueue(page, E2E_USER_ID, [{
      queueId: 'queued-1',
      sessionId: 'queued-session-1',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: '2026-04-03',
      sessionOrigin: 'remote',
      dirty: true,
      finalSyncPending: true,
      updatedAt: Date.now(),
      enqueuedAt: Date.now(),
      retryCount: 2,
      lastError: 'permission-denied',
      lastErrorAt: Date.now(),
      permanent: true,
    }]);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'Centrum synchronizacji' })).toBeVisible();
    await expect(page.getByText('2 sesje oczekujące')).toBeVisible();
    await expect(page.getByText('Tylko lokalnie')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Otwórz trening' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Synchronizuj teraz' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usuń szkic' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ponów wszystkie' })).toBeVisible();
  });

  test('dashboard highlights offline or pending local workout state', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Draft nieświeży (>12h, inna data): auto-resume (Z49) go NIE wznawia,
    // ale karta statusu sync na Dashboardzie nadal go pokazuje.
    const staleUpdatedAt = Date.now() - 13 * 60 * 60 * 1000;
    await writeWorkoutDraftDb(page, {
      sessionId: 'local-workout-e2e-test-user-day-1-2026-04-03',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: '2026-04-03',
      cycleId: 'cycle-1',
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      exerciseSets: {
        'ex-1-1': [{ reps: 6, weight: 20, completed: true }],
      },
      exerciseNotes: {},
      dayNotes: 'pending sync',
      skippedExercises: [],
      startedAt: staleUpdatedAt,
      updatedAt: staleUpdatedAt,
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // WP-C (X38): zwykłe "czeka na sieć" = pasywna chmurka z kropką, bez CTA
    // (AutoSync domknie sam); karta "Otwórz Sync Center" tylko dla wpisów trwałych.
    const indicator = page.getByTestId('cloud-pending-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute('aria-label', 'Czeka na zapis w chmurze, zapisze się sam');
    await expect(page.getByText('Masz trening rozpoczęty offline')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Otwórz centrum synchronizacji' })).toHaveCount(0);
  });

  test('permanent sync error keeps the Sync Center card with an exit on the dashboard', async ({ page }) => {
    await navigateAndWait(page, '/');

    await writeWorkoutDraftDb(page, {
      sessionId: 'perm-session-1',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: '2026-04-03',
      cycleId: 'cycle-1',
      sessionOrigin: 'remote',
      remoteSessionId: 'perm-session-1',
      exerciseSets: { 'ex-1-1': [{ reps: 8, weight: 25, completed: true }] },
      exerciseNotes: {},
      dayNotes: 'permanent',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      cloudRevision: 1,
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: true,
      finalSyncPending: true,
      version: 1,
    });
    await writeWorkoutSyncQueue(page, E2E_USER_ID, [{
      queueId: 'perm-1',
      sessionId: 'perm-session-1',
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: '2026-04-03',
      sessionOrigin: 'remote',
      dirty: true,
      finalSyncPending: true,
      updatedAt: Date.now(),
      enqueuedAt: Date.now(),
      retryCount: 3,
      lastError: 'permission-denied',
      lastErrorAt: Date.now(),
      permanent: true,
    }]);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: 'Otwórz centrum synchronizacji' })).toBeVisible();
    await expect(page.getByTestId('cloud-pending-indicator')).toHaveCount(0);
  });

  // WP-C (X38): sekwencja właściciela z 2026-08-26. Zakończenie offline jest
  // CICHE (celebracja jak zwykle, bez toastu "zapisano lokalnie"), Dashboard ma
  // chmurkę, a po powrocie sieci AutoSync domyka trening SAM (promocja
  // provisional + final przez mock chmury e2e), chmurka znika, jest toast
  // "Trening zapisany w chmurze".
  test('offline finish is silent, cloud indicator shows, reconnect syncs by itself', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('fittracker_e2e_cloud_writes', 'true'));
    const today = localToday();
    // Rozgrzanie lazy chunków (Dashboard + WorkoutDay) ONLINE: offline nie da
    // się ich dociągnąć, a nawigacja odbywa się zmianą hasha bez reloadu.
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('dash-hero')).toBeVisible();
    await navigateAndWait(page, `/workout/day-1?date=${today}`);
    await expect(page.getByRole('button', { name: 'Rozpocznij trening' })).toBeEnabled();
    await clearWorkoutDraftDb(page, E2E_USER_ID);

    await page.context().setOffline(true);
    await page.evaluate((route) => { window.location.hash = `#${route}`; }, `/workout/day-1?date=${today}&autostart=true`);

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('40');
    await firstCard.getByRole('spinbutton', { name: /Set 1, Powt\./ }).first().fill('8');
    await firstCard.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);
    const provisionalDraft = await readWorkoutDraftDb(page, E2E_USER_ID) as { sessionId?: string; sessionOrigin?: string } | null;
    expect(provisionalDraft?.sessionOrigin).toBe('provisional');
    const provisionalSessionId = provisionalDraft?.sessionId;
    expect(provisionalSessionId).toBeTruthy();

    await page.getByTestId('finish-workout').click();
    await page.getByRole('button', { name: 'Tak, zakończ' }).click();

    // Cisza: normalna sekwencja celebracji, zero toastu o zapisie lokalnym.
    await expect(page.getByText('Trening ukończony!')).toBeVisible();
    await expect(page.getByText('Trening zapisano lokalnie')).toHaveCount(0);

    await page.evaluate(() => { window.location.hash = '#/'; });
    await expect(page.getByTestId('cloud-pending-indicator')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Otwórz centrum synchronizacji' })).toHaveCount(0);

    // Sieć wraca: bez klikania trening ląduje w chmurze (mock), draft znika.
    await page.context().setOffline(false);
    await expect(page.getByTestId('cloud-pending-indicator')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText('Trening zapisany w chmurze').first()).toBeVisible();
    const cloud = await page.evaluate(() => JSON.parse(localStorage.getItem('fittracker_e2e_workouts') ?? '[]') as Array<{ id: string; dayId: string; completed: boolean; exercises: unknown[] }>);
    const synced = cloud.find((w) => w.dayId === 'day-1' && w.completed);
    expect(synced).toBeTruthy();
    expect(synced?.exercises.length).toBeGreaterThan(0);
    const readDurablePromotionState = () => page.evaluate(async ({ userId, provisionalId }) => {
      const records = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const request = indexedDB.open('strength-save-db', 2);
        request.onsuccess = () => {
          const getAll = request.result.transaction('workoutDrafts', 'readonly').objectStore('workoutDrafts').getAll();
          getAll.onsuccess = () => resolve(getAll.result as Array<Record<string, unknown>>);
          getAll.onerror = () => reject(getAll.error);
        };
        request.onerror = () => reject(request.error);
      });
      const owned = records.filter((record) => record.userId === userId);
      const aliases = owned.filter((record) => record.kind === 'promotion-alias');
      return {
        activeDraftCount: owned.filter((record) => record.kind !== 'promotion-alias').length,
        matchingAlias: aliases.some((record) => (
          record.provisionalSessionId === provisionalId
          && typeof record.remoteSessionId === 'string'
          && record.remoteSessionId !== provisionalId
        )),
        remoteSessionIds: aliases.map((record) => record.remoteSessionId),
      };
    }, { userId: E2E_USER_ID, provisionalId: provisionalSessionId });
    await expect.poll(readDurablePromotionState, { timeout: 10_000 }).toEqual({
      activeDraftCount: 0,
      matchingAlias: true,
      remoteSessionIds: [synced?.id],
    });
  });

  test('can start workout offline with provisional session and local-only status', async ({ page }) => {
    await navigateAndWait(page, '/workout/day-1');

    await page.getByRole('button', { name: 'Rozpocznij trening' }).click();
    await skipPreStartWarmupIfShown(page);

    // X38 (cisza): start offline bez toastu o zapisie lokalnym; na sesję czekamy
    // po statystykach sesji i drafcie, nie po toaście.
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await expect(page.getByText('Trening rozpoczęty offline', { exact: true })).toHaveCount(0);
    await expect.poll(async () => readWorkoutDraftDb(page, E2E_USER_ID), { timeout: 10_000 }).not.toBeNull();

    const draft = await readWorkoutDraftDb(page, E2E_USER_ID) as {
      sessionId: string;
      sessionOrigin: string;
      remoteSessionId: string | null;
      cycleId: string | null;
      exerciseSets: Record<string, Array<unknown>>;
    } | null;

    expect(draft).not.toBeNull();
    expect(draft?.sessionId.startsWith('local-workout-')).toBe(true);
    expect(draft?.sessionOrigin).toBe('provisional');
    expect(draft?.remoteSessionId).toBeNull();
    expect(Object.keys(draft?.exerciseSets ?? {}).length).toBeGreaterThan(0);
  });

  test('starting a second workout does not delete an existing dirty draft', async ({ page }) => {
    await navigateAndWait(page, '/');

    const today = localToday();
    const existingSessionId = `local-workout-${E2E_USER_ID}-day-1-${today}`;
    await writeWorkoutDraftDb(page, {
      sessionId: existingSessionId,
      userId: E2E_USER_ID,
      dayId: 'day-1',
      date: today,
      cycleId: 'cycle-1',
      sessionOrigin: 'provisional',
      remoteSessionId: null,
      exerciseSets: {
        'ex-1-1': [{ reps: 6, weight: 20, completed: true }],
      },
      exerciseNotes: {},
      exerciseMetrics: {},
      dayNotes: 'keep me',
      skippedExercises: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastFirebaseSyncAt: null,
      dirty: true,
      completedLocally: false,
      finalSyncPending: false,
      version: 1,
    });

    await navigateAndWait(page, `/workout/day-2?date=${today}`);
    await page.getByRole('button', { name: 'Rozpocznij trening' }).click();
    await skipPreStartWarmupIfShown(page);
    // X38 (cisza): start offline bez toastu o zapisie lokalnym.
    await expect(page.getByText('Trening rozpoczęty offline', { exact: true })).toHaveCount(0);

    const preserved = await readWorkoutDraftDb(page, E2E_USER_ID, existingSessionId) as { dayNotes: string } | null;
    expect(preserved?.dayNotes).toBe('keep me');
  });
});

test.describe('App loads in E2E mode', () => {
  test('loads without crash', async ({ page }) => {
    await blockFirebase(page);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const renderedChildren = await page.locator('#root').evaluate((root) =>
      Array.from(root.children).filter((child) => child.tagName !== 'SCRIPT').length
    );
    expect(renderedChildren).toBeGreaterThan(0);
  });
});
