import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Android rest notification resources', () => {
  it('ships exactly the selected iOS/web WAV sounds as Android raw resources', () => {
    for (const sound of ['bell', 'horn', 'alarm']) {
      expect(readFileSync(`android/app/src/main/res/raw/rest_${sound}.wav`)
        .equals(readFileSync(`public/rest_${sound}.wav`))).toBe(true);
    }
  });
  it('declares user-controlled exact alarms without restricted automatic exact access', () => {
    const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
    expect(manifest).toContain('android.permission.SCHEDULE_EXACT_ALARM');
    expect(manifest).not.toContain('android.permission.USE_EXACT_ALARM');
  });
});
