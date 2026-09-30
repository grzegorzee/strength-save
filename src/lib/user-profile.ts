import type { AppUserProfile } from '@/lib/registration-api';
import { sanitizePRBackfill, type PRBackfill } from '@/lib/pr-backfill';
import type { ConsentMirror } from '@/lib/legal-versions';
import type { OnboardingAnswers, TrainingProfileSnapshot } from '@/lib/onboarding-answers';
import type { LanguageCode } from '@/i18n';
import type { RestSettings } from '@/lib/rest-timer';
import type { PaletteThemeV2 } from '@/lib/palette-theme';
import { sanitizeStravaSyncError, type StravaSyncError } from '@/lib/strava-sync-status';
import { sanitizeNotificationPrefs, type NotificationPrefs } from '@/lib/notification-prefs';
import { readCloudAppTour, type CloudAppTourState } from '@/lib/first-workout-tour';

export type SubscriptionTier = 'monthly' | 'yearly' | 'trial' | 'comp' | 'none';

export interface SubscriptionState {
  store?: string;
  tier: SubscriptionTier;
  status: 'active' | 'expired' | 'billing_issue' | 'cancelled' | 'none';
  /** Początek bieżącego okresu (webhook RC, purchased_at_ms) — brak w dokumentach sprzed 2026-08-11. */
  startedAt?: string | null;
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
    startedAt: raw.startedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    ...(raw.productId && { productId: raw.productId }),
    ...(typeof raw.store === 'string' && { store: raw.store }),
    ...(raw.willRenew !== undefined && { willRenew: raw.willRenew }),
    ...(raw.updatedAt && { updatedAt: raw.updatedAt }),
  };
};

/** Czy stan z Firestore daje aktywny dostęp PRO (comp bez expiresAt bezterminowo; reszta wg expiresAt). */
export const isSubscriptionActive = (sub: SubscriptionState | null, now = Date.now()): boolean => {
  if (!sub) return false;
  if (sub.tier === 'comp') {
    // 2026-08-20: grant admina może mieć datę końca (+30/+90/+365 dni z panelu).
    if (sub.status !== 'active') return false;
    return !sub.expiresAt || new Date(sub.expiresAt).getTime() > now;
  }
  if (sub.status !== 'active' && sub.status !== 'billing_issue') return false;
  // billing_issue = grace period — dostęp zostaje do expiresAt.
  return !!sub.expiresAt && new Date(sub.expiresAt).getTime() > now;
};

/**
 * Bug 7 (X30): grant comp przykrywa stan sklepowy tylko póki trwa. Webhook RC pisze
 * wtedy do users/{uid}.storeSubscription; po wygaśnięciu grantu obowiązuje zachowany
 * stan sklepowy (opłacony okres nie znika z web/Garmin do następnego eventu sklepu).
 */
export const resolveEffectiveSubscription = (
  sub: SubscriptionState | null,
  storeSub: SubscriptionState | null,
  now = Date.now(),
): SubscriptionState | null => {
  if (!sub || !storeSub) return sub ?? storeSub;
  if (sub.tier === 'comp' && !isSubscriptionActive(sub, now)) return storeSub;
  return sub;
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
  /** F5: data ostatniego udanego syncu Stravy (ISO), do „Twoich liczb". */
  stravaLastSync?: string;
  /** F5b: ostatni błąd synchronizacji Stravy (pisze backend, czyści po sukcesie). */
  stravaSyncError?: StravaSyncError;
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
    language?: LanguageCode;
    /** Legacy (do X35a): pojedynczy czas przerwy. Tylko do odczytu (migracja do `rest`). */
    restTimerSec?: number;
    /** X35b: jedno źródło prawdy o przerwach (RestSettings; walidacja normalizeRestSettings). */
    rest?: Partial<RestSettings>;
    timerSound?: boolean;
    /** X37 WP-B: proponuj rozgrzewkę przed treningiem (arkusz przed startem); brak pola = true. */
    warmupPrompt?: boolean;
    /** F-T2: id koloru przewodniego (accent-theme); brak = limonka. */
    accentColor?: string;
    /** PaletteThemeV2: addytywnie obok accentColor dla nowych klientów. */
    paletteTheme?: PaletteThemeV2;
    /** Optymistyczna rewizja wyboru palety między urządzeniami. */
    paletteRevision?: number;
    paletteMutationId?: string;
    /** F-T3: zapamiętany adres odbiorcy maili z podsumowaniem (np. trener). */
    trainerEmail?: string;
    /** WP-I (X29): imię trenera/odbiorcy — do powitania w mailu i podglądu w Profilu. */
    trainerName?: string;
    /** Przewodnik nowego konta (2026-09-29): koniec (done/skipped), per konto. */
    appTour?: CloudAppTourState;
  };
  /** Mirror zgód z users/{uid}.consents; bramka re-consent czyta go z profilu. */
  consents?: ConsentMirror;
  /** Bug 11 (X30): strefa IANA zapisana w profilu (TimeZoneSync porównuje z Intl). */
  timeZone?: string;
  /** X35c: przełączniki powiadomień (Profil → Powiadomienia); brak klucza = włączone. */
  notificationPrefs?: NotificationPrefs;
  /** OTA: `internal` = tester wskazany przez admina (docs/LIVE-UPDATES.md). */
  liveUpdateChannel?: 'internal' | 'production';
  /** Rekordy sprzed instalacji (Runna p.1, spec A5) — baseline detekcji PR. */
  prBackfill?: PRBackfill;
  /** WP-O (X30): profil treningowy (onboarding + replan): poziom/cel/dni w tygodniu. */
  trainingProfile?: TrainingProfileSnapshot;
  /** WP-O (X30): snapshot odpowiedzi onboardingu (v2), pisany raz przy zakończeniu. */
  onboardingAnswers?: OnboardingAnswers;
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

const mapPreferences = (raw: AppUserProfile['preferences']): UserProfile['preferences'] => {
  if (!raw) return undefined;
  const { appTour, ...rest } = raw;
  const tour = readCloudAppTour(appTour);
  return tour ? { ...rest, appTour: tour } : rest;
};

export const mapAppUserProfile = (userId: string, data: AppUserProfile, seed: AuthProfileSeed): UserProfile => ({
  uid: userId,
  email: data.email || seed.email,
  displayName: data.displayName || seed.displayName,
  photoURL: data.photoURL || seed.photoURL,
  role: data.role || 'user',
  accessEnabled: data.access?.enabled !== false,
  status: data.status || 'active',
  stravaConnected: data.stravaConnected || false,
  ...(typeof data.stravaLastSync === 'string' && Number.isFinite(new Date(data.stravaLastSync).getTime())
    ? { stravaLastSync: data.stravaLastSync } : {}),
  ...(sanitizeStravaSyncError(data.stravaSyncError) ? { stravaSyncError: sanitizeStravaSyncError(data.stravaSyncError) } : {}),
  onboardingCompleted: data.onboardingCompleted || false,
  primaryProvider: data.auth?.primaryProvider || 'google',
  registrationSource: data.registration?.source || data.auth?.primaryProvider || 'google',
  emailVerifiedAt: data.verification?.emailVerifiedAt || null,
  cohorts: data.cohorts || [],
  features: data.features || undefined,
  // Bug 7 (X30): po wygaśnięciu grantu comp głos przejmuje zachowany stan sklepowy.
  subscription: resolveEffectiveSubscription(mapSubscription(data.subscription), mapSubscription(data.storeSubscription)),
  // Przewodnik nowego konta: preferences to luźna mapa, więc appTour przechodzi
  // tylko w poprawnym kształcie (lekcja builda 88: pole bez mappera znika/psuje UI).
  preferences: mapPreferences(data.preferences),
  // Incydent 2026-08-11 (build 87): bez przeniesienia mirrora zgód bramka
  // re-consent nie miała się jak zamknąć po udanym recordConsent.
  consents: data.consents || undefined,
  // Lekcja builda 88: mapper pole-po-polu — nowe pole bez wpisu tutaj znika.
  prBackfill: sanitizePRBackfill(data.prBackfill),
  timeZone: typeof data.timeZone === 'string' && data.timeZone ? data.timeZone : undefined,
  // Release e2e 2026-09-29: bez tego pola Profil pokazywał każdy przełącznik jako włączony.
  notificationPrefs: sanitizeNotificationPrefs(data.notificationPrefs),
  // OTA 2026-09-30: kanał aktualizacji przypisany przez admina (callable adminSetLiveUpdateChannel).
  liveUpdateChannel: data.liveUpdateChannel === 'internal' || data.liveUpdateChannel === 'production'
    ? data.liveUpdateChannel
    : undefined,
  // WP-O (X30): passthrough jak consents — karta admina (p12) i kreator czytają z profilu.
  trainingProfile: data.trainingProfile || undefined,
  onboardingAnswers: data.onboardingAnswers || undefined,
});

export const resolveProfileLoadFailure = (lastKnownProfile: UserProfile | null): UserProfile | null =>
  lastKnownProfile;
