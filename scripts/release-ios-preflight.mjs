import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import {
  findBuildNumberMismatch,
  validateRevenueCatAppleApiKey,
} from './release-ios-preflight-checks.mjs';
import { findVersionProblems, readVersionState } from './version-helpers.mjs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const info = readFileSync('ios/App/App/Info.plist', 'utf8');
const project = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
const plistVersion = info.match(/CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
const projectVersions = [...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);

// Od X12B Info.plist trzyma placeholder $(MARKETING_VERSION) — źródłem prawdy jest pbxproj.
const plistOk = plistVersion === version || plistVersion === '$(MARKETING_VERSION)';
if (!plistOk || projectVersions.length === 0 || projectVersions.some((candidate) => candidate !== version)) {
  throw new Error(`iOS/Watch marketing version must equal package.json (${version}).`);
}

// Build number (CURRENT_PROJECT_VERSION) musi być obecny i spójny we wszystkich 6 wystąpieniach —
// ręczny bump łatwo rozjeżdża część targetów, co Apple odrzuca dopiero po uploadzie.
const buildCheck = findBuildNumberMismatch(project);
if (!buildCheck.ok) {
  throw new Error(
    `iOS CURRENT_PROJECT_VERSION must be present and consistent in project.pbxproj (${buildCheck.reason}: ${buildCheck.values.join(', ') || 'none found'}).`
  );
}
// Wersja SemVer i buildy muszą być równe we WSZYSTKICH miejscach (package.json,
// lock, pbxproj ×6, gradle, release-train) — to samo co `npm run version:check`.
const versionProblems = findVersionProblems(readVersionState({
  packageJson: readFileSync('package.json', 'utf8'),
  packageLock: readFileSync('package-lock.json', 'utf8'),
  pbxproj: project,
  buildGradle: readFileSync('android/app/build.gradle', 'utf8'),
  releaseTrain: readFileSync('release/release-train.json', 'utf8'),
}));
if (versionProblems.length) {
  throw new Error(`Version sources are inconsistent (npm run version:check):\n- ${versionProblems.join('\n- ')}`);
}
// Ten sam mode co `npm run build:mobile`; jawny env procesu ma pierwszeństwo.
const mobileEnv = loadEnv('mobile', process.cwd(), 'VITE_');
const revenueCatAppleKey = process.env.VITE_REVENUECAT_APPLE_API_KEY
  ?? mobileEnv.VITE_REVENUECAT_APPLE_API_KEY;
const revenueCatKeyCheck = validateRevenueCatAppleApiKey(revenueCatAppleKey);
if (!revenueCatKeyCheck.ok) {
  throw new Error(
    `VITE_REVENUECAT_APPLE_API_KEY must be a production Apple public SDK key (${revenueCatKeyCheck.reason}).`,
  );
}

console.log(`iOS release preflight passed for ${version}.`);
