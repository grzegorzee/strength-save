import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const isE2EMode = import.meta.env.VITE_E2E_MODE === 'true';

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
    primaryProvider?: "google" | "password";
  };
  authProviders?: string[];
  onboardingCompleted?: boolean;
  onboarding?: {
    state?: "not_started" | "in_progress" | "completed";
    version?: number;
  };
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
  stravaConnected?: boolean;
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
  const fn = httpsCallable<Record<string, never>, { profile: AppUserProfile }>(functions, "syncUserProfile");
  const result = await fn({});
  return result.data.profile;
}

export async function requestEmailVerificationCode() {
  if (isE2EMode) {
    return { sent: true, alreadyVerified: false };
  }
  const fn = httpsCallable<Record<string, never>, { sent: boolean; alreadyVerified?: boolean }>(functions, "requestEmailVerificationCode");
  const result = await fn({});
  return result.data;
}

export async function verifyEmailCode(code: string) {
  if (isE2EMode) {
    if (code !== '123456') {
      throw new Error('Nieprawidłowy kod.');
    }
    return { verified: true };
  }
  const fn = httpsCallable<{ code: string }, { verified: boolean }>(functions, "verifyEmailCode");
  const result = await fn({ code });
  return result.data;
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

export async function updateUserAccess(input: { uid: string; accessEnabled: boolean; suspended: boolean }) {
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
