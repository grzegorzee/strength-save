import { describe, expect, it } from 'vitest';
import { revenueCatApiKeyForPlatform } from '@/lib/purchases';

describe('Z208 — RevenueCat platform configuration', () => {
  const env = {
    VITE_REVENUECAT_APPLE_API_KEY: 'appl_public',
    VITE_REVENUECAT_GOOGLE_API_KEY: 'goog_public',
  };

  it('uses the Apple public key on iOS', () => {
    expect(revenueCatApiKeyForPlatform('ios', env)).toBe('appl_public');
  });

  it('uses the Google public key on Android', () => {
    expect(revenueCatApiKeyForPlatform('android', env)).toBe('goog_public');
  });

  it('never configures checkout on web or falls back across stores', () => {
    expect(revenueCatApiKeyForPlatform('web', env)).toBeNull();
    expect(revenueCatApiKeyForPlatform('android', {
      VITE_REVENUECAT_APPLE_API_KEY: 'appl_public',
    })).toBeNull();
  });
});
