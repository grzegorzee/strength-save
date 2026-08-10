import { describe, expect, it } from "vitest";
import {
  buildGarminCapabilityEnvelope,
  buildLinkedGarminDevice,
  parseAppleWatchStatusReport,
  verifyGarminCapabilityEnvelope,
} from "./linked-devices";

const NOW = Date.parse("2026-08-10T12:00:00.000Z");

describe("linked device contract (Z227)", () => {
  it("returns a minimal signed Garmin capability without store identifiers", () => {
    const envelope = buildGarminCapabilityEnvelope({
      status: "active",
      subscription: {
        tier: "yearly",
        status: "active",
        expiresAt: "2026-09-10T12:00:00.000Z",
      },
    }, "device-123", "server-secret", NOW);

    expect(envelope).toMatchObject({ v: 1, a: 1, t: "yearly", i: NOW });
    expect(envelope.s).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(envelope)).not.toContain("product");
    expect(verifyGarminCapabilityEnvelope(envelope, "device-123", "server-secret")).toBe(true);
    expect(verifyGarminCapabilityEnvelope({ ...envelope, a: 0 }, "device-123", "server-secret")).toBe(false);
  });

  it("normalizes Garmin pending/FIT state and rejects revoked or expired devices", () => {
    expect(buildLinkedGarminDevice("abcdef1234567890", {
      uid: "u1",
      label: "Fenix 8",
      createdAt: NOW - 10_000,
      lastUsedAt: NOW - 1_000,
      revokedAt: null,
      expiresAt: NOW + 10_000,
      lastSyncAt: NOW - 2_000,
      pendingEvents: 3,
      fitStatus: "saved",
      lastError: null,
    }, NOW)).toEqual({
      deviceId: "abcdef123456",
      platform: "garmin",
      label: "Fenix 8",
      pairedAt: NOW - 10_000,
      lastSeenAt: NOW - 1_000,
      lastSyncAt: NOW - 2_000,
      pendingEvents: 3,
      integration: "fit",
      integrationStatus: "saved",
      syncStatus: "pending",
    });

    expect(buildLinkedGarminDevice("abcdef1234567890", {
      uid: "u1", label: "Fenix 8", createdAt: NOW, lastUsedAt: NOW,
      revokedAt: NOW, expiresAt: NOW + 10_000,
    }, NOW)).toBeNull();
  });

  it("accepts only bounded Apple Watch reports and keeps pending events", () => {
    expect(parseAppleWatchStatusReport({
      deviceId: "watch-12345678-1234-1234-1234-123456789012",
      label: "Apple Watch",
      paired: true,
      watchAppInstalled: true,
      reachable: false,
      pendingEvents: 4,
      healthStatus: "active",
      lastSyncAt: NOW - 500,
    })).toMatchObject({ pendingEvents: 4, healthStatus: "active", reachable: false });
    expect(parseAppleWatchStatusReport({ deviceId: "x", pendingEvents: -1 })).toBeNull();
  });
});
