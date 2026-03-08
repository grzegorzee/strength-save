/**
 * Migration script: Add userId to all existing workouts and measurements
 * Also copies training_plans/current -> training_plans/{userId}
 * And creates users/{userId} document with role: "admin"
 *
 * Usage:
 *   GRZEGORZ_UID=<firebase-uid> node scripts/migrate-to-multiuser.mjs
 *
 * How to find your UID:
 *   1. Open the app, open browser console
 *   2. Run: firebase.auth().currentUser.uid
 *   Or check Firebase Console -> Authentication -> Users
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCeOk53XZs0yFpwpxx505YiP305Z1szjus',
  authDomain: 'fittracker-workouts.firebaseapp.com',
  projectId: 'fittracker-workouts',
  storageBucket: 'fittracker-workouts.firebasestorage.app',
  messagingSenderId: '283539506094',
  appId: '1:283539506094:web:fcb9e5af60d71fd566be3f',
};

const GRZEGORZ_UID = process.env.GRZEGORZ_UID;

if (!GRZEGORZ_UID) {
  console.error('ERROR: Set GRZEGORZ_UID environment variable');
  console.error('Usage: GRZEGORZ_UID=<uid> node scripts/migrate-to-multiuser.mjs');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCollection(collectionName) {
  console.log(`\nMigrating ${collectionName}...`);
  const snapshot = await getDocs(collection(db, collectionName));
  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.userId) {
      skipped++;
      continue;
    }

    await updateDoc(doc(db, collectionName, docSnap.id), {
      userId: GRZEGORZ_UID,
    });
    updated++;
  }

  console.log(`  ${collectionName}: ${updated} updated, ${skipped} already had userId`);
}

async function migrateTrainingPlan() {
  console.log('\nMigrating training_plans...');
  const currentDoc = await getDoc(doc(db, 'training_plans', 'current'));

  if (!currentDoc.exists()) {
    console.log('  No training_plans/current found, skipping');
    return;
  }

  const data = currentDoc.data();

  // Copy to training_plans/{userId}
  await setDoc(doc(db, 'training_plans', GRZEGORZ_UID), data);
  console.log(`  Copied training_plans/current -> training_plans/${GRZEGORZ_UID}`);
}

async function createUserDoc() {
  console.log('\nCreating user document...');
  await setDoc(doc(db, 'users', GRZEGORZ_UID), {
    uid: GRZEGORZ_UID,
    email: 'g.jasionowicz@gmail.com',
    displayName: 'Grzegorz',
    role: 'admin',
    stravaConnected: false,
    createdAt: new Date().toISOString(),
  }, { merge: true });
  console.log(`  Created users/${GRZEGORZ_UID} with role: admin`);
}

async function main() {
  console.log('=== Multi-user Migration ===');
  console.log(`Target UID: ${GRZEGORZ_UID}`);

  await migrateCollection('workouts');
  await migrateCollection('measurements');
  await migrateTrainingPlan();
  await createUserDoc();

  console.log('\n=== Migration complete! ===');
  console.log('Next steps:');
  console.log('1. Deploy Firestore indexes (composite index needed for userId + date)');
  console.log('2. Deploy Firestore security rules');
  console.log('3. Update .env with VITE_ALLOWED_EMAILS');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
