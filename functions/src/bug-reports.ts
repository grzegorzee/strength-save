import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { hasCallableAppAccess } from "./security";
import { SES_EMAIL_SECRETS, safeSesErrorCode, sendSesEmail, type SesEmailResult } from "./ses-email";
import { writeEmailLog } from "./email-log";

const BUG_REPORTS_COLLECTION = "bug_reports";
const BUG_REPORT_RATE_LIMITS_COLLECTION = "bug_report_rate_limits";
const BUG_REPORT_EMAIL_TO = "contact@strengthsave.app";

export const BUG_REPORT_MAX_SCREENSHOT_BYTES = 1_572_864;
export const BUG_REPORT_CATEGORIES = [
  "crash",
  "sync",
  "workout",
  "ui",
  "account",
  "other",
] as const;

type BugReportCategory = typeof BUG_REPORT_CATEGORIES[number];

export const BUG_REPORT_ADMIN_STATUSES = [
  "new",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
  "duplicate",
] as const;
export const BUG_REPORT_PRIORITIES = ["low", "normal", "high", "critical"] as const;

type BugReportAdminStatus = typeof BUG_REPORT_ADMIN_STATUSES[number];
type BugReportPriority = typeof BUG_REPORT_PRIORITIES[number];

const BUG_REPORT_STATUS_TRANSITIONS: Record<BugReportAdminStatus, readonly BugReportAdminStatus[]> = {
  new: ["triaged", "in_progress", "resolved", "closed", "duplicate"],
  triaged: ["in_progress", "resolved", "closed", "duplicate"],
  in_progress: ["triaged", "resolved", "closed", "duplicate"],
  resolved: ["in_progress", "closed"],
  closed: ["in_progress"],
  duplicate: ["triaged", "closed"],
};

const BUG_REPORT_RETENTION_MS = 180 * 24 * 60 * 60 * 1_000;
const BUG_REPORT_AWAITING_UPLOAD_TTL_MS = 15 * 60 * 1_000;
const BUG_REPORT_EMAIL_RETRY_MS = 10 * 60 * 1_000;
const BUG_REPORT_SCREENSHOT_URL_TTL_MS = 5 * 60 * 1_000;

interface BugReportContext {
  platform?: string;
  appVersion?: string;
  route?: string;
  viewport?: string;
  locale?: string;
}

export interface NormalizedCreateBugReportData {
  clientRequestId: string;
  reportId: string;
  uploadPath: string;
  category: BugReportCategory;
  message: string;
  context: BugReportContext;
}

export interface BugReportRateLimit {
  hourKey: string;
  hourCount: number;
  dayKey: string;
  dayCount: number;
}

export interface NormalizedAdminBugReportUpdate {
  reportId: string;
  status: BugReportAdminStatus;
  priority?: BugReportPriority | null;
  note?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asRecord = (value: unknown): Record<string, unknown> => (
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const optionalString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
};

export const normalizeBugReporterEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const normalizeContext = (value: unknown): BugReportContext => {
  const input = asRecord(value);
  const context: BugReportContext = {};
  const fields: Array<[keyof BugReportContext, unknown, number]> = [
    ["platform", input.platform, 20],
    ["appVersion", input.appVersion, 32],
    ["route", input.route, 200],
    ["viewport", input.viewport, 32],
    ["locale", input.locale, 16],
  ];
  for (const [key, fieldValue, maxLength] of fields) {
    const normalized = optionalString(fieldValue, maxLength);
    if (normalized !== undefined) context[key] = normalized;
  }
  return context;
};

export const bugReportDocId = (uid: string, clientRequestId: string): string => (
  `${uid}_${clientRequestId}`
);

export const bugReportExpiresAt = (nowMs: number): number => nowMs + BUG_REPORT_RETENTION_MS;

export const bugReportScreenshotUrlExpiry = (nowMs: number): number => (
  nowMs + BUG_REPORT_SCREENSHOT_URL_TTL_MS
);

export const shouldRecoverStaleBugReport = (
  status: unknown,
  updatedAtMs: number,
  nowMs: number,
): boolean => status === "awaiting_upload"
  && Number.isFinite(updatedAtMs)
  && updatedAtMs <= nowMs - BUG_REPORT_AWAITING_UPLOAD_TTL_MS;

const timestampMillis = (value: unknown): number => value instanceof Timestamp ? value.toMillis() : NaN;
const isFinalized = (report: Record<string, unknown>): boolean =>
  BUG_REPORT_ADMIN_STATUSES.includes(report.status as BugReportAdminStatus);

export const canTransitionBugReportStatus = (current: unknown, next: unknown): boolean => {
  if (!BUG_REPORT_ADMIN_STATUSES.includes(current as BugReportAdminStatus)) return false;
  if (!BUG_REPORT_ADMIN_STATUSES.includes(next as BugReportAdminStatus)) return false;
  if (current === next) return true;
  return BUG_REPORT_STATUS_TRANSITIONS[current as BugReportAdminStatus]
    .includes(next as BugReportAdminStatus);
};

export function normalizeAdminBugReportId(value: unknown): string | null {
  const reportId = optionalString(asRecord(value).reportId, 165);
  if (!reportId || reportId.includes("/")) return null;
  const separatorIndex = reportId.length - 37;
  if (separatorIndex < 1 || reportId[separatorIndex] !== "_") return null;
  return UUID_RE.test(reportId.slice(separatorIndex + 1)) ? reportId : null;
}

export function normalizeAdminUpdateBugReportData(value: unknown): NormalizedAdminBugReportUpdate | null {
  const input = asRecord(value);
  const reportId = normalizeAdminBugReportId(input);
  if (!reportId || !BUG_REPORT_ADMIN_STATUSES.includes(input.status as BugReportAdminStatus)) return null;
  const normalized: NormalizedAdminBugReportUpdate = {
    reportId,
    status: input.status as BugReportAdminStatus,
  };
  if (Object.prototype.hasOwnProperty.call(input, "priority")) {
    if (input.priority === null) normalized.priority = null;
    else if (BUG_REPORT_PRIORITIES.includes(input.priority as BugReportPriority)) {
      normalized.priority = input.priority as BugReportPriority;
    } else return null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "note")) {
    if (input.note === null) normalized.note = null;
    else if (typeof input.note === "string") {
      const note = input.note.trim();
      if (note.length > 2_000) return null;
      normalized.note = note || null;
    } else return null;
  }
  return normalized;
}

export function resolveBugReportScreenshotPath(
  reportId: string,
  value: unknown,
): string | null {
  const report = asRecord(value);
  const screenshot = asRecord(report.screenshot);
  const path = typeof screenshot.path === "string" ? screenshot.path : "";
  const userId = typeof report.userId === "string" ? report.userId : "";
  const expectedPath = `bug-reports/${userId}/${reportId}/screenshot.jpg`;
  return userId && path === expectedPath ? path : null;
}

export function normalizeCreateBugReportData(
  value: unknown,
  uid: string,
): NormalizedCreateBugReportData {
  const input = asRecord(value);
  const clientRequestId = typeof input.clientRequestId === "string"
    ? input.clientRequestId.trim().toLowerCase()
    : "";
  if (!UUID_RE.test(clientRequestId)) throw new Error("INVALID_CLIENT_REQUEST_ID");

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (message.length < 20 || message.length > 4_000) throw new Error("INVALID_MESSAGE");

  if (!BUG_REPORT_CATEGORIES.includes(input.category as BugReportCategory)) {
    throw new Error("INVALID_CATEGORY");
  }

  const reportId = bugReportDocId(uid, clientRequestId);
  return {
    clientRequestId,
    reportId,
    uploadPath: `bug-reports/${uid}/${reportId}/screenshot.jpg`,
    category: input.category as BugReportCategory,
    message,
    context: normalizeContext(input.context),
  };
}

export function normalizeFinalizeBugReportData(
  value: unknown,
  uid: string,
): { reportId: string; useScreenshot: boolean } | null {
  const input = asRecord(value);
  const clientRequestId = typeof input.clientRequestId === "string"
    ? input.clientRequestId.trim().toLowerCase()
    : "";
  if (!UUID_RE.test(clientRequestId) || typeof input.useScreenshot !== "boolean") return null;
  return { reportId: bugReportDocId(uid, clientRequestId), useScreenshot: input.useScreenshot };
}

export function buildNextRateLimit(
  current: BugReportRateLimit | null,
  nowMs: number,
): BugReportRateLimit {
  const now = new Date(nowMs);
  const hourKey = now.toISOString().slice(0, 13);
  const dayKey = now.toISOString().slice(0, 10);
  const hourCount = current?.hourKey === hourKey ? current.hourCount : 0;
  const dayCount = current?.dayKey === dayKey ? current.dayCount : 0;
  if (hourCount >= 3) throw new Error("BUG_REPORT_HOURLY_LIMIT");
  if (dayCount >= 10) throw new Error("BUG_REPORT_DAILY_LIMIT");
  return { hourKey, hourCount: hourCount + 1, dayKey, dayCount: dayCount + 1 };
}

export const isJpegMagicBytes = (bytes: Uint8Array): boolean => (
  bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
);

const requireUserAccess = async (uid: string): Promise<void> => {
  const user = await admin.firestore().collection("users").doc(uid).get();
  if (!hasCallableAppAccess(user.exists ? user.data() : undefined)) {
    throw new HttpsError("permission-denied", "Active app access is required.");
  }
};

const requireAdmin = async (uid: string): Promise<void> => {
  const user = await admin.firestore().collection("users").doc(uid).get();
  if (!user.exists || user.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
};

const requireAuthUid = (uid: string | undefined): string => {
  if (!uid) throw new HttpsError("unauthenticated", "Authentication is required.");
  return uid;
};

const inputError = (error: unknown): HttpsError => {
  if (error instanceof HttpsError) return error;
  return new HttpsError("invalid-argument", "Invalid bug report payload.");
};

export const createBugReport = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const uid = requireAuthUid(request.auth?.uid);
    await requireUserAccess(uid);
    const reporterEmail = normalizeBugReporterEmail(request.auth?.token.email);

    let input: NormalizedCreateBugReportData;
    try {
      input = normalizeCreateBugReportData(request.data, uid);
    } catch (error) {
      throw inputError(error);
    }

    const db = admin.firestore();
    const reportRef = db.collection(BUG_REPORTS_COLLECTION).doc(input.reportId);
    const rateRef = db.collection(BUG_REPORT_RATE_LIMITS_COLLECTION).doc(uid);

    const existingResult = await db.runTransaction(async (transaction) => {
      const [reportSnapshot, rateSnapshot] = await Promise.all([
        transaction.get(reportRef),
        transaction.get(rateRef),
      ]);

      // Retry tego samego clientRequestId jest idempotentny i nie zużywa limitu.
      if (reportSnapshot.exists) {
        const existing = reportSnapshot.data();
        if (existing?.userId !== uid || existing?.clientRequestId !== input.clientRequestId) {
          throw new HttpsError("already-exists", "Bug report identifier is already in use.");
        }
        // Timeout/offline retry przed finalize może zawierać poprawiony opis.
        // Odświeżamy wyłącznie stan oczekujący; raport obsłużony pozostaje immutable.
        if (existing.status === "awaiting_upload") {
          transaction.update(reportRef, {
            category: input.category,
            message: input.message,
            context: input.context,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { finalized: isFinalized(existing), screenshotAttached: !!resolveBugReportScreenshotPath(input.reportId, existing) };
      }

      let nextRate: BugReportRateLimit;
      try {
        nextRate = buildNextRateLimit(
          rateSnapshot.exists ? rateSnapshot.data() as BugReportRateLimit : null,
          Date.now(),
        );
      } catch (error) {
        const retryAfter = error instanceof Error && error.message === "BUG_REPORT_HOURLY_LIMIT"
          ? "Spróbuj ponownie za godzinę."
          : "Spróbuj ponownie jutro.";
        throw new HttpsError("resource-exhausted", retryAfter);
      }

      transaction.set(rateRef, { ...nextRate, userId: uid, updatedAt: FieldValue.serverTimestamp() });
      transaction.create(reportRef, {
        userId: uid,
        reporterEmail,
        clientRequestId: input.clientRequestId,
        category: input.category,
        message: input.message,
        context: input.context,
        status: "awaiting_upload",
        uploadPath: input.uploadPath,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(bugReportExpiresAt(Date.now())),
      });
      return { finalized: false, screenshotAttached: false };
    });

    return { ok: true, reportId: input.reportId, uploadPath: input.uploadPath, ...existingResult };
  },
);

const deleteOrphanScreenshot = async (path: string): Promise<void> => {
  try {
    await admin.storage().bucket().file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    logger.warn("bug_report_orphan_cleanup_failed", { path, error });
  }
};

const deleteScreenshotForRetention = async (path: string): Promise<boolean> => {
  try {
    await admin.storage().bucket().file(path).delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    // Zachowaj dokument jako retry marker; usunięcie go tutaj osierociłoby plik.
    logger.error("bug_report_retention_storage_delete_failed", { path, error });
    return false;
  }
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

export const buildBugReportEmail = (reportId: string, report: Record<string, unknown>) => {
  const message = typeof report.message === "string" ? report.message : "";
  const category = typeof report.category === "string" ? report.category : "other";
  const context = asRecord(report.context);
  const hasScreenshot = asRecord(report.screenshot).path !== undefined;
  const screenshotLabel = hasScreenshot
    ? "dostępny bezpiecznie w panelu admina"
    : "brak";
  return {
    to: BUG_REPORT_EMAIL_TO,
    subject: `[Strength Save] Nowe zgłoszenie błędu: ${category}`,
    html: `<h2>Nowe zgłoszenie błędu</h2><p><strong>ID:</strong> ${escapeHtml(reportId)}</p><p><strong>Kategoria:</strong> ${escapeHtml(category)}</p><p><strong>Screenshot:</strong> ${screenshotLabel}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><pre>${escapeHtml(JSON.stringify(context, null, 2))}</pre>`,
    text: `Nowe zgłoszenie błędu\n\nID: ${reportId}\nKategoria: ${category}\nScreenshot: ${screenshotLabel}\n\n${message}\n\n${JSON.stringify(context, null, 2)}`,
  };
};

const sendBugReportEmail = async (reportId: string, report: Record<string, unknown>): Promise<SesEmailResult> => {
  const email = buildBugReportEmail(reportId, report);
  const result = await sendSesEmail(email);
  try {
    await writeEmailLog(admin.firestore(), {
      uid: typeof report.userId === "string" ? report.userId : "system",
      to: email.to,
      type: "bug_report",
      subject: email.subject,
      transport: result.transport,
      ...(result.sesMessageId ? { sesMessageId: result.sesMessageId } : {}),
      status: "sent",
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("bug_report_email_log_failed", { reportId, error });
  }
  return result;
};

/** A durable retry marker also covers a process dying between commit and SES. */
const deliverBugReportEmail = async (reportRef: FirebaseFirestore.DocumentReference): Promise<void> => {
  const now = Date.now();
  const report = await admin.firestore().runTransaction(async transaction => {
    const snapshot = await transaction.get(reportRef);
    const data = snapshot.data();
    if (!data || !isFinalized(data) || asRecord(data.emailDelivery).status === "accepted") return null;
    const retryAt = timestampMillis(data.emailRetryAt);
    if (Number.isFinite(retryAt) && retryAt > now) return null;
    transaction.update(reportRef, {
      emailRetryAt: Timestamp.fromMillis(now + BUG_REPORT_EMAIL_RETRY_MS),
      emailDelivery: { status: "pending", updatedAt: FieldValue.serverTimestamp() },
    });
    return data;
  });
  if (!report) return;
  try {
    const result = await sendBugReportEmail(reportRef.id, report);
    await reportRef.update({
      emailRetryAt: FieldValue.delete(),
      emailDelivery: {
        status: "accepted", transport: result.transport,
        ...(result.sesMessageId ? { sesMessageId: result.sesMessageId } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
    });
  } catch (error) {
    logger.error("bug_report_email_failed", { reportId: reportRef.id, errorCode: safeSesErrorCode(error) });
    await reportRef.update({
      emailDelivery: { status: "failed", updatedAt: FieldValue.serverTimestamp(), error: "delivery_failed" },
    });
  }
};

const finalizeStoredBugReport = async (
  reportRef: FirebaseFirestore.DocumentReference,
  uid: string,
  useScreenshot: boolean,
  recoveryNowMs?: number,
): Promise<Record<string, unknown>> => {
  const snapshot = await reportRef.get();
  const report = snapshot.data();
  if (!report || report.userId !== uid) throw new HttpsError("not-found", "Bug report not found.");
  if (isFinalized(report)) {
    await deliverBugReportEmail(reportRef);
    return report;
  }
  if (report.status !== "awaiting_upload") throw new HttpsError("failed-precondition", "Bug report cannot be finalized.");
  const expectedPath = `bug-reports/${uid}/${reportRef.id}/screenshot.jpg`;
  if (report.uploadPath !== expectedPath) throw new HttpsError("failed-precondition", "Bug report upload path mismatch.");

  let screenshot: Record<string, unknown> | null = null;
  if (useScreenshot) {
    try {
      const file = admin.storage().bucket().file(expectedPath);
      const [metadata] = await file.getMetadata();
      const size = Number(metadata.size);
      if (metadata.contentType === "image/jpeg" && Number.isFinite(size) && size > 0 && size <= BUG_REPORT_MAX_SCREENSHOT_BYTES) {
        const [header] = await file.download({ start: 0, end: 2 });
        if (isJpegMagicBytes(header)) screenshot = { path: expectedPath, contentType: "image/jpeg", size };
      }
    } catch {
      // Missing/invalid/inaccessible image must never discard the durable text.
      logger.warn("bug_report_screenshot_unavailable", { reportId: reportRef.id });
    }
  }

  const result = await admin.firestore().runTransaction(async transaction => {
    const fresh = await transaction.get(reportRef);
    const data = fresh.data();
    if (!data || data.userId !== uid) throw new HttpsError("not-found", "Bug report not found.");
    if (isFinalized(data)) return { report: data, changed: false };
    if (data.status !== "awaiting_upload") throw new HttpsError("failed-precondition", "Bug report cannot be finalized.");
    // A retry may have refreshed the description while the scheduler read Storage.
    if (recoveryNowMs !== undefined && (!shouldRecoverStaleBugReport(data.status,
      timestampMillis(data.updatedAt ?? data.createdAt), recoveryNowMs)
      || timestampMillis(data.expiresAt) <= recoveryNowMs)) return { report: data, changed: false };
    const finalizedAt = FieldValue.serverTimestamp();
    const patch = {
      status: "new", screenshot, finalizedAt, updatedAt: finalizedAt,
      emailDelivery: { status: "pending", updatedAt: finalizedAt },
      emailRetryAt: Timestamp.fromMillis(Date.now()),
    };
    transaction.update(reportRef, patch);
    return { report: { ...data, ...patch }, changed: true };
  });
  // Only the transaction winner may remove an omitted image; a losing retry
  // must never delete a screenshot already attached by another finalizer.
  if (result.changed && !screenshot) await deleteOrphanScreenshot(expectedPath);
  if (isFinalized(result.report)) await deliverBugReportEmail(reportRef);
  return result.report;
};

export const finalizeBugReport = onCall(
  { enforceAppCheck: true, secrets: [...SES_EMAIL_SECRETS] },
  async (request) => {
    const uid = requireAuthUid(request.auth?.uid);
    await requireUserAccess(uid);
    const input = normalizeFinalizeBugReportData(request.data, uid);
    if (!input) throw new HttpsError("invalid-argument", "Invalid bug report payload.");
    const reportRef = admin.firestore().collection(BUG_REPORTS_COLLECTION).doc(input.reportId);
    const report = await finalizeStoredBugReport(reportRef, uid, input.useScreenshot);
    return { ok: true, reportId: input.reportId, screenshotAttached: !!resolveBugReportScreenshotPath(input.reportId, report) };
  },
);

export const adminUpdateBugReport = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const adminUid = requireAuthUid(request.auth?.uid);
    await requireAdmin(adminUid);
    const input = normalizeAdminUpdateBugReportData(request.data);
    if (!input) throw new HttpsError("invalid-argument", "Invalid bug report update.");

    const reportRef = admin.firestore().collection(BUG_REPORTS_COLLECTION).doc(input.reportId);
    await admin.firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reportRef);
      if (!snapshot.exists) throw new HttpsError("not-found", "Bug report not found.");
      const currentStatus = snapshot.data()?.status;
      if (!canTransitionBugReportStatus(currentStatus, input.status)) {
        throw new HttpsError("failed-precondition", "Bug report status transition is not allowed.");
      }
      const timestamp = FieldValue.serverTimestamp();
      const update: Record<string, unknown> = {
        status: input.status,
        handledBy: adminUid,
        updatedAt: timestamp,
      };
      if (currentStatus !== input.status) update.statusChangedAt = timestamp;
      if (Object.prototype.hasOwnProperty.call(input, "priority")) update.priority = input.priority;
      if (Object.prototype.hasOwnProperty.call(input, "note")) update.adminNote = input.note;
      transaction.update(reportRef, update);
    });

    return { ok: true, reportId: input.reportId, status: input.status };
  },
);

export const adminGetBugReportScreenshotUrl = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const adminUid = requireAuthUid(request.auth?.uid);
    await requireAdmin(adminUid);
    const reportId = normalizeAdminBugReportId(request.data);
    if (!reportId) throw new HttpsError("invalid-argument", "Invalid bug report id.");

    const snapshot = await admin.firestore().collection(BUG_REPORTS_COLLECTION).doc(reportId).get();
    if (!snapshot.exists) throw new HttpsError("not-found", "Bug report not found.");
    const path = resolveBugReportScreenshotPath(reportId, snapshot.data());
    if (!path) {
      throw new HttpsError("not-found", "Bug report screenshot not found.");
    }

    const file = admin.storage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) throw new HttpsError("not-found", "Bug report screenshot not found.");
    const expiresAt = bugReportScreenshotUrlExpiry(Date.now());
    const [url] = await file.getSignedUrl({ version: "v4", action: "read", expires: expiresAt });
    return { ok: true, reportId, url, expiresAt: new Date(expiresAt).toISOString() };
  },
);

// Recovery runs on the server so it also works after an app kill or a lost phone.
// Deletion remains exclusively tied to the original 180-day retention period.
export const cleanupStaleBugReports = onSchedule(
  { schedule: "every 15 minutes", timeZone: "UTC", region: "us-central1", secrets: [...SES_EMAIL_SECRETS] },
  async () => {
    const pageSize = 100;
    const maxPages = 5;
    const nowMs = Date.now();
    let deleted = 0;
    let recovered = 0;
    const reports = () => admin.firestore().collection(BUG_REPORTS_COLLECTION);

    let expiredCursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      let query = reports().where("expiresAt", "<=", Timestamp.fromMillis(nowMs)).orderBy("expiresAt").limit(pageSize);
      if (expiredCursor) query = query.startAfter(expiredCursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      for (const document of snapshot.docs) {
        const data = document.data();
        const userId = typeof data.userId === "string" ? data.userId : "";
        if (userId && !await deleteScreenshotForRetention(`bug-reports/${userId}/${document.id}/screenshot.jpg`)) continue;
        await document.ref.delete();
        deleted += 1;
      }
      expiredCursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < pageSize) break;
    }

    let awaitingCursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      let query = reports().where("status", "==", "awaiting_upload").orderBy(FieldPath.documentId()).limit(pageSize);
      if (awaitingCursor) query = query.startAfter(awaitingCursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      for (const document of snapshot.docs) {
        const data = document.data();
        if (!shouldRecoverStaleBugReport(data.status, timestampMillis(data.updatedAt ?? data.createdAt), nowMs)
          || timestampMillis(data.expiresAt) <= nowMs) continue;
        try {
          const result = await finalizeStoredBugReport(document.ref, data.userId, true, nowMs);
          if (isFinalized(result)) recovered += 1;
        } catch (error) {
          logger.error("bug_report_recovery_failed", { reportId: document.id, errorCode: safeSesErrorCode(error) });
        }
      }
      awaitingCursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < pageSize) break;
    }

    // Single-field query needs no new composite index. A lease prevents overlap
    // with a callable or another scheduler invocation while SES is sending.
    const pending = await reports().where("emailRetryAt", "<=", Timestamp.fromMillis(nowMs)).limit(pageSize).get();
    for (const document of pending.docs) {
      if (timestampMillis(document.data().expiresAt) <= nowMs) continue;
      try { await deliverBugReportEmail(document.ref); }
      catch (error) { logger.error("bug_report_email_retry_failed", { reportId: document.id, errorCode: safeSesErrorCode(error) }); }
    }
    logger.info("bug_report_stale_cleanup", { deleted, recovered });
  },
);
