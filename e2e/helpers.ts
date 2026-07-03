import { Page, expect } from '@playwright/test';

const WORKOUT_DRAFT_DB_NAME = 'strength-save-db';
const WORKOUT_DRAFT_STORE_NAME = 'workoutDrafts';
const WORKOUT_DRAFT_DB_VERSION = 2;
const WORKOUT_SYNC_QUEUE_KEY_PREFIX = 'fittracker_workout_sync_queue_v1';
const E2E_AUTH_STATE_KEY = 'fittracker_e2e_auth_state';

export const blockFirebase = async (page: Page) => {
  await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => route.abort());
  await page.route('**/securetoken.googleapis.com/**', (route) => route.abort());
  await page.route('**/googleapis.com/identitytoolkit/**', (route) => route.abort());
};

export const navigateAndWait = async (page: Page, path: string) => {
  const normalizedPath = path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`;
  await page.goto(normalizedPath === '/' ? './#/' : `./#${normalizedPath}`);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#root')).toBeVisible();
};

export const expectHashRoute = async (page: Page, path: string) => {
  const normalizedPath = path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`;
  const expected = normalizedPath === '/' ? /\/#\/?$/ : new RegExp(`/#${normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  await expect(page).toHaveURL(expected);
};

export const expectPageRendered = async (page: Page) => {
  const rootChildCount = await page.locator('#root > *').count();
  expect(rootChildCount).toBeGreaterThan(0);
  await expect(page.getByRole('main')).toBeVisible();
  const hasError = await page.locator('text=Something went wrong').count();
  const hasErrorPl = await page.locator('text=Coś poszło nie tak').count();
  expect(hasError + hasErrorPl).toBe(0);
};

export const writeWorkoutDraftDb = async (page: Page, draft: unknown) => {
  await page.evaluate(async ({ dbName, storeName, dbVersion, draftValue }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        const value = draftValue as { userId?: string; sessionId?: string };
        if (!value.userId || !value.sessionId) {
          reject(new Error('Draft userId/sessionId required'));
          return;
        }
        tx.objectStore(storeName).put(draftValue, `${value.userId}::${value.sessionId}`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, { dbName: WORKOUT_DRAFT_DB_NAME, storeName: WORKOUT_DRAFT_STORE_NAME, dbVersion: WORKOUT_DRAFT_DB_VERSION, draftValue: draft });
};

export const readWorkoutDraftDb = async (page: Page, userId: string, sessionId?: string) => {
  return page.evaluate(async ({ dbName, storeName, dbVersion, userId: draftUserId, sessionId: draftSessionId }) => {
    return new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        if (draftSessionId) {
          const getRequest = store.get(`${draftUserId}::${draftSessionId}`);
          getRequest.onsuccess = () => resolve(getRequest.result ?? null);
          getRequest.onerror = () => reject(getRequest.error);
          return;
        }

        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const drafts = (Array.isArray(getAllRequest.result) ? getAllRequest.result : [])
            .filter((draft: { userId?: string }) => draft.userId === draftUserId)
            .sort((a: { updatedAt?: number }, b: { updatedAt?: number }) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0));
          resolve(drafts[0] ?? null);
        };
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, { dbName: WORKOUT_DRAFT_DB_NAME, storeName: WORKOUT_DRAFT_STORE_NAME, dbVersion: WORKOUT_DRAFT_DB_VERSION, userId, sessionId });
};

export const clearWorkoutDraftDb = async (page: Page, userId: string, sessionId?: string) => {
  await page.evaluate(async ({ dbName, storeName, dbVersion, userId: draftUserId, sessionId: draftSessionId }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        if (draftSessionId) {
          store.delete(`${draftUserId}::${draftSessionId}`);
        } else {
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            (Array.isArray(getAllRequest.result) ? getAllRequest.result : [])
              .filter((draft: { userId?: string; sessionId?: string }) => draft.userId === draftUserId && draft.sessionId)
              .forEach((draft: { sessionId?: string }) => store.delete(`${draftUserId}::${draft.sessionId}`));
          };
          getAllRequest.onerror = () => reject(getAllRequest.error);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, { dbName: WORKOUT_DRAFT_DB_NAME, storeName: WORKOUT_DRAFT_STORE_NAME, dbVersion: WORKOUT_DRAFT_DB_VERSION, userId, sessionId });
};

export const writeWorkoutSyncQueue = async (page: Page, userId: string, entries: unknown[]) => {
  await page.evaluate(({ draftUserId, queueEntries, queuePrefix }) => {
    localStorage.setItem(`${queuePrefix}_${draftUserId}`, JSON.stringify(queueEntries));
  }, { draftUserId: userId, queueEntries: entries, queuePrefix: WORKOUT_SYNC_QUEUE_KEY_PREFIX });
};

export const setE2EAuthScenario = async (
  page: Page,
  scenario: 'unauthenticated' | 'pending-verification' | 'suspended' | 'active-user' | 'active-admin' | 'new-user' | 'new-invited-user',
  overrides?: {
    email?: string;
    displayName?: string;
    /** Symuluj natywny iOS (hard paywall guard) w przeglądarce. */
    simulateNative?: boolean;
    /** Stan subskrypcji w profilu (surowy kształt Firestore). */
    subscription?: { tier: string; status: string; expiresAt: string | null } | null;
    /** Czy user ma ukończone treningi (guard sprawdza przed redirectem na paywall). */
    hasWorkouts?: boolean;
  },
) => {
  await page.addInitScript(({ storageKey, authState }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(authState));
  }, {
    storageKey: E2E_AUTH_STATE_KEY,
    authState: { scenario, ...overrides },
  });
};

// Wstrzykuje cykle planów do localStorage (czytane przez usePlanCycles w trybie E2E).
export const setE2ECycles = async (page: Page, cycles: unknown[]) => {
  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: 'fittracker_e2e_cycles', data: cycles });
};

// Wstrzykuje historię treningów (czytana przez workout-read-store w trybie mock E2E).
export const setE2EWorkouts = async (page: Page, workouts: unknown[]) => {
  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: 'fittracker_e2e_workouts', data: workouts });
};
