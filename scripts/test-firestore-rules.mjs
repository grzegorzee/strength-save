// Test reguł Firestore na emulatorze. Regresja: getDoc na nieistniejącym dokumencie
// treningu zwracał PERMISSION_DENIED i blokował rozpoczęcie pierwszego treningu nowego planu.
// Uruchom: npm run test:rules  (wymaga JDK 21 + firebase-tools)
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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

await env.clearFirestore();
await seedUser({ enabled: true }, 'pending_verification');
add('create plan_cycle (pending_verification) zablokowane', false, await ok(() => setDoc(doc(db, 'plan_cycles', 'c2'), cycle)));

// === Telemetry ===
await env.clearFirestore();
await seedUser({ enabled: true });
const telemetry = { userId: UID, date: '2026-06-08', opens: 1 };
add('create app_telemetry_daily (active)', true, await ok(() => setDoc(doc(db, 'app_telemetry_daily', `t-${UID}`), telemetry)));
add('delete app_telemetry_daily zablokowane', false, await ok(() => deleteDoc(doc(db, 'app_telemetry_daily', `t-${UID}`))));
add('create app_telemetry_daily z cudzym userId zablokowane', false, await ok(() => setDoc(doc(db, 'app_telemetry_daily', 't-x'), { ...telemetry, userId: OTHER_UID })));

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

// === Pola Max HR: user nie pisze bezposrednio, callable (admin SDK) tak ===
await env.clearFirestore();
await seedUser({ enabled: true });
add('user update estimatedMaxHR zablokowane', false, await ok(() => updateDoc(doc(db, 'users', UID), { estimatedMaxHR: 190 })));
add('user update maxHRManualOverride zablokowane', false, await ok(() => updateDoc(doc(db, 'users', UID), { maxHRManualOverride: true })));
add('user update zwyklego pola profilu (displayName)', true, await ok(() => updateDoc(doc(db, 'users', UID), { displayName: 'G' })));
add('user update subscription zablokowane', false, await ok(() => updateDoc(doc(db, 'users', UID), { subscription: { tier: 'yearly', status: 'active' } })));
add('zapis Max HR przez admin SDK (sciezka callable saveMaxHR)', true, await ok(() => env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', UID), { estimatedMaxHR: 190, maxHRManualOverride: true }, { merge: true });
})));

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
