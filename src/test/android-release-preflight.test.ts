import { describe, expect, it } from 'vitest';
import { validateGoogleSdkKey } from '../../scripts/android-release-preflight.mjs';

describe('Android release requires its own RevenueCat public SDK key', () => {
  it('accepts a production Google public key without returning its value', () => {
    expect(validateGoogleSdkKey('goog_1234567890abcdef')).toEqual({ ok: true, reason: 'valid' });
  });
  it.each([
    [undefined, 'missing'], ['', 'missing'], ['appl_1234567890abcdef', 'wrong-platform'],
    ['sk_1234567890abcdef', 'secret-key'], ['test_1234567890abcdef', 'test-store'],
    ['goog_mock', 'malformed'], [' goog_1234567890abcdef', 'malformed'],
    ['{"type":"service_account","private_key":"fixture"}', 'malformed'],
  ])('rejects unusable environment input (%s)', (candidate, reason) => {
    expect(validateGoogleSdkKey(candidate)).toEqual({ ok: false, reason });
  });
});
