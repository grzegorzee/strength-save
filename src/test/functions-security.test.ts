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
  resolveUpdatedAccessStatus,
  STRAVA_OAUTH_STATE_BYTES,
  STRAVA_OAUTH_STATE_TTL_MS,
  buildGrantedSubscription,
  buildRevokedSubscription,
  resolveGrantStartedAt,
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
      // WP-B (X27): luki purge domknięte — kolekcje per-user z polem userId
      // z firestore.rules, wcześniej nieobjęte kasowaniem konta.
      'plan_cycle_operations',
      'user_events',
      'client_errors',
      'exercise_notes',
      'workout_day_notes',
      'manual_activities',
    ]));
    expect(GDPR_UID_FIELD_COLLECTIONS).toContain('email_verification_codes');
    expect(GDPR_DIRECT_DOC_COLLECTIONS).toEqual(expect.arrayContaining([
      'strava_connections',
      'training_plans',
      'users',
    ]));
  });
});

// Bug 46 (X30): restore konta legacy bez verification.emailVerifiedAt (konta
// sprzed registration flow, np. v4.0.0) ustawiał JAWNY status
// pending_verification — rules blokowały wtedy wszystkie zapisy, user widział
// EmailVerificationGate mimo maila "dostęp przywrócony", a panel admina
// pokazywał optymistyczne "active".
describe('resolveUpdatedAccessStatus (updateUserAccess, bug 46)', () => {
  it('suspend zawsze daje suspended', () => {
    expect(resolveUpdatedAccessStatus(true, { status: 'active' })).toBe('suspended');
    expect(resolveUpdatedAccessStatus(true, {})).toBe('suspended');
  });

  it('restore zweryfikowanego konta = active', () => {
    expect(resolveUpdatedAccessStatus(false, {
      status: 'suspended',
      verification: { emailVerifiedAt: '2026-08-01T00:00:00.000Z' },
    })).toBe('active');
  });

  it('restore konta legacy bez pola verification = active (nie pending_verification)', () => {
    expect(resolveUpdatedAccessStatus(false, { status: 'suspended' })).toBe('active');
    expect(resolveUpdatedAccessStatus(false, {})).toBe('active');
    expect(resolveUpdatedAccessStatus(false, { verification: { emailVerifiedAt: null } })).toBe('active');
  });

  it('konto jawnie czekające na weryfikację zostaje pending (toggle dostępu nie omija weryfikacji)', () => {
    expect(resolveUpdatedAccessStatus(false, {
      status: 'pending_verification',
      verification: { emailVerifiedAt: null },
    })).toBe('pending_verification');
  });
});

// Z169 (przeprojektowane 2026-08-20): grant PRO z panelu — zawsze comp, dni doliczane
// do końca obecnego dostępu (webhook RC nie kasuje aktywnego comp, patrz revenuecat.ts).
describe('buildGrantedSubscription (Z169 / panel 2026-08-20)', () => {
  const NOW = Date.parse('2026-07-29T10:00:00.000Z');

  it('bez dni = comp bezterminowo', () => {
    expect(buildGrantedSubscription({}, NOW)).toEqual({
      tier: 'comp', status: 'active', expiresAt: null,
    });
  });

  it('dni liczone od teraz, gdy nie ma aktywnego dostępu', () => {
    expect(buildGrantedSubscription({ days: 30 }, NOW).expiresAt)
      .toBe('2026-08-28T10:00:00.000Z');
    // Wygasła data w przeszłości nie przesuwa bazy.
    expect(buildGrantedSubscription({ days: 30, currentExpiresAt: '2026-07-01T00:00:00.000Z' }, NOW).expiresAt)
      .toBe('2026-08-28T10:00:00.000Z');
  });

  it('dni DOLICZANE do końca aktywnego dostępu (grant albo opłacony okres)', () => {
    expect(buildGrantedSubscription({ days: 30, currentExpiresAt: '2026-09-10T10:00:00.000Z' }, NOW).expiresAt)
      .toBe('2026-10-10T10:00:00.000Z');
  });

  it('odrzuca bezsensowne dni', () => {
    expect(() => buildGrantedSubscription({ days: 0 }, NOW)).toThrow('INVALID_DAYS');
    expect(() => buildGrantedSubscription({ days: -5 }, NOW)).toThrow('INVALID_DAYS');
    expect(() => buildGrantedSubscription({ days: 99999 }, NOW)).toThrow('INVALID_DAYS');
  });

  it('wynik przechodzi isSubscriptionActive (kontrakt z klientem)', () => {
    expect(isSubscriptionActive(buildGrantedSubscription({}, NOW), NOW)).toBe(true);
    expect(isSubscriptionActive(buildGrantedSubscription({ days: 14 }, NOW), NOW)).toBe(true);
    // Po wygaśnięciu grant nie daje dostępu.
    expect(isSubscriptionActive(buildGrantedSubscription({ days: 14 }, NOW), NOW + 15 * 864e5)).toBe(false);
  });

  it('revoke wraca do stanu bez subskrypcji i gasi dostęp', () => {
    const revoked = buildRevokedSubscription();
    expect(revoked).toEqual({ tier: 'none', status: 'none', expiresAt: null });
    expect(isSubscriptionActive(revoked, NOW)).toBe(false);
  });

  // "Od kiedy" grantu (2026-08-20): przedłużenie aktywnego dostępu zachowuje startedAt.
  it('resolveGrantStartedAt: aktywny dostęp zachowuje datę startu, reszta startuje teraz', () => {
    const NOW_ISO = new Date(NOW).toISOString();
    const FROM = '2026-06-01T08:00:00.000Z';
    // aktywny bezterminowy comp i aktywny okres sklepowy → zostaje pierwotny start
    expect(resolveGrantStartedAt({ status: 'active', startedAt: FROM, expiresAt: null }, NOW)).toBe(FROM);
    expect(resolveGrantStartedAt({ status: 'active', startedAt: FROM, expiresAt: '2026-09-01T00:00:00.000Z' }, NOW)).toBe(FROM);
    expect(resolveGrantStartedAt({ status: 'billing_issue', startedAt: FROM, expiresAt: '2026-09-01T00:00:00.000Z' }, NOW)).toBe(FROM);
    // wygasły / nieaktywny / brak startedAt → start = teraz
    expect(resolveGrantStartedAt({ status: 'active', startedAt: FROM, expiresAt: '2026-07-01T00:00:00.000Z' }, NOW)).toBe(NOW_ISO);
    expect(resolveGrantStartedAt({ status: 'expired', startedAt: FROM, expiresAt: null }, NOW)).toBe(NOW_ISO);
    expect(resolveGrantStartedAt({ status: 'active', expiresAt: null }, NOW)).toBe(NOW_ISO);
    expect(resolveGrantStartedAt(undefined, NOW)).toBe(NOW_ISO);
  });
});
