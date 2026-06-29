import { readFileSync } from 'node:fs';
import { findBuildNumberMismatch } from './release-ios-preflight-checks.mjs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const info = readFileSync('ios/App/App/Info.plist', 'utf8');
const project = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
const plistVersion = info.match(/CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
const projectVersions = [...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);

if (plistVersion !== version || projectVersions.length === 0 || projectVersions.some((candidate) => candidate !== version)) {
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
if (!process.env.VITE_REVENUECAT_APPLE_API_KEY) {
  throw new Error('VITE_REVENUECAT_APPLE_API_KEY is required before an iOS archive.');
}

console.log(`iOS release preflight passed for ${version}.`);
