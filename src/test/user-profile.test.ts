import { describe, expect, it } from 'vitest';
import {
  buildPendingAuthProfile,
  isSubscriptionActive,
  mapAppUserProfile,
  resolveEffectiveSubscription,
  resolveProfileLoadFailure,
  type SubscriptionState,
  type UserProfile,
} from '@/lib/user-profile';
import { buildGrantedSubscription } from '../../functions/src/security';
import type { AppUserProfile } from '@/lib/registration-api';
import { getConsentMirror } from '@/lib/consent-selection';
import { hasCurrentRequiredConsents } from '@/lib/legal-versions';
import { buildOnboardingAnswers } from '@/lib/onboarding-answers';

const seed = {
  userId: 'user-1',
  email: 'user@example.com',
  displayName: 'User One',
  photoURL: 'https://example.com/avatar.png',
};

describe('user profile loading', () => {
  it('uses pending verification only for a missing profile document', () => {
    const profile = buildPendingAuthProfile(seed);

    expect(profile.status).toBe('pending_verification');
    expect(profile.accessEnabled).toBe(false);
  });

  it('keeps the last known profile after a load failure', () => {
    const lastKnown: UserProfile = {
      ...buildPendingAuthProfile(seed),
      status: 'active',
      accessEnabled: true,
      primaryProvider: 'google',
    };

    expect(resolveProfileLoadFailure(lastKnown)).toBe(lastKnown);
  });

  it('does not invent a pending verification profile when no fallback exists', () => {
    expect(resolveProfileLoadFailure(null)).toBeNull();
  });

  it('maps active Firestore profiles without changing access policy', () => {
    const data: AppUserProfile = {
      uid: 'user-1',
      email: 'profile@example.com',
      displayName: 'Profile Name',
      photoURL: '',
      role: 'user',
      status: 'active',
      access: { enabled: true },
      auth: { primaryProvider: 'google' },
      onboardingCompleted: true,
      cohorts: ['beta'],
      features: { strava: true },
    };

    expect(mapAppUserProfile('user-1', data, seed)).toMatchObject({
      email: 'profile@example.com',
      status: 'active',
      accessEnabled: true,
      primaryProvider: 'google',
      cohorts: ['beta'],
      features: { strava: true },
    });
  });

  // Incydent 2026-08-11 (build 87): mapper gubił pole consents, więc po udanym
  // recordConsent bramka re-consent nigdy nie znikała (spinner bez wyjścia),
  // mimo że mirror w users/{uid} był zapisany poprawnie.
  it('przenosi mirror zgód do profilu, żeby bramka re-consent mogła się zamknąć', () => {
    const consents = {
      termsVersion: '2.0',
      privacyVersion: '2.1',
      healthGranted: true,
      healthVersion: '1.0',
    };
    const data = {
      uid: 'user-1',
      email: 'profile@example.com',
      displayName: 'Profile Name',
      photoURL: '',
      role: 'user',
      status: 'active',
      consents,
    } as AppUserProfile;

    const profile = mapAppUserProfile('user-1', data, seed);

    expect(getConsentMirror(profile)).toEqual(consents);
    expect(hasCurrentRequiredConsents(getConsentMirror(profile))).toBe(true);
  });

  it('wymaga ponownego potwierdzenia po zmianie polityki prywatności 2.0 → 2.1', () => {
    expect(hasCurrentRequiredConsents({
      termsVersion: '2.0',
      privacyVersion: '2.0',
      healthGranted: true,
      healthVersion: '1.0',
    })).toBe(false);
  });

  // WP-O (X30): nowe pola users/{uid} musza przejsc przez mapper pole-po-polu
  // (lekcja builda 88). Fixture snapshotu z tej samej logiki co produkcyjny zapis.
  it('przenosi trainingProfile i onboardingAnswers (kontrakt v2) do profilu', () => {
    const onboardingAnswers = buildOnboardingAnswers({
      level: 'intermediate',
      objective: 'fat_loss',
      daysPerWeek: 4,
      durationWeeks: 8,
      trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
      planSource: 'recommended',
      templateId: 'tpl-lean-engine-4',
      recommendedTemplateId: 'tpl-lean-engine-4',
    }, { accentColor: 'lime', startDate: '2026-08-31', now: new Date('2026-08-25T10:00:00.000Z') });
    const trainingProfile = { level: 'advanced', objective: 'peak_strength', daysPerWeek: 3 };
    const data = {
      uid: 'user-1',
      email: 'profile@example.com',
      displayName: 'Profile Name',
      photoURL: '',
      role: 'user',
      status: 'active',
      trainingProfile,
      onboardingAnswers,
    } as AppUserProfile;

    const profile = mapAppUserProfile('user-1', data, seed);

    expect(profile.trainingProfile).toEqual(trainingProfile);
    expect(profile.onboardingAnswers).toEqual(onboardingAnswers);
    expect(profile.onboardingAnswers?.version).toBe(2);
  });

  it('brak trainingProfile/onboardingAnswers w dokumencie: pola nie powstaja (stare konta)', () => {
    const data = {
      uid: 'user-1', email: 'profile@example.com', displayName: 'Profile Name', photoURL: '', role: 'user', status: 'active',
    } as AppUserProfile;

    const profile = mapAppUserProfile('user-1', data, seed);

    expect(profile.trainingProfile).toBeUndefined();
    expect(profile.onboardingAnswers).toBeUndefined();
  });
});

// Bug 7 (X30): grant comp nad opłaconą subskrypcją przykrywa ją tylko póki trwa.
// Webhook RC pisze wtedy stan sklepowy do users/{uid}.storeSubscription; po
// wygaśnięciu grantu obowiązuje zachowany stan sklepowy (opłacony okres nie
// znika z web/Garmin na miesiące do następnego eventu sklepu).
describe('resolveEffectiveSubscription (bug 7 / X30)', () => {
  const NOW = Date.parse('2026-08-25T12:00:00.000Z');
  const store: SubscriptionState = {
    tier: 'yearly', status: 'active', startedAt: '2026-07-01T00:00:00.000Z',
    expiresAt: '2027-07-01T00:00:00.000Z',
  };
  // Fixture grantu przez produkcyjny builder (zasada 11), nie ręczny obiekt.
  const grantAt = (nowMs: number, days: number): SubscriptionState => ({
    ...buildGrantedSubscription({ days }, nowMs), startedAt: new Date(nowMs).toISOString(),
  });

  it('aktywny grant comp wygrywa ze stanem sklepowym', () => {
    const activeComp = grantAt(NOW, 30);
    expect(resolveEffectiveSubscription(activeComp, store, NOW)).toBe(activeComp);
  });

  it('wygasły grant comp oddaje głos zachowanemu stanowi sklepowemu (opłacony rok nie znika)', () => {
    const expiredComp = grantAt(NOW - 40 * 864e5, 30);
    const effective = resolveEffectiveSubscription(expiredComp, store, NOW);
    expect(effective).toBe(store);
    expect(isSubscriptionActive(effective, NOW)).toBe(true);
  });

  it('NIEZMIENNIK: bez storeSubscription zachowanie jak dotąd', () => {
    const expiredComp = grantAt(NOW - 40 * 864e5, 30);
    expect(resolveEffectiveSubscription(expiredComp, null, NOW)).toBe(expiredComp);
    expect(resolveEffectiveSubscription(store, null, NOW)).toBe(store);
    expect(resolveEffectiveSubscription(null, null, NOW)).toBeNull();
  });

  it('mapAppUserProfile scala storeSubscription po wygaśnięciu grantu', () => {
    const pastMs = Date.now() - 40 * 864e5;
    const data = {
      uid: 'user-1',
      email: 'profile@example.com',
      displayName: 'Profile Name',
      photoURL: '',
      role: 'user',
      status: 'active',
      subscription: { ...buildGrantedSubscription({ days: 30 }, pastMs) },
      storeSubscription: { ...store, expiresAt: '2099-01-01T00:00:00.000Z' },
    } as AppUserProfile;

    const profile = mapAppUserProfile('user-1', data, seed);
    expect(profile.subscription).toMatchObject({ tier: 'yearly', status: 'active' });
    expect(isSubscriptionActive(profile.subscription ?? null)).toBe(true);
  });

  it('NIEZMIENNIK: mapAppUserProfile bez storeSubscription mapuje jak dotąd', () => {
    const data = {
      uid: 'user-1',
      email: 'profile@example.com',
      displayName: 'Profile Name',
      photoURL: '',
      role: 'user',
      status: 'active',
      subscription: { tier: 'monthly', status: 'active', expiresAt: '2099-01-01T00:00:00.000Z' },
    } as AppUserProfile;

    expect(mapAppUserProfile('user-1', data, seed).subscription)
      .toMatchObject({ tier: 'monthly', status: 'active', expiresAt: '2099-01-01T00:00:00.000Z' });
  });
});
