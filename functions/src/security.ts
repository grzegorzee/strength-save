// Import wyłącznie typu — ten plik trafia też do webowego programu TS
// (src/test/functions-security.test.ts), gdzie globalny namespace FirebaseFirestore nie istnieje.
import type { Firestore } from "firebase-admin/firestore";
import { LEGAL_VERSIONS } from "./legal-versions";

export type AuthProvider = "google" | "password" | "apple";

export interface AccessProfile {
  role?: unknown;
  status?: unknown;
  access?: {
    enabled?: unknown;
  } | null;
  features?: Record<string, unknown> | null;
}

export const ADMIN_DELETE_BATCH_SIZE = 450;
export const STRAVA_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const STRAVA_OAUTH_STATE_BYTES = 32;

// Publiczne Firebase App ID atestowanych aplikacji (pliki konfiguracyjne Firebase).
// To nie sa sekrety. Bez invite nowy profil wolno utworzyc tylko wtedy, gdy
// callable zweryfikowal token App Check wystawiony dokladnie dla jednej z nich.
// Web dolaczyl 2026-08-21: App Check przez reCAPTCHA Enterprise (init w
// src/lib/firebase.ts), zgodnie z pierwotnym planem otwarcia rejestracji
// dopiero po wdrozeniu wymuszanej atestacji.
export const STRENGTH_SAVE_IOS_APP_CHECK_ID = "1:283539506094:ios:b7bb014c82f1e82666be3f";
export const STRENGTH_SAVE_ANDROID_APP_CHECK_ID = "1:283539506094:android:d247e84bda5834fe66be3f";
export const STRENGTH_SAVE_WEB_APP_CHECK_ID = "1:283539506094:web:fcb9e5af60d71fd566be3f";

const STRENGTH_SAVE_NATIVE_APP_CHECK_IDS = new Set([
  STRENGTH_SAVE_IOS_APP_CHECK_ID,
  STRENGTH_SAVE_ANDROID_APP_CHECK_ID,
  STRENGTH_SAVE_WEB_APP_CHECK_ID,
]);

// UWAGA: kolekcja `consents` jest CELOWO poza listami kasowania — wpisy logu
// zgód są dowodem rozliczalności (art. 7 ust. 1 RODO) i przeżywają usunięcie
// konta; retencja opisana w Polityce Prywatności (sekcje 5 i 10).
export const GDPR_USER_ID_COLLECTIONS = [
  "workouts",
  "workout_health_v2",
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
  // WP-B (X27): luki purge domknięte — kolekcje per-user z polem userId
  // z firestore.rules, wcześniej nieobjęte kasowaniem konta.
  "plan_cycle_operations",
  "user_events",
  "client_errors",
  "exercise_notes",
  "workout_day_notes",
  "manual_activities",
  "bug_reports",
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
  "bug_report_rate_limits",
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

// Bug 46 (X30): status po updateUserAccess (suspend/restore/toggle dostępu).
// Restore konta legacy bez verification.emailVerifiedAt (konta sprzed
// registration flow, np. v4.0.0 z 2026-03) NIE może ustawiać jawnego
// pending_verification: rules hasSelfAccess tolerują tylko BRAK pola status,
// więc taki restore blokował wszystkie zapisy i stawiał EmailVerificationGate
// mimo maila "dostęp przywrócony". pending zostaje wyłącznie dla kont, które
// JAWNIE czekały na weryfikację (status pending_verification).
export function resolveUpdatedAccessStatus(
  suspended: boolean,
  userData: {
    status?: unknown;
    verification?: { emailVerifiedAt?: unknown } | null;
  } | null | undefined,
): "suspended" | "active" | "pending_verification" {
  if (suspended) return "suspended";
  if (userData?.verification?.emailVerifiedAt) return "active";
  return userData?.status === "pending_verification" ? "pending_verification" : "active";
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

/**
 * Centralna, fail-closed granica przetwarzania danych zdrowotnych w Functions.
 * Samo `healthGranted` nie wystarcza: grant musi wskazywać aktualny dokument,
 * dodatnią epokę i niepusty identyfikator nadany atomowo przez recordConsent.
 */
export function hasActiveHealthConsent(profile: unknown): boolean {
  if (typeof profile !== "object" || profile === null) return false;
  const consents = (profile as { consents?: unknown }).consents;
  if (typeof consents !== "object" || consents === null) return false;

  const state = consents as Record<string, unknown>;
  return state.healthGranted === true
    && state.healthVersion === LEGAL_VERSIONS.health
    && Number.isSafeInteger(state.healthEpoch)
    && (state.healthEpoch as number) > 0
    && typeof state.healthGrantId === "string"
    && state.healthGrantId.trim().length > 0;
}

export function isValidStravaOAuthState(state: unknown): state is string {
  return typeof state === "string" && /^[A-Za-z0-9_-]{32,256}$/.test(state);
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
 * Bug 7 (X30): revoke grantu nadanego NA opłacony okres nie może odebrać PRO —
 * przywraca stan sklepowy zachowany w users/{uid}.storeSubscription (pełna mapa
 * z dokumentu: grant kopiuje ją przy nadaniu, webhook RC aktualizuje póki grant
 * trwa). Bez zachowanego stanu wraca 'none' jak dotąd.
 */
export const restoreRevokedSubscription = (
  storeSubscription: unknown,
): Record<string, unknown> =>
  storeSubscription && typeof storeSubscription === 'object' && !Array.isArray(storeSubscription)
    ? { ...(storeSubscription as Record<string, unknown>) }
    : { ...buildRevokedSubscription() };

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
