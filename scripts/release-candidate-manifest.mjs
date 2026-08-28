#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { loadEnv } from 'vite';
import {
  buildEnvironmentFingerprint,
  buildReleaseCandidateManifest,
  compareReleaseCandidateManifests,
  requiredReleaseInputPaths,
  selectReleaseInputPaths,
  sha256,
  validateReleaseCandidateManifest,
} from './release-candidate-manifest-helpers.mjs';

const ROOT = process.cwd();

const usage = () => [
  'Usage:',
  '  node scripts/release-candidate-manifest.mjs [--output <manifest.json>]',
  '  node scripts/release-candidate-manifest.mjs --verify [manifest.json]',
  '',
  'Generation writes hashes only. Verification is read-only and exits nonzero on mismatch.',
  'Neither mode copies source, environment values, secrets or user data.',
].join('\n');

const parseArgs = (args) => {
  const parsed = { output: null, verify: false, manifest: null, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--output') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('MISSING_OUTPUT_PATH');
      parsed.output = value;
      index += 1;
    } else if (arg === '--verify') {
      parsed.verify = true;
      const value = args[index + 1];
      if (value && !value.startsWith('--')) {
        parsed.manifest = value;
        index += 1;
      }
    } else throw new Error(`UNKNOWN_ARGUMENT:${arg}`);
  }
  if (parsed.verify && parsed.output) throw new Error('VERIFY_OUTPUT_CONFLICT');
  return parsed;
};

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const gitPaths = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

const hashFile = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

const existingFingerprint = async (name, filePath) => {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    return { name, size: info.size, sha256: await hashFile(filePath) };
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const readVersions = async () => {
  const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const pbxproj = await readFile(path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  const android = await readFile(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
  const iosMarketing = [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);
  const iosBuild = [...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((match) => match[1]);
  const androidName = android.match(/versionName\s+["']([^"']+)["']/)?.[1];
  const androidCode = android.match(/versionCode\s+(\d+)/)?.[1];
  if (iosMarketing.length !== 6 || new Set(iosMarketing).size !== 1) throw new Error('IOS_MARKETING_VERSION_MISMATCH');
  if (iosBuild.length !== 6 || new Set(iosBuild).size !== 1) throw new Error('IOS_BUILD_VERSION_MISMATCH');
  if (!androidName || !androidCode) throw new Error('ANDROID_VERSION_MISSING');
  return {
    package: packageJson.version,
    iosMarketing: iosMarketing[0],
    iosBuild: iosBuild[0],
    androidName,
    androidCode,
  };
};

const collectSourceFiles = async () => {
  const explicitExisting = (await Promise.all(requiredReleaseInputPaths().map(async (relativePath) => {
    try {
      return (await stat(path.join(ROOT, relativePath))).isFile() ? relativePath : null;
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }))).filter(Boolean);
  const allPaths = selectReleaseInputPaths([
    ...gitPaths('ls-files', '--cached', '--others', '--exclude-standard', '-z'),
    ...explicitExisting,
  ]);
  const modified = new Set(gitPaths('diff', '--name-only', '-z'));
  const staged = new Set(gitPaths('diff', '--cached', '--name-only', '-z'));
  const untracked = new Set(gitPaths('ls-files', '--others', '--exclude-standard', '-z'));

  return Promise.all(allPaths.map(async (relativePath) => {
    const absolutePath = path.join(ROOT, relativePath);
    const status = untracked.has(relativePath)
      ? 'untracked'
      : staged.has(relativePath) && modified.has(relativePath)
        ? 'staged+modified'
        : staged.has(relativePath)
          ? 'staged'
          : modified.has(relativePath)
            ? 'modified'
            : 'tracked';
    try {
      const info = await stat(absolutePath);
      if (!info.isFile()) throw new Error(`NOT_A_FILE:${relativePath}`);
      return {
        path: relativePath,
        size: info.size,
        mode: info.mode & 0o777,
        sha256: await hashFile(absolutePath),
        status,
      };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return { path: relativePath, size: 0, mode: 0, sha256: sha256(`DELETED\0${relativePath}`), status: 'deleted' };
      }
      throw error;
    }
  }));
};

const defaultOutput = () => path.join(
  ROOT,
  'private-audits',
  `release-candidate-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
);

const collectCurrentReleaseCandidate = async ({ generatedAt = new Date().toISOString() } = {}) => {
  const environmentFingerprints = ['mobile', 'production'].map((mode) => (
    buildEnvironmentFingerprint(mode, loadEnv(mode, ROOT, 'VITE_'))
  ));

  const artifacts = (await Promise.all([
    existingFingerprint('dist/index.html', path.join(ROOT, 'dist/index.html')),
    existingFingerprint('android/public/index.html', path.join(ROOT, 'android/app/src/main/assets/public/index.html')),
    existingFingerprint('ios/public/index.html', path.join(ROOT, 'ios/App/App/public/index.html')),
    existingFingerprint('android/app-debug.apk', path.join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk')),
    existingFingerprint('ios-simulator/App.app/index.html', path.join('/tmp/strength-save-derived-data/Build/Products/Debug-iphonesimulator/App.app/public/index.html')),
  ])).filter(Boolean);

  const audit = await existingFingerprint('audit/latest.json', path.join(ROOT, 'audit/latest.json'));
  if (!audit) throw new Error('AUDIT_LATEST_MISSING');

  return buildReleaseCandidateManifest({
    generatedAt,
    baseCommit: git('rev-parse', 'HEAD'),
    versions: await readVersions(),
    sourceFiles: await collectSourceFiles(),
    environmentFingerprints,
    artifacts,
    evidence: { auditSha256: audit.sha256 },
  });
};

export const createReleaseCandidateManifest = async ({ output = null } = {}) => {
  const manifest = await collectCurrentReleaseCandidate();
  const validation = validateReleaseCandidateManifest(manifest);
  if (!validation.ok) throw new Error(`INVALID_RELEASE_MANIFEST:${validation.reason}`);

  const outputPath = path.resolve(output ?? defaultOutput());
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return {
    outputPath,
    candidateSha256: manifest.candidateSha256,
    baseCommit: manifest.baseCommit,
    versions: manifest.versions,
    sourceFileCount: manifest.sourceFileCount,
    modifiedSourceFileCount: manifest.sourceFiles.filter((file) => file.status !== 'tracked').length,
    environmentFingerprintCount: manifest.environmentFingerprints.length,
    artifacts: manifest.artifacts,
  };
};

const latestReleaseManifestPath = async () => {
  const directory = path.join(ROOT, 'private-audits');
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('RELEASE_MANIFEST_NOT_FOUND');
    throw error;
  }
  const latest = entries
    .filter((entry) => entry.isFile() && /^release-candidate-manifest-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a))[0];
  if (!latest) throw new Error('RELEASE_MANIFEST_NOT_FOUND');
  return path.join(directory, latest);
};

export const verifyReleaseCandidateManifest = async ({ manifest: manifestPath = null } = {}) => {
  const resolvedPath = manifestPath ? path.resolve(manifestPath) : await latestReleaseManifestPath();
  let expected;
  try {
    expected = JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`RELEASE_MANIFEST_NOT_FOUND:${resolvedPath}`);
    if (error instanceof SyntaxError) throw new Error(`INVALID_RELEASE_MANIFEST_JSON:${resolvedPath}`);
    throw error;
  }

  const validation = validateReleaseCandidateManifest(expected);
  if (!validation.ok) throw new Error(`INVALID_RELEASE_MANIFEST:${validation.reason}`);

  const current = await collectCurrentReleaseCandidate({ generatedAt: expected.generatedAt });
  const comparison = compareReleaseCandidateManifests(expected, current);
  if (!comparison.ok) {
    throw new Error(`RELEASE_MANIFEST_MISMATCH:${comparison.mismatches.join(',')}`);
  }

  return {
    ok: true,
    manifestPath: resolvedPath,
    candidateSha256: expected.candidateSha256,
    sourceFileCount: expected.sourceFileCount,
    artifactCount: expected.artifacts.length,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const result = args.verify
    ? await verifyReleaseCandidateManifest({ manifest: args.manifest })
    : await createReleaseCandidateManifest({ output: args.output });
  console.log(JSON.stringify(result, null, 2));
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    console.error(usage());
    process.exitCode = 1;
  });
}
