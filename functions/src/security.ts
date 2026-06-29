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
] as const;

export const GDPR_UID_FIELD_COLLECTIONS = [
  "email_verification_codes",
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
