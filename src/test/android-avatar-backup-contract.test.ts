import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const AVATAR_CACHE_PATH = 'strength-save/avatar-cache/';
const MANIFEST_PATH = 'android/app/src/main/AndroidManifest.xml';
const LEGACY_RULES_PATH = 'android/app/src/main/res/xml/backup_rules.xml';
const MODERN_RULES_PATH = 'android/app/src/main/res/xml/data_extraction_rules.xml';

const read = (path: string): string => readFileSync(path, 'utf8');

const excludeEntries = (xml: string): Array<{ domain: string; path: string }> => (
  [...xml.matchAll(/<exclude\b([^>]*)\/?\s*>/g)].map(([, attributes]) => ({
    domain: attributes.match(/\bdomain="([^"]+)"/)?.[1] ?? '',
    path: attributes.match(/\bpath="([^"]+)"/)?.[1] ?? '',
  }))
);

describe('Android backup — prywatny cache avatara', () => {
  it('zachowuje backup aplikacji, ale podpina reguły dla Android 11 i 12+', () => {
    const manifest = read(MANIFEST_PATH);

    expect(manifest).toContain('android:allowBackup="true"');
    expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
  });

  it('Android 11 i starszy wyklucza wyłącznie katalog cache avatara', () => {
    expect(existsSync(LEGACY_RULES_PATH), `${LEGACY_RULES_PATH} musi istnieć`).toBe(true);
    if (!existsSync(LEGACY_RULES_PATH)) return;

    const xml = read(LEGACY_RULES_PATH);
    expect(xml).toContain('<full-backup-content>');
    expect(excludeEntries(xml)).toEqual([{ domain: 'file', path: AVATAR_CACHE_PATH }]);
  });

  it('Android 12+ wyklucza ten sam cache z chmury i transferu urządzenie→urządzenie', () => {
    expect(existsSync(MODERN_RULES_PATH), `${MODERN_RULES_PATH} musi istnieć`).toBe(true);
    if (!existsSync(MODERN_RULES_PATH)) return;

    const xml = read(MODERN_RULES_PATH);
    const cloudBackup = xml.match(/<cloud-backup>[\s\S]*?<\/cloud-backup>/)?.[0] ?? '';
    const deviceTransfer = xml.match(/<device-transfer>[\s\S]*?<\/device-transfer>/)?.[0] ?? '';

    expect(excludeEntries(cloudBackup)).toEqual([{ domain: 'file', path: AVATAR_CACHE_PATH }]);
    expect(excludeEntries(deviceTransfer)).toEqual([{ domain: 'file', path: AVATAR_CACHE_PATH }]);
    expect(excludeEntries(xml)).toHaveLength(2);
  });
});
