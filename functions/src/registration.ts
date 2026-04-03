import { randomInt, randomUUID, createHash } from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";

const resendApiKey = defineSecret("RESEND_API_KEY");
const authPepper = defineSecret("API_KEY_PEPPER");

const USERS_COLLECTION = "users";
const INVITES_COLLECTION = "invites";
const WAITLIST_COLLECTION = "waitlist_entries";
const VERIFICATION_CODES_COLLECTION = "email_verification_codes";
const AUTH_AUDIT_COLLECTION = "auth_audit_logs";
const NOTIFICATION_LOGS_COLLECTION = "notification_logs";

type AuthProvider = "google" | "password";
type UserStatus = "pending_verification" | "active" | "suspended" | "deleted";
type InviteStatus = "active" | "redeemed" | "revoked" | "expired";
type WaitlistStatus = "waiting" | "invited" | "converted" | "archived";

interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: "admin" | "user";
  lastLogin?: string;
  access?: { enabled?: boolean };
  status?: UserStatus;
  auth?: {
    primaryProvider?: AuthProvider;
  };
  authProviders?: string[];
  stravaConnected?: boolean;
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
  notifications?: {
    welcomeSentAt?: string | null;
    inviteSentAt?: string | null;
    accessChangedSentAt?: string | null;
  };
  features?: Record<string, boolean>;
}

interface InviteDoc {
  code: string;
  email: string | null;
  status: InviteStatus;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedBy: string | null;
  note: string | null;
  cohorts: string[];
  featureFlags: Record<string, boolean>;
  waitlistEntryId: string | null;
  sentAt: string | null;
}

interface WaitlistEntryDoc {
  email: string;
  displayName: string | null;
  note: string | null;
  source: string;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
  convertedUserId: string | null;
  linkedInviteId: string | null;
}

interface VerificationCodeDoc {
  email: string;
  uid: string;
  codeHash: string;
  createdAt: string;
  sentAt: string;
  expiresAt: string;
  attempts: number;
  status: "pending" | "verified" | "expired";
}

interface AuthAuditLogDoc {
  eventType: string;
  uid: string | null;
  email: string | null;
  actorUid: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const getDb = () => admin.firestore();
const nowIso = () => new Date().toISOString();

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Email jest wymagany.");
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpsError("invalid-argument", "Nieprawidłowy adres email.");
  }
  return normalized;
}

function normalizeOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeStringArray(value: unknown, maxItems = 10, maxLength = 40): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

function codeDocId(email: string): string {
  return Buffer.from(email, "utf8").toString("base64url");
}

function hashCode(email: string, code: string, pepper: string): string {
  return createHash("sha256")
    .update(`${pepper}:${email}:${code}`)
    .digest("hex");
}

function randomVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

function randomInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}

function providerFromToken(provider: unknown): AuthProvider {
  if (provider === "google.com") return "google";
  return "password";
}

async function assertAdmin(userId: string): Promise<void> {
  const snap = await getDb().collection(USERS_COLLECTION).doc(userId).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

async function writeAuthAuditLog(payload: AuthAuditLogDoc): Promise<void> {
  await getDb().collection(AUTH_AUDIT_COLLECTION).doc(randomUUID()).set(payload);
}

async function writeNotificationLog(payload: Record<string, unknown>): Promise<void> {
  await getDb().collection(NOTIFICATION_LOGS_COLLECTION).doc(randomUUID()).set({
    createdAt: nowIso(),
    ...payload,
  });
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  type: string;
  userId?: string | null;
}): Promise<void> {
  const apiKey = resendApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Missing RESEND_API_KEY secret");
  }

  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from: "Strength Save <onboarding@resend.dev>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  await writeNotificationLog({
    type: params.type,
    userId: params.userId ?? null,
    email: params.to,
    responseId: response.data?.id ?? null,
    error: response.error?.message ?? null,
  });
}

function verificationEmailHtml(code: string, email: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">Potwierdź adres email</h1>
      <p style="margin:0 0 24px;color:#475569;">Użyj poniższego kodu, aby dokończyć rejestrację w Strength Save dla ${email}.</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:0.18em;text-align:center;padding:20px 0;border-radius:12px;background:#0f172a;color:#fff;">
        ${code}
      </div>
      <p style="margin:24px 0 0;color:#64748b;font-size:14px;">Kod wygasa po 10 minutach.</p>
    </div>
  </div>`;
}

function welcomeEmailHtml(displayName: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">Witamy w Strength Save</h1>
      <p style="margin:0 0 24px;color:#475569;">${displayName || "Cześć"} — konto jest gotowe. Możesz przejść do onboardingu i zacząć układać swój plan treningowy.</p>
      <a href="https://grzegorzee.github.io/strength-save/" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;">Otwórz aplikację</a>
    </div>
  </div>`;
}

function inviteEmailHtml(code: string, inviteUrl: string, note: string | null): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">Masz zaproszenie do Strength Save</h1>
      <p style="margin:0 0 16px;color:#475569;">Możesz wejść do aplikacji przez Google albo email + hasło. Jeśli aplikacja poprosi o kod zaproszenia, użyj:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:0.12em;text-align:center;padding:18px 0;border-radius:12px;background:#0f172a;color:#fff;">
        ${code}
      </div>
      ${note ? `<p style="margin:16px 0 0;color:#334155;">${note}</p>` : ""}
      <p style="margin:20px 0 12px;color:#64748b;">Bezpośredni link:</p>
      <a href="${inviteUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;">Otwórz aplikację</a>
    </div>
  </div>`;
}

function accessChangedEmailHtml(enabled: boolean): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">Zmiana dostępu do konta</h1>
      <p style="margin:0;color:#475569;">${enabled ? "Administrator ponownie włączył dostęp do aplikacji." : "Administrator wyłączył dostęp do aplikacji."}</p>
    </div>
  </div>`;
}

async function maybeSendWelcomeEmail(userRef: FirebaseFirestore.DocumentReference, data: UserProfileDoc): Promise<void> {
  if (data.notifications?.welcomeSentAt || !data.email) return;
  await sendEmail({
    to: data.email,
    subject: "Strength Save — konto gotowe",
    html: welcomeEmailHtml(data.displayName || data.email),
    type: "welcome_email",
    userId: data.uid,
  });
  await userRef.set({
    notifications: {
      ...(data.notifications || {}),
      welcomeSentAt: nowIso(),
    },
  }, { merge: true });
}

export const syncUserProfile = onCall({ secrets: [resendApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const provider = providerFromToken(request.auth.token.firebase?.sign_in_provider);
  const displayName = normalizeOptionalString(request.auth.token.name, 120) || email.split("@")[0];
  const photoURL = normalizeOptionalString(request.auth.token.picture, 500) || "";
  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const snap = await userRef.get();
  const current = snap.exists ? snap.data() as UserProfileDoc : null;
  const timestamp = nowIso();

  if (!current) {
    const nextProfile: UserProfileDoc = {
      uid,
      email,
      displayName,
      photoURL,
      role: "user",
      access: { enabled: provider === "google" },
      status: provider === "google" ? "active" : "pending_verification",
      authProviders: [provider],
      auth: { primaryProvider: provider },
      stravaConnected: false,
      onboardingCompleted: false,
      onboarding: { state: "not_started", version: 1 },
      verification: {
        emailVerifiedAt: provider === "google" ? timestamp : null,
        lastCodeSentAt: null,
      },
      registration: {
        source: provider,
        inviteId: null,
        waitlistId: null,
        createdAt: timestamp,
        lastLoginAt: timestamp,
      },
      lastLogin: timestamp,
      cohorts: [],
      notifications: {
        welcomeSentAt: null,
        inviteSentAt: null,
        accessChangedSentAt: null,
      },
      features: {},
    };
    await userRef.set(nextProfile, { merge: true });
    await writeAuthAuditLog({
      eventType: provider === "google" ? "register_google" : "register_email_pending",
      uid,
      email,
      actorUid: uid,
      createdAt: timestamp,
      metadata: { provider },
    });
    if (provider === "google") {
      await maybeSendWelcomeEmail(userRef, nextProfile);
    }
    return { profile: nextProfile };
  }

  const authProviders = Array.from(new Set([...(current.authProviders || []), provider]));
  const nextProfile: Partial<UserProfileDoc> = {
    email,
    displayName: current.displayName || displayName,
    photoURL: current.photoURL || photoURL,
    authProviders,
    auth: {
      ...(current.auth || {}),
      primaryProvider: current.auth?.primaryProvider || provider,
    },
    registration: {
      ...(current.registration || {}),
      source: current.registration?.source || provider,
      lastLoginAt: timestamp,
    },
    lastLogin: timestamp,
  };

  await userRef.set(nextProfile, { merge: true });
  await writeAuthAuditLog({
    eventType: "login_success",
    uid,
    email,
    actorUid: uid,
    createdAt: timestamp,
    metadata: { provider },
  });

  if ((current.status || "active") === "active") {
    await maybeSendWelcomeEmail(userRef, { ...current, ...nextProfile } as UserProfileDoc);
  }

  const refreshed = await userRef.get();
  return { profile: refreshed.data() };
});

export const requestEmailVerificationCode = onCall({ secrets: [resendApiKey, authPepper] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "User profile missing");
  }

  const userData = userSnap.data() as UserProfileDoc;
  if (userData.status === "active" && userData.verification?.emailVerifiedAt) {
    return { sent: true, alreadyVerified: true };
  }

  const codeRef = getDb().collection(VERIFICATION_CODES_COLLECTION).doc(codeDocId(email));
  const existingCodeSnap = await codeRef.get();
  const currentTime = new Date();
  if (existingCodeSnap.exists) {
    const existing = existingCodeSnap.data() as VerificationCodeDoc;
    const sentAt = new Date(existing.sentAt);
    if (currentTime.getTime() - sentAt.getTime() < 60_000) {
      throw new HttpsError("resource-exhausted", "Odczekaj chwilę przed ponownym wysłaniem kodu.");
    }
  }

  const code = randomVerificationCode();
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await codeRef.set({
    email,
    uid,
    codeHash: hashCode(email, code, authPepper.value()),
    createdAt: timestamp,
    sentAt: timestamp,
    expiresAt,
    attempts: 0,
    status: "pending",
  } satisfies VerificationCodeDoc);

  await userRef.set({
    status: "pending_verification",
    access: { enabled: false },
    verification: {
      ...(userData.verification || {}),
      lastCodeSentAt: timestamp,
    },
  }, { merge: true });

  await sendEmail({
    to: email,
    subject: "Strength Save — kod weryfikacyjny",
    html: verificationEmailHtml(code, email),
    type: "verification_code",
    userId: uid,
  });

  await writeAuthAuditLog({
    eventType: "verification_code_sent",
    uid,
    email,
    actorUid: uid,
    createdAt: timestamp,
  });

  return { sent: true };
});

export const verifyEmailCode = onCall({ secrets: [resendApiKey, authPepper] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const code = normalizeOptionalString(request.data?.code, 12);
  if (!code) {
    throw new HttpsError("invalid-argument", "Kod jest wymagany.");
  }

  const codeRef = getDb().collection(VERIFICATION_CODES_COLLECTION).doc(codeDocId(email));
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) {
    throw new HttpsError("not-found", "Brak aktywnego kodu weryfikacyjnego.");
  }

  const codeDoc = codeSnap.data() as VerificationCodeDoc;
  if (codeDoc.uid !== uid) {
    throw new HttpsError("permission-denied", "Kod nie należy do tego użytkownika.");
  }
  if (codeDoc.status !== "pending") {
    throw new HttpsError("failed-precondition", "Kod nie jest już aktywny.");
  }
  if (new Date(codeDoc.expiresAt).getTime() < Date.now()) {
    await codeRef.set({ status: "expired" }, { merge: true });
    throw new HttpsError("deadline-exceeded", "Kod wygasł.");
  }
  if (codeDoc.attempts >= 5) {
    throw new HttpsError("resource-exhausted", "Przekroczono liczbę prób. Wyślij nowy kod.");
  }

  const providedHash = hashCode(email, code, authPepper.value());
  if (providedHash !== codeDoc.codeHash) {
    await codeRef.set({ attempts: codeDoc.attempts + 1 }, { merge: true });
    await writeAuthAuditLog({
      eventType: "verification_code_failed",
      uid,
      email,
      actorUid: uid,
      createdAt: nowIso(),
      metadata: { attempts: codeDoc.attempts + 1 },
    });
    throw new HttpsError("invalid-argument", "Nieprawidłowy kod.");
  }

  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "User profile missing");
  }

  const current = userSnap.data() as UserProfileDoc;
  const timestamp = nowIso();
  await codeRef.set({ status: "verified", attempts: codeDoc.attempts + 1 }, { merge: true });
  await userRef.set({
    access: { enabled: true },
    status: "active",
    verification: {
      ...(current.verification || {}),
      emailVerifiedAt: timestamp,
    },
    onboarding: {
      ...(current.onboarding || {}),
      state: current.onboardingCompleted ? "completed" : "in_progress",
      version: current.onboarding?.version || 1,
    },
  }, { merge: true });

  await writeAuthAuditLog({
    eventType: "verification_code_verified",
    uid,
    email,
    actorUid: uid,
    createdAt: timestamp,
  });

  await maybeSendWelcomeEmail(userRef, { ...current, access: { enabled: true }, status: "active" } as UserProfileDoc);

  return { verified: true };
});

export const createWaitlistEntry = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email);
  const displayName = normalizeOptionalString(request.data?.displayName, 120);
  const note = normalizeOptionalString(request.data?.note, 500);
  const source = normalizeOptionalString(request.data?.source, 60) || "login";

  const existingSnap = await getDb().collection(WAITLIST_COLLECTION).where("email", "==", email).limit(1).get();
  const timestamp = nowIso();
  if (!existingSnap.empty) {
    const docRef = existingSnap.docs[0].ref;
    await docRef.set({
      displayName,
      note,
      source,
      updatedAt: timestamp,
    }, { merge: true });
    return { entryId: docRef.id, existing: true };
  }

  const docRef = getDb().collection(WAITLIST_COLLECTION).doc();
  await docRef.set({
    email,
    displayName,
    note,
    source,
    status: "waiting",
    createdAt: timestamp,
    updatedAt: timestamp,
    convertedUserId: null,
    linkedInviteId: null,
  } satisfies WaitlistEntryDoc);

  await writeAuthAuditLog({
    eventType: "waitlist_entry_created",
    uid: null,
    email,
    actorUid: null,
    createdAt: timestamp,
    metadata: { source },
  });

  return { entryId: docRef.id, existing: false };
});

export const createInvite = onCall({ secrets: [resendApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }
  await assertAdmin(request.auth.uid);

  const email = request.data?.email ? normalizeEmail(request.data.email) : null;
  const note = normalizeOptionalString(request.data?.note, 500);
  const cohorts = normalizeStringArray(request.data?.cohorts, 10, 40);
  const waitlistEntryId = normalizeOptionalString(request.data?.waitlistEntryId, 120);
  const expiresInDays = Math.max(1, Math.min(90, Number(request.data?.expiresInDays) || 30));
  const timestamp = nowIso();
  const code = randomInviteCode();
  const inviteRef = getDb().collection(INVITES_COLLECTION).doc();
  const inviteUrl = `https://grzegorzee.github.io/strength-save/?invite=${encodeURIComponent(code)}`;

  await inviteRef.set({
    code,
    email,
    status: "active",
    createdAt: timestamp,
    createdBy: request.auth.uid,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    redeemedAt: null,
    redeemedBy: null,
    note,
    cohorts,
    featureFlags: {},
    waitlistEntryId,
    sentAt: null,
  } satisfies InviteDoc);

  if (waitlistEntryId) {
    await getDb().collection(WAITLIST_COLLECTION).doc(waitlistEntryId).set({
      status: "invited",
      linkedInviteId: inviteRef.id,
      updatedAt: timestamp,
    }, { merge: true });
  }

  if (email) {
    await sendEmail({
      to: email,
      subject: "Zaproszenie do Strength Save",
      html: inviteEmailHtml(code, inviteUrl, note),
      type: "invite_email",
      userId: null,
    });
    await inviteRef.set({ sentAt: timestamp }, { merge: true });
  }

  await writeAuthAuditLog({
    eventType: "invite_created",
    uid: null,
    email,
    actorUid: request.auth.uid,
    createdAt: timestamp,
    metadata: { inviteId: inviteRef.id, waitlistEntryId, cohorts },
  });

  return {
    invite: {
      id: inviteRef.id,
      code,
      email,
      status: "active",
      createdAt: timestamp,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      redeemedAt: null,
      redeemedBy: null,
      note,
      cohorts,
      waitlistEntryId,
      sentAt: email ? timestamp : null,
    },
    inviteUrl,
  };
});

export const listInvites = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const snap = await getDb().collection(INVITES_COLLECTION).orderBy("createdAt", "desc").limit(100).get();
  return {
    invites: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

export const revokeInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const inviteId = normalizeOptionalString(request.data?.inviteId, 120);
  if (!inviteId) throw new HttpsError("invalid-argument", "inviteId is required");

  await getDb().collection(INVITES_COLLECTION).doc(inviteId).set({
    status: "revoked",
  }, { merge: true });
  await writeAuthAuditLog({
    eventType: "invite_revoked",
    uid: null,
    email: null,
    actorUid: request.auth.uid,
    createdAt: nowIso(),
    metadata: { inviteId },
  });
  return { success: true };
});

export const redeemInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }
  const code = normalizeOptionalString(request.data?.code, 20);
  if (!code) throw new HttpsError("invalid-argument", "Kod zaproszenia jest wymagany.");

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const inviteSnap = await getDb().collection(INVITES_COLLECTION).where("code", "==", code.toUpperCase()).limit(1).get();
  if (inviteSnap.empty) throw new HttpsError("not-found", "Nie znaleziono zaproszenia.");

  const inviteDocRef = inviteSnap.docs[0].ref;
  const invite = inviteSnap.docs[0].data() as InviteDoc;
  if (invite.status !== "active") throw new HttpsError("failed-precondition", "Zaproszenie nie jest aktywne.");
  if (invite.email && invite.email !== email) {
    throw new HttpsError("permission-denied", "To zaproszenie jest przypisane do innego adresu email.");
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    await inviteDocRef.set({ status: "expired" }, { merge: true });
    throw new HttpsError("deadline-exceeded", "Zaproszenie wygasło.");
  }

  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("failed-precondition", "User profile missing");

  const userData = userSnap.data() as UserProfileDoc;
  const sourcePrefix = userData.auth?.primaryProvider === "google" ? "invite-google" : "invite-email";
  await userRef.set({
    cohorts: Array.from(new Set([...(userData.cohorts || []), ...(invite.cohorts || [])])),
    features: {
      ...(userData.features || {}),
      ...(invite.featureFlags || {}),
    },
    registration: {
      ...(userData.registration || {}),
      source: sourcePrefix,
      inviteId: inviteDocRef.id,
    },
  }, { merge: true });

  await inviteDocRef.set({
    status: "redeemed",
    redeemedAt: nowIso(),
    redeemedBy: uid,
  }, { merge: true });

  if (invite.waitlistEntryId) {
    await getDb().collection(WAITLIST_COLLECTION).doc(invite.waitlistEntryId).set({
      status: "converted",
      convertedUserId: uid,
      updatedAt: nowIso(),
    }, { merge: true });
  }

  await writeAuthAuditLog({
    eventType: "invite_redeemed",
    uid,
    email,
    actorUid: uid,
    createdAt: nowIso(),
    metadata: { inviteId: inviteDocRef.id },
  });

  return { success: true, inviteId: inviteDocRef.id };
});

export const listWaitlistEntries = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const snap = await getDb().collection(WAITLIST_COLLECTION).orderBy("createdAt", "desc").limit(100).get();
  return {
    entries: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

export const updateUserAccess = onCall({ secrets: [resendApiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);

  const uid = normalizeOptionalString(request.data?.uid, 120);
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  const accessEnabled = Boolean(request.data?.accessEnabled);
  const suspended = Boolean(request.data?.suspended);
  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
  const userData = userSnap.data() as UserProfileDoc;

  const nextStatus: UserStatus = suspended ? "suspended" : (userData.verification?.emailVerifiedAt ? "active" : "pending_verification");
  const timestamp = nowIso();
  await userRef.set({
    access: { enabled: accessEnabled && !suspended },
    status: nextStatus,
    audit: {
      lastAccessChangeAt: timestamp,
    },
  }, { merge: true });

  if (userData.email) {
    await sendEmail({
      to: userData.email,
      subject: "Strength Save — zmiana dostępu do konta",
      html: accessChangedEmailHtml(accessEnabled && !suspended),
      type: "access_changed",
      userId: uid,
    });
  }

  await writeAuthAuditLog({
    eventType: "admin_user_access_updated",
    uid,
    email: userData.email || null,
    actorUid: request.auth.uid,
    createdAt: timestamp,
    metadata: { accessEnabled, suspended },
  });

  return { success: true };
});

export const listAuthAuditLogs = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const snap = await getDb().collection(AUTH_AUDIT_COLLECTION).orderBy("createdAt", "desc").limit(150).get();
  return {
    logs: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});
