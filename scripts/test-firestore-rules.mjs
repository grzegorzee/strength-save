// Test reguł Firestore na emulatorze. Regresja: getDoc na nieistniejącym dokumencie
// treningu zwracał PERMISSION_DENIED i blokował rozpoczęcie pierwszego treningu nowego planu.
// Uruchom: npm run test:rules  (wymaga JDK 21 + firebase-tools)
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'rules-repro',
  // Port 8081 zgodnie z firebase.json (8080 koliduje z vite dev serverem przy e2e:emulator).
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8081 },
});

const UID = 'user123';
const OTHER_UID = 'intruder456';
const ADMIN_UID = 'admin789';
const WORKOUT_ID = `workout-${UID}-tpl-fullbody-2-2026-06-08`;

const seedDoc = async (path, id, data) => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path, id), data);
  });
};

const seedUser = async (accessField, status = 'active', uid = UID, role = 'user') => {
  await seedDoc('users', uid, {
    uid, email: `${uid}@b.c`, role, status,
    onboardingCompleted: true, ...(accessField !== undefined ? { access: accessField } : {}),
  });
};

const db = env.authenticatedContext(UID).firestore();
const otherDb = env.authenticatedContext(OTHER_UID).firestore();
const adminDb = env.authenticatedContext(ADMIN_UID).firestore();
const newWorkout = { id: WORKOUT_ID, userId: UID, dayId: 'tpl-fullbody-2', date: '2026-06-08', exercises: [], completed: false };
const ok = (fn) => fn().then(() => true, () => false);

// expected: true = ma przejść, false = ma być zablokowane
const cases = [];
const add = (name, expected, pass) => cases.push({ name, expected, pass });

// === Workouts: dostęp i regresja resource==null ===
await env.clearFirestore();
await seedUser({ enabled: true });
add('getDoc nieistniejacy workout (access=true) — REGRESJA', true, await ok(() => getDoc(doc(db, 'workouts', WORKOUT_ID))));
add('create workout (access=true)', true, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));
add('read wlasny istniejacy workout (access=true)', true, await ok(() => getDoc(doc(db, 'workouts', WORKOUT_ID))));
add('update workout ze zmiana userId zablokowane', false, await ok(() => updateDoc(doc(db, 'workouts', WORKOUT_ID), { userId: OTHER_UID })));
add('write training_plans (access=true)', true, await ok(() => setDoc(doc(db, 'training_plans', UID), { days: [], durationWeeks: 12, startDate: '2026-06-08', updatedAt: 'x' })));

// cross-user + admin na tych samych danych
await seedUser(undefined, 'active', OTHER_UID);
add('read cudzego workouta zablokowane', false, await ok(() => getDoc(doc(otherDb, 'workouts', WORKOUT_ID))));
await seedUser(undefined, 'active', ADMIN_UID, 'admin');
add('admin czyta cudzy workout', true, await ok(() => getDoc(doc(adminDb, 'workouts', WORKOUT_ID))));

await env.clearFirestore();
await seedUser({ enabled: false });
add('create workout (access=false) zablokowane', false, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));

// === Status pending_verification: brak dostepu do workouts/plans mimo access=true ===
await env.clearFirestore();
await seedUser({ enabled: true }, 'pending_verification');
await seedDoc('workouts', WORKOUT_ID, newWorkout);
add('create workout (pending_verification + access=true) zablokowane', false, await ok(() => setDoc(doc(db, 'workouts', `${WORKOUT_ID}-b`), { ...newWorkout, id: `${WORKOUT_ID}-b` })));
add('read istniejacego workouta (pending_verification) zablokowane', false, await ok(() => getDoc(doc(db, 'workouts', WORKOUT_ID))));
add('write training_plans (pending_verification + access=true) zablokowane', false, await ok(() => setDoc(doc(db, 'training_plans', UID), { days: [], durationWeeks: 12, startDate: '2026-06-08', updatedAt: 'x' })));
add('read training_plans (pending_verification) zablokowane', false, await ok(() => getDoc(doc(db, 'training_plans', UID))));

await env.clearFirestore();
add('create workout (brak users doc) zablokowane', false, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));

// === Legacy/Google: dokument users BEZ pola status = traktowany jak aktywny ===
// REGRESJA 2026-06-29: hardening reguł wymagał status=='active', a konta z logowania Google
// nigdy nie dostały tego pola → zapis treningu padał "Missing or insufficient permissions".
await env.clearFirestore();
await seedDoc('users', UID, { uid: UID, email: `${UID}@b.c`, role: 'user', onboardingCompleted: true });
add('create workout (users bez pola status) dozwolone — REGRESJA', true, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));
add('update workout (users bez pola status) dozwolone', true, await ok(() => updateDoc(doc(db, 'workouts', WORKOUT_ID), { completed: true })));
add('write training_plans (users bez pola status) dozwolone', true, await ok(() => setDoc(doc(db, 'training_plans', UID), { days: [], durationWeeks: 12, startDate: '2026-06-08', updatedAt: 'x' })));

// === Measurements ===
await env.clearFirestore();
await seedUser({ enabled: true });
const measurement = { userId: UID, date: '2026-06-08', weight: 80 };
add('create measurement (active)', true, await ok(() => setDoc(doc(db, 'measurements', 'm1'), measurement)));
add('update measurement (active)', true, await ok(() => updateDoc(doc(db, 'measurements', 'm1'), { weight: 81 })));
add('delete measurement (active)', true, await ok(() => deleteDoc(doc(db, 'measurements', 'm1'))));
add('create measurement z cudzym userId zablokowane', false, await ok(() => setDoc(doc(db, 'measurements', 'm2'), { ...measurement, userId: OTHER_UID })));

await env.clearFirestore();
await seedUser({ enabled: true }, 'pending_verification');
add('create measurement (pending_verification) zablokowane', false, await ok(() => setDoc(doc(db, 'measurements', 'm3'), measurement)));

// === Plan cycles ===
await env.clearFirestore();
await seedUser({ enabled: true });
const cycle = { userId: UID, status: 'active', startDate: '2026-06-08', days: [] };
add('getDoc nieistniejacy plan_cycle (resource==null)', true, await ok(() => getDoc(doc(db, 'plan_cycles', 'c-missing'))));
add('create plan_cycle (active)', true, await ok(() => setDoc(doc(db, 'plan_cycles', 'c1'), cycle)));
await seedUser(undefined, 'active', OTHER_UID);
add('read cudzego plan_cycle zablokowane', false, await ok(() => getDoc(doc(otherDb, 'plan_cycles', 'c1'))));

const mergeOperation = { userId: UID, kind: 'merge_cycles', phase: 'remapping', nextWorkoutIndex: 0, nextCycleIndex: 0 };
add('create prywatnego checkpointu merge cycles (active)', true, await ok(() => setDoc(doc(db, 'plan_cycle_operations', 'merge-c1'), mergeOperation)));
add('read cudzego checkpointu merge cycles zablokowane', false, await ok(() => getDoc(doc(otherDb, 'plan_cycle_operations', 'merge-c1'))));
add('update checkpointu ze zmiana userId zablokowane', false, await ok(() => updateDoc(doc(db, 'plan_cycle_operations', 'merge-c1'), { userId: OTHER_UID })));

await env.clearFirestore();
await seedUser({ enabled: true }, 'pending_verification');
add('create plan_cycle (pending_verification) zablokowane', false, await ok(() => setDoc(doc(db, 'plan_cycles', 'c2'), cycle)));

// === Telemetry ===
await env.clearFirestore();
await seedUser({ enabled: true });
const telemetry = { userId: UID, date: '2026-06-08', updatedAt: '2026-06-08T00:00:00.000Z', counters: { sync_success: 1 } };
add('create app_telemetry_daily (active)', true, await ok(() => setDoc(doc(db, 'app_telemetry_daily', `t-${UID}`), telemetry)));
add('create app_telemetry_daily z licznikiem spoza listy zablokowane', false, await ok(() => setDoc(doc(db, 'app_telemetry_daily', 't-evil'), { ...telemetry, counters: { evil_counter: 1 } })));
add('delete app_telemetry_daily zablokowane', false, await ok(() => deleteDoc(doc(db, 'app_telemetry_daily', `t-${UID}`))));
add('create app_telemetry_daily z cudzym userId zablokowane', false, await ok(() => setDoc(doc(db, 'app_telemetry_daily', 't-x'), { ...telemetry, userId: OTHER_UID })));
// X13A: merge-update liczników (dot-notation) = hasOnly z pełną listą nazw.
add('update licznika produktowego (session_active) przechodzi', true, await ok(() => updateDoc(doc(db, 'app_telemetry_daily', `t-${UID}`), { 'counters.session_active': increment(1), updatedAt: '2026-07-17T00:00:00.000Z' })));
add('update licznika screen_dashboard przechodzi', true, await ok(() => updateDoc(doc(db, 'app_telemetry_daily', `t-${UID}`), { 'counters.screen_dashboard': increment(2), updatedAt: '2026-07-17T00:00:00.000Z' })));
add('update licznika revision_conflict (stara unia) przechodzi', true, await ok(() => updateDoc(doc(db, 'app_telemetry_daily', `t-${UID}`), { 'counters.revision_conflict': increment(1), updatedAt: '2026-07-17T00:00:00.000Z' })));
add('update licznika spoza listy zablokowane', false, await ok(() => updateDoc(doc(db, 'app_telemetry_daily', `t-${UID}`), { 'counters.evil_counter': increment(1) })));
add('update cudzego dokumentu telemetrii zablokowane', false, await ok(() => updateDoc(doc(otherDb, 'app_telemetry_daily', `t-${UID}`), { 'counters.session_active': increment(1) })));
// Z100/Z101: backupy napraw i dziennik akcji admina.
await seedUser(undefined, 'active', ADMIN_UID, 'admin');
add('admin_repair_backups: klient (nawet admin) nie tworzy', false, await ok(() => setDoc(doc(adminDb, 'admin_repair_backups', 'b-1'), { adminUid: ADMIN_UID, docs: [] })));
const auditEntry = { adminUid: ADMIN_UID, action: 'toggle:access', targetUid: UID, detail: 'off', createdAt: '2026-07-17T12:00:00.000Z' };
add('admin_audit_log: admin tworzy wpis create-only', true, await ok(() => setDoc(doc(adminDb, 'admin_audit_log', 'a-1'), auditEntry)));
add('admin_audit_log: zwykly user nie tworzy', false, await ok(() => setDoc(doc(db, 'admin_audit_log', 'a-2'), { ...auditEntry, adminUid: UID })));
add('admin_audit_log: admin nie edytuje istniejacego', false, await ok(() => updateDoc(doc(adminDb, 'admin_audit_log', 'a-1'), { detail: 'edit' })));
add('admin_audit_log: zwykly user nie czyta', false, await ok(() => getDoc(doc(db, 'admin_audit_log', 'a-1'))));
add('admin_audit_log: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(adminDb, 'admin_audit_log', 'a-3'), { ...auditEntry, evil: 1 })));
// Z99: szczegół usera w panelu admina czyta cudzą telemetrię i plan.
await seedUser(undefined, 'active', ADMIN_UID, 'admin');
add('read cudzej telemetrii jako admin', true, await ok(() => getDoc(doc(adminDb, 'app_telemetry_daily', `t-${UID}`))));
add('read cudzej telemetrii jako zwykly user zablokowane', false, await ok(() => getDoc(doc(otherDb, 'app_telemetry_daily', `t-${UID}`))));

// === Client errors: append-only, wlasne wpisy, odczyt tylko admin ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedUser(undefined, 'active', ADMIN_UID, 'admin');
const clientError = {
  userId: UID, code: 'revision-conflict', phase: 'checkpoint', detail: 'WORKOUT_CONFLICT',
  sessionHash: 'ab12cd34', appVersion: '6.13.0', platform: 'ios', createdAt: Date.now(),
};
add('create client_errors wlasny wpis', true, await ok(() => setDoc(doc(db, 'client_errors', 'ce-1'), clientError)));
add('create client_errors z cudzym userId zablokowane', false, await ok(() => setDoc(doc(db, 'client_errors', 'ce-2'), { ...clientError, userId: OTHER_UID })));
add('create client_errors z nadmiarowym polem zablokowane', false, await ok(() => setDoc(doc(db, 'client_errors', 'ce-3'), { ...clientError, extra: 'x' })));
add('create client_errors z detail > 500 znakow zablokowane', false, await ok(() => setDoc(doc(db, 'client_errors', 'ce-4'), { ...clientError, detail: 'x'.repeat(501) })));
add('read client_errors jako zwykly user zablokowane', false, await ok(() => getDoc(doc(db, 'client_errors', 'ce-1'))));
add('read client_errors jako admin', true, await ok(() => getDoc(doc(adminDb, 'client_errors', 'ce-1'))));
add('update client_errors zablokowane', false, await ok(() => updateDoc(doc(db, 'client_errors', 'ce-1'), { detail: 'edit' })));
add('delete client_errors zablokowane', false, await ok(() => deleteDoc(doc(db, 'client_errors', 'ce-1'))));

// === Schemat workouts (Z28): hasOnly + limity + lekcja ef8b8d5 (pole nie istnieje) ===
await env.clearFirestore();
await seedUser({ enabled: true });
add('create workout z lastWriteId (schemat zamkniety)', true, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), { ...newWorkout, revision: 0, updatedAt: 1, lastWriteId: 'w-1' })));
add('update workout z nadmiarowym polem zablokowane', false, await ok(() => updateDoc(doc(db, 'workouts', WORKOUT_ID), { hackedField: 'x' })));
add('create workout z nadmiarowym polem zablokowane', false, await ok(() => setDoc(doc(db, 'workouts', `${WORKOUT_ID}-x`), { ...newWorkout, id: `${WORKOUT_ID}-x`, blob: 'y' })));
add('update workout z notes > 5000 znakow zablokowane', false, await ok(() => updateDoc(doc(db, 'workouts', WORKOUT_ID), { notes: 'x'.repeat(5001) })));
add('update workout z notes <= 5000 znakow', true, await ok(() => updateDoc(doc(db, 'workouts', WORKOUT_ID), { notes: 'dobra sesja' })));

// Konto bez pola status (Google sprzed hardeningu) nadal zapisuje trening (lekcja ef8b8d5).
await env.clearFirestore();
await seedDoc('users', UID, { uid: UID, email: `${UID}@b.c`, role: 'user', onboardingCompleted: true });
add('create workout na koncie BEZ pola status (schemat zamkniety)', true, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));

// Dokument legacy z polem createdAt (sprzed schematu Z28): update MUSI przechodzic,
// inaczej checkpoint/edycja takiego treningu pada PERMISSION_DENIED (lekcja 880cb9e:
// kazda zmiana regul musi miec przypadek z danymi w ksztalcie sprzed hardeningu).
await env.clearFirestore();
await seedUser({ enabled: true });
await seedDoc('workouts', WORKOUT_ID, { ...newWorkout, createdAt: 1751000000000 });
add('update workouta LEGACY z polem createdAt dozwolony — REGRESJA', true, await ok(() => updateDoc(doc(db, 'workouts', WORKOUT_ID), { completed: true })));

// === Chat messages: create zamkniete (feature usuniety v6.7.0, pisze tylko admin SDK) ===
await env.clearFirestore();
await seedUser({ enabled: true });
add('create chat_messages przez klienta zablokowane', false, await ok(() => setDoc(doc(db, 'chat_messages', 'm1'), { userId: UID, role: 'user', content: 'hi' })));

// === Config zawezone do feature_flags ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedDoc('config', 'feature_flags', { workoutTimers: false });
await seedDoc('config', 'secret_settings', { apiUrl: 'x' });
add('read config/feature_flags przez zalogowanego', true, await ok(() => getDoc(doc(db, 'config', 'feature_flags'))));
add('read config/secret_settings zablokowane', false, await ok(() => getDoc(doc(db, 'config', 'secret_settings'))));

// === Strava activities: zapis tylko Cloud Functions, odczyt tylko wlasciciel ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedUser(undefined, 'active', OTHER_UID);
await seedDoc('strava_activities', `strava-${UID}-1`, { userId: UID, stravaId: 1, name: 'Run', date: '2026-06-08' });
add('read wlasnej strava_activity (active)', true, await ok(() => getDoc(doc(db, 'strava_activities', `strava-${UID}-1`))));
add('read cudzej strava_activity zablokowane', false, await ok(() => getDoc(doc(otherDb, 'strava_activities', `strava-${UID}-1`))));
add('write strava_activity przez usera zablokowane', false, await ok(() => setDoc(doc(db, 'strava_activities', `strava-${UID}-2`), { userId: UID, stravaId: 2 })));

// === Kolekcje prywatne (Cloud Functions only) ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedDoc('strava_connections', UID, { userId: UID, accessToken: 'secret' });
await seedDoc('api_keys', 'k1', { userId: UID, keyHash: 'h' });
await seedDoc('api_audit_logs', 'l1', { userId: UID });
await seedDoc('email_verification_codes', 'e1', { uid: UID, codeHash: 'h' });
await seedDoc('auth_audit_logs', 'a1', { uid: UID });
await seedDoc('notification_logs', 'n1', { userId: UID });
add('read wlasnego strava_connections zablokowane', false, await ok(() => getDoc(doc(db, 'strava_connections', UID))));
add('read wlasnego api_keys zablokowane', false, await ok(() => getDoc(doc(db, 'api_keys', 'k1'))));
add('read api_audit_logs zablokowane', false, await ok(() => getDoc(doc(db, 'api_audit_logs', 'l1'))));
add('read email_verification_codes zablokowane', false, await ok(() => getDoc(doc(db, 'email_verification_codes', 'e1'))));
add('read auth_audit_logs zablokowane', false, await ok(() => getDoc(doc(db, 'auth_audit_logs', 'a1'))));
add('read notification_logs zablokowane', false, await ok(() => getDoc(doc(db, 'notification_logs', 'n1'))));

// === Pola Max HR (Z59): user pisze bezposrednio z walidacja typow i widelek ===
await env.clearFirestore();
await seedUser({ enabled: true });
add('user update estimatedMaxHR w widelkach ALLOWED', true, await ok(() => updateDoc(doc(db, 'users', UID), { estimatedMaxHR: 190, maxHRManualOverride: true })));
add('user update estimatedMaxHR poza widelkami DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { estimatedMaxHR: 300 })));
add('user update estimatedMaxHR zly typ DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { estimatedMaxHR: 'wysoki' })));
add('user update maxHRManualOverride zly typ DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { maxHRManualOverride: 'tak' })));
add('user update zwyklego pola profilu (displayName)', true, await ok(() => updateDoc(doc(db, 'users', UID), { displayName: 'G' })));
add('user update trainingProfile podczas onboardingu', true, await ok(() => updateDoc(doc(db, 'users', UID), { trainingProfile: { level: 'beginner', objective: 'build_muscle', daysPerWeek: 3 } })));
add('user update subscription zablokowane', false, await ok(() => updateDoc(doc(db, 'users', UID), { subscription: { tier: 'yearly', status: 'active' } })));
add('zapis Max HR przez admin SDK (sciezka callable saveMaxHR)', true, await ok(() => env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), { estimatedMaxHR: 190, maxHRManualOverride: true }, { merge: true });
})));

// === Z41: zamkniete schematy kolekcji klienckich (R2-13, R2-14, R2-15) ===

// client_errors: pelna walidacja pol + widelki createdAt
await env.clearFirestore();
await seedUser({ enabled: true });
const validClientError = {
  userId: UID, code: 'revision-conflict', phase: 'checkpoint', detail: 'WORKOUT_CONFLICT',
  sessionHash: 'ab12cd34', appVersion: '6.13.0', platform: 'ios', createdAt: Date.now(),
  expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
};
add('client_errors: zgodny wpis z expiresAt ALLOWED', true, await ok(() => setDoc(doc(db, 'client_errors', 'z41-1'), validClientError)));
const legacyClientError = { ...validClientError };
delete legacyClientError.expiresAt;
add('client_errors: wpis BEZ expiresAt (klient build <= 48) ALLOWED', true, await ok(() => setDoc(doc(db, 'client_errors', 'z41-2'), legacyClientError)));
add('client_errors: platform spoza listy DENIED', false, await ok(() => setDoc(doc(db, 'client_errors', 'z41-3'), { ...validClientError, platform: 'windows' })));
add('client_errors: createdAt poza widelkami DENIED', false, await ok(() => setDoc(doc(db, 'client_errors', 'z41-4'), { ...validClientError, createdAt: Date.now() - 60 * 60 * 1000 })));
add('client_errors: sessionHash o zlej dlugosci DENIED', false, await ok(() => setDoc(doc(db, 'client_errors', 'z41-5'), { ...validClientError, sessionHash: 'za-krotki-za-dlugi' })));
add('client_errors: code > 64 znakow DENIED', false, await ok(() => setDoc(doc(db, 'client_errors', 'z41-6'), { ...validClientError, code: 'x'.repeat(65) })));
add('client_errors: expiresAt nie-timestamp DENIED', false, await ok(() => setDoc(doc(db, 'client_errors', 'z41-7'), { ...validClientError, expiresAt: 12345 })));

// training_plans: zamkniety schemat
await env.clearFirestore();
await seedUser({ enabled: true });
const validPlan = { days: [], durationWeeks: 12, startDate: '2026-06-08', updatedAt: '2026-06-08T00:00:00.000Z', revision: 1 };
add('training_plans: zgodny dokument ALLOWED', true, await ok(() => setDoc(doc(db, 'training_plans', UID), validPlan)));
add('training_plans: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(db, 'training_plans', UID), { ...validPlan, blob: 'x'.repeat(10) })));
add('training_plans: days nie-lista DENIED', false, await ok(() => setDoc(doc(db, 'training_plans', UID), { ...validPlan, days: 'oops' })));

// measurements: zamkniety schemat + typy
await env.clearFirestore();
await seedUser({ enabled: true });
const validMeasurement = { id: 'm-1', userId: UID, date: '2026-06-08', weight: 82.5, waist: 90 };
add('measurements: zgodny pomiar ALLOWED', true, await ok(() => setDoc(doc(db, 'measurements', 'm-1'), validMeasurement)));
add('measurements: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(db, 'measurements', 'm-2'), { ...validMeasurement, id: 'm-2', notes: 'blob' })));
add('measurements: weight nie-liczba DENIED', false, await ok(() => setDoc(doc(db, 'measurements', 'm-3'), { ...validMeasurement, id: 'm-3', weight: 'duzo' })));

// plan_cycles: zamkniety schemat (dokument produkcyjny z technical/hiddenFromInsights przechodzi)
await env.clearFirestore();
await seedUser({ enabled: true });
const validCycle = {
  userId: UID, days: [], durationWeeks: 8, startDate: '2026-03-02', endDate: '2026-04-26',
  status: 'completed', createdAt: '2026-03-02T00:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  technical: true, hiddenFromInsights: true,
};
add('plan_cycles: zgodny cykl (z polami technical) ALLOWED', true, await ok(() => setDoc(doc(db, 'plan_cycles', 'c-1'), validCycle)));
add('plan_cycles: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(db, 'plan_cycles', 'c-2'), { ...validCycle, evil: 1 })));
add('plan_cycles: status nie-string DENIED', false, await ok(() => setDoc(doc(db, 'plan_cycles', 'c-3'), { ...validCycle, status: 7 })));

// plan_cycle_operations: zamkniety schemat
await env.clearFirestore();
await seedUser({ enabled: true });
const validOperation = {
  userId: UID, kind: 'merge_cycles', primaryCycleId: 'c-1', restCycleIds: ['c-2'],
  workoutIds: ['w-1'], newStart: '2026-03-02', newEnd: '2026-04-26', newDuration: 8,
  phase: 'remapping', nextWorkoutIndex: 0, nextCycleIndex: 0,
};
add('plan_cycle_operations: zgodna operacja ALLOWED', true, await ok(() => setDoc(doc(db, 'plan_cycle_operations', 'op-1'), validOperation)));
add('plan_cycle_operations: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(db, 'plan_cycle_operations', 'op-2'), { ...validOperation, evil: 1 })));

// app_telemetry_daily: zamkniety schemat + legacy plaskie klucze counters.*
await env.clearFirestore();
await seedUser({ enabled: true });
const validTelemetry = { userId: UID, date: '2026-06-08', updatedAt: '2026-06-08T00:00:00.000Z', counters: { sync_success: 1 } };
add('app_telemetry_daily: zgodny dokument ALLOWED', true, await ok(() => setDoc(doc(db, 'app_telemetry_daily', `${UID}-2026-06-08`), validTelemetry)));
add('app_telemetry_daily: expiresAt (TTL 180 dni) ALLOWED', true, await ok(() => setDoc(doc(db, 'app_telemetry_daily', `${UID}-2026-06-10`), { ...validTelemetry, expiresAt: Timestamp.fromMillis(Date.now() + 180 * 24 * 60 * 60 * 1000) })));
add('app_telemetry_daily: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(db, 'app_telemetry_daily', `${UID}-2026-06-09`), { ...validTelemetry, evil: 1 })));
// Dokumenty legacy maja PLASKIE klucze "counters.xxx" (historyczny zapis) — update musi przechodzic.
await seedDoc('app_telemetry_daily', `${UID}-2026-01-01`, { userId: UID, date: '2026-01-01', updatedAt: 'x', 'counters.draft_recovered': 1, 'counters.sync_success': 2 });
add('app_telemetry_daily: merge na dokumencie legacy (plaskie counters.*) ALLOWED — REGRESJA', true, await ok(() => setDoc(doc(db, 'app_telemetry_daily', `${UID}-2026-01-01`), validTelemetry, { merge: true })));

// users: typy wartosci na whiteliscie update
await env.clearFirestore();
await seedUser({ enabled: true });
add('users: notificationPrefs mapa ALLOWED', true, await ok(() => updateDoc(doc(db, 'users', UID), { notificationPrefs: { weeklyDigest: false } })));
// Z96: activitySummary pisze wyłącznie Admin SDK (rollup) — klient DENIED.
add('users: klient nie zapisze activitySummary DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { activitySummary: { lastActiveAt: '2026-07-17' } })));
add('users: notificationPrefs nie-mapa DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { notificationPrefs: 'wylacz' })));
add('users: displayName > 200 znakow DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { displayName: 'x'.repeat(201) })));
add('users: preferences nie-mapa DENIED', false, await ok(() => updateDoc(doc(db, 'users', UID), { preferences: 42 })));

// weekly_summaries: martwe uprawnienia zamkniete (klient tylko czyta)
await env.clearFirestore();
await seedUser({ enabled: true });
await seedDoc('weekly_summaries', 'ws-1', { userId: UID, weekStart: '2026-06-01', weekEnd: '2026-06-07', summary: 's' });
add('weekly_summaries: read wlasnego ALLOWED', true, await ok(() => getDoc(doc(db, 'weekly_summaries', 'ws-1'))));
add('weekly_summaries: create przez klienta DENIED', false, await ok(() => setDoc(doc(db, 'weekly_summaries', 'ws-2'), { userId: UID, weekStart: '2026-06-08', weekEnd: '2026-06-14', summary: 'x' })));
add('weekly_summaries: update przez klienta DENIED', false, await ok(() => updateDoc(doc(db, 'weekly_summaries', 'ws-1'), { summary: 'edit' })));

// chat_messages: delete zamkniete (GDPR kasuje admin SDK)
await env.clearFirestore();
await seedUser({ enabled: true });
await seedDoc('chat_messages', 'cm-1', { userId: UID, role: 'user', content: 'hi' });
add('chat_messages: delete przez klienta DENIED', false, await ok(() => deleteDoc(doc(db, 'chat_messages', 'cm-1'))));

// === Custom exercises (Z71): wlasne cwiczenia usera, zamkniety schemat ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedUser(undefined, 'active', OTHER_UID);
await seedUser(undefined, 'active', ADMIN_UID, 'admin');
const validCustomExercise = {
  userId: UID, name: 'Moje wioslowanie', category: 'back', isBodyweight: false, type: 'compound', createdAt: Date.now(),
};
add('custom_exercises: create wlasnego ALLOWED', true, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-1'), validCustomExercise)));
add('custom_exercises: create z cudzym userId DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-2'), { ...validCustomExercise, userId: OTHER_UID })));
add('custom_exercises: category spoza listy DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-3'), { ...validCustomExercise, category: 'cardio' })));
add('custom_exercises: nazwa 200 znakow DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-4'), { ...validCustomExercise, name: 'x'.repeat(200) })));
add('custom_exercises: nazwa 1 znak DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-5'), { ...validCustomExercise, name: 'x' })));
add('custom_exercises: nadmiarowe pole DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-6'), { ...validCustomExercise, evil: 1 })));
add('custom_exercises: type spoza listy DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-7'), { ...validCustomExercise, type: 'cardio' })));
add('custom_exercises: isBodyweight nie-bool DENIED', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-8'), { ...validCustomExercise, isBodyweight: 'tak' })));
add('custom_exercises: read wlasnego ALLOWED', true, await ok(() => getDoc(doc(db, 'custom_exercises', 'cx-1'))));
add('custom_exercises: read cudzego DENIED', false, await ok(() => getDoc(doc(otherDb, 'custom_exercises', 'cx-1'))));
add('custom_exercises: read admin ALLOWED', true, await ok(() => getDoc(doc(adminDb, 'custom_exercises', 'cx-1'))));
add('custom_exercises: update wlasnego ALLOWED', true, await ok(() => updateDoc(doc(db, 'custom_exercises', 'cx-1'), { name: 'Moje wioslowanie v2' })));
add('custom_exercises: update cudzego DENIED', false, await ok(() => updateDoc(doc(otherDb, 'custom_exercises', 'cx-1'), { name: 'przejete' })));
add('custom_exercises: update ze zmiana userId DENIED', false, await ok(() => updateDoc(doc(db, 'custom_exercises', 'cx-1'), { userId: OTHER_UID })));
add('custom_exercises: delete wlasnego ALLOWED', true, await ok(() => deleteDoc(doc(db, 'custom_exercises', 'cx-1'))));
add('custom_exercises: tracking z listy ALLOWED (Z105)', true, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-t1'), { ...validCustomExercise, tracking: 'assisted_bodyweight' })));
add('custom_exercises: tracking spoza listy DENIED (Z105)', false, await ok(() => setDoc(doc(db, 'custom_exercises', 'cx-t2'), { ...validCustomExercise, tracking: 'cardio' })));

// === Import CSV (Z110): tag importBatchId w workouts ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedUser(undefined, 'active', OTHER_UID);
const importedWorkout = {
  id: 'imported-abc123-1', userId: UID, dayId: 'imported-abc123-1', date: '2026-05-04',
  completed: true, dayName: 'Import test', importBatchId: 'abc123',
  exercises: [{ exerciseId: 'imported-ex-1', name: 'Plank', sets: [{ reps: 0, weight: 0, completed: true, durationSec: 90 }] }],
};
add('workouts: create importowanego z importBatchId ALLOWED (Z110)', true, await ok(() => setDoc(doc(db, 'workouts', 'imported-abc123-1'), importedWorkout)));
add('workouts: import z cudzym userId DENIED (Z110)', false, await ok(() => setDoc(doc(db, 'workouts', 'imported-abc123-2'), { ...importedWorkout, id: 'imported-abc123-2', userId: OTHER_UID })));
add('workouts: importBatchId nie-string DENIED (Z110)', false, await ok(() => setDoc(doc(db, 'workouts', 'imported-abc123-3'), { ...importedWorkout, id: 'imported-abc123-3', importBatchId: 42 })));
add('workouts: delete wlasnego importowanego ALLOWED (cofniecie importu, Z110)', true, await ok(() => deleteDoc(doc(db, 'workouts', 'imported-abc123-1'))));

// === Progresja programowa (Z119): pole progression w training_plans ===
await env.clearFirestore();
await seedUser({ enabled: true });
add('training_plans: zapis z progression ALLOWED (Z119)', true, await ok(() => setDoc(doc(db, 'training_plans', UID), {
  days: [], durationWeeks: 12, progression: { enabled: true, deloadEveryWeeks: 5 },
})));
add('training_plans: progression z polem spoza schematu DENIED (Z119)', false, await ok(() => setDoc(doc(db, 'training_plans', UID), {
  days: [], durationWeeks: 12, progression: { enabled: true, evil: 1 },
})));
add('training_plans: progression.enabled nie-bool DENIED (Z119)', false, await ok(() => setDoc(doc(db, 'training_plans', UID), {
  days: [], durationWeeks: 12, progression: { enabled: 'tak' },
})));
add('training_plans: progression z deloadDecisions ALLOWED (Z119)', true, await ok(() => setDoc(doc(db, 'training_plans', UID), {
  days: [], durationWeeks: 12, progression: { enabled: true, deloadEveryWeeks: 5, deloadDecisions: { '5': 'applied' } },
})));

// === Manual activities (Z111): reczne wpisy cardio, zamkniety schemat ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedUser(undefined, 'active', OTHER_UID);
const validManualActivity = {
  userId: UID, type: 'Treadmill', date: '2026-07-19', movingTime: 1800,
  name: 'Bieżnia po treningu', perceivedIntensity: 'moderate', createdAt: Date.now(),
};
add('manual_activities: create wlasnego ALLOWED', true, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-1'), validManualActivity)));
add('manual_activities: create z cudzym userId DENIED', false, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-2'), { ...validManualActivity, userId: OTHER_UID })));
add('manual_activities: typ spoza listy DENIED', false, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-3'), { ...validManualActivity, type: 'KravMaga' })));
add('manual_activities: pole spoza schematu DENIED', false, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-4'), { ...validManualActivity, evil: 1 })));
add('manual_activities: movingTime 0 DENIED', false, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-5'), { ...validManualActivity, movingTime: 0 })));
add('manual_activities: intensity spoza listy DENIED', false, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-6'), { ...validManualActivity, perceivedIntensity: 'ultra' })));
add('manual_activities: update wlasnego ALLOWED', true, await ok(() => setDoc(doc(db, 'manual_activities', 'ma-1'), { ...validManualActivity, movingTime: 2400 })));
add('manual_activities: update cudzego DENIED', false, await ok(() => setDoc(doc(otherDb, 'manual_activities', 'ma-1'), { ...validManualActivity, userId: OTHER_UID })));
add('manual_activities: read wlasnego ALLOWED', true, await ok(() => getDoc(doc(db, 'manual_activities', 'ma-1'))));
add('manual_activities: read cudzego DENIED', false, await ok(() => getDoc(doc(otherDb, 'manual_activities', 'ma-1'))));
add('manual_activities: delete wlasnego ALLOWED', true, await ok(() => deleteDoc(doc(db, 'manual_activities', 'ma-1'))));

// === Exercise notes (Z103): przypieta notatka per cwiczenie, zamkniety schemat ===
await env.clearFirestore();
await seedUser({ enabled: true });
await seedUser(undefined, 'active', OTHER_UID);
await seedUser(undefined, 'active', ADMIN_UID, 'admin');
const validExerciseNote = {
  userId: UID, exerciseName: 'Przysiad ze sztangą', note: 'pas na 3 dziurkę', machineSettings: 'siedzisko 4', updatedAt: Date.now(),
};
add('exercise_notes: create wlasnej ALLOWED', true, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_przysiad-ze-sztanga`), validExerciseNote)));
add('exercise_notes: create z cudzym userId DENIED', false, await ok(() => setDoc(doc(db, 'exercise_notes', `${OTHER_UID}_przysiad`), { ...validExerciseNote, userId: OTHER_UID })));
add('exercise_notes: pole spoza schematu DENIED', false, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_x1`), { ...validExerciseNote, evil: 1 })));
add('exercise_notes: note 501 znakow DENIED', false, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_x2`), { ...validExerciseNote, note: 'x'.repeat(501) })));
add('exercise_notes: machineSettings 201 znakow DENIED', false, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_x3`), { ...validExerciseNote, machineSettings: 'x'.repeat(201) })));
add('exercise_notes: bez machineSettings ALLOWED', true, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_x4`), { userId: UID, exerciseName: 'Martwy ciąg', note: 'hak nisko', updatedAt: Date.now() })));
add('exercise_notes: overwrite wlasnej (setDoc) ALLOWED', true, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_przysiad-ze-sztanga`), { ...validExerciseNote, note: 'nowa notatka' })));
add('exercise_notes: update ze zmiana userId DENIED', false, await ok(() => setDoc(doc(db, 'exercise_notes', `${UID}_przysiad-ze-sztanga`), { ...validExerciseNote, userId: OTHER_UID })));
add('exercise_notes: read wlasnej ALLOWED', true, await ok(() => getDoc(doc(db, 'exercise_notes', `${UID}_przysiad-ze-sztanga`))));
add('exercise_notes: read cudzej DENIED', false, await ok(() => getDoc(doc(otherDb, 'exercise_notes', `${UID}_przysiad-ze-sztanga`))));
add('exercise_notes: read admin ALLOWED', true, await ok(() => getDoc(doc(adminDb, 'exercise_notes', `${UID}_przysiad-ze-sztanga`))));
add('exercise_notes: delete wlasnej ALLOWED', true, await ok(() => deleteDoc(doc(db, 'exercise_notes', `${UID}_przysiad-ze-sztanga`))));
add('exercise_notes: delete cudzej DENIED', false, await ok(() => deleteDoc(doc(otherDb, 'exercise_notes', `${UID}_x4`))));

await env.cleanup();

let failed = 0;
console.log('\n=== TEST REGUŁ FIRESTORE ===');
for (const c of cases) {
  const pass = c.pass === c.expected;
  if (!pass) failed++;
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'}  ${c.name}  (oczekiwano: ${c.expected ? 'allow' : 'deny'}, było: ${c.pass ? 'allow' : 'deny'})`);
}
console.log(failed === 0 ? `\nWszystkie ${cases.length} testów reguł przeszło.` : `\n${failed} testów reguł NIE przeszło.`);
process.exit(failed === 0 ? 0 : 1);
