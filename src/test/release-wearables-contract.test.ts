import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');

const manifestProducts = (): string[] => [
  ...read('garmin/manifest.xml').matchAll(/<iq:product id="([^"]+)"\/>/g),
].map((match) => match[1]);

const pngSize = (path: string): { width: number; height: number } => {
  const png = readFileSync(path);
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

describe('Z229 — release contract Apple Watch and Garmin', () => {
  it('bundles an honest privacy manifest for both executables using UserDefaults', () => {
    const app = read('ios/App/App/PrivacyInfo.xcprivacy');
    const watch = read('ios/App/WatchApp/PrivacyInfo.xcprivacy');
    const project = read('ios/App/App.xcodeproj/project.pbxproj');

    for (const privacy of [app, watch]) {
      expect(privacy).toContain('NSPrivacyTracking');
      expect(privacy).toContain('NSPrivacyAccessedAPICategoryUserDefaults');
      expect(privacy).toContain('CA92.1');
    }
    expect(project.match(/= \{isa = PBXBuildFile; fileRef = [^;]+ \/\* PrivacyInfo\.xcprivacy \*\//g)).toHaveLength(2);
  });

  it('keeps one explicit Garmin device matrix with round/rectangle and touch/button coverage', () => {
    const matrix = JSON.parse(read('garmin/release/device-matrix.json')) as {
      devices: Array<{ id: string; shape: 'round' | 'rectangle'; input: 'buttons' | 'touch-buttons' }>;
    };
    const declared = manifestProducts().sort();
    const classified = matrix.devices.map((device) => device.id).sort();

    expect(classified).toEqual(declared);
    expect(new Set(matrix.devices.map((device) => device.shape))).toEqual(new Set(['round', 'rectangle']));
    expect(new Set(matrix.devices.map((device) => device.input))).toEqual(new Set(['buttons', 'touch-buttons']));
  });

  it('ships bilingual listing metadata, permission reasons, privacy URL and a 1024px store icon', () => {
    for (const locale of ['pl', 'en']) {
      const listing = read(`garmin/release/listing-${locale}.md`);
      expect(listing).toContain('Strength Save');
      expect(listing).toContain('Communications');
      expect(listing).toContain('Fit');
      expect(listing).toContain('Sensor');
      expect(listing).toContain('UserProfile');
      expect(listing).toContain('https://strengthsave.app/legal/privacy.html');
    }
    expect(pngSize('garmin/release/store-icon-1024.png')).toEqual({ width: 1024, height: 1024 });
    expect(pngSize('garmin/release/screenshots/fr255-pairing-round.png')).toEqual({ width: 419, height: 629 });
    expect(pngSize('garmin/release/screenshots/venusq2-pairing-rectangle.png')).toEqual({ width: 575, height: 946 });

    const artifact = JSON.parse(read('garmin/release/artifact.json')) as {
      manifestDeviceIds: number;
      targetBinaries: number;
      status: string;
    };
    expect(artifact).toMatchObject({
      manifestDeviceIds: manifestProducts().length,
      targetBinaries: 27,
      status: 'local-signed-not-submitted',
    });
  });
});
