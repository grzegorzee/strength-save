import { createHash } from 'node:crypto';

const CURRENT_HEALTH_VERSION = '1.1';
const PSEUDONYM_DOMAIN = 'strength-save-health-migration-v1';
const HEALTH_EXERCISE_FIELDS = ['rpe', 'pain', 'quality'];
const HEALTH_ACTIVITY_FIELDS = [
  'averageHeartrate',
  'maxHeartrate',
  'calories',
  'perceivedIntensity',
];
const HEALTH_PROFILE_FIELDS = ['estimatedMaxHR', 'maxHRManualOverride'];
const SENSITIVE_MANIFEST_KEYS = new Set([
  'uid',
  'userId',
  'email',
  'path',
  'photoPath',
  'photoUrl',
  'healthGrantId',
  'name',
  'exerciseId',
]);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
};

export const stableJson = (value) => JSON.stringify(canonicalize(value));
export const sha256 = (value) => createHash('sha256').update(stableJson(value)).digest('hex');

const opaqueRef = (value) => `record-${createHash('sha256')
  .update(`${PSEUDONYM_DOMAIN}\0${value}`)
  .digest('hex')
  .slice(0, 20)}`;

export const pseudonymizeUid = (uid) => {
  if (typeof uid !== 'string' || uid.length === 0) throw new Error('INVALID_UID');
  return `subject-${createHash('sha256')
    .update(`${PSEUDONYM_DOMAIN}\0subject\0${uid}`)
    .digest('hex')
    .slice(0, 16)}`;
};

export const parseHealthDryRunArgs = (argv) => {
  const args = { output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') return { help: true, output: null };
    if (token !== '--output' || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      throw new Error(`INVALID_ARGUMENT:${token ?? ''}`);
    }
    if (args.output !== null) throw new Error('DUPLICATE_OUTPUT');
    args.output = argv[index + 1];
    index += 1;
  }
  return args;
};

export const hasExplicitActiveHealthConsent = (consent) => (
  consent?.healthGranted === true
  && consent?.healthVersion === CURRENT_HEALTH_VERSION
  && Number.isSafeInteger(consent?.healthEpoch)
  && consent.healthEpoch > 0
  && typeof consent?.healthGrantId === 'string'
  && consent.healthGrantId.length > 0
);

const consentState = (consent) => {
  if (hasExplicitActiveHealthConsent(consent)) return 'active-current';
  if (consent?.healthVersion && consent.healthVersion !== CURRENT_HEALTH_VERSION) {
    return 'legacy-version';
  }
  if (consent?.healthGranted === true) return 'incomplete-current-grant';
  return 'inactive';
};

const hasDefinedField = (data, fields) => fields.some((field) => (
  Object.prototype.hasOwnProperty.call(data ?? {}, field)
  && data[field] !== null
  && data[field] !== undefined
));

const classifyDocuments = (documents) => {
  const records = [];
  let bodyPhotoReferences = 0;

  for (const document of [...documents].sort((left, right) => (
    String(left.path).localeCompare(String(right.path))
  ))) {
    const data = document.data ?? {};
    if (document.collection === 'measurements') {
      records.push({ kind: 'measurement', source: String(document.path) });
      if (typeof data.photoPath === 'string' && data.photoPath.length > 0) {
        bodyPhotoReferences += 1;
      }
      continue;
    }

    if (document.collection === 'workouts') {
      const exercises = Array.isArray(data.exercises) ? data.exercises : [];
      exercises.forEach((exercise, index) => {
        if (hasDefinedField(exercise, HEALTH_EXERCISE_FIELDS)) {
          records.push({
            kind: 'workout-health-metric',
            source: `${document.path}#exercise:${index}`,
          });
        }
      });
      continue;
    }

    if (
      (document.collection === 'strava_activities' || document.collection === 'manual_activities')
      && hasDefinedField(data, HEALTH_ACTIVITY_FIELDS)
    ) {
      records.push({ kind: 'activity-health', source: String(document.path) });
      continue;
    }

    if (document.collection === 'users' && hasDefinedField(data, HEALTH_PROFILE_FIELDS)) {
      records.push({ kind: 'user-health-profile', source: String(document.path) });
    }
  }

  return { records, bodyPhotoReferences };
};

const emptyCounts = () => ({
  measurements: 0,
  workoutMetricItems: 0,
  activityHealthDocuments: 0,
  userHealthProfiles: 0,
  bodyPhotoReferences: 0,
});

const countsFor = (records, bodyPhotoReferences) => {
  const counts = emptyCounts();
  counts.bodyPhotoReferences = bodyPhotoReferences;
  for (const record of records) {
    if (record.kind === 'measurement') counts.measurements += 1;
    if (record.kind === 'workout-health-metric') counts.workoutMetricItems += 1;
    if (record.kind === 'activity-health') counts.activityHealthDocuments += 1;
    if (record.kind === 'user-health-profile') counts.userHealthProfiles += 1;
  }
  return counts;
};

const sumCounts = (subjects) => subjects.reduce((total, subject) => {
  for (const key of Object.keys(emptyCounts())) total[key] += subject.counts[key];
  return total;
}, emptyCounts());

const checkpointFrom = (transformations) => ({
  algorithm: 'sha256',
  itemCount: transformations.length,
  sha256: sha256(transformations),
});

const manifestHashInput = (manifest) => {
  const { generatedAt: _generatedAt, manifestSha256: _manifestSha256, ...stable } = manifest;
  return stable;
};

/**
 * Tworzy wyłącznie manifest audytowy. Nie planuje patchy ani docelowych wartości:
 * schemat workout health nie jest jeszcze zatwierdzony, a zgody historycznej nie
 * wolno retroaktywnie przypisywać do bieżącej epoki.
 */
export const buildHealthMigrationManifest = ({ projectId, generatedAt, subjects }) => {
  if (typeof projectId !== 'string' || !projectId) throw new Error('INVALID_PROJECT_ID');
  if (!Array.isArray(subjects)) throw new Error('INVALID_SUBJECTS');

  const manifestSubjects = subjects.map((subject) => {
    const state = consentState(subject.consent);
    const eligibleForFutureMigration = state === 'active-current';
    const { records, bodyPhotoReferences } = classifyDocuments(subject.documents ?? []);
    const transformations = records
      .map((record) => ({
        sourceRef: opaqueRef(record.source),
        kind: record.kind,
        status: 'blocked',
        blocker: eligibleForFutureMigration
          ? 'TARGET_SCHEMA_NOT_APPROVED'
          : 'EXPLICIT_CURRENT_CONSENT_REQUIRED',
      }))
      .sort((left, right) => (
        left.sourceRef.localeCompare(right.sourceRef) || left.kind.localeCompare(right.kind)
      ));

    return {
      subjectRef: pseudonymizeUid(subject.uid),
      consentState: state,
      eligibleForFutureMigration,
      counts: countsFor(records, bodyPhotoReferences),
      transformations,
    };
  }).sort((left, right) => left.subjectRef.localeCompare(right.subjectRef));

  const transformations = manifestSubjects.flatMap((subject) => subject.transformations)
    .sort((left, right) => (
      left.sourceRef.localeCompare(right.sourceRef) || left.kind.localeCompare(right.kind)
    ));
  const recordTotals = sumCounts(manifestSubjects);
  const manifest = {
    schemaVersion: 1,
    mode: 'read-only',
    projectId,
    generatedAt,
    policy: {
      currentHealthVersion: CURRENT_HEALTH_VERSION,
      legacyConsentAutoUpgrade: false,
      targetSchemaApproved: false,
      rawHealthValuesIncluded: false,
      mutationCapability: false,
    },
    blockers: [
      ...(transformations.some((item) => item.blocker === 'EXPLICIT_CURRENT_CONSENT_REQUIRED')
        ? ['EXPLICIT_CURRENT_CONSENT_REQUIRED']
        : []),
      'TARGET_SCHEMA_NOT_APPROVED',
    ],
    totals: {
      subjects: manifestSubjects.length,
      eligibleSubjects: manifestSubjects.filter((subject) => subject.eligibleForFutureMigration).length,
      ...recordTotals,
      plannedTransformations: transformations.length,
      blockedTransformations: transformations.length,
    },
    subjects: manifestSubjects,
    checkpoint: checkpointFrom(transformations),
    mutationCount: 0,
    mutationPlan: [],
  };
  return {
    ...manifest,
    manifestSha256: sha256(manifestHashInput(manifest)),
  };
};

const firstSensitiveKey = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstSensitiveKey(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_MANIFEST_KEYS.has(key)) return key;
    const found = firstSensitiveKey(nested);
    if (found) return found;
  }
  return null;
};

export const validateHealthMigrationManifest = (manifest) => {
  const sensitiveKey = firstSensitiveKey(manifest);
  if (sensitiveKey) return { ok: false, reason: `SENSITIVE_FIELD_IN_MANIFEST:${sensitiveKey}` };
  if (manifest?.mode !== 'read-only' || manifest?.mutationCount !== 0) {
    return { ok: false, reason: 'MUTATION_CAPABILITY_PRESENT' };
  }
  if (!Array.isArray(manifest?.mutationPlan) || manifest.mutationPlan.length !== 0) {
    return { ok: false, reason: 'MUTATION_CAPABILITY_PRESENT' };
  }
  const transformations = (manifest.subjects ?? []).flatMap((subject) => subject.transformations ?? [])
    .sort((left, right) => (
      left.sourceRef.localeCompare(right.sourceRef) || left.kind.localeCompare(right.kind)
    ));
  if (stableJson(manifest.checkpoint) !== stableJson(checkpointFrom(transformations))) {
    return { ok: false, reason: 'CHECKPOINT_MISMATCH' };
  }
  if (manifest.manifestSha256 !== sha256(manifestHashInput(manifest))) {
    return { ok: false, reason: 'MANIFEST_HASH_MISMATCH' };
  }
  return { ok: true };
};
