import { readFileSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const info = readFileSync('ios/App/App/Info.plist', 'utf8');
const project = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
const plistVersion = info.match(/CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
const projectVersions = [...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);

if (plistVersion !== version || projectVersions.length === 0 || projectVersions.some((candidate) => candidate !== version)) {
  throw new Error(`iOS/Watch marketing version must equal package.json (${version}).`);
}
if (!process.env.VITE_REVENUECAT_APPLE_API_KEY) {
  throw new Error('VITE_REVENUECAT_APPLE_API_KEY is required before an iOS archive.');
}

console.log(`iOS release preflight passed for ${version}.`);
