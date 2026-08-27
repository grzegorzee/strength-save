import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  CONSENT_ACTIONS,
  CONSENT_DOC_VERSION,
  CONSENT_TYPES,
  type ConsentAction,
  type ConsentType,
} from "./legal-versions";

// Log zgód (rozliczalność art. 7 ust. 1 RODO). Zapis WYŁĄCZNIE przez tę
// funkcję: klient nie zna swojego IP, a timestamp musi pochodzić z serwera.
// Kolekcja `consents` jest celowo POZA listami kasowania GDPR w security.ts:
// wpisy są dowodem zgodności z prawem i przeżywają usunięcie konta
// (opisane w Polityce Prywatności, sekcje 5 i 10).
export const CONSENTS_COLLECTION = "consents";
const USERS_COLLECTION = "users";

// "onboarding-marketing-step": dedykowany ekran zgody marketingowej w
// onboardingu (spec 2026-08-11) — kanał odróżnia go w logu od checkboxa Welcome.
const CHANNELS = ["web", "ios", "android", "onboarding-marketing-step"] as const;
const LANGS = ["pl", "en"] as const;
const MAX_ENTRIES = 8;
const MAX_STATEMENT_LENGTH = 2000;
const MAX_APP_VERSION_LENGTH = 40;

// Okno zgodności dla już rozpowszechnionego TestFlight 128 / Android 42.
// Te buildy pokazują i wysyłają privacy 2.0. Serwer zapisuje wersję faktycznie
// zaakceptowaną przez użytkownika, dzięki czemu klient 2.1 nadal poprawnie
// uruchomi re-consent. Usuń 2.0 dopiero po wycofaniu obu starych buildów.
const ACCEPTED_CONSENT_DOC_VERSIONS: Record<ConsentType, readonly string[]> = {
  terms: [CONSENT_DOC_VERSION.terms],
  privacy_ack: ["2.0", CONSENT_DOC_VERSION.privacy_ack],
  health: [CONSENT_DOC_VERSION.health],
  marketing: [CONSENT_DOC_VERSION.marketing],
};

export interface ConsentEntry {
  type: ConsentType;
  action: ConsentAction;
  docVersion: string;
  lang: (typeof LANGS)[number];
  statementText: string;
}

export interface ConsentPayload {
  entries: ConsentEntry[];
  channel: (typeof CHANNELS)[number];
  appVersion?: string;
}

const isIn = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/** Waliduje wejście recordConsent. Rzuca HttpsError invalid-argument. */
export function parseConsentPayload(data: unknown): ConsentPayload {
  const raw = (data ?? {}) as Record<string, unknown>;
  if (!Array.isArray(raw.entries) || raw.entries.length === 0 || raw.entries.length > MAX_ENTRIES) {
    throw new HttpsError("invalid-argument", "entries must be a non-empty array");
  }
  if (!isIn(CHANNELS, raw.channel)) {
    throw new HttpsError("invalid-argument", "invalid channel");
  }
  let appVersion: string | undefined;
  if (raw.appVersion !== undefined) {
    if (typeof raw.appVersion !== "string" || raw.appVersion.length > MAX_APP_VERSION_LENGTH) {
      throw new HttpsError("invalid-argument", "invalid appVersion");
    }
    appVersion = raw.appVersion;
  }

  const entries = raw.entries.map((item): ConsentEntry => {
    const entry = (item ?? {}) as Record<string, unknown>;
    if (!isIn(CONSENT_TYPES, entry.type)) {
      throw new HttpsError("invalid-argument", "invalid consent type");
    }
    if (!isIn(CONSENT_ACTIONS, entry.action)) {
      throw new HttpsError("invalid-argument", "invalid consent action");
    }
    if (
      typeof entry.docVersion !== "string"
      || !ACCEPTED_CONSENT_DOC_VERSIONS[entry.type].includes(entry.docVersion)
    ) {
      throw new HttpsError(
        "invalid-argument",
        `stale docVersion for ${entry.type}: expected ${CONSENT_DOC_VERSION[entry.type]}`,
      );
    }
    if (!isIn(LANGS, entry.lang)) {
      throw new HttpsError("invalid-argument", "invalid lang");
    }
    if (
      typeof entry.statementText !== "string"
      || entry.statementText.trim().length === 0
      || entry.statementText.length > MAX_STATEMENT_LENGTH
    ) {
      throw new HttpsError("invalid-argument", "invalid statementText");
    }
    return {
      type: entry.type,
      action: entry.action,
      docVersion: entry.docVersion,
      lang: entry.lang,
      statementText: entry.statementText,
    };
  });

  // Oświadczenia obowiązkowe (terms, privacy_ack) nie mają wariantu "withdrawn".
  for (const entry of entries) {
    if ((entry.type === "terms" || entry.type === "privacy_ack") && entry.action !== "granted") {
      throw new HttpsError("invalid-argument", `${entry.type} cannot be withdrawn`);
    }
  }
  return { entries, channel: raw.channel, appVersion };
}

/** IP klienta z nagłówków proxy (ten sam wzorzec co admin-api.extractIpAddress). */
export function extractClientIp(rawRequest: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  const forwarded = rawRequest?.headers?.["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return forwarded[0] || "unknown";
  }
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return rawRequest?.ip || "unknown";
}

/** Aktualizacja mirrora users/{uid}.consents na podstawie zapisanych wpisów. */
export function buildConsentMirror(entries: ConsentEntry[]): Record<string, unknown> {
  const mirror: Record<string, unknown> = {};
  for (const entry of entries) {
    switch (entry.type) {
      case "terms":
        mirror["consents.termsVersion"] = entry.docVersion;
        break;
      case "privacy_ack":
        mirror["consents.privacyVersion"] = entry.docVersion;
        break;
      case "health":
        mirror["consents.healthGranted"] = entry.action === "granted";
        mirror["consents.healthVersion"] = entry.docVersion;
        break;
      case "marketing":
        mirror["consents.marketingGranted"] = entry.action === "granted";
        mirror["consents.marketingVersion"] = entry.docVersion;
        break;
    }
  }
  return mirror;
}

export const recordConsent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }
  const uid = request.auth.uid;
  const payload = parseConsentPayload(request.data);
  const ip = extractClientIp(request.rawRequest ?? {});

  const db = admin.firestore();
  const batch = db.batch();
  const createdAt = admin.firestore.FieldValue.serverTimestamp();

  for (const entry of payload.entries) {
    const ref = db.collection(CONSENTS_COLLECTION).doc();
    batch.set(ref, {
      uid,
      type: entry.type,
      action: entry.action,
      docVersion: entry.docVersion,
      lang: entry.lang,
      statementText: entry.statementText,
      channel: payload.channel,
      appVersion: payload.appVersion ?? null,
      ip,
      createdAt,
    });
  }

  const mirror = buildConsentMirror(payload.entries);
  mirror["consents.updatedAt"] = createdAt;
  batch.update(db.collection(USERS_COLLECTION).doc(uid), mirror);

  await batch.commit();
  return { ok: true, recorded: payload.entries.length };
});
