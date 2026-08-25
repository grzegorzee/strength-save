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

  // Bug 21 (X30): datowany grant comp (panel admina +30/+90/+365 dni) wygasa na
  // zegarku tak samo jak u klienta (isSubscriptionActive) — koniec z dożywotnim a=1.
  it("comp z przyszłą datą jest aktywny i deklaruje koniec (x) zegarkowi", () => {
    const entitlement = resolveGarminEntitlement({
      status: "active", subscription: { tier: "comp", status: "active", expiresAt: FUTURE },
    }, NOW);
    expect(entitlement).toMatchObject({ active: true, tier: "comp", expiresAt: Date.parse(FUTURE), reason: "active" });
    expect(entitlement.snapshot).toEqual({ v: 1, a: 1, t: "comp", x: Date.parse(FUTURE) });
  });

  it("comp z przeszłą albo niepoprawną datą wygasa (fail closed)", () => {
    expect(resolveGarminEntitlement({
      status: "active", subscription: { tier: "comp", status: "active", expiresAt: PAST },
    }, NOW)).toMatchObject({ active: false, tier: "comp", reason: "expired" });
    expect(resolveGarminEntitlement({
      status: "active", subscription: { tier: "comp", status: "active", expiresAt: "not-a-date" },
    }, NOW)).toMatchObject({ active: false, tier: "comp", reason: "incomplete" });
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
