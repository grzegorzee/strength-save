import { randomInt, randomUUID, createHash } from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import {
  type Lang,
  verificationSubject,
  welcomeSubject,
  accessChangedSubject,
  verificationEmailHtml,
  welcomeEmailHtml,
  inviteEmailHtml,
  accessChangedEmailHtml,
  adminMessageEmailHtml,
} from "./email-templates";
import {
  ADMIN_DELETE_BATCH_SIZE,
  type AuthProvider,
  GDPR_DIRECT_DOC_COLLECTIONS,
  GDPR_UID_FIELD_COLLECTIONS,
  GDPR_USER_ID_COLLECTIONS,
  providerFromSignInProvider,
  providerGetsImmediateAccess,
  readFeatureFlags,
  resendErrorMessage,
} from "./security";

const resendApiKey = defineSecret("RESEND_API_KEY");
const authPepper = defineSecret("API_KEY_PEPPER");

const USERS_COLLECTION = "users";
const INVITES_COLLECTION = "invites";
const WAITLIST_COLLECTION = "waitlist_entries";
const VERIFICATION_CODES_COLLECTION = "email_verification_codes";
const AUTH_AUDIT_COLLECTION = "auth_audit_logs";
const NOTIFICATION_LOGS_COLLECTION = "notification_logs";
const FCM_TOKEN_REGISTRATIONS_COLLECTION = "fcm_token_registrations";
const DELETION_OPERATIONS_COLLECTION = "deletion_operations";

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
  language?: Lang;
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
  sentAt?: string;
  expiresAt: string;
  // TTL Firestore (Timestamp) — osobne od expiresAt (string ISO, logika 10 min kodu).
  ttlExpiresAt?: Timestamp;
  attempts: number;
  status: "pending_send" | "pending" | "verified" | "expired";
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

// Język maili. Domyślnie PL; "en" tylko jeśli klient jawnie go przekazał/zapisał.
function normalizeLanguage(value: unknown): Lang {
  return value === "en" ? "en" : "pl";
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

async function assertAdmin(userId: string): Promise<void> {
  const snap = await getDb().collection(USERS_COLLECTION).doc(userId).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

// TTL Firestore (R2-12): kolekcje operacyjne nie rosną bez sufitu — polityki TTL
// (gcloud firestore fields ttls update) kasują dokumenty po expiresAt/ttlExpiresAt.
function ttlTimestamp(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

async function writeAuthAuditLog(payload: AuthAuditLogDoc): Promise<void> {
  await getDb().collection(AUTH_AUDIT_COLLECTION).doc(randomUUID()).set({ ...payload, expiresAt: ttlTimestamp(90) });
}

// R2-12: login_success 1x/dzień — syncUserProfile odpala się przy każdym otwarciu apki,
// a wpis o każdym otwarciu to czysty koszt bez wartości audytowej. Inne typy zdarzeń
// logowane bez zmian. Eksport dla testów.
const LOGIN_AUDIT_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

export function shouldLogLoginSuccess(lastLoginAt: string | undefined, now: Date): boolean {
  if (!lastLoginAt) return true;
  const parsed = Date.parse(lastLoginAt);
  if (!Number.isFinite(parsed)) return true;
  return now.getTime() - parsed >= LOGIN_AUDIT_MIN_INTERVAL_MS;
}

async function writeNotificationLog(payload: Record<string, unknown>): Promise<void> {
  await getDb().collection(NOTIFICATION_LOGS_COLLECTION).doc(randomUUID()).set({
    createdAt: nowIso(),
    expiresAt: ttlTimestamp(90),
    ...payload,
  });
}

function sanitizedIdentifierHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function deleteQueryInBatches(query: FirebaseFirestore.Query, batchSize = ADMIN_DELETE_BATCH_SIZE): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) return deleted;

    const batch = getDb().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;

    if (snap.size < batchSize) return deleted;
  }
}

async function deleteCollectionByField(collection: string, field: string, value: string): Promise<number> {
  return deleteQueryInBatches(getDb().collection(collection).where(field, "==", value));
}

async function deleteApiKeysAndReturnIds(uid: string): Promise<string[]> {
  const deletedKeyIds: string[] = [];
  while (true) {
    const snap = await getDb().collection("api_keys").where("userId", "==", uid).limit(ADMIN_DELETE_BATCH_SIZE).get();
    if (snap.empty) return deletedKeyIds;

    const batch = getDb().batch();
    snap.docs.forEach((doc) => {
      deletedKeyIds.push(doc.id);
      batch.delete(doc.ref);
    });
    await batch.commit();

    if (snap.size < ADMIN_DELETE_BATCH_SIZE) return deletedKeyIds;
  }
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
    from: "Strength Save <noreply@strengthsave.app>",
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

  const errorMessage = resendErrorMessage(response);
  if (errorMessage) {
    throw new HttpsError("unavailable", `Email provider rejected message: ${errorMessage}`);
  }
}

async function maybeSendWelcomeEmail(userRef: FirebaseFirestore.DocumentReference, data: UserProfileDoc): Promise<void> {
  if (data.notifications?.welcomeSentAt || !data.email) return;
  const lang = normalizeLanguage(data.language);
  await sendEmail({
    to: data.email,
    subject: welcomeSubject(lang),
    html: welcomeEmailHtml(data.displayName || data.email, lang),
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

/** Walidacja zaproszenia bez konsumpcji (rejestracja web). Te same warunki co redeemInvite. */
async function isInviteUsable(code: string, email: string): Promise<boolean> {
  const inviteSnap = await getDb().collection(INVITES_COLLECTION).where("code", "==", code.toUpperCase()).limit(1).get();
  if (inviteSnap.empty) return false;
  const invite = inviteSnap.docs[0].data() as InviteDoc;
  if (invite.status !== "active") return false;
  if (invite.email && invite.email !== email) return false;
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export const syncUserProfile = onCall({ secrets: [resendApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = request.auth.uid;
  const email = normalizeEmail(request.auth.token.email);
  const language = normalizeLanguage(request.data?.language);
  const provider = providerFromSignInProvider(request.auth.token.firebase?.sign_in_provider);
  const displayName = normalizeOptionalString(request.auth.token.name, 120) || email.split("@")[0];
  const photoURL = normalizeOptionalString(request.auth.token.picture, 500) || "";
  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const snap = await userRef.get();
  const current = snap.exists ? snap.data() as UserProfileDoc : null;
  const timestamp = nowIso();

  if (!current) {
    // Flaga admina registrationOpen=false zamyka tworzenie nowych kont
    // (kill switch m.in. na nadużycie budżetu AI przez masowe konta Google/Apple).
    const flags = await readFeatureFlags(getDb());
    if (flags.registrationOpen === false) {
      throw new HttpsError("permission-denied", "Registration is currently closed");
    }
    // Nie ufamy deklaracji platformy od klienta. Otwartą rejestrację mobilną
    // wolno włączyć dopiero po wdrożeniu wymuszanego App Check/attestation.
    const inviteCode = normalizeOptionalString(request.data?.inviteCode, 20);
    const inviteValid = inviteCode ? await isInviteUsable(inviteCode, email) : false;
    if (!inviteValid) {
      throw new HttpsError(
        "permission-denied",
        "Rejestracja wymaga ważnego zaproszenia."
      );
    }
    const immediateAccess = providerGetsImmediateAccess(provider);
    const nextProfile: UserProfileDoc = {
      uid,
      email,
      displayName,
      photoURL,
      role: "user",
      language,
      access: { enabled: immediateAccess },
      status: immediateAccess ? "active" : "pending_verification",
      authProviders: [provider],
      auth: { primaryProvider: provider },
      stravaConnected: false,
      onboardingCompleted: false,
      onboarding: { state: "not_started", version: 1 },
      verification: {
        emailVerifiedAt: immediateAccess ? timestamp : null,
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
      eventType: immediateAccess ? `register_${provider}` : "register_email_pending",
      uid,
      email,
      actorUid: uid,
      createdAt: timestamp,
      metadata: { provider },
    });
    if (immediateAccess) {
      await maybeSendWelcomeEmail(userRef, nextProfile);
    }
    return { profile: nextProfile };
  }

  const authProviders = Array.from(new Set([...(current.authProviders || []), provider]));
  const nextProfile: Partial<UserProfileDoc> = {
    email,
    displayName: current.displayName || displayName,
    photoURL: current.photoURL || photoURL,
    language,
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
  if (shouldLogLoginSuccess(current.lastLogin ?? current.registration?.lastLoginAt, new Date())) {
    await writeAuthAuditLog({
      eventType: "login_success",
      uid,
      email,
      actorUid: uid,
      createdAt: timestamp,
      metadata: { provider },
    });
  }

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
  const language = normalizeLanguage(request.data?.language ?? userData.language);
  if (userData.status === "active" && userData.verification?.emailVerifiedAt) {
    return { sent: true, alreadyVerified: true };
  }

  const codeRef = getDb().collection(VERIFICATION_CODES_COLLECTION).doc(codeDocId(email));
  const existingCodeSnap = await codeRef.get();
  const currentTime = new Date();
  if (existingCodeSnap.exists) {
    const existing = existingCodeSnap.data() as VerificationCodeDoc;
    const sentAt = existing.status === "pending" && existing.sentAt ? new Date(existing.sentAt) : null;
    if (sentAt && currentTime.getTime() - sentAt.getTime() < 60_000) {
      throw new HttpsError("resource-exhausted", "Odczekaj chwilę przed ponownym wysłaniem kodu.");
    }
  }

  const code = randomVerificationCode();
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  // pending_send nie uruchamia cooldownu. Gdy Resend odrzuci mail, dokument jest
  // usuwany, więc użytkownik może natychmiast ponowić próbę.
  await codeRef.set({
    email,
    uid,
    codeHash: hashCode(email, code, authPepper.value()),
    createdAt: timestamp,
    expiresAt,
    ttlExpiresAt: ttlTimestamp(1),
    attempts: 0,
    status: "pending_send",
  } satisfies VerificationCodeDoc);
  try {
    await sendEmail({
      to: email,
      subject: verificationSubject(code, language),
      html: verificationEmailHtml(code, email, language),
      type: "verification_code",
      userId: uid,
    });
  } catch (error) {
    await codeRef.delete().catch(() => undefined);
    throw error;
  }
  await codeRef.set({ status: "pending", sentAt: timestamp }, { merge: true });
  await userRef.set({
    status: "pending_verification",
    access: { enabled: false },
    language,
    verification: {
      ...(userData.verification || {}),
      lastCodeSentAt: timestamp,
    },
  }, { merge: true });

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

// Bez enforceAppCheck: klient NIE inicjalizuje App Check (zero initializeAppCheck w src/),
// więc każdy produkcyjny request był odrzucany — martwa waitlista (R2-05). Anti-abuse
// zapewnia transakcyjny rate limit (60 s per email) + walidacje + cooldown poniżej.
// Pełny App Check (reCAPTCHA v3 + App Attest) odłożony do publicznego launchu.
export const createWaitlistEntry = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email);
  const displayName = normalizeOptionalString(request.data?.displayName, 120);
  const note = normalizeOptionalString(request.data?.note, 500);
  const source = normalizeOptionalString(request.data?.source, 60) || "login";

  const db = getDb();
  const rateRef = db.collection("waitlist_rate_limits").doc(sanitizedIdentifierHash(email));
  const timestamp = nowIso();
  const result = await db.runTransaction(async (transaction) => {
    const rate = await transaction.get(rateRef);
    const lastRequestAt = typeof rate.data()?.lastRequestAt === "string" ? Date.parse(rate.data()!.lastRequestAt) : 0;
    if (Number.isFinite(lastRequestAt) && Date.now() - lastRequestAt < 60_000) {
      throw new HttpsError("resource-exhausted", "Odczekaj chwilę przed ponownym zgłoszeniem.");
    }
    transaction.set(rateRef, { lastRequestAt: timestamp, expiresAt: ttlTimestamp(7) }, { merge: true });
    const existing = await transaction.get(db.collection(WAITLIST_COLLECTION).where("email", "==", email).limit(1));
    if (!existing.empty) return { entryId: existing.docs[0].id, existing: true };

    const docRef = db.collection(WAITLIST_COLLECTION).doc();
    transaction.set(docRef, {
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
    return { entryId: docRef.id, existing: false };
  });

  await writeAuthAuditLog({
    eventType: "waitlist_entry_created",
    uid: null,
    email,
    actorUid: null,
    createdAt: timestamp,
    metadata: { source },
  });

  return result;
});

export const registerPushToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const token = normalizeOptionalString(request.data?.token, 4096);
  if (!token) throw new HttpsError("invalid-argument", "Push token is required");
  const deviceId = normalizeOptionalString(request.data?.deviceId, 120) || "unknown";
  await registerPushTokenForUser(request.auth.uid, token, deviceId);
  return { success: true };
});

export function fcmTokenRegistrationDocId(token: string): string {
  return sanitizedIdentifierHash(token);
}

export async function registerPushTokenForUser(uid: string, token: string, deviceId = "unknown"): Promise<void> {
  const db = getDb();
  const tokenRef = db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(fcmTokenRegistrationDocId(token));
  const timestamp = nowIso();
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(tokenRef);
    const previousOwner = existing.data()?.userId;
    if (typeof previousOwner === "string" && previousOwner !== uid) {
      // Wyczyść poprzedni format od razu przy reassign, aby stary owner nie dostał push.
      transaction.set(db.collection(USERS_COLLECTION).doc(previousOwner), {
        fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
      }, { merge: true });
    }
    transaction.set(tokenRef, {
      userId: uid,
      token,
      tokenHash: sanitizedIdentifierHash(token),
      deviceId,
      createdAt: existing.data()?.createdAt || timestamp,
      lastSeenAt: timestamp,
    });
  });
}

export const unregisterPushToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const token = normalizeOptionalString(request.data?.token, 4096);
  if (!token) throw new HttpsError("invalid-argument", "Push token is required");
  await unregisterPushTokenForUser(request.auth.uid, token);
  return { success: true };
});

export async function unregisterPushTokenForUser(uid: string, token: string): Promise<void> {
  const db = getDb();
  const tokenRef = db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(fcmTokenRegistrationDocId(token));
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(tokenRef);
    if (existing.data()?.userId === uid) transaction.delete(tokenRef);
    // Kompatybilność z klientem przed migracją; nie wpływa na registry jako source of truth.
    transaction.set(db.collection(USERS_COLLECTION).doc(uid), {
      fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
    }, { merge: true });
  });
}

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
  const sourcePrefix = userData.auth?.primaryProvider === "google"
    ? "invite-google"
    : userData.auth?.primaryProvider === "apple"
      ? "invite-apple"
      : "invite-email";
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
  const reason = normalizeOptionalString(request.data?.reason, 500);
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
      ...(suspended && reason ? { lastSuspendReason: reason } : {}),
    },
  }, { merge: true });

  if (userData.email) {
    const lang = normalizeLanguage(userData.language);
    await sendEmail({
      to: userData.email,
      subject: accessChangedSubject(lang),
      html: accessChangedEmailHtml(accessEnabled && !suspended, lang),
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
    metadata: { accessEnabled, suspended, ...(reason ? { reason } : {}) },
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

// ── Panel admina (Fazy 1-3 + push) ──────────────────────────────────────────

// Logi per-użytkownik: maile (notification_logs) + zdarzenia auth (auth_audit_logs).
// Bez orderBy w zapytaniu (uniknięcie composite indexu) — sortujemy w pamięci.
export const adminGetUserLogs = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const uid = normalizeOptionalString(request.data?.uid, 120);
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");

  const [notifSnap, authSnap] = await Promise.all([
    getDb().collection(NOTIFICATION_LOGS_COLLECTION).where("userId", "==", uid).limit(100).get(),
    getDb().collection(AUTH_AUDIT_COLLECTION).where("uid", "==", uid).limit(100).get(),
  ]);

  const createdAtOf = (x: Record<string, unknown>) => (typeof x.createdAt === "string" ? x.createdAt : "");
  const byCreatedDesc = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    createdAtOf(b).localeCompare(createdAtOf(a));

  const notifications = notifSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byCreatedDesc);
  const authLogs = authSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byCreatedDesc);
  return { notifications, authLogs };
});

// Wyślij własnego maila do użytkownika.
export const adminSendUserEmail = onCall({ secrets: [resendApiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const uid = normalizeOptionalString(request.data?.uid, 120);
  const subject = normalizeOptionalString(request.data?.subject, 200);
  const body = normalizeOptionalString(request.data?.body, 5000);
  if (!uid || !subject || !body) throw new HttpsError("invalid-argument", "uid, subject, body required");

  const userSnap = await getDb().collection(USERS_COLLECTION).doc(uid).get();
  if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
  const email = (userSnap.data() as UserProfileDoc).email;
  if (!email) throw new HttpsError("failed-precondition", "User has no email");

  await sendEmail({ to: email, subject, html: adminMessageEmailHtml(body), type: "admin_message", userId: uid });
  return { success: true };
});

// Ponowne wysłanie kodu weryfikacyjnego do wybranego użytkownika (admin).
export const adminResendVerification = onCall({ secrets: [resendApiKey, authPepper] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const uid = normalizeOptionalString(request.data?.uid, 120);
  if (!uid) throw new HttpsError("invalid-argument", "uid required");
  const userRef = getDb().collection(USERS_COLLECTION).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
  const userData = userSnap.data() as UserProfileDoc;
  const email = userData.email ? normalizeEmail(userData.email) : null;
  if (!email) throw new HttpsError("failed-precondition", "User has no email");
  const language = normalizeLanguage(userData.language);

  const code = randomVerificationCode();
  const timestamp = nowIso();
  await getDb().collection(VERIFICATION_CODES_COLLECTION).doc(codeDocId(email)).set({
    email, uid,
    codeHash: hashCode(email, code, authPepper.value()),
    createdAt: timestamp, sentAt: timestamp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    ttlExpiresAt: ttlTimestamp(1),
    attempts: 0, status: "pending",
  } satisfies VerificationCodeDoc);

  await sendEmail({ to: email, subject: verificationSubject(code, language), html: verificationEmailHtml(code, email, language), type: "verification_code", userId: uid });
  return { success: true };
});

// Broadcast mailowy do wszystkich lub do cohorty.
export const adminBroadcastEmail = onCall({ secrets: [resendApiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const target = normalizeOptionalString(request.data?.target, 60) || "all"; // 'all' | nazwa cohorty
  const subject = normalizeOptionalString(request.data?.subject, 200);
  const body = normalizeOptionalString(request.data?.body, 5000);
  if (!subject || !body) throw new HttpsError("invalid-argument", "subject, body required");

  let query: FirebaseFirestore.Query = getDb().collection(USERS_COLLECTION);
  if (target !== "all") query = query.where("cohorts", "array-contains", target);
  const snap = await query.get();
  const recipients = snap.docs
    .map((d) => (d.data() as UserProfileDoc).email)
    .filter((e): e is string => !!e);

  const html = adminMessageEmailHtml(body);
  let sent = 0;
  for (const email of recipients) {
    try {
      await sendEmail({ to: email, subject, html, type: "admin_broadcast", userId: null });
      sent += 1;
    } catch {
      // pojedynczy błąd nie przerywa broadcastu
    }
  }
  return { success: true, sent, total: recipients.length };
});

// Push (FCM) do wszystkich lub do cohorty. Registry tokenów jest jedynym source of truth.
export const adminSendPush = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const target = normalizeOptionalString(request.data?.target, 60) || "all";
  const title = normalizeOptionalString(request.data?.title, 120);
  const body = normalizeOptionalString(request.data?.body, 500);
  if (!title || !body) throw new HttpsError("invalid-argument", "title, body required");

  let query: FirebaseFirestore.Query = getDb().collection(USERS_COLLECTION);
  if (target !== "all") query = query.where("cohorts", "array-contains", target);
  const snap = await query.get();

  const eligibleUserIds = new Set(snap.docs.map((doc) => doc.id));
  const registrations = await getDb().collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).get();
  const tokenOwners = new Map<string, FirebaseFirestore.DocumentReference[]>();
  registrations.docs.forEach((doc) => {
    const registration = doc.data() as { userId?: unknown; token?: unknown };
    if (typeof registration.userId !== "string" || !eligibleUserIds.has(registration.userId)) return;
    if (typeof registration.token !== "string" || !registration.token) return;
    tokenOwners.set(registration.token, [doc.ref]);
  });
  const unique = Array.from(tokenOwners.keys());
  if (unique.length === 0) {
    await writeNotificationLog({
      type: "admin_push",
      actorUid: request.auth.uid,
      target,
      sent: 0,
      failed: 0,
      total: 0,
      invalidTokens: 0,
    });
    return { success: true, sent: 0, failed: 0, total: 0, invalidTokens: 0 };
  }

  // sendEachForMulticast obsługuje max 500 tokenów na wywołanie.
  let sent = 0;
  let failed = 0;
  const invalidTokens = new Set<string>();
  for (let i = 0; i < unique.length; i += 500) {
    const batch = unique.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
    });
    sent += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((response, idx) => {
      if (response.success) return;
      const code = response.error?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.add(batch[idx]);
      }
    });
  }

  const cleanupWrites: Promise<unknown>[] = [];
  invalidTokens.forEach((token) => {
    const owners = tokenOwners.get(token) || [];
    owners.forEach((ref) => {
      cleanupWrites.push(ref.delete());
    });
  });
  await Promise.allSettled(cleanupWrites);

  await writeNotificationLog({
    type: "admin_push",
    actorUid: request.auth.uid,
    target,
    sent,
    failed,
    total: unique.length,
    invalidTokens: invalidTokens.size,
    cleanedTokenRefs: cleanupWrites.length,
  });

  return { success: true, sent, failed, total: unique.length, invalidTokens: invalidTokens.size };
});

// Usuń użytkownika: konto Auth + dane Firestore (GDPR). Operacja nieodwracalna.
// Pełne usunięcie konta i danych użytkownika (Auth + wszystkie kolekcje + avatary Storage).
// Wspólne dla adminDeleteUser i deleteOwnAccount (wymóg Apple 5.1.1(v): self-service delete).
interface DeletionOperationDeps {
  deleteAvatarFiles?: (uid: string) => Promise<void>;
}

async function deleteAvatarFilesForUser(uid: string): Promise<void> {
  await admin.storage().bucket().deleteFiles({ prefix: `avatars/${uid}/` });
}

async function purgeUserData(uid: string, deps: DeletionOperationDeps = {}): Promise<Record<string, number>> {
  const db = getDb();

  const deletedCounts: Record<string, number> = {};
  for (const coll of GDPR_USER_ID_COLLECTIONS) {
    deletedCounts[coll] = await deleteCollectionByField(coll, "userId", uid);
  }

  for (const coll of GDPR_UID_FIELD_COLLECTIONS) {
    deletedCounts[coll] = await deleteCollectionByField(coll, "uid", uid);
  }
  deletedCounts.auth_audit_logs = await deleteCollectionByField("auth_audit_logs", "uid", uid);
  deletedCounts.auth_audit_logs += await deleteCollectionByField("auth_audit_logs", "actorUid", uid);

  const apiKeyIds = await deleteApiKeysAndReturnIds(uid);
  deletedCounts.api_keys = apiKeyIds.length;
  deletedCounts.api_rate_limits = 0;
  for (const keyId of apiKeyIds) {
    deletedCounts.api_rate_limits += await deleteCollectionByField("api_rate_limits", "keyId", keyId);
  }

  for (const coll of GDPR_DIRECT_DOC_COLLECTIONS) {
    if (coll === USERS_COLLECTION) continue;
    await db.collection(coll).doc(uid).delete();
  }

  deletedCounts.fcm_token_registrations = await deleteCollectionByField(FCM_TOKEN_REGISTRATIONS_COLLECTION, "userId", uid);

  // Avatary w Storage (avatars/{uid}/...) — bez tego pliki zostają po usunięciu konta.
  await (deps.deleteAvatarFiles || deleteAvatarFilesForUser)(uid);

  return deletedCounts;
}

export async function processDeletionOperation(uid: string, deps: DeletionOperationDeps = {}): Promise<Record<string, number>> {
  const db = getDb();
  const operationRef = db.collection(DELETION_OPERATIONS_COLLECTION).doc(uid);
  const startedAt = nowIso();
  await operationRef.set({ state: "running", startedAt, updatedAt: startedAt }, { merge: true });

  try {
    const deletedCounts = await purgeUserData(uid, deps);

    await admin.auth().deleteUser(uid);
    await db.collection(USERS_COLLECTION).doc(uid).delete();
    await operationRef.set({ state: "completed", completedAt: nowIso(), updatedAt: nowIso(), deletedCounts }, { merge: true });
    return deletedCounts;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    if (code === "auth/user-not-found") {
      await db.collection(USERS_COLLECTION).doc(uid).delete();
      await operationRef.set({ state: "completed", completedAt: nowIso(), updatedAt: nowIso() }, { merge: true });
      return {};
    }
    await operationRef.set({
      state: "failed",
      updatedAt: nowIso(),
      lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      attempts: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
    throw error;
  }
}

export async function requestDeletionOperation(uid: string, requestedBy: string, deps: DeletionOperationDeps = {}): Promise<Record<string, number>> {
  const timestamp = nowIso();
  await getDb().collection(DELETION_OPERATIONS_COLLECTION).doc(uid).set({
    uid,
    state: "pending",
    requestedAt: timestamp,
    requestedBy,
    updatedAt: timestamp,
    attempts: 0,
  }, { merge: true });
  await getDb().collection(USERS_COLLECTION).doc(uid).set({ deletionPending: { requestedAt: timestamp, requestedBy } }, { merge: true });
  return processDeletionOperation(uid, deps);
}

export const adminDeleteUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  await assertAdmin(request.auth.uid);
  const uid = normalizeOptionalString(request.data?.uid, 120);
  if (!uid) throw new HttpsError("invalid-argument", "uid required");
  if (uid === request.auth.uid) throw new HttpsError("failed-precondition", "Nie można usunąć własnego konta admina.");

  const deletedCounts = await requestDeletionOperation(uid, request.auth.uid);

  await writeAuthAuditLog({
    eventType: "admin_user_deleted",
    uid: null,
    email: null,
    actorUid: request.auth.uid,
    createdAt: nowIso(),
    metadata: {
      deletedUidHash: sanitizedIdentifierHash(uid),
      deletedCounts,
    },
  }).catch((error) => {
    console.error("Failed to write sanitized admin delete audit log", error);
  });
  return { success: true };
});

// Self-service usunięcie własnego konta (wymóg Apple 5.1.1(v)).
export const deleteOwnAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const uid = request.auth.uid;

  const profile = await getDb().collection(USERS_COLLECTION).doc(uid).get();
  if (profile.data()?.role === "admin") {
    throw new HttpsError("failed-precondition", "Konto admina nie może usunąć samo siebie.");
  }

  const deletedCounts = await requestDeletionOperation(uid, uid);

  await writeAuthAuditLog({
    eventType: "user_self_deleted",
    uid: null,
    email: null,
    actorUid: null,
    createdAt: nowIso(),
    metadata: {
      deletedUidHash: sanitizedIdentifierHash(uid),
      deletedCounts,
    },
  }).catch((error) => {
    console.error("Failed to write sanitized self delete audit log", error);
  });
  return { success: true };
});

// Worker uprzywilejowany: kończy operacje przerwane po częściowym purge lub po usunięciu Auth.
// Co 60 min (nie 5): usunięcia biegną synchronicznie w adminDeleteUser/deleteOwnAccount,
// cron to tylko naprawa po crashu — dokończenie do 1 h później jest OK (GDPR bez zmian),
// a 8640 inwokacji/mies. spada do ~720 (R2-09).
export const resumeDeletionOperations = onSchedule("every 60 minutes", async () => {
  const pending = await getDb().collection(DELETION_OPERATIONS_COLLECTION)
    .where("state", "in", ["pending", "failed"]).limit(25).get();
  for (const operation of pending.docs) {
    try {
      await processDeletionOperation(operation.id);
    } catch (error) {
      console.error("Deletion operation retry failed", { uidHash: sanitizedIdentifierHash(operation.id), error });
    }
  }
});
