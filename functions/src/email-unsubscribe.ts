// 2026-09-29: one-click unsubscribe (RFC 8058) dla cotygodniowego digestu,
// jedynego cyklicznego maila do wszystkich aktywnych userów. Gmail i Yahoo
// pokazują przy nadawcy przycisk "Anuluj subskrypcję" i wysyłają POST na adres
// z nagłówka List-Unsubscribe; bez niego odbiorca, który nie chce maila, klika
// "Spam", a to psuje reputację domeny.
//
// Token = HMAC-SHA256(uid) kluczem wyprowadzonym z API_KEY_PEPPER (etykieta
// "email-unsubscribe-v1"), więc wdrożenie nie wymaga nowego sekretu, a sam
// pepper nigdy nie służy bezpośrednio jako klucz. Token nie wygasa (link w
// starym mailu ma działać), obejmuje wyłącznie wypis z digestu.
//
// GET niczego nie zmienia (skanery linków w skrzynkach otwierają URL-e):
// pokazuje przycisk POST. Zmianę robi tylko POST.
import { createHmac, timingSafeEqual } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import type { SesEmailHeader } from "./ses-email";

const unsubscribePepper = defineSecret("API_KEY_PEPPER");

export const UNSUBSCRIBE_ENDPOINT = "https://us-central1-fittracker-workouts.cloudfunctions.net/emailUnsubscribe";
const KEY_LABEL = "email-unsubscribe-v1";
const SCOPE = "weekly_digest";

export const deriveUnsubscribeKey = (pepper: string): Buffer =>
  createHmac("sha256", pepper).update(KEY_LABEL).digest();

export const unsubscribeToken = (uid: string, key: Buffer): string =>
  createHmac("sha256", key).update(`${SCOPE}:${uid}`).digest("base64url");

export const verifyUnsubscribeToken = (uid: string, token: string | undefined, key: Buffer): boolean => {
  if (!uid || typeof token !== "string") return false;
  const expected = Buffer.from(unsubscribeToken(uid, key));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
};

export const unsubscribeUrl = (uid: string, key: Buffer): string =>
  `${UNSUBSCRIBE_ENDPOINT}?u=${encodeURIComponent(uid)}&t=${unsubscribeToken(uid, key)}`;

export const listUnsubscribeHeaders = (url: string): SesEmailHeader[] => [
  { name: "List-Unsubscribe", value: `<${url}>` },
  { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
];

export interface UnsubscribeResponse {
  status: number;
  body: string;
}

// Strona dwujęzyczna: link nie niesie języka usera, a odczyt profilu przed
// weryfikacją tokenu byłby zbędnym odczytem na żądanie z internetu.
const page = (pl: string, en: string, extra = ""): string => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Strength Save</title></head>
<body style="margin:0;padding:32px 16px;background:#f6f7f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;">
<div style="font-size:14px;font-weight:800;letter-spacing:3px;">STRENGTH SAVE</div>
<div style="height:4px;width:56px;background:#ccfc22;margin:4px 0 20px;"></div>
<p style="font-size:16px;line-height:1.5;margin:0 0 8px;">${pl}</p>
<p style="font-size:14px;line-height:1.5;margin:0 0 16px;color:#6b7280;">${en}</p>
${extra}
</div></body></html>`;

export async function handleUnsubscribeRequest(
  deps: { key: Buffer; optOut: (uid: string) => Promise<void> },
  req: { method: string; uid: string; token: string | undefined },
): Promise<UnsubscribeResponse> {
  if (req.method !== "GET" && req.method !== "POST") {
    return { status: 405, body: page("Nieobsługiwana metoda.", "Method not allowed.") };
  }
  if (!verifyUnsubscribeToken(req.uid, req.token, deps.key)) {
    return {
      status: 400,
      body: page(
        "Link wypisu jest nieprawidłowy. Raport wyłączysz w aplikacji: Profil, Powiadomienia.",
        "This unsubscribe link is invalid. You can turn the report off in the app: Profile, Notifications.",
      ),
    };
  }
  if (req.method === "GET") {
    const action = `${UNSUBSCRIBE_ENDPOINT}?u=${encodeURIComponent(req.uid)}&t=${req.token}`;
    return {
      status: 200,
      body: page(
        "Wyłączyć cotygodniowe podsumowanie e-mail ze Strength Save?",
        "Turn off the weekly summary email from Strength Save?",
        `<form method="post" action="${action}"><button type="submit" style="font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px;border:2px solid #111827;background:#111827;color:#ffffff;">Wyłącz / Turn off</button></form>`,
      ),
    };
  }
  try {
    await deps.optOut(req.uid);
  } catch (error) {
    logger.error("[EmailUnsubscribe] opt-out write failed", { error });
    return { status: 500, body: page("Nie udało się zapisać zmiany. Spróbuj ponownie za chwilę.", "Could not save the change. Please try again shortly.") };
  }
  return {
    status: 200,
    body: page(
      "Cotygodniowe podsumowanie e-mail jest wyłączone. Włączysz je z powrotem w aplikacji: Profil, Powiadomienia.",
      "The weekly summary email is turned off. You can turn it back on in the app: Profile, Notifications.",
    ),
  };
}

export const emailUnsubscribe = onRequest({ secrets: [unsubscribePepper], cors: false }, async (req, res) => {
  const uid = typeof req.query.u === "string" ? req.query.u.slice(0, 128) : "";
  const token = typeof req.query.t === "string" ? req.query.t.slice(0, 128) : undefined;
  const result = await handleUnsubscribeRequest({
    key: deriveUnsubscribeKey(unsubscribePepper.value()),
    optOut: async (targetUid) => {
      try {
        // update (nie set/merge): usunięte konto nie odżywa jako pusty dokument.
        await admin.firestore().collection("users").doc(targetUid).update({ "notificationPrefs.weeklyDigest": false });
      } catch (error) {
        const code = (error as { code?: number | string }).code;
        if (code === 5 || code === "not-found") return;
        throw error;
      }
    },
  }, { method: req.method, uid, token });
  res.status(result.status).set("Content-Type", "text/html; charset=utf-8").set("Cache-Control", "no-store").send(result.body);
});
