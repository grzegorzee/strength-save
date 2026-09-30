import { test, expect } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  addDays, completeWizard, dashboardGreeting, loginThroughUi, provisionVerifiedProUser, readDoc, todayIso, weekdayOf,
} from './support';

// Release e2e 10 (płatności, 2026-09-30): prawdziwy endpoint HTTP revenuecatWebhook
// w emulatorze Functions z sekretem z fixture (scripts/ensure-functions-emulator-secrets).
// Sprawdza bramkę autoryzacji i zdarzenia rozstrzygane PRZED odczytem RevenueCat
// (test nie wychodzi do api.revenuecat.com). Pełny cykl zdarzeń z odczytem API v2
// pokrywa functions/src/revenuecat.integration.test.ts (emulator Firestore + fake RC).

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const WEBHOOK = 'http://127.0.0.1:5001/fittracker-workouts/us-central1/revenuecatWebhook';
const AUTH = 'e2e-emulator-webhook-only';

const post = (event: Record<string, unknown>, authorization?: string) => fetch(WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(authorization !== undefined ? { Authorization: authorization } : {}) },
  body: JSON.stringify({ api_version: '1.0', event: { id: `r10-${Date.now()}-${Math.random()}`, event_timestamp_ms: Date.now(), ...event } }),
});

test('R10: webhook RC w emulatorze: zła autoryzacja 401 bez zapisu, grant comp nietknięty, paywall przepuszcza PRO', async ({ page }) => {
  test.setTimeout(120_000);
  const user = await provisionVerifiedProUser('r10-pay');
  const before = await readDoc(`users/${user.uid}`);
  expect(before?.subscription).toMatchObject({ tier: 'comp', status: 'active' });

  // 1. Autoryzacja: brak, zła wartość, poprawna z prefiksem "Bearer" (RC wysyła dokładnie
  //    skonfigurowaną wartość) = 401. Metoda inna niż POST = 405.
  for (const authorization of [undefined, 'wrong', `Bearer ${AUTH}`]) {
    const response = await post({ type: 'EXPIRATION', app_user_id: user.uid, store: 'APP_STORE', environment: 'SANDBOX' }, authorization);
    expect(response.status, String(authorization)).toBe(401);
  }
  expect((await fetch(WEBHOOK)).status).toBe(405);

  // 2. Poprawna autoryzacja, zdarzenia bez wpływu na stan (rozstrzygane przed odczytem RC).
  const testEvent = await post({ type: 'TEST', app_user_id: user.uid }, AUTH);
  expect(testEvent.status).toBe(200);
  expect(await testEvent.json()).toMatchObject({ ok: true, skipped: 'event-type' });
  const anonymous = await post({ type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:r10', aliases: ['$RCAnonymousID:r10'] }, AUTH);
  expect(anonymous.status).toBe(200);
  expect(await anonymous.json()).toMatchObject({ ok: true, skipped: 'no-uid' });

  // 3. Żadne z powyższych nie zmieniło dokumentu (grant comp admina nietknięty).
  expect(await readDoc(`users/${user.uid}`)).toEqual(before);

  // 4. UI: po kreatorze user z PRO wchodzi na /paywall i wraca na Dashboard
  //    (paywall nie ma czego sprzedać; w trakcie onboardingu trasy prowadzą do kreatora).
  await loginThroughUi(page, user.email);
  const today = todayIso();
  await completeWizard(page, { weekdays: [weekdayOf(today), weekdayOf(addDays(today, 2)), weekdayOf(addDays(today, 4))], firstWorkout: today });
  await page.goto('./#/paywall');
  await expect(page).toHaveURL(/#\/$/, { timeout: 15_000 });
  await expect(dashboardGreeting(page)).toBeVisible();
});
