import { describe, expect, it } from 'vitest';
import {
  buildPendingAuthProfile,
  mapAppUserProfile,
  resolveProfileLoadFailure,
  type UserProfile,
} from '@/lib/user-profile';
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
      privacyVersion: '2.0',
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
