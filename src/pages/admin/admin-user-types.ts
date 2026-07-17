// Wspólne typy panelu admina (lista userów + szczegół). Wydzielone z AdminDashboard
// w X13B, żeby UsersActivityTable/AdminUserDetail nie importowały strony (cykl).
import type { ActivitySummary } from '@/lib/user-profile';

export const AVAILABLE_FEATURES = [
  { key: 'strava', label: 'Strava', description: 'Integracja ze Stravą', defaultOn: false },
] as const;

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
