import { describe, expect, it } from 'vitest';
import {
  ADMIN_DELETE_BATCH_SIZE,
  canUseApiExport,
  canUseStravaIntegration,
  GDPR_DIRECT_DOC_COLLECTIONS,
  GDPR_UID_FIELD_COLLECTIONS,
  GDPR_USER_ID_COLLECTIONS,
  hasCallableAppAccess,
  isValidStravaOAuthState,
  providerFromSignInProvider,
  providerGetsImmediateAccess,
  resendErrorMessage,
  STRAVA_OAUTH_STATE_BYTES,
  STRAVA_OAUTH_STATE_TTL_MS,
  buildGrantedSubscription,
} from '../../functions/src/security';
import { isSubscriptionActive } from '@/lib/user-profile';

describe('functions security helpers', () => {
  it('maps Apple sign-in as social auth with immediate access', () => {
    const provider = providerFromSignInProvider('apple.com');

    expect(provider).toBe('apple');
    expect(providerGetsImmediateAccess(provider)).toBe(true);
  });

  it('requires active status for callable app access outside admin', () => {
    expect(hasCallableAppAccess({ role: 'user', status: 'active', access: { enabled: true } })).toBe(true);
    expect(hasCallableAppAccess({ role: 'user', status: 'pending_verification', access: { enabled: true } })).toBe(false);
    expect(hasCallableAppAccess({ role: 'user', status: 'active', access: { enabled: false } })).toBe(false);
    expect(hasCallableAppAccess({ role: 'admin', status: 'suspended', access: { enabled: false } })).toBe(true);
    // Symetria z firestore.rules: brak pola status (konta Google/legacy) = aktywny,
    // o ile dokument profilu istnieje i access.enabled !== false.
    expect(hasCallableAppAccess({ role: 'user', access: { enabled: true } })).toBe(true);
    expect(hasCallableAppAccess({})).toBe(true);
    expect(hasCallableAppAccess({ access: { enabled: false } })).toBe(false);
    expect(hasCallableAppAccess(undefined)).toBe(false);
  });

  it('requires active admin owner for API export keys', () => {
    expect(canUseApiExport({ role: 'admin', status: 'active', access: { enabled: true } })).toBe(true);
    expect(canUseApiExport({ role: 'user', status: 'active', access: { enabled: true } })).toBe(false);
    expect(canUseApiExport({ role: 'admin', status: 'suspended', access: { enabled: true } })).toBe(false);
    expect(canUseApiExport({ role: 'admin', status: 'active', access: { enabled: false } })).toBe(false);
  });

  it('keeps Strava admin-only unless explicitly enabled for an active user', () => {
    expect(canUseStravaIntegration({ role: 'admin', status: 'active', access: { enabled: true } })).toBe(true);
    expect(canUseStravaIntegration({ role: 'user', status: 'active', access: { enabled: true }, features: { strava: true } })).toBe(true);
    expect(canUseStravaIntegration({ role: 'user', status: 'active', access: { enabled: true } })).toBe(false);
    expect(canUseStravaIntegration({ role: 'user', status: 'active', access: { enabled: true }, features: { strava: false } })).toBe(false);
    expect(canUseStravaIntegration({ role: 'user', status: 'pending_verification', access: { enabled: true }, features: { strava: true } })).toBe(false);
    expect(canUseStravaIntegration({ role: 'user', status: 'active', access: { enabled: false }, features: { strava: true } })).toBe(false);
  });

  it('accepts only bounded URL-safe Strava OAuth state values', () => {
    expect(STRAVA_OAUTH_STATE_BYTES).toBe(32);
    expect(STRAVA_OAUTH_STATE_TTL_MS).toBe(10 * 60 * 1000);
    expect(isValidStravaOAuthState('abcDEF123_-abcDEF123_-abcDEF123_-')).toBe(true);
    expect(isValidStravaOAuthState('too-short')).toBe(false);
    expect(isValidStravaOAuthState('abcDEF123_-abcDEF123_-abcDEF123_-$')).toBe(false);
    expect(isValidStravaOAuthState('a'.repeat(257))).toBe(false);
  });

  it('detects Resend provider errors before reporting sent=true', () => {
    expect(resendErrorMessage({ error: null })).toBeNull();
    expect(resendErrorMessage({ error: { message: 'Domain rejected' } })).toBe('Domain rejected');
  });

  it('keeps adminDeleteUser GDPR coverage for private user collections', () => {
    expect(ADMIN_DELETE_BATCH_SIZE).toBeLessThanOrEqual(450);
    expect(GDPR_USER_ID_COLLECTIONS).toEqual(expect.arrayContaining([
      'workouts',
      'measurements',
      'plan_cycles',
      'weekly_summaries',
      'chat_messages',
      'strava_activities',
      'ai_usage',
      'api_audit_logs',
      'notification_logs',
    ]));
    expect(GDPR_UID_FIELD_COLLECTIONS).toContain('email_verification_codes');
    expect(GDPR_DIRECT_DOC_COLLECTIONS).toEqual(expect.arrayContaining([
      'strava_connections',
      'training_plans',
      'users',
    ]));
  });
});

// Z169: nadawanie dostępu PRO przez panel admina (odblokowuje konto demo App Review
// bez service accountu; docelowo influencerzy i rekompensaty).
describe('buildGrantedSubscription (Z169)', () => {
  const NOW = Date.parse('2026-07-29T10:00:00.000Z');

  it('comp bez dni = dostęp bezterminowy', () => {
    expect(buildGrantedSubscription({ tier: 'comp' }, NOW)).toEqual({
      tier: 'comp', status: 'active', expiresAt: null,
    });
  });

  it('trial z dniami liczy expiresAt', () => {
    expect(buildGrantedSubscription({ tier: 'trial', days: 30 }, NOW).expiresAt)
      .toBe('2026-08-28T10:00:00.000Z');
  });

  it('trial bez dni odrzucony (nigdy by nie wygasł)', () => {
    expect(() => buildGrantedSubscription({ tier: 'trial' }, NOW)).toThrow('TRIAL_REQUIRES_DAYS');
  });

  it('odrzuca zły tier i bezsensowne dni', () => {
    expect(() => buildGrantedSubscription({ tier: 'pro' as 'comp' }, NOW)).toThrow('INVALID_TIER');
    expect(() => buildGrantedSubscription({ tier: 'comp', days: 0 }, NOW)).toThrow('INVALID_DAYS');
    expect(() => buildGrantedSubscription({ tier: 'comp', days: -5 }, NOW)).toThrow('INVALID_DAYS');
    expect(() => buildGrantedSubscription({ tier: 'comp', days: 99999 }, NOW)).toThrow('INVALID_DAYS');
  });

  it('wynik przechodzi isSubscriptionActive (kontrakt z klientem)', () => {
    expect(isSubscriptionActive(buildGrantedSubscription({ tier: 'comp' }, NOW), NOW)).toBe(true);
    expect(isSubscriptionActive(buildGrantedSubscription({ tier: 'trial', days: 14 }, NOW), NOW)).toBe(true);
    // Po wygaśnięciu trial nie daje dostępu.
    expect(isSubscriptionActive(buildGrantedSubscription({ tier: 'trial', days: 14 }, NOW), NOW + 15 * 864e5)).toBe(false);
  });
});
