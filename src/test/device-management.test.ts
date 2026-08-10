import { describe, expect, it } from 'vitest';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  buildWatchCapabilitySnapshot,
  applyLastKnownWatchLink,
  mobileStoreDestinations,
  saveAppleWatchLinkedState,
} from '@/lib/device-management';

describe('cross-device access contract (Z227)', () => {
  it('passes one PRO capability from iPhone to Apple Watch without checkout data', () => {
    expect(buildWatchCapabilitySnapshot({
      isPro: true,
      tier: 'trial',
      expiresAt: '2026-08-17T12:00:00.000Z',
    })).toEqual({
      v: 1,
      active: true,
      tier: 'trial',
      expiresAt: '2026-08-17T12:00:00.000Z',
    });
    expect(buildWatchCapabilitySnapshot({ isPro: false, tier: 'none', expiresAt: null }))
      .toEqual({ v: 1, active: false, tier: 'none' });
  });

  it('web points to both mobile stores and never exposes a web checkout', () => {
    expect(mobileStoreDestinations('web')).toEqual([
      { platform: 'ios', url: APP_STORE_URL },
      { platform: 'android', url: PLAY_STORE_URL },
    ]);
    expect(mobileStoreDestinations('ios')).toEqual([{ platform: 'ios', url: APP_STORE_URL }]);
    expect(mobileStoreDestinations('android')).toEqual([{ platform: 'android', url: PLAY_STORE_URL }]);
  });

  it('a server-revoked Watch stays blocked offline until an explicit relink', () => {
    const capability = buildWatchCapabilitySnapshot({ isPro: true, tier: 'yearly', expiresAt: null });
    saveAppleWatchLinkedState(false);
    expect(applyLastKnownWatchLink(capability)).toMatchObject({ active: false, tier: 'yearly' });
    saveAppleWatchLinkedState(true);
    expect(applyLastKnownWatchLink(capability)).toMatchObject({ active: true, tier: 'yearly' });
  });
});
