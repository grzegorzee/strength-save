import { describe, expect, it } from "vitest";
import { resolveGarminEntitlement } from "./garmin-entitlement";

const NOW = Date.parse("2026-08-10T12:00:00.000Z");
const FUTURE = "2026-08-17T12:00:00.000Z";
const PAST = "2026-08-03T12:00:00.000Z";

describe("resolveGarminEntitlement (X25/Z226)", () => {
  it("accepts admin, active comp, paid and grace-period access", () => {
    expect(resolveGarminEntitlement({ role: "admin", status: "active" }, NOW))
      .toMatchObject({ active: true, tier: "comp" });
    expect(resolveGarminEntitlement({
      status: "active", access: { enabled: true },
      subscription: { tier: "comp", status: "active", expiresAt: null },
    }, NOW)).toMatchObject({ active: true, tier: "comp" });
    expect(resolveGarminEntitlement({
      status: "active", subscription: { tier: "monthly", status: "active", expiresAt: FUTURE },
    }, NOW)).toMatchObject({ active: true, tier: "monthly", expiresAt: Date.parse(FUTURE) });
    expect(resolveGarminEntitlement({
      status: "active", subscription: { tier: "yearly", status: "billing_issue", expiresAt: FUTURE },
    }, NOW)).toMatchObject({ active: true, tier: "yearly" });
  });

  it("fails closed for missing, disabled, deleted, expired and incomplete profiles", () => {
    expect(resolveGarminEntitlement(undefined, NOW).active).toBe(false);
    expect(resolveGarminEntitlement({ role: "admin", status: "deleted" }, NOW).active).toBe(false);
    expect(resolveGarminEntitlement({
      status: "active", access: { enabled: false },
      subscription: { tier: "comp", status: "active", expiresAt: null },
    }, NOW).active).toBe(false);
    expect(resolveGarminEntitlement({
      status: "active", subscription: { tier: "monthly", status: "active", expiresAt: PAST },
    }, NOW)).toMatchObject({ active: false, reason: "expired" });
    expect(resolveGarminEntitlement({
      status: "active", subscription: { tier: "monthly", status: "active" },
    }, NOW).active).toBe(false);
  });

  it("emits a compact server-confirmed capability snapshot without store secrets", () => {
    const entitlement = resolveGarminEntitlement({
      status: "active",
      subscription: { tier: "trial", status: "active", expiresAt: FUTURE, productId: "ios-secret-ish" },
    }, NOW);
    expect(entitlement.snapshot).toEqual({ v: 1, a: 1, t: "trial", x: Date.parse(FUTURE) });
    expect(JSON.stringify(entitlement.snapshot)).not.toContain("productId");
  });
});
