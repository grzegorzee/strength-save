import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }));

const pluginImported = vi.fn();
vi.mock('@capawesome/capacitor-live-update', () => {
  pluginImported();
  return { LiveUpdate: {} };
});

import { getLiveUpdateController, liveUpdateObjectUrl, markLiveUpdateReady, setLiveUpdateUser } from '@/lib/live-update';

describe('OTA na webie (app.strengthsave.app)', () => {
  it('nigdy nie ładuje pluginu ani kontrolera — web aktualizuje się przez PWA', async () => {
    markLiveUpdateReady();
    setLiveUpdateUser({ uid: 'u1', isAdmin: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pluginImported).not.toHaveBeenCalled();
    expect(getLiveUpdateController()).toBeNull();
  });

  it('URL obiektu: Firebase Storage REST (alt=media) albo jawny prefiks testowy', () => {
    expect(liveUpdateObjectUrl('live-updates/production/ios/1.0.1/manifest.json', ''))
      .toMatch(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]*\/o\/live-updates%2Fproduction%2Fios%2F1\.0\.1%2Fmanifest\.json\?alt=media$/);
    expect(liveUpdateObjectUrl('live-updates/x.json', 'http://localhost:8787/'))
      .toBe('http://localhost:8787/live-updates/x.json');
  });
});
