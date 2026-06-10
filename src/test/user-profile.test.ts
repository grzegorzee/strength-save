import { describe, expect, it } from 'vitest';
import {
  buildPendingAuthProfile,
  mapAppUserProfile,
  resolveProfileLoadFailure,
  type UserProfile,
} from '@/lib/user-profile';
import type { AppUserProfile } from '@/lib/registration-api';

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
});
