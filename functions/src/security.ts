// Import wyłącznie typu — ten plik trafia też do webowego programu TS
// (src/test/functions-security.test.ts), gdzie globalny namespace FirebaseFirestore nie istnieje.
import type { Firestore } from "firebase-admin/firestore";

export type AuthProvider = "google" | "password" | "apple";

export interface AccessProfile {
  role?: unknown;
  status?: unknown;
  access?: {
    enabled?: unknown;
  } | null;
  features?: Record<string, unknown> | null;
}

export interface ResendLikeResponse {
  error?: {
    message?: string | null;
  } | null;
}

export const ADMIN_DELETE_BATCH_SIZE = 450;
export const STRAVA_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const STRAVA_OAUTH_STATE_BYTES = 32;

// Publiczne Firebase App ID natywnych aplikacji (pliki konfiguracyjne Firebase).
// To nie sa sekrety. Bez invite nowy profil wolno utworzyc tylko wtedy, gdy
// callable zweryfikowal token App Check wystawiony dokladnie dla jednej z nich.
export const STRENGTH_SAVE_IOS_APP_CHECK_ID = "1:283539506094:ios:b7bb014c82f1e82666be3f";
export const STRENGTH_SAVE_ANDROID_APP_CHECK_ID = "1:283539506094:android:d247e84bda5834fe66be3f";

const STRENGTH_SAVE_NATIVE_APP_CHECK_IDS = new Set([
  STRENGTH_SAVE_IOS_APP_CHECK_ID,
  STRENGTH_SAVE_ANDROID_APP_CHECK_ID,
]);

// UWAGA: kolekcja `consents` jest CELOWO poza listami kasowania — wpisy logu
// zgód są dowodem rozliczalności (art. 7 ust. 1 RODO) i przeżywają usunięcie
// konta; retencja opisana w Polityce Prywatności (sekcje 5 i 10).
export const GDPR_USER_ID_COLLECTIONS = [
  "workouts",
  "measurements",
  "plan_cycles",
  "weekly_summaries",
  "chat_messages",
  "strava_activities",
  "ai_usage",
  "api_audit_logs",
  "notification_logs",
  "app_telemetry_daily",
  "custom_exercises",
] as const;

export const GDPR_UID_FIELD_COLLECTIONS = [
  "email_verification_codes",
  "device_pair_codes",
  "device_tokens",
  "device_statuses",
] as const;

export const GDPR_DIRECT_DOC_COLLECTIONS = [
  "strava_connections",
  "training_plans",
  "users",
] as const;

// Globalne flagi funkcji ustawiane przez admina (config/feature_flags).
// Domyślnie wszystko otwarte — flaga działa dopiero gdy jawnie ustawiona na false.
export interface FeatureFlags {
  aiEnabled?: boolean;
  registrationOpen?: boolean;
  stravaForAll?: boolean;
}

export async function readFeatureFlags(db: Firestore): Promise<FeatureFlags> {
  try {
    const snap = await db.collection("config").doc("feature_flags").get();
    return (snap.data() as FeatureFlags) || {};
  } catch {
    return {};
  }
}

export function providerFromSignInProvider(provider: unknown): AuthProvider {
  if (provider === "google.com") return "google";
  if (provider === "apple.com") return "apple";
  return "password";
}

export function providerGetsImmediateAccess(provider: AuthProvider): boolean {
  return provider === "google" || provider === "apple";
}

export function canCreateUserProfile(input: {
  registrationOpen: boolean;
  inviteValid: boolean;
  appCheckAppId: string | undefined;
}): boolean {
  return input.registrationOpen
    && (input.inviteValid || (
      input.appCheckAppId !== undefined
      && STRENGTH_SAVE_NATIVE_APP_CHECK_IDS.has(input.appCheckAppId)
    ));
}

export function hasCallableAppAccess(profile: AccessProfile | undefined): boolean {
  // Brak dokumentu profilu = brak dostępu (jak get() nieistniejącego doca w regułach).
  if (!profile) return false;
  if (profile.role === "admin") return true;
  // Symetria z firestore.rules hasSelfAccess: brak pola status (konta Google/legacy) = aktywny;
  // jawnie nieaktywni (pending_verification/suspended) nadal blokowani, access.enabled !== false.
  const statusActive = profile.status === undefined || profile.status === "active";
  return statusActive && profile.access?.enabled !== false;
}

export function canUseApiExport(profile: AccessProfile | undefined): boolean {
  return profile?.role === "admin" && profile.status === "active" && profile.access?.enabled !== false;
}

export function canUseStravaIntegration(profile: AccessProfile | undefined): boolean {
  if (!hasCallableAppAccess(profile)) return false;
  return profile?.role === "admin" || profile?.features?.strava === true;
}

export function isValidStravaOAuthState(state: unknown): state is string {
  return typeof state === "string" && /^[A-Za-z0-9_-]{32,256}$/.test(state);
}

export function resendErrorMessage(response: ResendLikeResponse): string | null {
  return response.error?.message || null;
}

// Z169 (przeprojektowane 2026-08-20): nadanie dostępu PRO przez admina (konto demo
// dla App Review, influencerzy, rekompensaty). Grant jest ZAWSZE tier 'comp' — webhook
// RevenueCat nie nadpisuje aktywnego comp, więc grant nie znika po evencie ze sklepu
// (stary wariant 'trial' był kasowany przez EXPIRATION). Czysta walidacja wejścia —
// zapis robi callable adminGrantSubscription.
export interface GrantSubscriptionInput {
  /** Liczba dni dostępu; null/undefined = bezterminowo. */
  days?: number | null;
  /** ISO końca obecnego dostępu (grant albo okres ze sklepu) — dni doliczają się od tej daty. */
  currentExpiresAt?: string | null;
}

export interface GrantSubscriptionResult {
  tier: 'comp';
  status: 'active';
  expiresAt: string | null;
}

export const MAX_GRANT_DAYS = 3650;

/** Buduje stan subskrypcji do zapisu; rzuca Error z kodem przy złym wejściu. */
export const buildGrantedSubscription = (
  input: GrantSubscriptionInput,
  now: number,
): GrantSubscriptionResult => {
  const days = input.days ?? null;
  if (days === null) {
    return { tier: 'comp', status: 'active', expiresAt: null };
  }
  if (!Number.isFinite(days) || days <= 0 || days > MAX_GRANT_DAYS) {
    throw new Error('INVALID_DAYS');
  }
  const current = input.currentExpiresAt ? Date.parse(input.currentExpiresAt) : NaN;
  const base = Number.isFinite(current) && current > now ? current : now;
  return {
    tier: 'comp',
    status: 'active',
    expiresAt: new Date(base + Math.round(days) * 24 * 60 * 60 * 1000).toISOString(),
  };
};

/** Odebranie ręcznego grantu — wraca stan "brak subskrypcji" (płatne okresy odtworzy webhook RC). */
export const buildRevokedSubscription = (): { tier: 'none'; status: 'none'; expiresAt: null } =>
  ({ tier: 'none', status: 'none', expiresAt: null });

/**
 * "Od kiedy" dla grantu (2026-08-20, prośba właściciela): przedłużenie AKTYWNEGO
 * dostępu zachowuje pierwotny startedAt (też sklepowy), świeży grant startuje teraz.
 */
export const resolveGrantStartedAt = (
  current: { status?: unknown; startedAt?: unknown; expiresAt?: unknown } | undefined,
  now: number,
): string => {
  const nowIso = new Date(now).toISOString();
  const startedAt = typeof current?.startedAt === 'string' ? current.startedAt : null;
  if (!startedAt) return nowIso;
  if (current?.status !== 'active' && current?.status !== 'billing_issue') return nowIso;
  if (current?.expiresAt == null) return startedAt; // aktywny bezterminowy comp
  const exp = typeof current.expiresAt === 'string' ? Date.parse(current.expiresAt) : NaN;
  return Number.isFinite(exp) && exp > now ? startedAt : nowIso;
};
