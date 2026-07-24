#!/usr/bin/env node

// Z142.3: naprawa produkcyjnych rekordów z absurdalnym durationSec (incydent
// 48:08:47 z 2026-07-24 — trening zapisany 48h po wyjściu z siłowni).
// DRY-RUN jest domyślny i wyłącznie czyta. Zapis TYLKO przez `apply --confirm <uid>`
// po jawnej zgodzie usera (dane usera są święte).
//
// Użycie:
//   node scripts/repair-duration-outliers.mjs dry-run --email <email> [--minutes <min>]
//   node scripts/repair-duration-outliers.mjs apply --email <email> --workout <id> --confirm <uid> [--minutes <min>]
//
// Propozycja czasu: completedSets x 3 min (ta sama heurystyka co fallback
// w src/lib/hybrid-load.ts) albo wartość z --minutes (np. 60, gdy user mówi
// "trening trwał około godziny").

import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'fittracker-workouts';
const OUTLIER_THRESHOLD_SEC = 12 * 60 * 60; // > 12h = na pewno kłamstwo
const FALLBACK_MINUTES_PER_SET = 3;

const usage = () => {
  console.error([
    'Usage:',
    '  node scripts/repair-duration-outliers.mjs dry-run --email <email> [--minutes <min>]',
    '  node scripts/repair-duration-outliers.mjs apply --email <email> --workout <id> --confirm <uid> [--minutes <min>]',
  ].join('\n'));
  process.exit(2);
};

const parseArgs = () => {
  const [mode, ...rest] = process.argv.slice(2);
  const args = { mode };
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]?.replace(/^--/, '');
    const value = rest[index + 1];
    if (!key || !value) usage();
    args[key] = value;
  }
  return args;
};

const initAdmin = () => {
  const credential = applicationDefault();
  const app = getApps()[0] ?? initializeApp({ credential, projectId: PROJECT_ID });
  return {
    auth: getAuth(app),
    getAccessToken: async () => (await credential.getAccessToken()).access_token,
  };
};

const decodeValue = (value) => {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return undefined;
};
const decodeFields = (fields) => Object.fromEntries(
  Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
);

const fmtDuration = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const countCompletedSets = (exercises) => (Array.isArray(exercises) ? exercises : [])
  .reduce((sum, ex) => sum + (Array.isArray(ex?.sets) ? ex.sets : [])
    .filter((set) => set?.completed === true && !set?.isWarmup).length, 0);

const runQuery = async (token, uid) => {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'workouts' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'userId' },
              op: 'EQUAL',
              value: { stringValue: uid },
            },
          },
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`RUN_QUERY_FAILED:${response.status}:${await response.text()}`);
  const rows = await response.json();
  return rows
    .filter((row) => row.document)
    .map((row) => ({
      id: row.document.name.split('/').pop(),
      data: decodeFields(row.document.fields ?? {}),
    }));
};

const findOutliers = (workouts, minutesOverride) => workouts
  .filter(({ data }) => typeof data.durationSec === 'number' && data.durationSec > OUTLIER_THRESHOLD_SEC)
  .map(({ id, data }) => {
    const completedSets = countCompletedSets(data.exercises);
    const proposedSec = minutesOverride
      ? Math.round(minutesOverride * 60)
      : completedSets * FALLBACK_MINUTES_PER_SET * 60;
    return { id, date: data.date, dayName: data.dayName ?? '(brak)', currentSec: data.durationSec, completedSets, proposedSec };
  })
  .sort((a, b) => String(a.date).localeCompare(String(b.date)));

const main = async () => {
  const args = parseArgs();
  if (!['dry-run', 'apply'].includes(args.mode) || !args.email) usage();
  const minutesOverride = args.minutes ? Number(args.minutes) : null;
  if (args.minutes && (!Number.isFinite(minutesOverride) || minutesOverride <= 0)) usage();

  const { auth, getAccessToken } = initAdmin();
  const user = await auth.getUserByEmail(args.email);
  const token = await getAccessToken();
  const workouts = await runQuery(token, user.uid);
  const outliers = findOutliers(workouts, minutesOverride);

  console.log(`Konto: ${args.email} (uid ${user.uid}) — treningów: ${workouts.length}`);
  if (outliers.length === 0) {
    console.log(`Brak rekordów z durationSec > ${fmtDuration(OUTLIER_THRESHOLD_SEC)}. Nic do naprawy.`);
    return;
  }

  console.log(`\nRekordy z czasem > 12h (${outliers.length}):`);
  outliers.forEach((o) => {
    console.log([
      `  id=${o.id}`,
      `data=${o.date}`,
      `dzień=${o.dayName}`,
      `obecnie=${fmtDuration(o.currentSec)}`,
      `serie robocze=${o.completedSets}`,
      `propozycja=${fmtDuration(o.proposedSec)} (${minutesOverride ? `--minutes ${minutesOverride}` : `${o.completedSets} serii x ${FALLBACK_MINUTES_PER_SET} min`})`,
    ].join('  '));
  });

  if (args.mode === 'dry-run') {
    console.log('\nDRY-RUN: nic nie zapisano. Zapis: apply --workout <id> --confirm <uid>.');
    return;
  }

  // apply: pojedynczy, jawnie wskazany rekord + confirm uid (podwójna zgoda).
  if (!args.workout || args.confirm !== user.uid) {
    console.error('apply wymaga --workout <id> oraz --confirm <uid> równego uid konta.');
    process.exit(2);
  }
  const target = outliers.find((o) => o.id === args.workout);
  if (!target) {
    console.error(`Rekord ${args.workout} nie jest outlierem tego konta — nic nie zapisano.`);
    process.exit(2);
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/workouts/${target.id}?updateMask.fieldPaths=durationSec`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { durationSec: { integerValue: String(target.proposedSec) } } }),
    },
  );
  if (!response.ok) throw new Error(`PATCH_FAILED:${response.status}:${await response.text()}`);
  console.log(`\nZAPISANO: ${target.id} durationSec ${target.currentSec} -> ${target.proposedSec}.`);
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
