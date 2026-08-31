import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const usageKeys = [
  'NSCameraUsageDescription',
  'NSHealthShareUsageDescription',
  'NSHealthUpdateUsageDescription',
  'NSPhotoLibraryAddUsageDescription',
  'NSPhotoLibraryUsageDescription',
] as const;

const read = (path: string): string => readFileSync(path, 'utf8');

describe('iOS permission prompt localization contract', () => {
  it.each(['en', 'pl'])('%s contains every permission explanation with non-empty copy', (locale) => {
    const strings = read(`ios/App/App/${locale}.lproj/InfoPlist.strings`);
    for (const key of usageKeys) {
      expect(strings).toMatch(new RegExp(`"${key}"\\s*=\\s*"[^"\\n]{20,}";`));
    }
  });

  it('adds both localizations to the App target resources and keeps English fallback', () => {
    const project = read('ios/App/App.xcodeproj/project.pbxproj');
    const info = read('ios/App/App/Info.plist');

    expect(project).toContain('InfoPlist.strings in Resources');
    expect(project).toContain('path = en.lproj/InfoPlist.strings');
    expect(project).toContain('path = pl.lproj/InfoPlist.strings');
    expect(project).toMatch(/knownRegions = \([\s\S]*?en,[\s\S]*?pl,[\s\S]*?Base,/);
    expect(info).toContain('<string>en</string>');
  });
});
