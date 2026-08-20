import { httpsCallable } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { functions } from "@/lib/firebase";
import type { ConsentMirror } from "@/lib/legal-versions";
import { getPendingInviteCode } from "@/lib/pending-invite";
import { detectLanguage, LANGUAGES, type LanguageCode } from "@/i18n";
import { withTimeout } from '@/lib/promise-timeout';

const REGISTRATION_WEB_TIMEOUT_MS = 10000;

const isE2EMode = import.meta.env.VITE_E2E_MODE === 'true';

// Język UI klienta (źródło prawdy: localStorage 'app-language' ustawiany w LanguageContext;
// fallback: wykrycie z urządzenia). Przekazujemy do funkcji wysyłających maile,
// by treść (kod weryfikacyjny, welcome) szła w języku użytkownika.
function currentLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem('app-language');
    // Z168: walidacja przez rejestr — nowy język działa bez zmiany tego warunku.
    if (saved && LANGUAGES.some((language) => language.code === saved)) return saved as LanguageCode;
  } catch { /* ignore */ }
  return detectLanguage();
}

async function callRegistrationFunction<RequestData, ResponseData>(
  functionName: string,
  data: RequestData,
): Promise<ResponseData> {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    const { callNativeAttestedFunction } = await import('@/lib/native-callable');
    return callNativeAttestedFunction<RequestData, ResponseData>(functionName, data);
  }
  const fn = httpsCallable<RequestData, ResponseData>(functions, functionName);
  return (await withTimeout(
    fn(data),
    REGISTRATION_WEB_TIMEOUT_MS,
    `Registration function ${functionName}`,
  )).data;
}

export type AccountStatus = "pending_verification" | "active" | "suspended" | "deleted";

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: "admin" | "user";
  access?: { enabled?: boolean };
  status?: AccountStatus;
  auth?: {
    primaryProvider?: "google" | "password" | "apple";
  };
  authProviders?: string[];
  onboardingCompleted?: boolean;
  onboarding?: {
    state?: "not_started" | "in_progress" | "completed";
    version?: number;
  };
  /** Mirror zgód pisany przez recordConsent (klient tylko czyta). */
  consents?: ConsentMirror;
  /** Rekordy sprzed instalacji (Runna p.1, spec A5): klient pisze z Profilu. */
  prBackfill?: { squat?: number; bench?: number; deadlift?: number };
  verification?: {
    emailVerifiedAt?: string | null;
    lastCodeSentAt?: string | null;
  };
  registration?: {
    source?: string;
    inviteId?: string | null;
    waitlistId?: string | null;
    createdAt?: string;
    lastLoginAt?: string;
  };
  cohorts?: string[];
  features?: Record<string, boolean>;
  // Subskrypcja PRO: pisane przez webhook RevenueCat (Cloud Function) albo admina (tier 'comp').
  subscription?: {
    tier?: string;
    status?: string;
    startedAt?: string | null;
    expiresAt?: string | null;
    productId?: string;
    willRenew?: boolean;
    updatedAt?: string;
  };
  stravaConnected?: boolean;
  // Preferencje aplikacji synchronizowane między urządzeniami (web + iOS).
  preferences?: {
    unit?: 'kg' | 'lbs';
    language?: LanguageCode;
    restTimerSec?: number;
    timerSound?: boolean;
  };
}

export interface InviteRecord {
  id: string;
  code: string;
  email: string | null;
  status: "active" | "redeemed" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedBy: string | null;
  note: string | null;
  cohorts: string[];
  waitlistEntryId: string | null;
  sentAt: string | null;
}

export interface WaitlistEntryRecord {
  id: string;
  email: string;
  displayName: string | null;
  note: string | null;
  source: string;
  status: "waiting" | "invited" | "converted" | "archived";
  createdAt: string;
  updatedAt: string;
  convertedUserId: string | null;
  linkedInviteId: string | null;
}

export interface AuthAuditLogRecord {
  id: string;
  eventType: string;
  uid: string | null;
  email: string | null;
  actorUid: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export async function syncUserProfile() {
  if (isE2EMode) {
    return {
      uid: 'e2e-test-user',
      email: 'e2e@test.com',
      displayName: 'E2E Tester',
      photoURL: '',
      role: 'admin' as const,
      access: { enabled: true },
      status: 'active' as const,
      auth: { primaryProvider: 'google' as const },
      authProviders: ['google'],
      onboardingCompleted: true,
      onboarding: { state: 'completed' as const, version: 1 },
      verification: { emailVerifiedAt: new Date().toISOString(), lastCodeSentAt: null },
      registration: { source: 'google', inviteId: null, waitlistId: null, createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() },
      cohorts: ['internal'],
      features: {},
      stravaConnected: false,
    };
  }
  const result = await callRegistrationFunction<
    { language: LanguageCode; inviteCode: string | null },
    { profile: AppUserProfile }
  >("syncUserProfile", {
    language: currentLanguage(),
    inviteCode: getPendingInviteCode(),
  });
  return result.profile;
}

export async function requestEmailVerificationCode() {
  if (isE2EMode) {
    return { sent: true, alreadyVerified: false };
  }
  return callRegistrationFunction<{ language: LanguageCode }, { sent: boolean; alreadyVerified?: boolean }>(
    "requestEmailVerificationCode",
    { language: currentLanguage() },
  );
}

export async function verifyEmailCode(code: string) {
  if (isE2EMode) {
    if (code !== '123456') {
      throw new Error('Nieprawidłowy kod.');
    }
    return { verified: true };
  }
  return callRegistrationFunction<{ code: string }, { verified: boolean }>("verifyEmailCode", { code });
}

export async function createWaitlistEntry(input: {
  email: string;
  displayName?: string;
  note?: string;
  source?: string;
}) {
  if (isE2EMode) {
    return { entryId: 'e2e-waitlist-entry', existing: false };
  }
  const fn = httpsCallable<typeof input, { entryId: string; existing: boolean }>(functions, "createWaitlistEntry");
  const result = await fn(input);
  return result.data;
}

export async function createInvite(input: {
  email?: string;
  note?: string;
  cohorts?: string[];
  waitlistEntryId?: string;
  expiresInDays?: number;
}) {
  if (isE2EMode) {
    return {
      invite: {
        id: 'e2e-invite',
        code: 'INVITE42',
        email: input.email || null,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        redeemedAt: null,
        redeemedBy: null,
        note: input.note || null,
        cohorts: input.cohorts || [],
        waitlistEntryId: input.waitlistEntryId || null,
        sentAt: input.email ? new Date().toISOString() : null,
      },
      inviteUrl: 'https://example.test/#/?invite=INVITE42',
    };
  }
  const fn = httpsCallable<typeof input, { invite: InviteRecord; inviteUrl: string }>(functions, "createInvite");
  const result = await fn(input);
  return result.data;
}

export async function listInvites() {
  if (isE2EMode) {
    return [{
      id: 'e2e-invite',
      code: 'INVITE42',
      email: 'invite@test.com',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      redeemedAt: null,
      redeemedBy: null,
      note: 'E2E invite',
      cohorts: ['beta'],
      waitlistEntryId: 'e2e-waitlist-entry',
      sentAt: new Date().toISOString(),
    }];
  }
  const fn = httpsCallable<Record<string, never>, { invites: InviteRecord[] }>(functions, "listInvites");
  const result = await fn({});
  return result.data.invites;
}

export async function revokeInvite(inviteId: string) {
  if (isE2EMode) {
    return { success: true };
  }
  const fn = httpsCallable<{ inviteId: string }, { success: boolean }>(functions, "revokeInvite");
  const result = await fn({ inviteId });
  return result.data;
}

export async function redeemInvite(code: string) {
  if (isE2EMode) {
    return { success: true, inviteId: code || 'e2e-invite' };
  }
  const fn = httpsCallable<{ code: string }, { success: boolean; inviteId: string }>(functions, "redeemInvite");
  const result = await fn({ code });
  return result.data;
}

export async function listWaitlistEntries() {
  if (isE2EMode) {
    return [{
      id: 'e2e-waitlist-entry',
      email: 'waitlist@test.com',
      displayName: 'Waitlist User',
      note: 'Chcę dostać invite do testów',
      source: 'login-screen',
      status: 'waiting' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      convertedUserId: null,
      linkedInviteId: null,
    }];
  }
  const fn = httpsCallable<Record<string, never>, { entries: WaitlistEntryRecord[] }>(functions, "listWaitlistEntries");
  const result = await fn({});
  return result.data.entries;
}

export async function updateUserAccess(input: { uid: string; accessEnabled: boolean; suspended: boolean; reason?: string }) {
  if (isE2EMode) {
    return { success: true };
  }
  const fn = httpsCallable<typeof input, { success: boolean }>(functions, "updateUserAccess");
  const result = await fn(input);
  return result.data;
}

export async function listAuthAuditLogs() {
  if (isE2EMode) {
    return [{
      id: 'e2e-audit-1',
      eventType: 'verification_code_sent',
      uid: 'e2e-test-user',
      email: 'e2e@test.com',
      actorUid: 'e2e-test-user',
      createdAt: new Date().toISOString(),
      metadata: { source: 'e2e' },
    }];
  }
  const fn = httpsCallable<Record<string, never>, { logs: AuthAuditLogRecord[] }>(functions, "listAuthAuditLogs");
  const result = await fn({});
  return result.data.logs;
}

// ── Panel admina (Fazy 1-3 + push) ──────────────────────────────────────────

export interface AdminLogEntry {
  id: string;
  createdAt?: string;
  [key: string]: unknown;
}

export async function adminGetUserLogs(uid: string) {
  if (isE2EMode) return { notifications: [] as AdminLogEntry[], authLogs: [] as AdminLogEntry[] };
  const fn = httpsCallable<{ uid: string }, { notifications: AdminLogEntry[]; authLogs: AdminLogEntry[] }>(functions, "adminGetUserLogs");
  const result = await fn({ uid });
  return result.data;
}

export async function adminSendUserEmail(input: { uid: string; subject: string; body: string }) {
  if (isE2EMode) return { success: true };
  const fn = httpsCallable<typeof input, { success: boolean }>(functions, "adminSendUserEmail");
  return (await fn(input)).data;
}

export async function adminResendVerification(uid: string) {
  if (isE2EMode) return { success: true };
  const fn = httpsCallable<{ uid: string }, { success: boolean }>(functions, "adminResendVerification");
  return (await fn({ uid })).data;
}

export async function adminBroadcastEmail(input: { target: string; subject: string; body: string }) {
  if (isE2EMode) return { success: true, sent: 0, total: 0 };
  const fn = httpsCallable<typeof input, { success: boolean; sent: number; total: number }>(functions, "adminBroadcastEmail");
  return (await fn(input)).data;
}

export async function adminSendPush(input: { target: string; title: string; body: string; inbox?: boolean }) {
  if (isE2EMode) return { success: true, sent: 1, failed: 0, total: 1, invalidTokens: 0, inboxWritten: 1 };
  // T15: inbox (default true po stronie funkcji) = mirror ogłoszenia do dzwonka;
  // inboxWritten opcjonalne (stara funkcja bez mirrora go nie zwraca).
  const fn = httpsCallable<typeof input, { success: boolean; sent: number; failed: number; total: number; invalidTokens: number; inboxWritten?: number }>(functions, "adminSendPush");
  return (await fn(input)).data;
}

export async function adminDeleteUser(uid: string) {
  if (isE2EMode) return { success: true };
  const fn = httpsCallable<{ uid: string }, { success: boolean }>(functions, "adminDeleteUser");
  return (await fn({ uid })).data;
}

/** Nadaje PRO (zawsze comp): days null = bezterminowo, N = doliczane do końca obecnego dostępu. */
export async function adminGrantSubscription(uid: string, days: number | null) {
  if (isE2EMode) return { success: true };
  const fn = httpsCallable<{ uid: string; days: number | null }, { success: boolean }>(
    functions, "adminGrantSubscription");
  return (await fn({ uid, days })).data;
}

/** Odbiera ręczny grant PRO (tylko tier comp; subskrypcją ze sklepu rządzi Apple/Google). */
export async function adminRevokeSubscription(uid: string) {
  if (isE2EMode) return { success: true };
  const fn = httpsCallable<{ uid: string }, { success: boolean }>(
    functions, "adminRevokeSubscription");
  return (await fn({ uid })).data;
}

export async function deleteOwnAccount() {
  if (isE2EMode) return { success: true };
  const fn = httpsCallable<Record<string, never>, { success: boolean }>(functions, "deleteOwnAccount");
  return (await fn({})).data;
}
