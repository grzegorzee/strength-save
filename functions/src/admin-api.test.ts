import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import type { Request } from "firebase-functions/v2/https";

const { store } = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
}));

vi.mock("firebase-admin", () => ({
  firestore: vi.fn(() => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = store.get(`${name}/${id}`);
          return { exists: data !== undefined, id, data: () => data };
        },
      }),
    }),
  })),
}));

import {
  API_KEYS_COLLECTION,
  decodeCursor,
  encodeCursor,
  extractIpAddress,
  hasScope,
  hashForLogs,
  normalizeApiKeyName,
  parseDateParam,
  parseFormat,
  parseLimit,
  parseResource,
  verifyApiKey,
  type ApiKeyDoc,
} from "./admin-api";

const PEPPER = "test-pepper";

function keyHash(rawKey: string): string {
  return createHash("sha256").update(`${PEPPER}:${rawKey}`).digest("hex");
}

function seedApiKey(prefix: string, rawKey: string, overrides: Partial<ApiKeyDoc> = {}): void {
  store.set(`${API_KEYS_COLLECTION}/${prefix}`, {
    userId: "user-1",
    name: "test key",
    prefix,
    keyHash: keyHash(rawKey),
    scopes: ["export:full"],
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUsedAt: null,
    revokedAt: null,
    expiresAt: null,
    rotatedFrom: null,
    ...overrides,
  });
}

describe("normalizeApiKeyName", () => {
  it("trims and caps at 80 chars", () => {
    expect(normalizeApiKeyName("  my key  ")).toBe("my key");
    expect(normalizeApiKeyName("x".repeat(120))).toHaveLength(80);
  });

  it("throws on empty or non-string input", () => {
    expect(() => normalizeApiKeyName("")).toThrow();
    expect(() => normalizeApiKeyName("   ")).toThrow();
    expect(() => normalizeApiKeyName(undefined)).toThrow();
    expect(() => normalizeApiKeyName(42)).toThrow();
  });
});

describe("parseResource", () => {
  it("accepts known resources and defaults to full", () => {
    expect(parseResource("workouts")).toBe("workouts");
    expect(parseResource("plan-cycles")).toBe("plan-cycles");
    expect(parseResource("everything")).toBe("full");
    expect(parseResource(undefined)).toBe("full");
  });
});

describe("parseLimit", () => {
  it("clamps to 1..1000 and floors", () => {
    expect(parseLimit(50)).toBe(50);
    expect(parseLimit("50")).toBe(50);
    expect(parseLimit(0)).toBe(1);
    expect(parseLimit(-5)).toBe(1);
    expect(parseLimit(5000)).toBe(1000);
    expect(parseLimit(12.9)).toBe(12);
  });

  it("falls back on non-numeric input", () => {
    expect(parseLimit("abc")).toBe(250);
    expect(parseLimit(undefined, 100)).toBe(100);
  });
});

describe("parseDateParam", () => {
  it("accepts YYYY-MM-DD only", () => {
    expect(parseDateParam("2026-06-10")).toBe("2026-06-10");
    expect(parseDateParam("2026-6-1")).toBeNull();
    expect(parseDateParam("10-06-2026")).toBeNull();
    expect(parseDateParam(20260610)).toBeNull();
    expect(parseDateParam(undefined)).toBeNull();
  });
});

describe("cursor round-trip", () => {
  it("encodes and decodes offsets", () => {
    const cursor = encodeCursor(120);
    expect(cursor).toBeTruthy();
    expect(decodeCursor(cursor)).toBe(120);
  });

  it("returns null cursor for offset 0 and 0 for garbage", () => {
    expect(encodeCursor(0)).toBeNull();
    expect(decodeCursor("")).toBe(0);
    expect(decodeCursor("not-base64!!")).toBe(0);
    expect(decodeCursor(undefined)).toBe(0);
    expect(decodeCursor(Buffer.from("{\"offset\":\"x\"}").toString("base64url"))).toBe(0);
  });
});

describe("parseFormat", () => {
  it("defaults to json", () => {
    expect(parseFormat("ndjson")).toBe("ndjson");
    expect(parseFormat("json")).toBe("json");
    expect(parseFormat("xml")).toBe("json");
  });
});

describe("extractIpAddress", () => {
  const makeReq = (headers: Record<string, unknown>, ip?: string) => (
    { headers, ip } as unknown as Request
  );

  it("uses x-forwarded-for (array, comma string), then req.ip", () => {
    expect(extractIpAddress(makeReq({ "x-forwarded-for": ["1.2.3.4", "5.6.7.8"] }))).toBe("1.2.3.4");
    expect(extractIpAddress(makeReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(extractIpAddress(makeReq({}, "9.9.9.9"))).toBe("9.9.9.9");
    expect(extractIpAddress(makeReq({}))).toBe("unknown");
  });
});

describe("hashForLogs", () => {
  it("is deterministic and pepper-dependent", () => {
    expect(hashForLogs("1.2.3.4", "a")).toBe(hashForLogs("1.2.3.4", "a"));
    expect(hashForLogs("1.2.3.4", "a")).not.toBe(hashForLogs("1.2.3.4", "b"));
  });
});

describe("hasScope", () => {
  it("export:full grants every resource", () => {
    expect(hasScope(["export:full"], "workouts")).toBe(true);
    expect(hasScope(["export:full"], "full")).toBe(true);
  });

  it("narrow scopes grant only their resource", () => {
    expect(hasScope(["export:workouts"], "workouts")).toBe(true);
    expect(hasScope(["export:workouts"], "measurements")).toBe(false);
    expect(hasScope([], "workouts")).toBe(false);
  });
});

describe("verifyApiKey", () => {
  it("verifies a valid active key", async () => {
    const rawKey = "ss_live_abc123_secretsecretsecret";
    seedApiKey("abc123", rawKey);

    const verified = await verifyApiKey(rawKey, PEPPER);
    expect(verified).toEqual({
      id: "abc123",
      userId: "user-1",
      scopes: ["export:full"],
      name: "test key",
    });
  });

  it("rejects wrong secret, revoked, expired and unknown keys", async () => {
    const rawKey = "ss_live_def456_correctsecret";
    seedApiKey("def456", rawKey);
    expect(await verifyApiKey("ss_live_def456_wrongsecret", PEPPER)).toBeNull();

    seedApiKey("ghi789", "ss_live_ghi789_secret", { status: "revoked" });
    expect(await verifyApiKey("ss_live_ghi789_secret", PEPPER)).toBeNull();

    seedApiKey("jkl012", "ss_live_jkl012_secret", { expiresAt: "2020-01-01T00:00:00.000Z" });
    expect(await verifyApiKey("ss_live_jkl012_secret", PEPPER)).toBeNull();

    expect(await verifyApiKey("ss_live_nosuch_secret", PEPPER)).toBeNull();
  });

  it("rejects malformed keys without touching the db", async () => {
    expect(await verifyApiKey("pk_live_abc_secret", PEPPER)).toBeNull();
    expect(await verifyApiKey("ss_live_onlythree", PEPPER)).toBeNull();
    expect(await verifyApiKey("", PEPPER)).toBeNull();
  });

  it("rejects a valid key when the pepper differs", async () => {
    const rawKey = "ss_live_mno345_secret";
    seedApiKey("mno345", rawKey);
    expect(await verifyApiKey(rawKey, "other-pepper")).toBeNull();
  });
});
