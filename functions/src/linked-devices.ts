import { createHmac, timingSafeEqual } from "node:crypto";
import { DEVICE_TOKEN_TTL_MS, deviceIdFromTokenHash, type DeviceTokenDoc } from "./garmin-pair";
import {
  resolveGarminEntitlement,
  type GarminEntitlementProfile,
  type GarminEntitlementTier,
} from "./garmin-entitlement";

export type DevicePlatform = "apple_watch" | "garmin";
export type DeviceSyncStatus = "synced" | "pending" | "error" | "offline";
export type DeviceIntegrationStatus = "unknown" | "ready" | "active" | "saved" | "discarded" | "unavailable";

export interface LinkedDevice {
  deviceId: string;
  platform: DevicePlatform;
  label: string;
  pairedAt: number;
  lastSeenAt: number | null;
  lastSyncAt: number | null;
  pendingEvents: number | null;
  integration: "healthkit" | "fit";
  integrationStatus: DeviceIntegrationStatus;
  syncStatus: DeviceSyncStatus;
}

export interface GarminCapabilityEnvelope {
  v: 1;
  a: 0 | 1;
  t: GarminEntitlementTier;
  x?: number;
  /** Server issuance epoch ms. */
  i: number;
  /** Truncated HMAC; the watch treats it as opaque and sends it back on ingest. */
  s: string;
}

const capabilityMessage = (
  envelope: Omit<GarminCapabilityEnvelope, "s">,
  deviceId: string,
): string => [envelope.v, envelope.a, envelope.t, envelope.x ?? "", envelope.i, deviceId].join(".");

const capabilitySignature = (
  envelope: Omit<GarminCapabilityEnvelope, "s">,
  deviceId: string,
  secret: string,
): string => createHmac("sha256", secret)
  .update(capabilityMessage(envelope, deviceId))
  .digest("hex")
  .slice(0, 32);

export function buildGarminCapabilityEnvelope(
  profile: GarminEntitlementProfile | undefined,
  deviceId: string,
  secret: string,
  now = Date.now(),
): GarminCapabilityEnvelope {
  const entitlement = resolveGarminEntitlement(profile, now);
  const unsigned = {
    ...entitlement.snapshot,
    i: now,
  } satisfies Omit<GarminCapabilityEnvelope, "s">;
  return { ...unsigned, s: capabilitySignature(unsigned, deviceId, secret) };
}

export function verifyGarminCapabilityEnvelope(
  envelope: GarminCapabilityEnvelope,
  deviceId: string,
  secret: string,
): boolean {
  const { s, ...unsigned } = envelope;
  const expected = capabilitySignature(unsigned, deviceId, secret);
  const actualBuffer = Buffer.from(s);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

const boundedCount = (value: unknown): number | null => (
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 500
    ? Math.floor(value)
    : null
);

const integrationStatus = (value: unknown): DeviceIntegrationStatus => (
  value === "ready" || value === "active" || value === "saved"
    || value === "discarded" || value === "unavailable"
    ? value
    : "unknown"
);

export function buildLinkedGarminDevice(
  tokenHash: string,
  doc: DeviceTokenDoc,
  now = Date.now(),
): LinkedDevice | null {
  if (doc.revokedAt !== null) return null;
  if (now > (doc.expiresAt ?? doc.createdAt + DEVICE_TOKEN_TTL_MS)) return null;
  const pendingEvents = boundedCount(doc.pendingEvents) ?? 0;
  const lastError = typeof doc.lastError === "string" && doc.lastError.length > 0;
  return {
    deviceId: deviceIdFromTokenHash(tokenHash),
    platform: "garmin",
    label: doc.label,
    pairedAt: doc.createdAt,
    lastSeenAt: doc.lastUsedAt,
    lastSyncAt: typeof doc.lastSyncAt === "number" ? doc.lastSyncAt : null,
    pendingEvents,
    integration: "fit",
    integrationStatus: integrationStatus(doc.fitStatus),
    syncStatus: lastError ? "error" : pendingEvents > 0 ? "pending" : "synced",
  };
}

export interface AppleWatchStatusReport {
  deviceId: string;
  label: string;
  paired: boolean;
  watchAppInstalled: boolean;
  reachable: boolean;
  pendingEvents: number;
  healthStatus: DeviceIntegrationStatus;
  lastSyncAt: number | null;
}

export interface AppleWatchStatusDoc extends AppleWatchStatusReport {
  uid: string;
  platform: "apple_watch";
  pairedAt: number;
  lastSeenAt: number;
  revokedAt: number | null;
}

export function parseAppleWatchStatusReport(raw: unknown): AppleWatchStatusReport | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const deviceId = typeof value.deviceId === "string" ? value.deviceId.trim() : "";
  if (!/^watch-[A-Za-z0-9-]{8,80}$/.test(deviceId)) return null;
  const pendingEvents = boundedCount(value.pendingEvents);
  if (pendingEvents === null) return null;
  const lastSyncAt = value.lastSyncAt === null || value.lastSyncAt === undefined
    ? null
    : typeof value.lastSyncAt === "number" && Number.isFinite(value.lastSyncAt) && value.lastSyncAt >= 0
      ? value.lastSyncAt
      : null;
  return {
    deviceId,
    label: typeof value.label === "string" && value.label.trim()
      ? value.label.trim().slice(0, 40)
      : "Apple Watch",
    paired: value.paired === true,
    watchAppInstalled: value.watchAppInstalled === true,
    reachable: value.reachable === true,
    pendingEvents,
    healthStatus: integrationStatus(value.healthStatus),
    lastSyncAt,
  };
}

export function buildLinkedAppleWatchDevice(doc: AppleWatchStatusDoc): LinkedDevice | null {
  if (doc.revokedAt !== null || !doc.paired || !doc.watchAppInstalled) return null;
  const pendingEvents = boundedCount(doc.pendingEvents) ?? 0;
  return {
    deviceId: doc.deviceId,
    platform: "apple_watch",
    label: doc.label,
    pairedAt: doc.pairedAt,
    lastSeenAt: doc.lastSeenAt,
    lastSyncAt: doc.lastSyncAt,
    pendingEvents,
    integration: "healthkit",
    integrationStatus: integrationStatus(doc.healthStatus),
    syncStatus: pendingEvents > 0 ? "pending" : doc.reachable ? "synced" : "offline",
  };
}
