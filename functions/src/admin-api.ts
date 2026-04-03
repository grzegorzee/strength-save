import { createHash, randomBytes, timingSafeEqual } from "crypto";
import * as admin from "firebase-admin";
import type { Request } from "firebase-functions/v2/https";

const db = admin.firestore();

export const API_KEYS_COLLECTION = "api_keys";
export const API_AUDIT_LOGS_COLLECTION = "api_audit_logs";
export const API_RATE_LIMITS_COLLECTION = "api_rate_limits";
export const API_RATE_LIMIT_PER_MINUTE = 60;
export const API_KEY_PREFIX = "ss_live";
export const DEFAULT_API_SCOPES = [
  "export:full",
  "export:profile",
  "export:workouts",
  "export:measurements",
  "export:training-plan",
  "export:plan-cycles",
] as const;

export type ApiScope = typeof DEFAULT_API_SCOPES[number];
export type ApiKeyStatus = "active" | "revoked";
export type ExportResource = "full" | "profile" | "workouts" | "measurements" | "training-plan" | "plan-cycles";

export interface ApiKeyDoc {
  userId: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: ApiScope[];
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  rotatedFrom: string | null;
}

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  rotatedFrom: string | null;
}

export interface VerifiedApiKey {
  id: string;
  userId: string;
  scopes: ApiScope[];
  name: string;
}

export interface CreateApiKeyResult {
  record: ApiKeyRecord;
  rawKey: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function minuteBucket(): string {
  return new Date().toISOString().slice(0, 16);
}

function createApiKeyHash(rawKey: string, pepper: string): string {
  return createHash("sha256")
    .update(`${pepper}:${rawKey}`)
    .digest("hex");
}

function safeHashEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function publicRecord(id: string, data: ApiKeyDoc): ApiKeyRecord {
  return {
    id,
    userId: data.userId,
    name: data.name,
    prefix: data.prefix,
    scopes: data.scopes,
    status: data.status,
    createdAt: data.createdAt,
    lastUsedAt: data.lastUsedAt,
    revokedAt: data.revokedAt,
    expiresAt: data.expiresAt,
    rotatedFrom: data.rotatedFrom,
  };
}

export function normalizeApiKeyName(name: unknown): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) {
    throw new Error("Nazwa klucza jest wymagana.");
  }
  return value.slice(0, 80);
}

export function parseResource(value: unknown): ExportResource {
  switch (value) {
    case "profile":
    case "workouts":
    case "measurements":
    case "training-plan":
    case "plan-cycles":
    case "full":
      return value;
    default:
      return "full";
  }
}

export function parseLimit(value: unknown, fallback = 250): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(1000, Math.floor(parsed)));
}

export function parseDateParam(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

export function decodeCursor(value: unknown): number {
  if (typeof value !== "string" || !value) return 0;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { offset?: number };
    if (!Number.isFinite(decoded.offset)) return 0;
    return Math.max(0, Math.floor(decoded.offset!));
  } catch {
    return 0;
  }
}

export function encodeCursor(offset: number): string | null {
  if (offset <= 0) return null;
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

export function parseFormat(value: unknown): "json" | "ndjson" {
  return value === "ndjson" ? "ndjson" : "json";
}

export function extractIpAddress(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return forwarded[0] || "unknown";
  }
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || "unknown";
}

export function hashForLogs(value: string, pepper: string): string {
  return createHash("sha256")
    .update(`${pepper}:${value}`)
    .digest("hex");
}

export function hasScope(scopes: ApiScope[], resource: ExportResource): boolean {
  if (scopes.includes("export:full")) return true;
  return scopes.includes(`export:${resource}` as ApiScope);
}

export async function createApiKeyForUser(
  userId: string,
  name: string,
  pepper: string,
  options: { scopes?: ApiScope[]; expiresAt?: string | null; rotatedFrom?: string | null } = {},
): Promise<CreateApiKeyResult> {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${API_KEY_PREFIX}_${prefix}_${secret}`;
  const docId = prefix;
  const scopes = options.scopes?.length ? options.scopes : [...DEFAULT_API_SCOPES];

  const record: ApiKeyDoc = {
    userId,
    name: normalizeApiKeyName(name),
    prefix,
    keyHash: createApiKeyHash(rawKey, pepper),
    scopes,
    status: "active",
    createdAt: nowIso(),
    lastUsedAt: null,
    revokedAt: null,
    expiresAt: options.expiresAt ?? null,
    rotatedFrom: options.rotatedFrom ?? null,
  };

  await db.collection(API_KEYS_COLLECTION).doc(docId).set(record);
  return { record: publicRecord(docId, record), rawKey };
}

export async function listApiKeysForUser(userId: string): Promise<ApiKeyRecord[]> {
  const snap = await db.collection(API_KEYS_COLLECTION).where("userId", "==", userId).get();
  return snap.docs
    .map((doc) => publicRecord(doc.id, doc.data() as ApiKeyDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeApiKeyForUser(userId: string, keyId: string): Promise<void> {
  const docRef = db.collection(API_KEYS_COLLECTION).doc(keyId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("Klucz API nie istnieje.");
  }

  const data = snap.data() as ApiKeyDoc;
  if (data.userId !== userId) {
    throw new Error("Brak dostępu do tego klucza API.");
  }

  await docRef.set(
    {
      status: "revoked",
      revokedAt: nowIso(),
    },
    { merge: true },
  );
}

export async function getApiKeyRecordForUser(userId: string, keyId: string): Promise<ApiKeyRecord> {
  const snap = await db.collection(API_KEYS_COLLECTION).doc(keyId).get();
  if (!snap.exists) {
    throw new Error("Klucz API nie istnieje.");
  }
  const data = snap.data() as ApiKeyDoc;
  if (data.userId !== userId) {
    throw new Error("Brak dostępu do tego klucza API.");
  }
  return publicRecord(snap.id, data);
}

export async function verifyApiKey(rawKey: string, pepper: string): Promise<VerifiedApiKey | null> {
  if (!rawKey.startsWith(`${API_KEY_PREFIX}_`)) {
    return null;
  }

  const segments = rawKey.split("_");
  if (segments.length < 4) {
    return null;
  }

  const prefix = segments[2];
  const snap = await db.collection(API_KEYS_COLLECTION).doc(prefix).get();
  if (!snap.exists) {
    return null;
  }

  const data = snap.data() as ApiKeyDoc;
  if (data.status !== "active") {
    return null;
  }
  if (data.expiresAt && data.expiresAt <= nowIso()) {
    return null;
  }

  const computedHash = createApiKeyHash(rawKey, pepper);
  if (!safeHashEquals(computedHash, data.keyHash)) {
    return null;
  }

  return {
    id: snap.id,
    userId: data.userId,
    scopes: data.scopes,
    name: data.name,
  };
}

export async function markApiKeyUsed(keyId: string): Promise<void> {
  await db.collection(API_KEYS_COLLECTION).doc(keyId).set(
    { lastUsedAt: nowIso() },
    { merge: true },
  );
}

export async function checkAndConsumeRateLimit(keyId: string, limit = API_RATE_LIMIT_PER_MINUTE): Promise<void> {
  const bucket = minuteBucket();
  const rateDocId = `${keyId}_${bucket}`;
  const rateDocRef = db.collection(API_RATE_LIMITS_COLLECTION).doc(rateDocId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateDocRef);
    const currentCount = Number(snap.data()?.count || 0);
    if (currentCount >= limit) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    tx.set(
      rateDocRef,
      {
        keyId,
        bucket,
        count: currentCount + 1,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  });
}

export async function writeApiAuditLog(input: {
  keyId: string;
  userId: string;
  resource: ExportResource;
  statusCode: number;
  request: Request;
  pepper: string;
  format: "json" | "ndjson";
  responseBytes: number;
  query: Record<string, unknown>;
}): Promise<void> {
  const ipAddress = extractIpAddress(input.request);
  const userAgent = input.request.get("user-agent") || "unknown";

  await db.collection(API_AUDIT_LOGS_COLLECTION).add({
    keyId: input.keyId,
    userId: input.userId,
    resource: input.resource,
    statusCode: input.statusCode,
    format: input.format,
    responseBytes: input.responseBytes,
    ipHash: hashForLogs(ipAddress, input.pepper),
    userAgent,
    query: input.query,
    createdAt: nowIso(),
  });
}
