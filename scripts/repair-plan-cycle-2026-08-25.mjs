#!/usr/bin/env node

// H1 (X31): naprawa danych konta po incydencie 2026-08-24/25 (bugi A + B).
// Stan konta: training_plans/{uid} = plan FBW 3 dni, active, startDate 2026-09-07;
// plan_cycles/cycle-{uid}-2026-09-07 = completed, endDate 2026-08-25 (< startDate),
// durationWeeks 1, 0 treningow — zamkniety przez archiveCurrentPlan przy replanie
// z ta sama data startu (bug B). Zaden cykl nie jest aktywny.
//
// Skrypt przywraca ten cykl jako AKTYWNY cykl planu: status active, endDate '',
// durationWeeks = plan.durationWeeks, days = plan.days, stats wyzerowane.
// DRY-RUN jest domyslny i wylacznie czyta (drukuje diff). Zapis TYLKO z flaga
// --apply po jawnej zgodzie usera (dane usera sa swiete). Historia (workouts)
// NIE jest ruszana.
//
// Uzycie:
//   node scripts/repair-plan-cycle-2026-08-25.mjs --uid <uid>
//   node scripts/repair-plan-cycle-2026-08-25.mjs --uid <uid> --apply
// Opcjonalnie: --start-date 2026-09-07 (domyslnie), --project fittracker-workouts.

import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const DEFAULT_PROJECT_ID = 'fittracker-workouts';
const DEFAULT_START_DATE = '2026-09-07';

const usage = () => {
  console.error([
    'Usage:',
    '  node scripts/repair-plan-cycle-2026-08-25.mjs --uid <uid> [--start-date 2026-09-07] [--project fittracker-workouts]',
    '  node scripts/repair-plan-cycle-2026-08-25.mjs --uid <uid> --apply',
  ].join('\n'));
  process.exit(2);
};

const parseArgs = () => {
  const args = { apply: false, startDate: DEFAULT_START_DATE, project: DEFAULT_PROJECT_ID };
  const rest = process.argv.slice(2);
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key === '--apply') { args.apply = true; continue; }
    const value = rest[index + 1];
    if (!key?.startsWith('--') || !value) usage();
    if (key === '--uid') args.uid = value;
    else if (key === '--start-date') args.startDate = value;
    else if (key === '--project') args.project = value;
    else usage();
    index += 1;
  }
  if (!args.uid || !/^\d{4}-\d{2}-\d{2}$/.test(args.startDate)) usage();
  return args;
};

const initDb = (projectId) => {
  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId });
  return getFirestore(app);
};

const ZERO_STATS = { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 };

const fail = (message) => {
  console.error(`STOP: ${message}`);
  process.exit(1);
};

const describeDays = (days) => (Array.isArray(days)
  ? days.map((day) => `${day?.id ?? '?'} (${day?.dayName ?? '?'}, ${Array.isArray(day?.exercises) ? day.exercises.length : 0} cw.)`).join('; ')
  : 'BRAK');

const main = async () => {
  const args = parseArgs();
  const db = initDb(args.project);
  const cycleId = `cycle-${args.uid}-${args.startDate}`;

  // (1) Plan: oczekiwany status active, startDate zgodny, FBW 3 dni.
  const planRef = db.collection('training_plans').doc(args.uid);
  const planSnap = await planRef.get();
  if (!planSnap.exists) fail(`brak training_plans/${args.uid}`);
  const plan = planSnap.data();
  console.log(`Plan training_plans/${args.uid}:`);
  console.log(`  status=${plan.status ?? 'active (brak pola)'} startDate=${plan.startDate} durationWeeks=${plan.durationWeeks} name=${plan.name ?? '-'} revision=${plan.revision ?? 0}`);
  console.log(`  days: ${describeDays(plan.days)}`);
  const planStatus = plan.status === 'ended' ? 'ended' : 'active';
  if (planStatus !== 'active') fail(`plan ma status ${planStatus}, oczekiwano active`);
  if (plan.startDate !== args.startDate) fail(`plan.startDate=${plan.startDate}, oczekiwano ${args.startDate}`);
  if (!Array.isArray(plan.days) || plan.days.length !== 3) fail(`plan ma ${Array.isArray(plan.days) ? plan.days.length : 'brak'} dni, oczekiwano 3 (FBW)`);
  if (!Number.isFinite(plan.durationWeeks) || plan.durationWeeks < 1) fail(`plan.durationWeeks=${plan.durationWeeks}`);

  // (2) Cykle usera: dokladnie zero aktywnych; docelowy cykl completed pod deterministycznym id.
  const cyclesSnap = await db.collection('plan_cycles').where('userId', '==', args.uid).get();
  const cycles = cyclesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  console.log(`\nCykle (${cycles.length}):`);
  cycles
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
    .forEach((cycle) => console.log(`  ${cycle.id}: ${cycle.status} ${cycle.startDate} -> ${cycle.endDate || 'trwa'} (${cycle.durationWeeks} tyg., ${cycle.stats?.totalWorkouts ?? 0} tr.)`));
  const active = cycles.filter((cycle) => cycle.status === 'active');
  if (active.length > 0) fail(`konto ma juz ${active.length} aktywny(ch) cykl(i): ${active.map((c) => c.id).join(', ')} — nic do naprawy`);

  const target = cycles.find((cycle) => cycle.id === cycleId);
  if (!target) fail(`brak plan_cycles/${cycleId}`);
  if (target.status !== 'completed') fail(`plan_cycles/${cycleId} ma status ${target.status}, oczekiwano completed`);
  if (target.startDate !== args.startDate) fail(`plan_cycles/${cycleId}.startDate=${target.startDate}`);
  if (!(target.endDate < target.startDate)) fail(`plan_cycles/${cycleId}.endDate=${target.endDate} nie jest przed startDate — to nie jest cykl z incydentu`);
  if ((target.stats?.totalWorkouts ?? 0) !== 0) fail(`plan_cycles/${cycleId} ma ${target.stats.totalWorkouts} treningow, oczekiwano 0`);

  // Treningi otagowane tym cyklem: informacyjnie (nie ruszamy historii).
  const taggedSnap = await db.collection('workouts').where('userId', '==', args.uid).where('cycleId', '==', cycleId).get();
  console.log(`\nWorkouts z cycleId=${cycleId}: ${taggedSnap.size} (historia nie jest modyfikowana)`);

  // (3) Diff.
  const patch = {
    status: 'active',
    endDate: '',
    durationWeeks: plan.durationWeeks,
    days: plan.days,
    stats: ZERO_STATS,
  };
  console.log(`\nDiff plan_cycles/${cycleId}:`);
  console.log(`  status:        ${target.status} -> ${patch.status}`);
  console.log(`  endDate:       ${JSON.stringify(target.endDate)} -> ${JSON.stringify(patch.endDate)}`);
  console.log(`  durationWeeks: ${target.durationWeeks} -> ${patch.durationWeeks}`);
  console.log(`  days:          ${describeDays(target.days)}`);
  console.log(`             ->  ${describeDays(patch.days)}`);
  console.log(`  stats:         ${JSON.stringify(target.stats)} -> ${JSON.stringify(patch.stats)}`);

  if (!args.apply) {
    console.log('\nDRY-RUN: nic nie zapisano. Zapis: --apply (po zgodzie usera).');
    return;
  }

  // Zapis w transakcji z precondycja: dokument nadal completed z endDate < startDate
  // (drugie uruchomienie albo naprawa z apki w miedzyczasie = brak zapisu).
  await db.runTransaction(async (transaction) => {
    const ref = db.collection('plan_cycles').doc(cycleId);
    const fresh = await transaction.get(ref);
    if (!fresh.exists) throw new Error(`plan_cycles/${cycleId} zniknal w trakcie`);
    const data = fresh.data();
    if (data.status !== 'completed' || !(data.endDate < data.startDate)) {
      throw new Error(`plan_cycles/${cycleId} zmienil sie w trakcie (status=${data.status}, endDate=${data.endDate}) — brak zapisu`);
    }
    transaction.update(ref, patch);
  });
  console.log(`\nZAPISANO: plan_cycles/${cycleId} jest znow aktywnym cyklem planu ${args.startDate}.`);
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
