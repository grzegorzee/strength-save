import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { SES_EMAIL_SECRETS, sendSesEmail } from "./ses-email";

// WP-G (X27), zasada 11 CLAUDE.md: crash ma znalezc SYSTEM, nie user na
// silowni. Dzienny przeglad client_errors z ostatniej doby: kod NIEWIDZIANY
// wczesniej (stan w error_digest_state/{code}) albo znany kod z naglym
// wzrostem (>SPIKE_THRESHOLD wystapien) => mail alarmowy do operatora.
// Zero PII w mailu: kod, przykladowy message, licznosc, platformy — bez uid.

export const ERROR_SPIKE_THRESHOLD = 3;
const ALERT_RECIPIENT = "contact@strengthsave.app";
const MAX_DETAIL_IN_EMAIL = 200;

export interface ErrorDigestEntry {
  code: string;
  platform: string;
  detail?: string;
}

export interface ErrorDigestAlert {
  code: string;
  reason: "new-code" | "spike";
  count: number;
  platforms: string[];
  sampleDetail: string;
}

export interface ErrorDigestDeps {
  /** Wpisy client_errors z okna (ostatnia doba). */
  listRecentErrors: () => Promise<ErrorDigestEntry[]>;
  /** Ktore z podanych kodow sa juz znane (istnieje error_digest_state/{code}). */
  loadSeenCodes: (codes: string[]) => Promise<Set<string>>;
  /** Oznacz kody jako widziane (upsert stanu z licznikiem). */
  markCodesSeen: (codes: Array<{ code: string; count: number }>, nowMs: number) => Promise<void>;
  sendAlertEmail: (subject: string, html: string) => Promise<void>;
  nowMs: number;
}

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

export const buildErrorAlertHtml = (alerts: ErrorDigestAlert[]): string => {
  const rows = alerts.map((alert) => `
    <tr>
      <td style="padding:6px 10px;font-family:monospace;">${escapeHtml(alert.code)}</td>
      <td style="padding:6px 10px;">${alert.reason === "new-code" ? "NOWY KOD" : "WZROST"}</td>
      <td style="padding:6px 10px;text-align:right;">${alert.count}</td>
      <td style="padding:6px 10px;">${escapeHtml(alert.platforms.join(", "))}</td>
      <td style="padding:6px 10px;color:#666;">${escapeHtml(alert.sampleDetail)}</td>
    </tr>`).join("");
  return `
    <h2>Strength Save: alert telemetrii client_errors</h2>
    <p>Wykryte w ostatniej dobie:</p>
    <table style="border-collapse:collapse;font-size:14px;">
      <tr><th align="left" style="padding:6px 10px;">Kod</th><th align="left" style="padding:6px 10px;">Powod</th><th align="right" style="padding:6px 10px;">Ile</th><th align="left" style="padding:6px 10px;">Platformy</th><th align="left" style="padding:6px 10px;">Przyklad</th></tr>
      ${rows}
    </table>
    <p style="color:#666;font-size:12px;">Pelne wpisy w kolekcji client_errors w konsoli Firebase.</p>`;
};

export const runErrorDigest = async (deps: ErrorDigestDeps): Promise<{ alerts: ErrorDigestAlert[] }> => {
  const entries = await deps.listRecentErrors();

  const groups = new Map<string, { count: number; platforms: Set<string>; sampleDetail: string }>();
  for (const entry of entries) {
    const code = entry.code || "(empty-code)";
    const group = groups.get(code) ?? { count: 0, platforms: new Set<string>(), sampleDetail: "" };
    group.count += 1;
    if (entry.platform) group.platforms.add(entry.platform);
    if (!group.sampleDetail && entry.detail) {
      group.sampleDetail = entry.detail.slice(0, MAX_DETAIL_IN_EMAIL);
    }
    groups.set(code, group);
  }

  const codes = [...groups.keys()];
  const seen = codes.length > 0 ? await deps.loadSeenCodes(codes) : new Set<string>();

  const alerts: ErrorDigestAlert[] = [];
  for (const [code, group] of groups) {
    const reason: ErrorDigestAlert["reason"] | null = !seen.has(code)
      ? "new-code"
      : group.count > ERROR_SPIKE_THRESHOLD
        ? "spike"
        : null;
    if (reason === null) continue;
    alerts.push({
      code,
      reason,
      count: group.count,
      platforms: [...group.platforms].sort(),
      sampleDetail: group.sampleDetail,
    });
  }
  alerts.sort((a, b) => b.count - a.count);

  if (alerts.length > 0) {
    const subject = `[Strength Save] client_errors: ${alerts.length} alert(y), top: ${alerts[0].code}`;
    await deps.sendAlertEmail(subject, buildErrorAlertHtml(alerts));
  }

  // Stan aktualizujemy po (probie) wysylki: padniety mail = jutro ten sam kod
  // nadal liczy sie jako nowy, alert nie ginie po cichu.
  if (codes.length > 0) {
    await deps.markCodesSeen(
      codes.map((code) => ({ code, count: groups.get(code)!.count })),
      deps.nowMs,
    );
  }

  return { alerts };
};

/** Kod bledu jako id dokumentu stanu — bez znakow zakazanych w path. */
export const errorStateDocId = (code: string): string => encodeURIComponent(code).slice(0, 512);

export const buildErrorDigestDeps = (
  db: FirebaseFirestore.Firestore,
  emailSender: typeof sendSesEmail,
  nowMs: number,
): ErrorDigestDeps => ({
  nowMs,
  listRecentErrors: async () => {
    const snapshot = await db.collection("client_errors")
      .where("createdAt", ">=", nowMs - 24 * 60 * 60 * 1000)
      .limit(2000)
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        code: typeof data.code === "string" ? data.code : "(invalid-code)",
        platform: typeof data.platform === "string" ? data.platform : "unknown",
        detail: typeof data.detail === "string" ? data.detail : undefined,
      };
    });
  },
  loadSeenCodes: async (codes) => {
    const refs = codes.map((code) => db.collection("error_digest_state").doc(errorStateDocId(code)));
    const snapshots = await db.getAll(...refs);
    const seen = new Set<string>();
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists) seen.add(codes[index]);
    });
    return seen;
  },
  markCodesSeen: async (codeCounts, stampMs) => {
    const batch = db.batch();
    for (const { code, count } of codeCounts) {
      const ref = db.collection("error_digest_state").doc(errorStateDocId(code));
      batch.set(ref, {
        code,
        lastSeenAt: stampMs,
        totalCount: admin.firestore.FieldValue.increment(count),
      }, { merge: true });
      // firstSeenAt tylko przy pierwszym zapisie (merge nie nadpisze istniejacego).
      batch.set(ref, { firstSeenAt: stampMs }, { mergeFields: ["firstSeenAt"] });
    }
    await batch.commit();
  },
  sendAlertEmail: async (subject, html) => {
    await emailSender({
      to: ALERT_RECIPIENT,
      subject,
      html,
    });
  },
});

/** Dzienny przeglad bledow klienta, po nocnym oknie (06:20, po cost digest 06:10). */
export const dailyErrorDigest = onSchedule(
  {
    schedule: "every day 06:20",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 120,
    secrets: [...SES_EMAIL_SECRETS],
  },
  async () => {
    const db = admin.firestore();
    const { alerts } = await runErrorDigest(buildErrorDigestDeps(db, sendSesEmail, Date.now()));
    logger.info(`[errorDigest] alerts=${alerts.length}${alerts.length > 0 ? ` codes=${alerts.map((a) => a.code).join(",")}` : ""}`);
  },
);
