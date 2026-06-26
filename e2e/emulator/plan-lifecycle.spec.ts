import { test, expect, type Page } from '@playwright/test';

// Cykl życia planu na realnym Auth + Firestore (emulatory, prawdziwe rules):
// 1. Onboarding: własny plan z pojedynczymi ćwiczeniami z biblioteki → Dashboard.
// 2. Zakończenie planu przed czasem: cykl completed + przejście do wyboru nowego planu.

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR = 'http://127.0.0.1:8081';
const PROJECT_ID = 'fittracker-workouts';
const PASSWORD = 'e2e-test-password-123';
const APP_URL = 'http://localhost:8090/strength-save/';

async function createAuthUser(email: string): Promise<string> {
  const res = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    throw new Error(`Auth emulator signUp failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { localId: string };
  return data.localId;
}

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFirestoreValue(value: unknown): FirestoreValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (value !== null && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toFirestoreValue(v)]),
        ),
      },
    };
  }
  throw new Error(`Unsupported Firestore value: ${String(value)}`);
}

async function seedDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)]),
  );
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!res.ok) {
    throw new Error(`Firestore emulator seed failed (${path}): ${res.status} ${await res.text()}`);
  }
}

async function seedDocs(entries: Array<[string, Record<string, unknown>]>): Promise<void> {
  const concurrency = 30;
  for (let index = 0; index < entries.length; index += concurrency) {
    await Promise.all(entries.slice(index, index + concurrency).map(([path, data]) => seedDoc(path, data)));
  }
}

async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore emulator read failed (${path}): ${res.status}`);
  return await res.json() as Record<string, unknown>;
}

async function listDocs(collection: string): Promise<Array<{ name: string; fields: Record<string, FirestoreValue> }>> {
  const res = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  if (!res.ok) throw new Error(`Firestore emulator list failed (${collection}): ${res.status}`);
  const data = await res.json() as { documents?: Array<{ name: string; fields: Record<string, FirestoreValue> }> };
  return data.documents ?? [];
}

async function loginThroughUi(page: Page, email: string): Promise<void> {
  await page.goto(`${APP_URL}#/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('tab', { name: 'Email + hasło' }).click();
  const panel = page.getByRole('tabpanel', { name: 'Email + hasło' });
  await panel.getByPlaceholder('Email').fill(email);
  await panel.getByPlaceholder('Hasło', { exact: true }).fill(PASSWORD);
  await panel.getByRole('button', { name: 'Zaloguj przez email' }).click();
}

const mondayOfThisWeek = (): string => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
};

test.describe('Emulator: cykl życia planu', () => {
  test('onboarding: własny plan z pojedynczym ćwiczeniem z biblioteki → Dashboard', async ({ page }) => {
    const email = `onb-own-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    await seedDoc(`users/${uid}`, {
      uid,
      email,
      displayName: 'E2E Onboarding',
      role: 'user',
      status: 'active',
      onboardingCompleted: false,
      access: { enabled: true },
      registration: { source: 'email' },
    });

    await loginThroughUi(page, email);

    // Wizard: welcome → poziom → cel → protokół → precyzja
    await expect(page.getByText('Witaj w')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Następny krok' }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();

    // Krok 5: ścieżka "Ułóż własny" → PlanBuilder
    await page.getByRole('button', { name: 'Ułóż własny' }).click();

    // Dodaj dzień + pojedyncze ćwiczenie z biblioteki (search)
    await page.getByRole('button', { name: /Dodaj dzień/ }).click();
    await page.getByRole('button', { name: 'Dodaj ćwiczenie' }).click();
    await page.getByPlaceholder(/Szukaj/i).fill('martwy');
    const firstResult = page.getByRole('dialog').locator('button', { hasText: /martwy/i }).first();
    const pickedName = (await firstResult.textContent() ?? '').trim();
    await firstResult.click();

    // Ćwiczenie widoczne na liście dnia
    await expect(page.getByText(/martwy/i).first()).toBeVisible();

    // Zapis własnego planu (w onboardingu submit od razu zapisuje)
    await page.getByRole('button', { name: 'Dalej do podglądu' }).click();

    // Ląduje na Dashboardzie
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });

    // Plan zapisany w Firestore z naszym ćwiczeniem + aktywny cykl istnieje
    const planDoc = await readDoc(`training_plans/${uid}`);
    expect(planDoc).not.toBeNull();
    expect(JSON.stringify(planDoc)).toMatch(/martwy/i);

    const cycleDocs = await listDocs('plan_cycles');
    const userCycles = cycleDocs.filter(d => JSON.stringify(d.fields.userId).includes(uid));
    expect(userCycles).toHaveLength(1);
    expect(userCycles[0].name).toContain(`cycle-${uid}-`);
    expect(JSON.stringify(planDoc?.fields ?? {})).toContain('revision');
    expect(pickedName.length).toBeGreaterThan(0);
  });

  test('zakończenie planu przed czasem: cykl completed + ekran wyboru nowego planu', async ({ page }) => {
    const email = `endplan-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    const startDate = mondayOfThisWeek();
    const days = [{
      id: `${startDate}-d1`,
      dayName: 'Poniedziałek',
      weekday: 'monday',
      focus: 'Push',
      exercises: [{ id: 'ex-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 5', instructions: [] }],
    }];

    await seedDoc(`users/${uid}`, {
      uid,
      email,
      displayName: 'E2E EndPlan',
      role: 'user',
      status: 'active',
      onboardingCompleted: true,
      access: { enabled: true },
      registration: { source: 'email' },
    });
    await seedDoc(`training_plans/${uid}`, {
      days,
      durationWeeks: 12,
      startDate,
      updatedAt: new Date().toISOString(),
    });
    await seedDoc(`plan_cycles/cycle-${uid}`, {
      userId: uid,
      days,
      durationWeeks: 12,
      startDate,
      status: 'active',
      createdAt: new Date().toISOString(),
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
    });

    await loginThroughUi(page, email);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });

    await page.goto('./#/cycles');
    await page.getByRole('button', { name: 'Zakończ plan' }).click();
    await page.getByRole('button', { name: 'Zakończ i wybierz nowy' }).click();

    // Przejście do wyboru nowego planu
    await expect(page).toHaveURL(/#\/new-plan/, { timeout: 15000 });

    // Cykl w Firestore zamknięty jako completed ze snapshotem planu
    await expect.poll(async () => {
      const cycle = await readDoc(`plan_cycles/cycle-${uid}`);
      return JSON.stringify(cycle?.fields ?? {});
    }, { timeout: 10000 }).toContain('completed');
  });

  test('merge 501 treningów dzieli zapis na batchy i kończy checkpoint', async ({ page }) => {
    const email = `merge-501-${Date.now()}@e2e.test`;
    const uid = await createAuthUser(email);
    const days = [{
      id: 'day-1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Push',
      exercises: [{ id: 'ex-1', name: 'Bench', sets: '3 x 5', instructions: [] }],
    }];
    await seedDoc(`users/${uid}`, {
      uid, email, displayName: 'E2E Merge', role: 'user', status: 'active',
      onboardingCompleted: true, access: { enabled: true }, registration: { source: 'email' },
    });
    await seedDoc(`plan_cycles/merge-primary-${uid}`, {
      userId: uid, days, durationWeeks: 4, startDate: '2026-03-02', endDate: '2026-03-28',
      status: 'completed', createdAt: new Date().toISOString(),
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
    });
    await seedDoc(`plan_cycles/merge-rest-${uid}`, {
      userId: uid, days, durationWeeks: 4, startDate: '2026-03-30', endDate: '2026-04-26',
      status: 'completed', createdAt: new Date().toISOString(),
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
    });
    await seedDocs(Array.from({ length: 501 }, (_, index) => [`workouts/merge-${uid}-${index}`, {
      id: `merge-${uid}-${index}`, userId: uid, dayId: 'day-1', date: '2026-04-01', completed: true,
      // First batch was already committed before a simulated process failure.
      cycleId: index < 450 ? `merge-primary-${uid}` : `merge-rest-${uid}`,
      exercises: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    await seedDoc(`plan_cycle_operations/merge-merge-primary-${uid}`, {
      userId: uid,
      kind: 'merge_cycles',
      primaryCycleId: `merge-primary-${uid}`,
      restCycleIds: [`merge-rest-${uid}`],
      workoutIds: Array.from({ length: 501 }, (_, index) => `merge-${uid}-${index}`),
      newStart: '2026-03-02', newEnd: '2026-04-26', newDuration: 8,
      phase: 'remapping', nextWorkoutIndex: 450, nextCycleIndex: 0,
    });

    await loginThroughUi(page, email);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await page.goto('./#/settings');
    const mergeButton = page.getByRole('button', { name: 'Połącz przerwane cykle' });
    await expect(mergeButton).toBeEnabled({ timeout: 20000 });
    await mergeButton.click();
    await page.getByRole('button', { name: 'Połącz przerwane cykle' }).last().click();

    await expect.poll(async () => readDoc(`plan_cycles/merge-rest-${uid}`), { timeout: 30000 }).toBeNull();
    await expect.poll(async () => JSON.stringify((await readDoc(`workouts/merge-${uid}-500`))?.fields ?? {}), {
      timeout: 10000,
    }).toContain(`merge-primary-${uid}`);
    await expect.poll(async () => {
      const operations = await listDocs('plan_cycle_operations');
      return operations.filter(operation => JSON.stringify(operation.fields.userId).includes(uid)).length;
    }, { timeout: 10000 }).toBe(0);
  });

});
