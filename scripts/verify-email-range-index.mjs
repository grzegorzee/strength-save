#!/usr/bin/env node

// J-T1: weryfikacja READ-ONLY composite indeksu workouts(userId ASC, completed ASC, date DESC).
// Odtwarza DOKŁADNIE zapytania listWorkoutsInRange z functions/src/index.ts
// (week: sinceDate; last30: sam limit; baseline PR: beforeDate) dla uid admina.
// ZERO zapisów — wyłącznie get(). Bez indeksu Firestore rzuca failed-precondition,
// czyli dokładnie ten błąd, który klient widział jako "Sending failed".
//
// Użycie: node scripts/verify-email-range-index.mjs

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: 'fittracker-workouts' });
}
const db = getFirestore();

const adminSnap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
if (adminSnap.empty) {
  console.error('Brak usera z role=admin');
  process.exit(1);
}
const uid = adminSnap.docs[0].id;
console.log(`admin uid: ${uid.slice(0, 6)}...`);

const runQuery = async (label, opts) => {
  let query = db.collection('workouts')
    .where('userId', '==', uid)
    .where('completed', '==', true);
  if (opts.sinceDate) query = query.where('date', '>=', opts.sinceDate);
  if (opts.beforeDate) query = query.where('date', '<', opts.beforeDate);
  const snap = await query.orderBy('date', 'desc').limit(opts.limit).get();
  console.log(`${label}: OK, ${snap.size} treningów`);
};

const today = new Date().toISOString().slice(0, 10);
const sinceDate = new Date(Date.parse(`${today}T00:00:00.000Z`) - 6 * 86400000)
  .toISOString().slice(0, 10);

try {
  await runQuery('week (sinceDate)', { sinceDate, limit: 14 });
  await runQuery('last30', { limit: 30 });
  await runQuery('baseline PR (beforeDate)', { beforeDate: today, limit: 100 });
  console.log('INDEX VERIFY: PASS');
} catch (error) {
  console.error('INDEX VERIFY: FAIL', error?.message ?? error);
  process.exit(1);
}
