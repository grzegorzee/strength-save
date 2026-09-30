#!/usr/bin/env node
// Rejestr warstwy natywnej builda sklepowego (baseline) dla kontroli zgodności OTA.
//   npm run live-update:baseline -- --platform ios|android [--build N] [--write]
//   npm run live-update:baseline -- --check      (każdy build z bieżących źródeł ma zgodny baseline)
// Uruchamiać przy KAŻDYM buildzie natywnym (release-ios.sh / AAB) i commitować plik
// release/live-updates/native-baselines/<platforma>-<wersja>-<build>.json.
// Zmiana warstwy natywnej w obrębie tej samej wersji jest odrzucana: nowy kod
// natywny = nowa wersja (npm run version:bump) i nowy build przez review.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BASELINE_DIR, inventoryFingerprint, loadBaselines as loadAll, nativeInventory, PLATFORMS } from './live-update-helpers.mjs';
import { readVersionState } from './version-helpers.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = join(ROOT, BASELINE_DIR);

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const versions = readVersionState({
  packageJson: readFileSync(join(ROOT, 'package.json'), 'utf8'),
  packageLock: readFileSync(join(ROOT, 'package-lock.json'), 'utf8'),
  pbxproj: readFileSync(join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8'),
  buildGradle: readFileSync(join(ROOT, 'android/app/build.gradle'), 'utf8'),
  releaseTrain: readFileSync(join(ROOT, 'release/release-train.json'), 'utf8'),
});
const currentBuild = { ios: Number(versions.iosBuild[0]), android: Number(versions.androidCode[0]) };

const loadBaselines = () => loadAll(ROOT);

const describe = (platform, build) => {
  const inventory = nativeInventory(ROOT, platform);
  return {
    schema: 1,
    platform,
    nativeVersion: versions.package,
    nativeBuild: build,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    recordedAt: new Date().toISOString(),
    fingerprint: inventoryFingerprint(inventory),
    inventory,
  };
};

if (flag('check')) {
  const baselines = loadBaselines();
  let failed = false;
  for (const platform of PLATFORMS) {
    const fingerprint = inventoryFingerprint(nativeInventory(ROOT, platform));
    const own = baselines.find((b) => b.platform === platform && b.nativeVersion === versions.package && b.nativeBuild === currentBuild[platform]);
    if (!own) {
      console.error(`Brak baseline'u ${platform} ${versions.package} (${currentBuild[platform]}): npm run live-update:baseline -- --platform ${platform} --write`);
      failed = true;
    } else if (own.fingerprint !== fingerprint) {
      console.error(`Baseline ${platform} ${versions.package} (${currentBuild[platform]}) nie odpowiada źródłom (warstwa natywna zmieniona po rejestracji).`);
      failed = true;
    } else {
      console.log(`OK ${platform} ${versions.package} (${currentBuild[platform]}) ${fingerprint.slice(0, 12)}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

const platform = value('platform');
if (!PLATFORMS.includes(platform)) {
  console.error('Użycie: live-update-baseline.mjs --platform ios|android [--build N] [--write] | --check');
  process.exit(2);
}
const build = Number(value('build') ?? currentBuild[platform]);
const record = describe(platform, build);
// Ponowna rejestracja TEGO SAMEGO builda (przed jego wydaniem) nadpisuje plik;
// inny build tej samej wersji z inną warstwą natywną = odmowa.
const conflict = loadBaselines().find((b) => b.platform === platform && b.nativeVersion === record.nativeVersion
  && b.nativeBuild !== build && b.fingerprint !== record.fingerprint);
if (conflict) {
  console.error(
    `Odmowa: ${platform} ${record.nativeVersion} build ${conflict.nativeBuild} ma inną warstwę natywną. `
    + 'Zmiana kodu natywnego wymaga nowej wersji (npm run version:bump -- patch|minor) i review sklepu.',
  );
  process.exit(1);
}
console.log(JSON.stringify({ platform, nativeVersion: record.nativeVersion, nativeBuild: build, fingerprint: record.fingerprint, plugins: record.inventory.plugins.length, localNativeFiles: record.inventory.localNative.files }, null, 2));
if (flag('write')) {
  mkdirSync(DIR, { recursive: true });
  const file = join(DIR, `${platform}-${record.nativeVersion}-${build}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Zapisano ${file}`);
}
