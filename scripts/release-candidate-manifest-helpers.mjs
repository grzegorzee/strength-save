import { createHash } from 'node:crypto';

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;

const EXACT_RELEASE_INPUTS = new Set([
  '.firebaserc',
  'AGENTS.md',
  'CLAUDE.md',
  'START.md',
  'DOCUMENTATION.md',
  'DECYZJE.md',
  'PLAN.md',
  'capacitor.config.ts',
  'firebase.json',
  'firestore.indexes.json',
  'firestore.rules',
  'index.html',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'playwright.emulator.config.ts',
  'postcss.config.js',
  'storage.rules',
  'tailwind.config.ts',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
]);

export const requiredReleaseInputPaths = () => [...EXACT_RELEASE_INPUTS]
  .sort((a, b) => a.localeCompare(b));

const RELEASE_INPUT_PREFIXES = [
  'docs/',
  'e2e/',
  'functions/src/',
  'ios/App/',
  'android/app/src/main/',
  'public/',
  'scripts/',
  'src/',
];

const GENERATED_OR_PRIVATE_PREFIXES = [
  'android/app/build/',
  'android/app/src/main/assets/public/',
  'audit/',
  'dist/',
  'functions/lib/',
  'ios/App/App/public/',
  'ios/App/CapApp-SPM/.build/',
  'node_modules/',
  'private-audits/',
];

const normalizePath = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    return null;
  }
  return normalized;
};

export const isReleaseInputPath = (value) => {
  const path = normalizePath(value);
  if (!path) return false;
  if (GENERATED_OR_PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (EXACT_RELEASE_INPUTS.has(path)) return true;
  if (/^functions\/(?:package(?:-lock)?\.json|tsconfig\.json)$/.test(path)) return true;
  if (/^android\/(?:build\.gradle|settings\.gradle|gradle\.properties|gradle\/wrapper\/gradle-wrapper\.properties)$/.test(path)) return true;
  if (/^android\/(?:capacitor\.settings\.gradle|variables\.gradle|gradlew(?:\.bat)?)$/.test(path)) return true;
  if (/^android\/gradle\/wrapper\/gradle-wrapper\.(?:jar|properties)$/.test(path)) return true;
  if (/^android\/app\/(?:build\.gradle|capacitor\.build\.gradle|proguard-rules\.pro)$/.test(path)) return true;
  return RELEASE_INPUT_PREFIXES.some((prefix) => path.startsWith(prefix));
};

export const selectReleaseInputPaths = (paths) => [...new Set(
  (Array.isArray(paths) ? paths : [])
    .map(normalizePath)
    .filter((path) => path && isReleaseInputPath(path)),
)].sort((a, b) => a.localeCompare(b));

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
};

const stableJson = (value) => JSON.stringify(stableValue(value));
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const buildEnvironmentFingerprint = (mode, environment) => {
  const viteEnvironment = Object.fromEntries(
    Object.entries(environment && typeof environment === 'object' ? environment : {})
      .filter(([key, value]) => key.startsWith('VITE_') && typeof value === 'string')
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return {
    name: `effective-vite-${mode}`,
    sha256: sha256(stableJson(viteEnvironment)),
  };
};

const normalizeFiles = (files) => [...(Array.isArray(files) ? files : [])]
  .map((file) => ({
    path: normalizePath(file?.path) ?? '',
    size: Number(file?.size),
    mode: Number(file?.mode),
    sha256: typeof file?.sha256 === 'string' ? file.sha256.toLowerCase() : '',
    status: typeof file?.status === 'string' ? file.status : '',
  }))
  .sort((a, b) => a.path.localeCompare(b.path));

const normalizeNamedHashes = (items, withSize = false) => [...(Array.isArray(items) ? items : [])]
  .map((item) => ({
    name: typeof item?.name === 'string' ? item.name : '',
    ...(withSize ? { size: Number(item?.size) } : {}),
    sha256: typeof item?.sha256 === 'string' ? item.sha256.toLowerCase() : '',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const candidateHashInput = (manifest) => ({
  schemaVersion: manifest.schemaVersion,
  baseCommit: manifest.baseCommit,
  versions: manifest.versions,
  sourceFiles: manifest.sourceFiles,
  environmentFingerprints: manifest.environmentFingerprints,
  artifacts: manifest.artifacts,
  evidence: manifest.evidence,
});

export const buildReleaseCandidateManifest = ({
  generatedAt,
  baseCommit,
  versions,
  sourceFiles,
  environmentFingerprints,
  artifacts,
  evidence,
}) => {
  const manifest = {
    schemaVersion: 1,
    generatedAt,
    baseCommit,
    versions: { ...versions },
    sourceFileCount: Array.isArray(sourceFiles) ? sourceFiles.length : 0,
    sourceFiles: normalizeFiles(sourceFiles),
    environmentFingerprints: normalizeNamedHashes(environmentFingerprints),
    artifacts: normalizeNamedHashes(artifacts, true),
    evidence: { ...evidence },
  };
  manifest.sourceFileCount = manifest.sourceFiles.length;
  return {
    ...manifest,
    candidateSha256: sha256(stableJson(candidateHashInput(manifest))),
  };
};

export const validateReleaseCandidateManifest = (manifest) => {
  if (!manifest || typeof manifest !== 'object' || manifest.schemaVersion !== 1) {
    return { ok: false, reason: 'invalid-schema' };
  }
  const versions = manifest.versions ?? {};
  if (versions.package !== '1.0.0' || versions.iosMarketing !== '1.0.0' || versions.androidName !== '1.0.0') {
    return { ok: false, reason: 'marketing-version-must-remain-1.0.0' };
  }
  if (!COMMIT_SHA.test(manifest.baseCommit ?? '')) return { ok: false, reason: 'invalid-base-commit' };
  if (!Array.isArray(manifest.sourceFiles) || manifest.sourceFiles.length === 0) {
    return { ok: false, reason: 'missing-source-files' };
  }
  const paths = manifest.sourceFiles.map((file) => file?.path);
  if (new Set(paths).size !== paths.length) return { ok: false, reason: 'duplicate-source-path' };
  for (const file of manifest.sourceFiles) {
    if (!normalizePath(file?.path) || !Number.isSafeInteger(file?.size) || file.size < 0
      || !Number.isSafeInteger(file?.mode) || file.mode < 0 || file.mode > 0o777) {
      return { ok: false, reason: 'invalid-source-file' };
    }
    if (!SHA256.test(file?.sha256 ?? '')) return { ok: false, reason: 'invalid-source-hash' };
  }
  for (const item of manifest.environmentFingerprints ?? []) {
    if (typeof item?.name !== 'string' || !item.name || !SHA256.test(item?.sha256 ?? '')) {
      return { ok: false, reason: 'invalid-environment-fingerprint' };
    }
  }
  for (const artifact of manifest.artifacts ?? []) {
    if (typeof artifact?.name !== 'string' || !artifact.name || !Number.isSafeInteger(artifact?.size) || artifact.size < 0 || !SHA256.test(artifact?.sha256 ?? '')) {
      return { ok: false, reason: 'invalid-artifact' };
    }
  }
  if (!SHA256.test(manifest.evidence?.auditSha256 ?? '')) return { ok: false, reason: 'invalid-evidence-hash' };
  if (!SHA256.test(manifest.candidateSha256 ?? '')) return { ok: false, reason: 'invalid-candidate-hash' };
  const expected = sha256(stableJson(candidateHashInput(manifest)));
  if (manifest.candidateSha256 !== expected) return { ok: false, reason: 'candidate-hash-mismatch' };
  return { ok: true, reason: 'valid' };
};

const compareKeyedItems = (expectedItems, currentItems, key, prefix, mismatches) => {
  const expectedByKey = new Map((expectedItems ?? []).map((item) => [item[key], item]));
  const currentByKey = new Map((currentItems ?? []).map((item) => [item[key], item]));

  for (const itemKey of [...expectedByKey.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!currentByKey.has(itemKey)) {
      mismatches.push(`${prefix}:missing:${itemKey}`);
      continue;
    }
    if (stableJson(expectedByKey.get(itemKey)) !== stableJson(currentByKey.get(itemKey))) {
      mismatches.push(`${prefix}:changed:${itemKey}`);
    }
  }
  for (const itemKey of [...currentByKey.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!expectedByKey.has(itemKey)) mismatches.push(`${prefix}:unexpected:${itemKey}`);
  }
};

export const compareReleaseCandidateManifests = (expected, current) => {
  const mismatches = [];

  if (expected?.baseCommit !== current?.baseCommit) mismatches.push('base-commit');
  if (stableJson(expected?.versions) !== stableJson(current?.versions)) mismatches.push('versions');
  compareKeyedItems(expected?.sourceFiles, current?.sourceFiles, 'path', 'source', mismatches);
  compareKeyedItems(
    expected?.environmentFingerprints,
    current?.environmentFingerprints,
    'name',
    'environment',
    mismatches,
  );
  compareKeyedItems(expected?.artifacts, current?.artifacts, 'name', 'artifact', mismatches);
  if (expected?.evidence?.auditSha256 !== current?.evidence?.auditSha256) {
    mismatches.push('evidence:audit-latest');
  }
  if (expected?.candidateSha256 !== current?.candidateSha256) mismatches.push('candidate-sha256');

  return { ok: mismatches.length === 0, mismatches };
};
