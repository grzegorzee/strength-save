#!/usr/bin/env node
// Wersjonowanie Strength Save (decyzja właściciela 2026-09-30, koniec zamrożenia 1.0.0).
//   npm run version:check                 spójność wszystkich miejsc (exit 1 przy rozjeździe)
//   npm run version:bump -- patch|minor|major   nowa wersja natywna (bez zmiany buildów)
//   npm run version:build                 +1 build iOS (CURRENT_PROJECT_VERSION ×6) i Android (versionCode)
// Zapis atomowy: wszystkie nowe treści liczone i walidowane w pamięci, potem
// zapis przez plik tymczasowy + rename per plik.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyVersionChange,
  bumpSemver,
  findVersionProblems,
  readVersionState,
} from './version-helpers.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const PATHS = {
  packageJson: 'package.json',
  packageLock: 'package-lock.json',
  pbxproj: 'ios/App/App.xcodeproj/project.pbxproj',
  buildGradle: 'android/app/build.gradle',
  releaseTrain: 'release/release-train.json',
};

const readAll = () => Object.fromEntries(
  Object.entries(PATHS).map(([key, path]) => [key, readFileSync(resolve(ROOT, path), 'utf8')]),
);

const writeAll = (before, after) => {
  const changed = Object.keys(PATHS).filter((key) => before[key] !== after[key]);
  for (const key of changed) {
    const target = resolve(ROOT, PATHS[key]);
    writeFileSync(`${target}.version-tmp`, after[key]);
  }
  for (const key of changed) {
    const target = resolve(ROOT, PATHS[key]);
    renameSync(`${target}.version-tmp`, target);
  }
  return changed.map((key) => PATHS[key]);
};

const describe = (state) => `${state.package} (iOS ${state.iosBuild[0]}, Android ${state.androidCode[0]})`;

const [command, arg] = process.argv.slice(2);
const files = readAll();
const state = readVersionState(files);
const problems = findVersionProblems(state);

if (command === 'check' || !command) {
  if (problems.length) {
    console.error(`Wersje niespójne:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Wersje spójne: ${describe(state)}`);
  process.exit(0);
}

if (problems.length) {
  console.error(`Odmowa zmiany: stan wejściowy niespójny.\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

let change;
if (command === 'bump') {
  change = { version: bumpSemver(state.package, arg) };
} else if (command === 'build') {
  change = { iosBuild: Number(state.iosBuild[0]) + 1, androidCode: Number(state.androidCode[0]) + 1 };
} else {
  console.error('Użycie: node scripts/version.mjs check | bump patch|minor|major | build');
  process.exit(2);
}

const next = applyVersionChange(files, change);
const nextProblems = findVersionProblems(readVersionState(next));
if (nextProblems.length) {
  console.error(`Odmowa zapisu: wynik niespójny.\n- ${nextProblems.join('\n- ')}`);
  process.exit(1);
}
const written = writeAll(files, next);
console.log(`${describe(state)} -> ${describe(readVersionState(next))}`);
console.log(`Zmienione pliki: ${written.join(', ')}`);
