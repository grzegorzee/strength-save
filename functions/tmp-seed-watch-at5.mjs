import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// BEZPIECZNIK (incydent 2026-08-20): uruchomiony bez env emulatorów admin SDK
// poszedł na PRODUKCJĘ przez ADC (konto admin z hasłem 123456 w prodzie,
// posprzątane). Seed działa WYŁĄCZNIE na emulatorach.
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('ODMOWA: ustaw FIREBASE_AUTH_EMULATOR_HOST i FIRESTORE_EMULATOR_HOST (seed tylko na emulatory).');
  process.exit(1);
}

const uid = 'Wmm2n1igMWi7N9E0hi3w3GfmVZpA';
const email = 'ios-offline-a-t5@e2e.test';

initializeApp({ projectId: 'fittracker-workouts' });

try {
  await getAuth().createUser({
    uid,
    email,
    password: '123456',
    displayName: 'iOS Offline',
    emailVerified: true,
  });
} catch (error) {
  if (error?.code !== 'auth/uid-already-exists') throw error;
  await getAuth().updateUser(uid, { password: '123456' });
}

const db = getFirestore();
await db.doc(`users/${uid}`).set({
  email,
  displayName: 'iOS Offline',
  role: 'admin',
  status: 'active',
  onboardingCompleted: true,
  access: { enabled: true },
  registration: { source: 'email' },
  auth: { primaryProvider: 'password' },
  consents: {
    termsVersion: '2.0',
    privacyVersion: '2.0',
    healthGranted: true,
    healthVersion: '1.0',
    marketingGranted: false,
    marketingVersion: '1.0',
  },
});

await db.doc(`training_plans/${uid}`).set({
  userId: uid,
  days: [{
    id: 'ios-offline-day',
    dayName: 'iOS offline',
    weekday: 'wednesday',
    focus: 'Full body',
    exercises: [{ id: 'ios-squat', name: 'Przysiad', sets: '3 x 5', instructions: '' }],
  }],
  planStartDate: '2026-08-19',
  planDurationWeeks: 12,
  updatedAt: new Date().toISOString(),
});

console.log(JSON.stringify({ uid, email, seeded: true }));
process.exit(0);
