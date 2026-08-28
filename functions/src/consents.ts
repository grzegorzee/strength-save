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

export interface ConsentResponseMirror {
  termsVersion?: string;
  privacyVersion?: string;
  healthGranted?: boolean;
  healthVersion?: string;
  healthEpoch?: number;
  healthGrantId?: string | null;
  marketingGranted?: boolean;
  marketingVersion?: string;
}

export interface StoredHealthConsentState {
  healthGranted?: boolean;
  healthVersion?: string;
  healthEpoch?: number;
  healthGrantId?: string | null;
}

export interface NextHealthConsentState {
  healthGranted: boolean;
  healthVersion: string;
  healthEpoch: number;
  healthGrantId: string | null;
  changed: true;
}

/**
 * Monotoniczna bariera dla zapisów zdrowotnych. Ten sam stan jest idempotentny,
 * ale withdraw, regrant oraz przejście z wersji legacy zawsze zmieniają epoch.
 */
export function nextHealthConsentState(
  current: StoredHealthConsentState | undefined,
  entries: ConsentEntry[],
  newGrantId = "pending-grant",
): NextHealthConsentState | null {
  const health = entries.find((entry) => entry.type === "health");
  if (!health) return null;

  const granted = health.action === "granted";
  const epoch = Number.isSafeInteger(current?.healthEpoch) && (current?.healthEpoch ?? 0) > 0
    ? current!.healthEpoch!
    : 0;
  const hasCurrentFence = granted
    ? typeof current?.healthGrantId === "string" && current.healthGrantId.length > 0
    : current?.healthGrantId == null;
  if (
    current?.healthGranted === granted
    && current.healthVersion === health.docVersion
    && epoch > 0
    && hasCurrentFence
  ) {
    return null;
  }

  return {
    healthGranted: granted,
    healthVersion: health.docVersion,
    healthEpoch: epoch + 1,
    healthGrantId: granted ? newGrantId : null,
    changed: true,
  };
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
  if (new Set(entries.map((entry) => entry.type)).size !== entries.length) {
    throw new HttpsError("invalid-argument", "duplicate consent type");
  }

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
export function buildConsentMirror(
  entries: ConsentEntry[],
  healthState?: StoredHealthConsentState | null,
): Record<string, unknown> {
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
  if (healthState) {
    mirror["consents.healthGranted"] = healthState.healthGranted === true;
    mirror["consents.healthVersion"] = healthState.healthVersion;
    mirror["consents.healthEpoch"] = healthState.healthEpoch;
    mirror["consents.healthGrantId"] = healthState.healthGrantId ?? null;
  }
  return mirror;
}

/**
 * Bezpieczny mirror do odpowiedzi callable. Nie zawiera IP, timestampu ani
 * tekstu oświadczeń; pozwala klientowi zakończyć bramkę bez czekania na drugi
 * kanał onSnapshot po potwierdzonym, atomowym batch.commit().
 */
export function buildConsentResponseMirror(
  entries: ConsentEntry[],
  healthState?: StoredHealthConsentState | null,
): ConsentResponseMirror {
  const mirror: ConsentResponseMirror = {};
  for (const entry of entries) {
    switch (entry.type) {
      case "terms":
        mirror.termsVersion = entry.docVersion;
        break;
      case "privacy_ack":
        mirror.privacyVersion = entry.docVersion;
        break;
      case "health":
        mirror.healthGranted = entry.action === "granted";
        mirror.healthVersion = entry.docVersion;
        break;
      case "marketing":
        mirror.marketingGranted = entry.action === "granted";
        mirror.marketingVersion = entry.docVersion;
        break;
    }
  }
  if (healthState) {
    mirror.healthGranted = healthState.healthGranted === true;
    mirror.healthVersion = healthState.healthVersion;
    mirror.healthEpoch = healthState.healthEpoch;
    mirror.healthGrantId = healthState.healthGrantId ?? null;
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
  const createdAt = admin.firestore.FieldValue.serverTimestamp();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const consentWrites = payload.entries.map((entry) => ({
    entry,
    ref: db.collection(CONSENTS_COLLECTION).doc(),
  }));
  const healthWrite = consentWrites.find(({ entry }) => entry.type === "health");
  let responseMirror: ConsentResponseMirror | null = null;

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile not found");
    }
    const userData = userSnapshot.data() ?? {};
    const currentHealth = (
      userData.consents && typeof userData.consents === "object"
        ? userData.consents
        : {}
    ) as StoredHealthConsentState;
    const changedHealth = nextHealthConsentState(
      currentHealth,
      payload.entries,
      healthWrite?.ref.id ?? "",
    );
    const authoritativeHealth = changedHealth ?? (
      healthWrite ? currentHealth : null
    );

    for (const { entry, ref } of consentWrites) {
      transaction.set(ref, {
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
        ...(entry.type === "health" && authoritativeHealth
          ? { healthEpoch: authoritativeHealth.healthEpoch ?? null }
          : {}),
      });
    }

    const mirror = buildConsentMirror(payload.entries, authoritativeHealth);
    mirror["consents.updatedAt"] = createdAt;
    transaction.update(userRef, mirror);
    responseMirror = buildConsentResponseMirror(payload.entries, authoritativeHealth);
  });

  return {
    ok: true,
    recorded: payload.entries.length,
    mirror: responseMirror ?? buildConsentResponseMirror(payload.entries),
  };
});
