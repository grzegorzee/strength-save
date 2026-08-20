// Wspólne typy panelu admina (lista userów + szczegół). Wydzielone z AdminDashboard
// w X13B, żeby UsersActivityTable/AdminUserDetail nie importowały strony (cykl).
import type { ActivitySummary, SubscriptionState } from '@/lib/user-profile';
import type { TranslationKey } from '@/i18n';

// Z165: opis funkcji jako KLUCZ i18n — moduł bez Reacta, tłumaczenie w miejscu renderu.
export const AVAILABLE_FEATURES: ReadonlyArray<{
  key: 'strava' | 'bodyPhotos';
  label: string;
  descriptionKey: TranslationKey;
  defaultOn: boolean;
}> = [
  { key: 'strava', label: 'Strava', descriptionKey: 'admin.featStravaDesc', defaultOn: false },
  // T14: zdjęcia sylwetki before/after — feature włączany per user decyzją admina.
  { key: 'bodyPhotos', label: 'Before/After', descriptionKey: 'admin.featBodyPhotosDesc', defaultOn: false },
];

export type FeatureKey = typeof AVAILABLE_FEATURES[number]['key'];

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  accessEnabled: boolean;
  status: 'pending_verification' | 'active' | 'suspended' | 'deleted';
  stravaConnected: boolean;
  features: Record<string, boolean>;
  onboardingCompleted: boolean;
  primaryProvider: 'google' | 'password' | 'apple';
  registrationSource: string;
  emailVerifiedAt: string | null;
  cohorts: string[];
  lastLogin?: string;
  activitySummary?: ActivitySummary;
  /** 2026-08-20: stan PRO widoczny w panelu (grant comp albo mirror ze sklepu). */
  subscription?: SubscriptionState | null;
}

export interface AdminUserDetails {
  plan: {
    dayCount: number;
    durationWeeks: number;
    startDate: string | null;
  } | null;
  activeCycle: {
    id: string;
    startDate: string;
    durationWeeks: number;
    completionRate: number;
  } | null;
  recentWorkouts: Array<{
    id: string;
    date: string;
    dayId: string;
    completed: boolean;
    exerciseCount: number;
    cycleId?: string;
  }>;
}
