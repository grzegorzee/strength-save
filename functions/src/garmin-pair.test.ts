import { describe, it, expect, vi } from "vitest";
import {
  startPairing,
  exchangeCode,
  authenticateDevice,
  hashSecret,
  deviceIdFromTokenHash,
  PAIR_CODE_TTL_MS,
  type GarminPairDeps,
  type PairCodeDoc,
  type DeviceTokenDoc,
} from "./garmin-pair";

const PEPPER = "test-pepper";
const NOW = 1_752_960_000_000;

const makeDeps = (over: Partial<GarminPairDeps> = {}) => {
  const pairCodes = new Map<string, PairCodeDoc>();
  const tokens = new Map<string, DeviceTokenDoc>();
  const deps: GarminPairDeps = {
    getPairCode: vi.fn(async (hash: string) => pairCodes.get(hash) ?? null),
    savePairCode: vi.fn(async (hash: string, doc: PairCodeDoc) => { pairCodes.set(hash, doc); }),
    markCodeUsed: vi.fn(async (hash: string) => {
      const doc = pairCodes.get(hash);
      if (doc) pairCodes.set(hash, { ...doc, usedAt: NOW });
    }),
    saveDeviceToken: vi.fn(async (hash: string, doc: DeviceTokenDoc) => { tokens.set(hash, doc); }),
    getDeviceToken: vi.fn(async (hash: string) => tokens.get(hash) ?? null),
    touchDeviceToken: vi.fn(async () => undefined),
    now: () => NOW,
    randomCode: () => "123456",
    randomToken: () => "tok_abcdefghijklmnopqrstuvwxyz012345",
    pepper: PEPPER,
    ...over,
  };
  return { deps, pairCodes, tokens };
};

describe("startPairing (Z125)", () => {
  it("generuje 6-cyfrowy kod z TTL 10 min i zapisuje TYLKO hash", async () => {
    const { deps, pairCodes } = makeDeps();
    const out = await startPairing(deps, "user-1", "Fenix 8");
    expect(out.code).toMatch(/^\d{6}$/);
    expect(out.expiresAt).toBe(NOW + PAIR_CODE_TTL_MS);
    const stored = [...pairCodes.entries()][0];
    expect(stored[0]).toBe(hashSecret(out.code, PEPPER));
    expect(stored[0]).not.toContain(out.code);
    expect(stored[1]).toMatchObject({ uid: "user-1", label: "Fenix 8", usedAt: null });
  });
});

describe("exchangeCode (Z125)", () => {
  it("poprawny kod => token urządzenia (w Firestore tylko hash), kod oznaczony jako zużyty", async () => {
    const { deps, tokens } = makeDeps();
    await startPairing(deps, "user-1", "Fenix 8");
    const out = await exchangeCode(deps, "123456");
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error("unreachable");
    expect(out.token.length).toBeGreaterThanOrEqual(32);
    const tokenHash = hashSecret(out.token, PEPPER);
    expect(tokens.get(tokenHash)).toMatchObject({ uid: "user-1", label: "Fenix 8", revokedAt: null });
    expect(out.deviceId).toBe(deviceIdFromTokenHash(tokenHash));
    expect(deps.markCodeUsed).toHaveBeenCalled();
  });

  it("zły kod => invalid (bez ujawniania czy istnieje)", async () => {
    const { deps } = makeDeps();
    await startPairing(deps, "user-1", "Fenix 8");
    const out = await exchangeCode(deps, "999999");
    expect(out).toEqual({ ok: false, reason: "invalid" });
  });

  it("wygasły kod odrzucony", async () => {
    const { deps } = makeDeps();
    await startPairing(deps, "user-1", "Fenix 8");
    const late = { ...deps, now: () => NOW + PAIR_CODE_TTL_MS + 1 };
    const out = await exchangeCode(late, "123456");
    expect(out).toEqual({ ok: false, reason: "expired" });
  });

  it("drugi raz ten sam kod odrzucony (jednorazowość)", async () => {
    const { deps } = makeDeps();
    await startPairing(deps, "user-1", "Fenix 8");
    expect((await exchangeCode(deps, "123456")).ok).toBe(true);
    const out = await exchangeCode(deps, "123456");
    expect(out).toEqual({ ok: false, reason: "used" });
  });

  it("kod niepoprawny formalnie odrzucany bez odczytu bazy", async () => {
    const { deps } = makeDeps();
    const out = await exchangeCode(deps, "12ab!");
    expect(out).toEqual({ ok: false, reason: "invalid" });
    expect(deps.getPairCode).not.toHaveBeenCalled();
  });
});

describe("authenticateDevice (Z125)", () => {
  it("poprawny token => uid + deviceId, lastUsedAt dotknięty", async () => {
    const { deps } = makeDeps();
    await startPairing(deps, "user-1", "Fenix 8");
    const pair = await exchangeCode(deps, "123456");
    if (!pair.ok) throw new Error("pairing failed");
    const auth = await authenticateDevice(deps, pair.token);
    expect(auth).toMatchObject({ uid: "user-1", deviceId: pair.deviceId });
    expect(deps.touchDeviceToken).toHaveBeenCalled();
  });

  it("nieznany albo cofnięty token => null", async () => {
    const { deps, tokens } = makeDeps();
    expect(await authenticateDevice(deps, "nie-ma-takiego")).toBeNull();

    await startPairing(deps, "user-1", "Fenix 8");
    const pair = await exchangeCode(deps, "123456");
    if (!pair.ok) throw new Error("pairing failed");
    const tokenHash = hashSecret(pair.token, PEPPER);
    tokens.set(tokenHash, { ...tokens.get(tokenHash)!, revokedAt: NOW });
    expect(await authenticateDevice(deps, pair.token)).toBeNull();
  });
});
