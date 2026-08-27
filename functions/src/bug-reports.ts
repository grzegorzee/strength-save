import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
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
const BUG_REPORT_AWAITING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1_000;
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

export const shouldCleanupStaleBugReport = (
  status: unknown,
  createdAtMs: number,
  nowMs: number,
): boolean => status === "awaiting_upload"
  && Number.isFinite(createdAtMs)
  && createdAtMs <= nowMs - BUG_REPORT_AWAITING_UPLOAD_TTL_MS;

export const shouldCleanupBugReport = (
  status: unknown,
  createdAtMs: number,
  expiresAtMs: number,
  nowMs: number,
): boolean => (
  (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs)
  || shouldCleanupStaleBugReport(status, createdAtMs, nowMs)
);

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

    await db.runTransaction(async (transaction) => {
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        return;
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

      transaction.set(rateRef, { ...nextRate, userId: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      transaction.create(reportRef, {
        userId: uid,
        reporterEmail,
        clientRequestId: input.clientRequestId,
        category: input.category,
        message: input.message,
        context: input.context,
        status: "awaiting_upload",
        uploadPath: input.uploadPath,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(bugReportExpiresAt(Date.now())),
      });
    });

    return { ok: true, reportId: input.reportId, uploadPath: input.uploadPath };
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

export const finalizeBugReport = onCall(
  { enforceAppCheck: true, secrets: [...SES_EMAIL_SECRETS] },
  async (request) => {
    const uid = requireAuthUid(request.auth?.uid);
    await requireUserAccess(uid);
    const input = normalizeFinalizeBugReportData(request.data, uid);
    if (!input) throw new HttpsError("invalid-argument", "Invalid bug report payload.");

    const db = admin.firestore();
    const reportRef = db.collection(BUG_REPORTS_COLLECTION).doc(input.reportId);
    const reportSnapshot = await reportRef.get();
    if (!reportSnapshot.exists || reportSnapshot.data()?.userId !== uid) {
      throw new HttpsError("not-found", "Bug report not found.");
    }

    const report = reportSnapshot.data() as Record<string, unknown>;
    if (report.status === "new") return { ok: true, reportId: input.reportId };
    if (report.status !== "awaiting_upload") {
      throw new HttpsError("failed-precondition", "Bug report cannot be finalized.");
    }

    const expectedPath = `bug-reports/${uid}/${input.reportId}/screenshot.jpg`;
    if (report.uploadPath !== expectedPath) {
      throw new HttpsError("failed-precondition", "Bug report upload path mismatch.");
    }

    let screenshot: Record<string, unknown> | null = null;
    if (input.useScreenshot) {
      const file = admin.storage().bucket().file(expectedPath);
      try {
        const [metadata] = await file.getMetadata();
        const size = Number(metadata.size);
        const [header] = await file.download({ start: 0, end: 2 });
        if (
          metadata.contentType !== "image/jpeg"
          || !Number.isFinite(size)
          || size <= 0
          || size > BUG_REPORT_MAX_SCREENSHOT_BYTES
          || !isJpegMagicBytes(header)
        ) {
          await deleteOrphanScreenshot(expectedPath);
          throw new HttpsError("invalid-argument", "Screenshot must be a JPEG up to 1.5 MB.");
        }
        screenshot = { path: expectedPath, contentType: "image/jpeg", size };
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("failed-precondition", "Screenshot upload is missing.");
      }
    } else {
      // Rezygnacja ze screena ma ścieżkę wyjścia: usuń ewentualny częściowy upload.
      await deleteOrphanScreenshot(expectedPath);
    }

    const finalizedAt = admin.firestore.FieldValue.serverTimestamp();
    let shouldSendEmail = false;
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(reportRef);
      if (!fresh.exists || fresh.data()?.userId !== uid) {
        throw new HttpsError("not-found", "Bug report not found.");
      }
      if (fresh.data()?.status === "new") return;
      if (fresh.data()?.status !== "awaiting_upload") {
        throw new HttpsError("failed-precondition", "Bug report cannot be finalized.");
      }
      shouldSendEmail = true;
      transaction.update(reportRef, {
        status: "new",
        screenshot,
        finalizedAt,
        updatedAt: finalizedAt,
        emailDelivery: { status: "pending", updatedAt: finalizedAt },
      });
    });

    // Powiadomienie jest best-effort: zapisane zgłoszenie pozostaje źródłem prawdy.
    if (shouldSendEmail) {
      try {
        const result = await sendBugReportEmail(input.reportId, { ...report, screenshot });
        await reportRef.update({
          emailDelivery: {
            status: "accepted",
            transport: result.transport,
            ...(result.sesMessageId ? { sesMessageId: result.sesMessageId } : {}),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      } catch (error) {
        logger.error("bug_report_email_failed", {
          reportId: input.reportId,
          errorCode: safeSesErrorCode(error),
        });
        await reportRef.update({
          emailDelivery: {
            status: "failed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: "delivery_failed",
          },
        });
      }
    }

    return { ok: true, reportId: input.reportId };
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
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
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

const cleanupStaleAwaitingPage = async (
  snapshot: FirebaseFirestore.QuerySnapshot,
  nowMs: number,
  mode: "stale-awaiting" | "expired",
): Promise<number> => {
  let deleted = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    const createdAt = data.createdAt instanceof admin.firestore.Timestamp
      ? data.createdAt.toMillis()
      : NaN;
    const expiresAt = data.expiresAt instanceof admin.firestore.Timestamp
      ? data.expiresAt.toMillis()
      : NaN;
    const shouldDelete = mode === "expired"
      ? Number.isFinite(expiresAt) && expiresAt <= nowMs
      : shouldCleanupStaleBugReport(data.status, createdAt, nowMs);
    if (!shouldDelete) continue;
    const userId = typeof data.userId === "string" ? data.userId : "";
    const expectedPath = `bug-reports/${userId}/${document.id}/screenshot.jpg`;
    if (userId && !await deleteScreenshotForRetention(expectedPath)) continue;
    await document.ref.delete();
    deleted += 1;
  }
  return deleted;
};

// Hourly, bounded cleanup for abandoned create/upload flows. A maximum of ten
// pages prevents an unbounded function; remaining rows are retried next hour.
export const cleanupStaleBugReports = onSchedule(
  { schedule: "every 60 minutes", timeZone: "UTC", region: "us-central1" },
  async () => {
    const pageSize = 100;
    const maxPages = 5;
    const nowMs = Date.now();
    let deleted = 0;

    // Najpierw retencja wszystkich statusów. Scheduler usuwa plik przed dokumentem;
    // expiresAt pozostaje też polem gotowym do włączenia Firestore TTL jako fallback.
    let expiredCursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      let query = admin.firestore().collection(BUG_REPORTS_COLLECTION)
        .where("expiresAt", "<=", admin.firestore.Timestamp.fromMillis(nowMs))
        .orderBy("expiresAt")
        .limit(pageSize);
      if (expiredCursor) query = query.startAfter(expiredCursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      deleted += await cleanupStaleAwaitingPage(snapshot, nowMs, "expired");
      expiredCursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < pageSize) break;
    }

    let awaitingCursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      let query = admin.firestore().collection(BUG_REPORTS_COLLECTION)
        .where("status", "==", "awaiting_upload")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);
      if (awaitingCursor) query = query.startAfter(awaitingCursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      deleted += await cleanupStaleAwaitingPage(snapshot, nowMs, "stale-awaiting");
      awaitingCursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < pageSize) break;
    }
    logger.info("bug_report_stale_cleanup", { deleted });
  },
);
