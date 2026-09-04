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
            .filter((draft: { userId?: string; sessionId?: string; dayId?: string; date?: string }) =>
              draft.userId === draftUserId
              && typeof draft.sessionId === 'string'
              && typeof draft.dayId === 'string'
              && typeof draft.date === 'string')
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
          const getAllRequest = store.getAllKeys();
          getAllRequest.onsuccess = () => {
            (Array.isArray(getAllRequest.result) ? getAllRequest.result : [])
              .map(String)
              .filter(key => key.startsWith(`${draftUserId}::`))
              .forEach(key => store.delete(key));
          };
          getAllRequest.onerror = () => reject(getAllRequest.error);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });

    // Produkcyjny store ma odporną kopię localStorage na wypadek zerwanego IDB.
    // Cleanup testowy musi usuwać obie warstwy tak samo jak clearActiveDraft,
    // inaczej reload prawidłowo odtworzy „skasowaną” sesję z fallbacku.
    const fallbackKey = `fittracker_workout_draft:${draftUserId}`;
    const journalKey = `fittracker_workout_drafts_v2:${draftUserId}`;
    const promotionTombstonePrefix = `fittracker_promoted:${draftUserId}:`;
    if (!draftSessionId) {
      localStorage.removeItem(fallbackKey);
      localStorage.removeItem(journalKey);
      Object.keys(localStorage)
        .filter(key => key.startsWith(promotionTombstonePrefix))
        .forEach(key => localStorage.removeItem(key));
    } else {
      try {
        const raw = localStorage.getItem(fallbackKey);
        if (raw && JSON.parse(raw)?.sessionId === draftSessionId) {
          localStorage.removeItem(fallbackKey);
        }
      } catch {
        localStorage.removeItem(fallbackKey);
      }
      try {
        const raw = localStorage.getItem(journalKey);
        if (raw) {
          const journal = JSON.parse(raw) as { drafts?: Record<string, unknown> };
          if (journal.drafts && typeof journal.drafts === 'object') {
            delete journal.drafts[draftSessionId];
            if (Object.keys(journal.drafts).length > 0) {
              localStorage.setItem(journalKey, JSON.stringify(journal));
            } else {
              localStorage.removeItem(journalKey);
            }
          } else {
            localStorage.removeItem(journalKey);
          }
        }
      } catch {
        localStorage.removeItem(journalKey);
      }
      localStorage.removeItem(`${promotionTombstonePrefix}${draftSessionId}`);
    }
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
    /** WP-G (X35a): profil treningowy (cel steruje tonem delty wagi w Pomiarach). */
    trainingProfile?: { level?: string; objective?: string; daysPerWeek?: number };
    /** Mirror zgód serwera do testów restartu i re-consent. */
    consents?: {
      termsVersion?: string;
      privacyVersion?: string;
      healthGranted?: boolean;
      healthVersion?: string;
      /** Monotoniczna generacja aktywnej zgody zdrowotnej (legacy/brak = fail-closed). */
      healthEpoch?: number;
      /** Identyfikator aktywnego grantu wymagany przez ścieżki zdjęć i zapisów zdrowotnych. */
      healthGrantId?: string | null;
      marketingGranted?: boolean;
      marketingVersion?: string;
    };
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

// WP-G (X35a): wstrzykuje pomiary ciała (czytane przez workout-read-store w trybie mock E2E).
export const setE2EMeasurements = async (page: Page, measurements: unknown[]) => {
  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: 'fittracker_e2e_measurements', data: measurements });
};

// Wstrzykuje własne ćwiczenia usera (czytane przez useCustomExercises w trybie mock E2E).
export const setE2ECustomExercises = async (page: Page, exercises: unknown[]) => {
  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: 'fittracker_e2e_custom_exercises', data: exercises });
};

// Lokalna data YYYY-MM-DD — testy dat MUSZĄ liczyć lokalnie jak apka;
// new Date().toISOString() daje UTC i po północy CET/CEST cofa dzień (nocne flaki).
// X36: sekcje Profilu są zwijane — treść (karty, wiersze) montuje się dopiero
// po rozwinięciu wiersza sekcji. Idempotentne: otwarta sekcja zostaje otwarta.
export const openProfileSection = async (page: Page, id: string) => {
  const parent = ({
    connections: 'devices', strava: 'devices', trainer: 'devices',
    rest: 'timer', preferences: 'training', plates: 'training',
    backup: 'data', consents: 'data',
  } as Record<string, string>)[id] ?? id;
  const target = ({
    connections: 'devices', strava: 'devices', rest: 'timer', preferences: 'training',
  } as Record<string, string>)[id] ?? id;
  const section = page.getByTestId(`profile-section-${parent}`);
  const toggle = page.getByTestId(`profile-toggle-${parent}`);
  await toggle.scrollIntoViewIfNeeded();
  if ((await section.getAttribute('data-state')) !== 'open') await toggle.click();
  await expect(section).toHaveAttribute('data-state', 'open');
  if (target !== parent) {
    const targetElement = page.locator(`#profile-${target}`);
    await expect(targetElement).toBeVisible();
    await targetElement.scrollIntoViewIfNeeded();
  }
};

export const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Lokalna data sprzed N dni (ta sama zasada co localToday).
export const localDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// X30 WP-L: nagłówek sesji pokazuje nazwę dnia tygodnia DATY renderowania
// (domyślna nazwa dnia planu podąża za datą; własna nazwa zostaje). Trasa
// /workout/day-N bez ?date= = dziś, więc testy oczekują nazwy dzisiejszego dnia.
const PL_WEEKDAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
export const plWeekdayName = (dateISO: string): string => {
  const [y, m, d] = dateISO.split('-').map(Number);
  return PL_WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
};

// X32: /new-plan z profilem startuje od kroku 2 (poziom); krok 5A "Dopasowane
// do Ciebie" (X33) jest po trzech przejściach (poziom -> cel -> dni -> 5A).
export const advanceWizardToStep5 = async (page: Page) => {
  await page.getByRole('button', { name: 'Następny krok' }).click();
  await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  await expect(page.getByTestId('ob-matching')).toHaveCount(0);
  await expect(page.getByTestId('plan-choice-recommended')).toBeVisible();
};

// X34: 5A "Wybierz start planu" -> ekran 6/6 "Start planu" (nazwa, długość, start,
// CTA celu, "Podgląd planu").
export const advanceWizardToStep6 = async (page: Page) => {
  await advanceWizardToStep5(page);
  await page.getByTestId('ob-match-next').click();
  await expect(page.getByTestId('ob-start-step')).toBeVisible();
};

// Onboarding helper świadomie pokrywa stary flow z dobrowolnym health opt-in.
export const passOnboardingWelcome = async (page: Page) => {
  await page.getByTestId('ob-personalization-next').click();
  await page.getByTestId('consent-terms').click();
  await page.getByTestId('consent-privacy').click();
  await page.getByTestId('consent-health').click();
  await page.getByTestId('ob-legal-submit').click();
  await expect(page.getByRole('button', { name: 'Następny krok' })).toBeVisible();
};

// Wstrzykuje metadane planu (startDate + progression, od 2026-08-11 też days,
// durationWeeks i scheduleOverrides — przełożenia treningów) czytane przez
// useTrainingPlan w mock E2E (Z120).
export const setE2EPlanMeta = async (page: Page, meta: {
  startDate?: string;
  progression?: unknown;
  days?: unknown[];
  durationWeeks?: number;
  scheduleOverrides?: Record<string, string | null>;
}) => {
  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: 'fittracker_e2e_plan', data: meta });
};

/** C-T2: świeży jawny start pokazuje sheet rozgrzewki (Tak/Pomiń). Testy,
 *  które nie badają rozgrzewki, pomijają go; resume/autostart promptu nie mają,
 *  więc helper jest warunkowy i tani (krótki timeout). */
export const skipPreStartWarmupIfShown = async (page: Page) => {
  const skip = page.getByTestId('prestart-skip');
  try {
    await skip.waitFor({ state: 'visible', timeout: 1000 });
    await skip.click();
    await skip.waitFor({ state: 'hidden', timeout: 2000 });
  } catch {
    // brak promptu (resume/autostart/kontynuacja) — nic do zrobienia
  }
};
