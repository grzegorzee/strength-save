import { Page, expect } from '@playwright/test';

const WORKOUT_DRAFT_DB_NAME = 'strength-save-db';
const WORKOUT_DRAFT_STORE_NAME = 'workoutDrafts';
const WORKOUT_SYNC_QUEUE_KEY_PREFIX = 'fittracker_workout_sync_queue_v1';

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
  await page.evaluate(async ({ dbName, storeName, draftValue }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'userId' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(draftValue);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, { dbName: WORKOUT_DRAFT_DB_NAME, storeName: WORKOUT_DRAFT_STORE_NAME, draftValue: draft });
};

export const readWorkoutDraftDb = async (page: Page, userId: string) => {
  return page.evaluate(async ({ dbName, storeName, userId: draftUserId }) => {
    return new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'userId' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readonly');
        const getRequest = tx.objectStore(storeName).get(draftUserId);
        getRequest.onsuccess = () => resolve(getRequest.result ?? null);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, { dbName: WORKOUT_DRAFT_DB_NAME, storeName: WORKOUT_DRAFT_STORE_NAME, userId });
};

export const clearWorkoutDraftDb = async (page: Page, userId: string) => {
  await page.evaluate(async ({ dbName, storeName, userId: draftUserId }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'userId' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(draftUserId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, { dbName: WORKOUT_DRAFT_DB_NAME, storeName: WORKOUT_DRAFT_STORE_NAME, userId });
};

export const writeWorkoutSyncQueue = async (page: Page, userId: string, entries: unknown[]) => {
  await page.evaluate(({ draftUserId, queueEntries, queuePrefix }) => {
    localStorage.setItem(`${queuePrefix}_${draftUserId}`, JSON.stringify(queueEntries));
  }, { draftUserId: userId, queueEntries: entries, queuePrefix: WORKOUT_SYNC_QUEUE_KEY_PREFIX });
};
