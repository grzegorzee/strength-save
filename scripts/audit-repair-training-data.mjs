#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'fittracker-workouts';
const COLLECTIONS = ['training_plans', 'plan_cycles', 'workouts', 'app_telemetry_daily'];
const TARGET_DATES_WITHOUT_CYCLE = new Set([
  '2026-06-16',
  '2026-06-18',
  '2026-06-22',
  '2026-06-23',
  '2026-06-25',
  '2026-06-26',
]);
const MIXED_EXERCISE_DATES = new Set([
  '2026-06-16',
  '2026-06-18',
  '2026-06-22',
  '2026-06-23',
  '2026-06-25',
]);
const TARGET_INCOMPLETE_DATE = '2026-06-19';
const TARGET_TECHNICAL_CYCLE_ID = 'lkjSbPbc3suvlhEBtFYK';

const usage = () => {
  console.error([
    'Usage:',
    '  node scripts/audit-repair-training-data.mjs backup --email <email>',
    '  node scripts/audit-repair-training-data.mjs preview --backup <snapshot.json>',
    '  node scripts/audit-repair-training-data.mjs apply --plan <repair-plan.json> --confirm <uid>',
    '  node scripts/audit-repair-training-data.mjs verify --email <email>',
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

const normalize = (value) => {
  if (value instanceof Date) return { __type: 'date', iso: value.toISOString() };
  if (Buffer.isBuffer(value)) return { __type: 'bytes', base64: value.toString('base64') };
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
      return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
    }
    if (typeof value.path === 'string' && value.firestore) {
      return { __type: 'reference', path: value.path };
    }
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)]),
    );
  }
  return value;
};

const stableJson = (value) => JSON.stringify(normalize(value));
const hash = (value) => createHash('sha256').update(stableJson(value)).digest('hex');
const prettyJson = (value) => `${JSON.stringify(normalize(value), null, 2)}\n`;
const timestampSlug = () => new Date().toISOString().replace(/[:.]/g, '-');
const documentName = (documentPath) => (
  `projects/${PROJECT_ID}/databases/(default)/documents/${documentPath}`
);

const initAdmin = () => {
  const credential = applicationDefault();
  const app = getApps()[0] ?? initializeApp({
    credential,
    projectId: PROJECT_ID,
  });
  return {
    auth: getAuth(app),
    getAccessToken: async () => (await credential.getAccessToken()).access_token,
  };
};

const decodeFirestoreValue = (value) => {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('bytesValue' in value) return { __type: 'bytes', base64: value.bytesValue };
  if ('referenceValue' in value) return { __type: 'reference', path: value.referenceValue };
  if ('geoPointValue' in value) return { __type: 'geopoint', ...value.geoPointValue };
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  if ('mapValue' in value) return decodeFirestoreFields(value.mapValue.fields ?? {});
  throw new Error(`UNSUPPORTED_FIRESTORE_VALUE:${Object.keys(value).join(',')}`);
};

const decodeFirestoreFields = (fields) => Object.fromEntries(
  Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
);

const encodeFirestoreValue = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('NON_FINITE_NUMBER');
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  }
  if (value && typeof value === 'object') {
    if (value.__type === 'timestamp') {
      return { timestampValue: new Date(value.iso ?? value.value).toISOString() };
    }
    if (value.__type === 'bytes') return { bytesValue: value.base64 };
    if (value.__type === 'reference') return { referenceValue: value.path };
    if (value.__type === 'geopoint') {
      return { geoPointValue: { latitude: value.latitude, longitude: value.longitude } };
    }
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value)
            .filter(([, nested]) => nested !== undefined)
            .map(([key, nested]) => [key, encodeFirestoreValue(nested)]),
        ),
      },
    };
  }
  throw new Error(`UNSUPPORTED_VALUE:${typeof value}`);
};

const encodeFirestoreFields = (data) => Object.fromEntries(
  Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, encodeFirestoreValue(value)]),
);

const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const firestoreRequest = async (getAccessToken, endpoint, options = {}) => {
  const response = await fetch(`${firestoreBaseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`FIRESTORE_REST_${response.status}:${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
};

const serializeDocument = (wireDocument) => {
  const segments = wireDocument.name.split('/');
  const id = segments.at(-1);
  const collection = segments.at(-2);
  const data = decodeFirestoreFields(wireDocument.fields ?? {});
  return {
    collection,
    id,
    path: `${collection}/${id}`,
    createTime: wireDocument.createTime ?? null,
    updateTime: wireDocument.updateTime ?? null,
    data,
    dataSha256: hash(data),
    wireDocument,
  };
};

const readUserDocuments = async (getAccessToken, uid) => {
  const byPath = new Map();
  for (const collectionName of COLLECTIONS) {
    const wireDocuments = [];

    if (collectionName === 'training_plans') {
      const response = await fetch(`${firestoreBaseUrl}/${collectionName}/${uid}`, {
        headers: { Authorization: `Bearer ${await getAccessToken()}` },
      });
      if (response.ok) wireDocuments.push(await response.json());
      else if (response.status !== 404) {
        throw new Error(`FIRESTORE_REST_${response.status}:${await response.text()}`);
      }
    }

    const queryResponse = await firestoreRequest(getAccessToken, ':runQuery', {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'userId' },
              op: 'EQUAL',
              value: { stringValue: uid },
            },
          },
        },
      }),
    });
    wireDocuments.push(...queryResponse.flatMap((entry) => entry.document ? [entry.document] : []));

    for (const wireDocument of wireDocuments) {
      const document = serializeDocument(wireDocument);
      byPath.set(document.path, document);
    }
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
};

const summarizeExercise = (exercise) => ({
  exerciseId: exercise?.exerciseId ?? null,
  name: exercise?.name ?? null,
  sets: Array.isArray(exercise?.sets) ? exercise.sets.length : 0,
  completedSets: Array.isArray(exercise?.sets)
    ? exercise.sets.filter((set) => set?.completed === true).length
    : 0,
  notes: exercise?.notes ?? null,
});

const auditSnapshot = (snapshot) => {
  const documents = snapshot.documents ?? [];
  const workouts = documents
    .filter((document) => document.collection === 'workouts')
    .map((document) => ({ id: document.id, ...document.data }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const cycles = documents
    .filter((document) => document.collection === 'plan_cycles')
    .map((document) => ({ id: document.id, ...document.data }));
  const activeCycles = cycles.filter((cycle) => cycle.status === 'active');

  return {
    uid: snapshot.uid,
    counts: Object.fromEntries(COLLECTIONS.map((collectionName) => [
      collectionName,
      documents.filter((document) => document.collection === collectionName).length,
    ])),
    activeCycles: activeCycles.map((cycle) => ({
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
    })),
    targetWorkouts: workouts
      .filter((workout) => (
        TARGET_DATES_WITHOUT_CYCLE.has(workout.date)
        || MIXED_EXERCISE_DATES.has(workout.date)
        || workout.date === TARGET_INCOMPLETE_DATE
      ))
      .map((workout) => ({
        id: workout.id,
        date: workout.date,
        dayId: workout.dayId,
        cycleId: workout.cycleId ?? null,
        completed: workout.completed === true,
        startedAt: workout.startedAt ?? null,
        completedAt: workout.completedAt ?? null,
        updatedAt: workout.updatedAt ?? null,
        durationSec: workout.durationSec ?? null,
        revision: workout.revision ?? null,
        exercises: Array.isArray(workout.exercises)
          ? workout.exercises.map(summarizeExercise)
          : [],
      })),
    technicalCycle: cycles.find((cycle) => cycle.id === TARGET_TECHNICAL_CYCLE_ID) ?? null,
  };
};

const runBackup = async (email) => {
  if (!email) usage();
  const { auth, getAccessToken } = initAdmin();
  const user = await auth.getUserByEmail(email);
  const documents = await readUserDocuments(getAccessToken, user.uid);
  const snapshot = {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    email,
    uid: user.uid,
    exportedAt: new Date().toISOString(),
    collections: COLLECTIONS,
    documents,
  };
  const directory = path.resolve('private-backups', `${timestampSlug()}-${user.uid}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const snapshotPath = path.join(directory, 'snapshot.json');
  const auditPath = path.join(directory, 'audit.json');
  const snapshotText = prettyJson(snapshot);
  await writeFile(snapshotPath, snapshotText, { mode: 0o600 });
  await writeFile(auditPath, prettyJson(auditSnapshot(snapshot)), { mode: 0o600 });
  const digest = createHash('sha256').update(snapshotText).digest('hex');
  await writeFile(path.join(directory, 'SHA256SUMS'), `${digest}  snapshot.json\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    snapshotPath,
    auditPath,
    sha256: digest,
    documentCount: documents.length,
    counts: auditSnapshot(snapshot).counts,
  }, null, 2));
};

const loadJson = async (filePath) => JSON.parse(await readFile(path.resolve(filePath), 'utf8'));

const completedSets = (workout) => (
  (workout.exercises ?? []).reduce(
    (total, exercise) => total + (exercise.sets ?? []).filter((set) => set.completed === true).length,
    0,
  )
);

const isForeignEmptyExercise = (exercise, validExerciseIds) => (
  typeof exercise?.exerciseId === 'string'
  && exercise.exerciseId.startsWith('ex-')
  && !validExerciseIds.has(exercise.exerciseId)
  && !exercise.name
  && !exercise.notes
  && exercise.rpe == null
  && exercise.pain == null
  && exercise.quality == null
  && Array.isArray(exercise.sets)
  && exercise.sets.every((set) => set?.completed !== true)
);

const parseSetCount = (sets) => {
  const match = String(sets ?? '').match(/^(\d+)/);
  return match ? Number(match[1]) : 3;
};

const emptyExerciseFromPlan = (exercise) => ({
  exerciseId: exercise.id,
  name: exercise.name,
  sets: [
    { reps: 0, weight: 0, completed: false, isWarmup: true },
    ...Array.from({ length: parseSetCount(exercise.sets) }, () => ({
      reps: 0,
      weight: 0,
      completed: false,
    })),
  ],
});

const buildRepairPlan = (snapshot, backupPath) => {
  const findDocuments = (collection) => (
    snapshot.documents.filter((document) => document.collection === collection)
  );
  const workoutDocuments = findDocuments('workouts');
  const cycleDocuments = findDocuments('plan_cycles');
  const planDocuments = findDocuments('training_plans');
  if (planDocuments.length !== 1) throw new Error(`EXPECTED_ONE_TRAINING_PLAN:${planDocuments.length}`);

  const activeCycles = cycleDocuments.filter((document) => document.data.status === 'active');
  if (activeCycles.length !== 1) throw new Error(`EXPECTED_ONE_ACTIVE_CYCLE:${activeCycles.length}`);
  const activeCycle = activeCycles[0];
  if (activeCycle.id !== 'otL65epGl1lQ9eyKIZrO') {
    throw new Error(`UNEXPECTED_ACTIVE_CYCLE:${activeCycle.id}`);
  }

  const planDays = new Map((planDocuments[0].data.days ?? []).map((day) => [day.id, day]));
  const patches = new Map();
  const reasons = new Map();
  const deletedFields = new Map();
  const addPatch = (document, patch, reason, deleteFields = []) => {
    patches.set(document.path, { ...(patches.get(document.path) ?? {}), ...patch });
    reasons.set(document.path, [...(reasons.get(document.path) ?? []), reason]);
    deletedFields.set(document.path, [
      ...(deletedFields.get(document.path) ?? []),
      ...deleteFields,
    ]);
  };

  for (const date of TARGET_DATES_WITHOUT_CYCLE) {
    const matching = workoutDocuments.filter((document) => document.data.date === date);
    if (matching.length !== 1) throw new Error(`EXPECTED_ONE_WORKOUT:${date}:${matching.length}`);
    const document = matching[0];
    if (document.data.completed !== true) throw new Error(`EXPECTED_COMPLETED_WORKOUT:${date}`);
    if (document.data.cycleId && document.data.cycleId !== activeCycle.id) {
      throw new Error(`UNEXPECTED_CYCLE_ID:${date}:${document.data.cycleId}`);
    }
    if (!document.data.cycleId) {
      addPatch(document, { cycleId: activeCycle.id }, 'attach-active-cycle');
    }
  }

  for (const date of MIXED_EXERCISE_DATES) {
    const document = workoutDocuments.find((candidate) => candidate.data.date === date);
    const day = planDays.get(document?.data.dayId);
    if (!document || !day) throw new Error(`MISSING_WORKOUT_OR_PLAN_DAY:${date}`);

    const validIds = new Set(day.exercises.map((exercise) => exercise.id));
    const foreign = document.data.exercises.filter((exercise) => isForeignEmptyExercise(exercise, validIds));
    const alreadyRepaired = foreign.length === 0
      && document.data.exercises.length === day.exercises.length
      && document.data.exercises.every((exercise) => validIds.has(exercise.exerciseId));
    if (alreadyRepaired) continue;
    if (foreign.length !== 7) {
      throw new Error(`EXPECTED_SEVEN_FOREIGN_EXERCISES:${date}:${foreign.length}`);
    }
    const retainedById = new Map(
      document.data.exercises
        .filter((exercise) => !foreign.includes(exercise))
        .map((exercise) => [exercise.exerciseId, exercise]),
    );
    const unknownIds = [...retainedById.keys()].filter((exerciseId) => !validIds.has(exerciseId));
    if (unknownIds.length > 0) {
      throw new Error(`UNKNOWN_EXERCISES:${date}:${unknownIds.join(',')}`);
    }

    const repairedExercises = day.exercises.map(
      (exercise) => retainedById.get(exercise.id) ?? emptyExerciseFromPlan(exercise),
    );
    addPatch(document, { exercises: repairedExercises }, `remove-mixed-plan-exercises:${foreign.map((exercise) => exercise.exerciseId).join(',')}`);
    const addedIds = repairedExercises
      .filter((exercise) => !retainedById.has(exercise.exerciseId))
      .map((exercise) => exercise.exerciseId);
    if (addedIds.length > 0) {
      addPatch(document, {}, `restore-missing-plan-exercises:${addedIds.join(',')}`);
    }
  }

  const incompleteMatches = workoutDocuments.filter(
    (document) => document.data.date === TARGET_INCOMPLETE_DATE,
  );
  if (incompleteMatches.length !== 1) {
    throw new Error(`EXPECTED_ONE_INCOMPLETE_WORKOUT:${incompleteMatches.length}`);
  }
  const incomplete = incompleteMatches[0];
  if (completedSets(incomplete.data) !== 13) {
    throw new Error(`EXPECTED_THIRTEEN_COMPLETED_SETS:${completedSets(incomplete.data)}`);
  }
  if (incomplete.data.completed !== true) {
    const startedAt = Date.parse(incomplete.createTime);
    const completedAt = Number(incomplete.data.updatedAt);
    if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt <= startedAt) {
      throw new Error('INVALID_INCOMPLETE_WORKOUT_TIMESTAMPS');
    }
    addPatch(incomplete, {
      completed: true,
      startedAt,
      completedAt,
      durationSec: Math.floor((completedAt - startedAt) / 1000),
    }, 'finalize-cloud-workout-from-create-and-last-update-times');
  }

  const technicalCycle = cycleDocuments.find(
    (document) => document.id === TARGET_TECHNICAL_CYCLE_ID,
  );
  if (!technicalCycle) throw new Error('MISSING_TECHNICAL_CYCLE');
  if (Number(technicalCycle.data.stats?.totalWorkouts ?? 0) !== 0) {
    throw new Error('TECHNICAL_CYCLE_IS_NOT_EMPTY');
  }
  if (technicalCycle.data.technical !== true || technicalCycle.data.hiddenFromInsights !== true) {
    addPatch(technicalCycle, {
      technical: true,
      hiddenFromInsights: true,
    }, 'hide-empty-technical-cycle');
  }

  for (const telemetry of findDocuments('app_telemetry_daily')) {
    const legacyCounters = Object.entries(telemetry.data)
      .filter(([field, value]) => field.startsWith('counters.') && typeof value === 'number');
    if (legacyCounters.length === 0) continue;
    const counters = {
      ...(telemetry.data.counters ?? {}),
      ...Object.fromEntries(
        legacyCounters.map(([field, value]) => [field.slice('counters.'.length), value]),
      ),
    };
    addPatch(
      telemetry,
      { counters },
      `migrate-literal-telemetry-counters:${legacyCounters.map(([field]) => field).join(',')}`,
      legacyCounters.map(([field]) => field),
    );
  }

  const generatedAt = new Date().toISOString();
  const changes = [...patches.entries()].map(([documentPath, patch]) => {
    const document = snapshot.documents.find((candidate) => candidate.path === documentPath);
    if (document.collection === 'workouts') {
      patch.revision = Math.max(0, Math.floor(document.data.revision ?? 0)) + 1;
    }
    return {
      path: documentPath,
      updateTime: document.updateTime,
      beforeDataSha256: document.dataSha256,
      reasons: reasons.get(documentPath),
      patch,
      deleteFields: deletedFields.get(documentPath) ?? [],
      after: {
        ...(document.collection === 'workouts' && {
          date: document.data.date,
          cycleId: patch.cycleId ?? document.data.cycleId ?? null,
          completed: patch.completed ?? document.data.completed === true,
          exerciseCount: (patch.exercises ?? document.data.exercises ?? []).length,
          completedSets: completedSets({
            exercises: patch.exercises ?? document.data.exercises ?? [],
          }),
          revision: patch.revision,
        }),
        ...(document.collection === 'plan_cycles' && {
          technical: patch.technical,
          hiddenFromInsights: patch.hiddenFromInsights,
        }),
        ...(document.collection === 'app_telemetry_daily' && {
          counters: Object.keys(patch.counters ?? {}).sort(),
          removedLiteralFields: deletedFields.get(documentPath) ?? [],
        }),
      },
    };
  }).sort((left, right) => left.path.localeCompare(right.path));

  const projectedWorkouts = workoutDocuments.map((document) => {
    const change = changes.find((candidate) => candidate.path === document.path);
    return { ...document.data, ...(change?.patch ?? {}) };
  });
  const completedInActiveCycle = projectedWorkouts.filter(
    (workout) => workout.cycleId === activeCycle.id && workout.completed === true,
  ).length;
  if (completedInActiveCycle !== 16) {
    throw new Error(`EXPECTED_SIXTEEN_COMPLETED_WORKOUTS:${completedInActiveCycle}`);
  }

  return {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    email: snapshot.email,
    uid: snapshot.uid,
    generatedAt,
    sourceBackup: path.resolve(backupPath),
    sourceSnapshotSha256: createHash('sha256')
      .update(JSON.stringify(snapshot, null, 2) + '\n')
      .digest('hex'),
    invariants: {
      activeCycleId: activeCycle.id,
      completedWorkoutsInActiveCycle: completedInActiveCycle,
      expectedCompletionRate: 100,
      expectedMissedWorkouts: 0,
    },
    changes,
  };
};

const runPreview = async (backupPath) => {
  if (!backupPath) usage();
  const snapshot = await loadJson(backupPath);
  if (snapshot.projectId !== PROJECT_ID || !snapshot.uid || !Array.isArray(snapshot.documents)) {
    throw new Error('INVALID_BACKUP');
  }
  const repairPlan = buildRepairPlan(snapshot, backupPath);
  const repairPlanPath = path.join(path.dirname(path.resolve(backupPath)), 'repair-plan.json');
  await writeFile(repairPlanPath, prettyJson(repairPlan), { mode: 0o600 });
  console.log(JSON.stringify({
    repairPlanPath,
    changes: repairPlan.changes.map((change) => ({
      path: change.path,
      reasons: change.reasons,
      after: change.after,
    })),
    invariants: repairPlan.invariants,
  }, null, 2));
};

const runApply = async (planPath, confirmation) => {
  if (!planPath || !confirmation) usage();
  const repairPlan = await loadJson(planPath);
  if (
    repairPlan.projectId !== PROJECT_ID
    || repairPlan.uid !== confirmation
    || !Array.isArray(repairPlan.changes)
    || repairPlan.changes.length === 0
  ) {
    throw new Error('INVALID_REPAIR_PLAN_OR_CONFIRMATION');
  }

  const { getAccessToken } = initAdmin();
  const writes = repairPlan.changes.map((change) => ({
    update: {
      name: documentName(change.path),
      fields: encodeFirestoreFields(change.patch),
    },
    updateMask: {
      fieldPaths: [
        ...Object.keys(change.patch),
        ...(change.deleteFields ?? []).map(
          (field) => `\`${String(field).replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\``,
        ),
      ],
    },
    currentDocument: { updateTime: change.updateTime },
  }));
  const result = await firestoreRequest(getAccessToken, ':commit', {
    method: 'POST',
    body: JSON.stringify({ writes }),
  });
  console.log(JSON.stringify({
    committed: result.writeResults?.length ?? 0,
    commitTime: result.commitTime,
    paths: repairPlan.changes.map((change) => change.path),
  }, null, 2));
};

const runVerify = async (email) => {
  if (!email) usage();
  const { auth, getAccessToken } = initAdmin();
  const user = await auth.getUserByEmail(email);
  const snapshot = {
    uid: user.uid,
    documents: await readUserDocuments(getAccessToken, user.uid),
  };
  console.log(prettyJson(auditSnapshot(snapshot)));
};

const main = async () => {
  const args = parseArgs();
  if (args.mode === 'backup') return runBackup(args.email);
  if (args.mode === 'preview') return runPreview(args.backup);
  if (args.mode === 'apply') return runApply(args.plan, args.confirm);
  if (args.mode === 'verify') return runVerify(args.email);
  usage();
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
