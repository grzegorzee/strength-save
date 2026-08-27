import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const EMAIL_EVENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
// Polityka 2.1: zagregowany rejestr wysyłek maksymalnie 24 miesiące.
// Używamy 730 dni jako deterministycznej, nie dłuższej granicy operacyjnej.
export const EMAIL_LOG_RETENTION_MS = 730 * 24 * 60 * 60 * 1000;

const assertTimestamp = (value: number): void => {
  if (!Number.isFinite(value)) throw new Error("invalid retention timestamp");
};

export const emailEventRetentionCutoffMs = (nowMs: number): number => {
  assertTimestamp(nowMs);
  return nowMs - EMAIL_EVENT_RETENTION_MS;
};

export const emailLogRetentionCutoffMs = (nowMs: number): number => {
  assertTimestamp(nowMs);
  return nowMs - EMAIL_LOG_RETENTION_MS;
};

export const isEmailEventExpired = (eventMs: number, nowMs: number): boolean => {
  assertTimestamp(eventMs);
  return eventMs <= emailEventRetentionCutoffMs(nowMs);
};

/**
 * Operational enforcement for the 180-day retention declared in the privacy
 * policy. Querying the canonical ISO timestamp also removes legacy records
 * created before `expiresAt` was introduced. The bounded loop prevents an
 * unexpectedly large backlog from monopolising the scheduler invocation.
 */
export const cleanupExpiredSesEvents = onSchedule(
  { schedule: "every 60 minutes", timeZone: "UTC", region: "us-central1" },
  async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    const cutoff = new Date(emailEventRetentionCutoffMs(nowMs)).toISOString();
    const pageSize = 500;
    const maxPages = 10;
    let deleted = 0;

    for (let page = 0; page < maxPages; page += 1) {
      const snapshot = await db.collection("email_events")
        .where("timestamp", "<=", cutoff)
        .orderBy("timestamp")
        .limit(pageSize)
        .get();
      if (snapshot.empty) break;

      const batch = db.batch();
      for (const document of snapshot.docs) batch.delete(document.ref);
      await batch.commit();
      deleted += snapshot.size;
      if (snapshot.size < pageSize) break;
    }

    // Parent delete nie usuwa podkolekcji `content/body`, dlatego logi czyścimy
    // recursiveDelete. Bounded page chroni czas wykonania; reszta wróci za godzinę.
    const logCutoff = new Date(emailLogRetentionCutoffMs(nowMs)).toISOString();
    const logSnapshot = await db.collection("email_log")
      .where("sentAt", "<=", logCutoff)
      .orderBy("sentAt")
      .limit(100)
      .get();
    let deletedLogs = 0;
    for (const document of logSnapshot.docs) {
      await db.recursiveDelete(document.ref);
      deletedLogs += 1;
    }

    logger.info("ses_event_retention_cleanup", { cutoff, deleted, logCutoff, deletedLogs });
  },
);
