#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  buildHealthMigrationManifest,
  parseHealthDryRunArgs,
  validateHealthMigrationManifest,
} from './health-migration-dry-run-helpers.mjs';

const PROJECT_ID = 'fittracker-workouts';
const READ_COLLECTIONS = [
  'users',
  'measurements',
  'workouts',
  'strava_activities',
  'manual_activities',
];

const usage = () => [
  'Usage:',
  '  node scripts/health-migration-dry-run.mjs [--output <manifest.json>]',
  '',
  'Read-only: this command has no apply/write mode and never changes Firebase data.',
].join('\n');

const initReadOnlyAdmin = () => {
  const require = createRequire(path.resolve('functions/package.json'));
  const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = getApps()[0] ?? initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
  return getFirestore(app);
};

const marker = (data, field) => (
  Object.prototype.hasOwnProperty.call(data, field) && data[field] != null
    ? true
    : undefined
);

const minimalDocument = (snapshot) => {
  const data = snapshot.data();
  const collection = snapshot.ref.parent.id;
  const base = { collection, path: snapshot.ref.path, data: {} };

  if (collection === 'users') {
    return {
      ...base,
      data: {
        estimatedMaxHR: marker(data, 'estimatedMaxHR'),
        maxHRManualOverride: marker(data, 'maxHRManualOverride'),
      },
    };
  }
  if (collection === 'measurements') {
    return {
      ...base,
      data: { photoPath: typeof data.photoPath === 'string' && data.photoPath ? 'present' : undefined },
    };
  }
  if (collection === 'workouts') {
    return {
      ...base,
      data: {
        exercises: (Array.isArray(data.exercises) ? data.exercises : []).map((exercise) => ({
          rpe: marker(exercise ?? {}, 'rpe'),
          pain: marker(exercise ?? {}, 'pain'),
          quality: marker(exercise ?? {}, 'quality'),
        })),
      },
    };
  }
  return {
    ...base,
    data: {
      averageHeartrate: marker(data, 'averageHeartrate'),
      maxHeartrate: marker(data, 'maxHeartrate'),
      calories: marker(data, 'calories'),
      perceivedIntensity: marker(data, 'perceivedIntensity'),
    },
  };
};

const collectionProjection = (db, collectionName) => {
  const collection = db.collection(collectionName);
  if (collectionName === 'users') {
    return collection.select('consents', 'estimatedMaxHR', 'maxHRManualOverride');
  }
  if (collectionName === 'measurements') return collection.select('userId', 'photoPath');
  if (collectionName === 'workouts') return collection.select('userId', 'exercises');
  return collection.select(
    'userId',
    'averageHeartrate',
    'maxHeartrate',
    'calories',
    'perceivedIntensity',
  );
};

/** Odczyt ogranicza projekcje do pól koniecznych do klasyfikacji i natychmiast usuwa wartości health. */
export const readHealthInventory = async (db) => {
  const snapshots = await Promise.all(
    READ_COLLECTIONS.map((collectionName) => collectionProjection(db, collectionName).get()),
  );
  const byUid = new Map();
  const ensure = (uid) => {
    const existing = byUid.get(uid);
    if (existing) return existing;
    const subject = { uid, consent: null, documents: [] };
    byUid.set(uid, subject);
    return subject;
  };

  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      const collectionName = document.ref.parent.id;
      const data = document.data();
      const uid = collectionName === 'users' ? document.id : data.userId;
      if (typeof uid !== 'string' || uid.length === 0) continue;
      const subject = ensure(uid);
      if (collectionName === 'users') {
        subject.consent = data.consents ?? null;
      }
      subject.documents.push(minimalDocument(document));
    }
  }
  return [...byUid.values()];
};

const defaultOutputPath = () => path.resolve(
  'private-audits',
  `health-migration-dry-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
);

export const runDryRun = async ({ output = null } = {}) => {
  const subjects = await readHealthInventory(initReadOnlyAdmin());
  const manifest = buildHealthMigrationManifest({
    projectId: PROJECT_ID,
    generatedAt: new Date().toISOString(),
    subjects,
  });
  const validation = validateHealthMigrationManifest(manifest);
  if (!validation.ok) throw new Error(`INVALID_GENERATED_MANIFEST:${validation.reason}`);

  const outputPath = path.resolve(output ?? defaultOutputPath());
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return {
    outputPath,
    manifestSha256: manifest.manifestSha256,
    checkpoint: manifest.checkpoint,
    totals: manifest.totals,
    blockers: manifest.blockers,
    mutationCount: manifest.mutationCount,
  };
};

const main = async () => {
  const args = parseHealthDryRunArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  console.log(JSON.stringify(await runDryRun(args), null, 2));
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    console.error(usage());
    process.exitCode = 1;
  });
}
