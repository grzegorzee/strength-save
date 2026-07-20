import { createHash, randomBytes, randomInt } from "node:crypto";

// Z125: parowanie zegarka Garmin z kontem — 6-cyfrowy kod (TTL 10 min, jednorazowy)
// wymieniany na token urządzenia. W Firestore WYŁĄCZNIE hashe (pepper z sekretu),
// token żyje tylko w Application.Storage zegarka. Logika czysta z wstrzykiwanymi
// zależnościami (wzorzec weekly-digest) — testowalna bez emulatora.

export const PAIR_CODE_TTL_MS = 10 * 60 * 1000;

export interface PairCodeDoc {
  uid: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  /** TTL Firestore (polityka na expiresAtTtl) — kody znikają same. */
  expiresAtTtl?: FirebaseFirestore.Timestamp;
}

export interface DeviceTokenDoc {
  uid: string;
  label: string;
  createdAt: number;
  lastUsedAt: number;
  revokedAt: number | null;
}

export interface GarminPairDeps {
  getPairCode(codeHash: string): Promise<PairCodeDoc | null>;
  savePairCode(codeHash: string, doc: PairCodeDoc): Promise<void>;
  markCodeUsed(codeHash: string): Promise<void>;
  saveDeviceToken(tokenHash: string, doc: DeviceTokenDoc): Promise<void>;
  getDeviceToken(tokenHash: string): Promise<DeviceTokenDoc | null>;
  touchDeviceToken(tokenHash: string, lastUsedAt: number): Promise<void>;
  now(): number;
  randomCode(): string;
  randomToken(): string;
  pepper: string;
}

/** Hash sekretu (kod/token) z pepperem — lookup po hashu jest timing-safe z natury. */
export const hashSecret = (secret: string, pepper: string): string =>
  createHash("sha256").update(`${pepper}:${secret}`).digest("hex");

/** Stabilny identyfikator urządzenia bez ujawniania pełnego hasha tokenu. */
export const deviceIdFromTokenHash = (tokenHash: string): string => tokenHash.slice(0, 12);

export const randomPairCode = (): string => String(randomInt(100000, 1000000));

export const randomDeviceToken = (): string => randomBytes(32).toString("base64url");

export async function startPairing(
  deps: GarminPairDeps,
  uid: string,
  label: string,
): Promise<{ code: string; expiresAt: number }> {
  const code = deps.randomCode();
  const now = deps.now();
  const expiresAt = now + PAIR_CODE_TTL_MS;
  await deps.savePairCode(hashSecret(code, deps.pepper), {
    uid,
    label: label.slice(0, 40),
    createdAt: now,
    expiresAt,
    usedAt: null,
  });
  return { code, expiresAt };
}

export type ExchangeResult =
  | { ok: true; token: string; deviceId: string; uid: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function exchangeCode(deps: GarminPairDeps, rawCode: unknown): Promise<ExchangeResult> {
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  // Format najpierw — złe wejście nie kosztuje odczytu bazy.
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid" };

  const codeHash = hashSecret(code, deps.pepper);
  const doc = await deps.getPairCode(codeHash);
  if (!doc) return { ok: false, reason: "invalid" };
  if (doc.usedAt !== null) return { ok: false, reason: "used" };
  if (deps.now() > doc.expiresAt) return { ok: false, reason: "expired" };

  const token = deps.randomToken();
  const tokenHash = hashSecret(token, deps.pepper);
  const now = deps.now();
  await deps.saveDeviceToken(tokenHash, {
    uid: doc.uid,
    label: doc.label,
    createdAt: now,
    lastUsedAt: now,
    revokedAt: null,
  });
  await deps.markCodeUsed(codeHash);
  return { ok: true, token, deviceId: deviceIdFromTokenHash(tokenHash), uid: doc.uid };
}

export interface DeviceAuth {
  uid: string;
  deviceId: string;
  lastUsedAt: number;
}

export async function authenticateDevice(deps: GarminPairDeps, rawToken: unknown): Promise<DeviceAuth | null> {
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (token.length < 16 || token.length > 128) return null;
  const tokenHash = hashSecret(token, deps.pepper);
  const doc = await deps.getDeviceToken(tokenHash);
  if (!doc || doc.revokedAt !== null) return null;
  const previousUse = doc.lastUsedAt;
  await deps.touchDeviceToken(tokenHash, deps.now());
  return { uid: doc.uid, deviceId: deviceIdFromTokenHash(tokenHash), lastUsedAt: previousUse };
}
