// Test reguł Firestore na emulatorze. Regresja: getDoc na nieistniejącym dokumencie
// treningu zwracał PERMISSION_DENIED i blokował rozpoczęcie pierwszego treningu nowego planu.
// Uruchom: npm run test:rules  (wymaga JDK 21 + firebase-tools)
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'rules-repro',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const UID = 'user123';
const WORKOUT_ID = `workout-${UID}-tpl-fullbody-2-2026-06-08`;

const seedUser = async (accessField) => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', UID), {
      uid: UID, email: 'a@b.c', role: 'user', status: 'active',
      onboardingCompleted: true, ...(accessField !== undefined ? { access: accessField } : {}),
    });
  });
};

const db = env.authenticatedContext(UID).firestore();
const newWorkout = { id: WORKOUT_ID, userId: UID, dayId: 'tpl-fullbody-2', date: '2026-06-08', exercises: [], completed: false };
const ok = (fn) => fn().then(() => true, () => false);

// expected: true = ma przejść, false = ma być zablokowane
const cases = [];
const add = (name, expected, pass) => cases.push({ name, expected, pass });

await env.clearFirestore();
await seedUser({ enabled: true });
add('getDoc nieistniejacy workout (access=true) — REGRESJA', true, await ok(() => getDoc(doc(db, 'workouts', WORKOUT_ID))));
add('create workout (access=true)', true, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));
add('write training_plans (access=true)', true, await ok(() => setDoc(doc(db, 'training_plans', UID), { days: [], durationWeeks: 12, startDate: '2026-06-08', updatedAt: 'x' })));

await env.clearFirestore();
await seedUser({ enabled: false });
add('create workout (access=false) zablokowane', false, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));

await env.clearFirestore();
add('create workout (brak users doc) zablokowane', false, await ok(() => setDoc(doc(db, 'workouts', WORKOUT_ID), newWorkout)));

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
