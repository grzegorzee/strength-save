import type { AppUserProfile } from '@/lib/registration-api';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  accessEnabled: boolean;
  status: 'pending_verification' | 'active' | 'suspended' | 'deleted';
  stravaConnected: boolean;
  onboardingCompleted: boolean;
  primaryProvider: 'google' | 'password' | 'apple';
  registrationSource: string;
  emailVerifiedAt: string | null;
  cohorts: string[];
  features?: Record<string, boolean>;
  preferences?: {
    unit?: 'kg' | 'lbs';
    language?: 'pl' | 'en';
    restTimerSec?: number;
    timerSound?: boolean;
  };
}

interface AuthProfileSeed {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export const buildPendingAuthProfile = (seed: AuthProfileSeed): UserProfile => ({
  uid: seed.userId,
  email: seed.email,
  displayName: seed.displayName,
  photoURL: seed.photoURL,
  role: 'user',
  accessEnabled: false,
  status: 'pending_verification',
  stravaConnected: false,
  onboardingCompleted: false,
  primaryProvider: 'password',
  registrationSource: 'email',
  emailVerifiedAt: null,
  cohorts: [],
});

export const mapAppUserProfile = (userId: string, data: AppUserProfile, seed: AuthProfileSeed): UserProfile => ({
  uid: userId,
  email: data.email || seed.email,
  displayName: data.displayName || seed.displayName,
  photoURL: data.photoURL || seed.photoURL,
  role: data.role || 'user',
  accessEnabled: data.access?.enabled !== false,
  status: data.status || 'active',
  stravaConnected: data.stravaConnected || false,
  onboardingCompleted: data.onboardingCompleted || false,
  primaryProvider: data.auth?.primaryProvider || 'google',
  registrationSource: data.registration?.source || data.auth?.primaryProvider || 'google',
  emailVerifiedAt: data.verification?.emailVerifiedAt || null,
  cohorts: data.cohorts || [],
  features: data.features || undefined,
  preferences: data.preferences || undefined,
});

export const resolveProfileLoadFailure = (lastKnownProfile: UserProfile | null): UserProfile | null =>
  lastKnownProfile;
