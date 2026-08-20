// T21b: jedno miejsce zapisu rejestru wysyłek email_log (+ treść w podkolekcji
// content/body dla podglądu w panelu admina). Wpis jest pomocniczy — wywołujący
// opakowuje całość w try/catch (best-effort), a awaria zapisu treści nie
// unieważnia wpisu rejestru.
import * as logger from "firebase-functions/logger";

export interface EmailLogWrite {
  uid: string;
  to: string;
  type: string;
  workoutId?: string;
  subject: string;
  transport?: "ses" | "resend";
  sesMessageId?: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: string;
  lang?: string;
}

/** Limit dokumentu Firestore 1 MB — treść przycinana z marginesem. */
const HTML_MAX = 900000;

export async function writeEmailLog(
  db: FirebaseFirestore.Firestore,
  entry: EmailLogWrite,
  html?: string,
): Promise<void> {
  // Admin SDK odrzuca undefined w polach — wpis tylko z obecnymi wartościami.
  const data = Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined));
  const ref = await db.collection("email_log").add(data);
  if (!html) return;
  try {
    await ref.collection("content").doc("body").set({
      html: html.slice(0, HTML_MAX),
      truncated: html.length > HTML_MAX,
    });
  } catch (error) {
    logger.error("[EmailLog] content write failed", { logId: ref.id, error });
  }
}
