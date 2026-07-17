import type { AppUserProfile } from '@/lib/registration-api';

export type SubscriptionTier = 'monthly' | 'yearly' | 'trial' | 'comp' | 'none';

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: 'active' | 'expired' | 'billing_issue' | 'cancelled' | 'none';
  expiresAt: string | null;
  productId?: string;
  willRenew?: boolean;
  updatedAt?: string;
}

const TIERS: SubscriptionTier[] = ['monthly', 'yearly', 'trial', 'comp', 'none'];
const SUB_STATUSES: SubscriptionState['status'][] = ['active', 'expired', 'billing_issue', 'cancelled', 'none'];

export const mapSubscription = (raw: AppUserProfile['subscription']): SubscriptionState | null => {
  if (!raw) return null;
  return {
    tier: TIERS.includes(raw.tier as SubscriptionTier) ? (raw.tier as SubscriptionTier) : 'none',
    status: SUB_STATUSES.includes(raw.status as SubscriptionState['status']) ? (raw.status as SubscriptionState['status']) : 'none',
    expiresAt: raw.expiresAt ?? null,
    ...(raw.productId && { productId: raw.productId }),
    ...(raw.willRenew !== undefined && { willRenew: raw.willRenew }),
    ...(raw.updatedAt && { updatedAt: raw.updatedAt }),
  };
};

/** Czy stan z Firestore daje aktywny dostęp PRO (comp bezterminowo; reszta wg expiresAt). */
export const isSubscriptionActive = (sub: SubscriptionState | null, now = Date.now()): boolean => {
  if (!sub) return false;
  if (sub.tier === 'comp') return sub.status === 'active';
  if (sub.status !== 'active' && sub.status !== 'billing_issue') return false;
  // billing_issue = grace period — dostęp zostaje do expiresAt.
  return !!sub.expiresAt && new Date(sub.expiresAt).getTime() > now;
};

// Z96: rollup aktywności pisany WYŁĄCZNIE przez scheduled function (Admin SDK);
// klient tylko czyta (rules: activitySummary poza whitelistą update usera).
export interface ActivitySummary {
  lastActiveAt: string;
  activeDays7: number;
  activeDays30: number;
  workouts7: number;
  workouts30: number;
  topScreens30: Array<{ key: string; count: number }>;
  updatedAt: string;
}

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
  subscription?: SubscriptionState | null;
  activitySummary?: ActivitySummary;
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
  subscription: mapSubscription(data.subscription),
  preferences: data.preferences || undefined,
});

export const resolveProfileLoadFailure = (lastKnownProfile: UserProfile | null): UserProfile | null =>
  lastKnownProfile;
