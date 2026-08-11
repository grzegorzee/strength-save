import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');

describe('Z230 — one Strength Save release and brand contract', () => {
  it('uses the canonical spaced product name on every installable surface', () => {
    expect(read('capacitor.config.ts')).toContain("appName: 'Strength Save'");
    expect(read('index.html')).toContain('<title>Strength Save — Tracker treningowy</title>');
    expect(read('vite.config.ts')).toContain("name: 'Strength Save — Tracker treningowy'");
    expect(read('vite.config.ts')).toContain("short_name: 'Strength Save'");
    expect(read('android/app/src/main/res/values/strings.xml')).toContain('<string name="app_name">Strength Save</string>');
    expect(read('garmin/resources/strings/strings.xml')).toContain('<string id="AppName">Strength Save</string>');
  });

  it('uses canonical accent #CCFC22 on web, Apple Watch and Garmin', () => {
    expect(read('src/index.css')).toContain('--primary: 73 97% 56%;');
    const watchAccent = read('ios/App/WatchApp/Assets.xcassets/AccentColor.colorset/Contents.json');
    expect(watchAccent).toContain('"red" : "0.800"');
    expect(watchAccent).toContain('"green" : "0.988"');
    expect(watchAccent).toContain('"blue" : "0.133"');
    expect(read('garmin/source/Brand.mc')).toContain('const ACCENT = 0xCCFC22;');
    expect(read('garmin/source/PairView.mc')).toContain('Brand.ACCENT');
  });

  it('keeps truthful, bilingual and platform-specific Store copy', () => {
    const stores = [
      read('release/app-store/en-US.md'),
      read('release/app-store/pl-PL.md'),
      read('release/google-play/en-US.md'),
      read('release/google-play/pl-PL.md'),
      read('garmin/release/listing-en.md'),
      read('garmin/release/listing-pl.md'),
    ];

    for (const listing of stores) {
      expect(listing).toContain('Strength Save');
      // Z250: czyste URL-e legal (React /privacy dobiera język); /legal/*.html
      // zostaje na landingu jako źródło treści, ale metadane go nie linkują.
      expect(listing).toMatch(/https:\/\/strengthsave\.app\/privacy/);
      expect(listing).not.toMatch(/strengthsave\.app\/legal\//);
      expect(listing).not.toMatch(/30[- ]day|30 dni|5 months free|5 mies/i);
      expect(listing).not.toMatch(/best|najlepsz|guarantee|gwaranc/i);
    }

    expect(stores[0]).toContain('Apple Watch');
    expect(stores[0]).not.toContain('Garmin:');
    expect(stores[2]).toContain('Health Connect');
    expect(stores[2]).not.toContain('Apple Watch:');
  });

  it('maps the exact release artifact for every surface', () => {
    const train = JSON.parse(read('release/release-train.json')) as Record<string, Record<string, unknown>>;
    expect(train.web.commit).toMatch(/^[0-9a-f]{8}$/);
    expect(train.ios).toMatchObject({ version: '1.0.0', build: 84 });
    expect(train.android).toMatchObject({ version: '1.0.0', versionCode: 6 });
    expect(train.garmin).toMatchObject({ manifestSchemaVersion: 3, targetBinaries: 27 });
    expect(train.entitlement).toMatchObject({ id: 'pro', checkout: ['ios', 'android'] });
  });
});
