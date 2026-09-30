import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyVersionChange,
  bumpSemver,
  findVersionProblems,
  readVersionState,
} from '../../scripts/version-helpers.mjs';

const read = (path: string): string => readFileSync(path, 'utf8');

const repoFiles = () => ({
  packageJson: read('package.json'),
  packageLock: read('package-lock.json'),
  pbxproj: read('ios/App/App.xcodeproj/project.pbxproj'),
  buildGradle: read('android/app/build.gradle'),
  releaseTrain: read('release/release-train.json'),
});

const pbx = (version: string, build: string | number, count = 6) => Array.from({ length: count })
  .map(() => `buildSettings = { CURRENT_PROJECT_VERSION = ${build}; MARKETING_VERSION = ${version}; };`)
  .join('\n');

const fixture = (version = '1.0.1', iosBuild = 153, androidCode = 57) => ({
  packageJson: JSON.stringify({ name: 'strength-save', version }, null, 2),
  packageLock: JSON.stringify({ name: 'strength-save', version, packages: { '': { version } } }, null, 2),
  pbxproj: pbx(version, iosBuild),
  buildGradle: `versionCode ${androidCode}\n        versionName "${version}"`,
  releaseTrain: JSON.stringify({
    product: { version },
    ios: { version, build: iosBuild, state: 'testflight-delivered-verified', deliveryEvidence: 'release/ios/x.json' },
    android: { version, versionCode: androidCode, state: 'internal-delivered-verified', deliveryEvidence: 'a.json' },
  }, null, 2),
});

describe('wersjonowanie SemVer (koniec zamrożenia 1.0.0)', () => {
  it('repo: wszystkie kopie wersji i buildów są równe (jedno źródło prawdy package.json)', () => {
    const state = readVersionState(repoFiles());
    expect(findVersionProblems(state)).toEqual([]);
    expect(state.iosMarketing).toHaveLength(6);
  });

  it('pierwszy build z OTA to 1.0.1 (iOS 153, Android 57) lub nowszy', () => {
    const state = readVersionState(repoFiles());
    const [major, minor, patch] = state.package.split('.').map(Number);
    expect(major * 1_000_000 + minor * 1_000 + patch).toBeGreaterThanOrEqual(1_000_001);
    expect(Number(state.iosBuild[0])).toBeGreaterThanOrEqual(153);
    expect(Number(state.androidCode[0])).toBeGreaterThanOrEqual(57);
  });

  it('bump patch/minor/major zeruje niższe człony', () => {
    expect(bumpSemver('1.0.1', 'patch')).toBe('1.0.2');
    expect(bumpSemver('1.2.3', 'minor')).toBe('1.3.0');
    expect(bumpSemver('1.2.3', 'major')).toBe('2.0.0');
    expect(() => bumpSemver('1.0', 'patch')).toThrow();
    expect(() => bumpSemver('1.0.0', 'build')).toThrow();
  });

  it('wykrywa rozjazd w dowolnym miejscu (watch target, gradle, lock, release-train)', () => {
    const base = fixture();
    expect(findVersionProblems(readVersionState(base))).toEqual([]);

    const watchDrift = { ...base, pbxproj: `${pbx('1.0.1', 153, 5)}\nbuildSettings = { CURRENT_PROJECT_VERSION = 153; MARKETING_VERSION = 1.0.0; };` };
    expect(findVersionProblems(readVersionState(watchDrift))).toContain('MARKETING_VERSION = 1.0.0');

    const buildDrift = { ...base, pbxproj: `${pbx('1.0.1', 153, 5)}\nbuildSettings = { CURRENT_PROJECT_VERSION = 152; MARKETING_VERSION = 1.0.1; };` };
    expect(findVersionProblems(readVersionState(buildDrift)).join()).toMatch(/rozjechany/);

    const gradleDrift = { ...base, buildGradle: 'versionCode 57\n versionName "1.0.0"' };
    expect(findVersionProblems(readVersionState(gradleDrift)).join()).toMatch(/versionName/);

    const lockDrift = { ...base, packageLock: JSON.stringify({ version: '1.0.1', packages: { '': { version: '1.0.0' } } }) };
    expect(findVersionProblems(readVersionState(lockDrift)).join()).toMatch(/package-lock/);

    const trainDrift = { ...base, releaseTrain: base.releaseTrain.replace('"build": 153', '"build": 152') };
    expect(findVersionProblems(readVersionState(trainDrift)).join()).toMatch(/ios.build/);
  });

  it('applyVersionChange zmienia wszystkie miejsca naraz i unieważnia dowód dostarczenia', () => {
    const next = applyVersionChange(fixture(), { version: '1.0.2', iosBuild: 154, androidCode: 58 });
    const state = readVersionState(next);
    expect(findVersionProblems(state)).toEqual([]);
    expect(state.package).toBe('1.0.2');
    expect(new Set(state.iosMarketing)).toEqual(new Set(['1.0.2']));
    expect(new Set(state.iosBuild)).toEqual(new Set(['154']));
    expect(state.androidCode).toEqual(['58']);
    const train = JSON.parse(next.releaseTrain);
    expect(train.ios.state).toBe('source-version-requires-current-delivery-verification');
    expect(train.ios.priorDeliveryEvidence).toBe('release/ios/x.json');
    expect(train.ios.deliveryEvidence).toBeUndefined();
  });

  it('sam build +1 nie zmienia wersji', () => {
    const next = applyVersionChange(fixture(), { iosBuild: 154, androidCode: 58 });
    const state = readVersionState(next);
    expect(state.package).toBe('1.0.1');
    expect(state.iosBuild[0]).toBe('154');
  });
});
