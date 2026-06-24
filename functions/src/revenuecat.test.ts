import { describe, expect, it } from "vitest";
import { mapEventToSubscription, resolveUid, shouldApplySubscriptionEvent } from "./revenuecat";

const NOW = "2026-06-11T12:00:00.000Z";
const EXP_MS = Date.parse("2026-07-11T12:00:00.000Z");

describe("resolveUid", () => {
  it("bierze app_user_id gdy to uid Firebase", () => {
    expect(resolveUid({ app_user_id: "abc123" })).toBe("abc123");
  });

  it("pomija anonimowe RC id i szuka w aliasach", () => {
    expect(resolveUid({
      app_user_id: "$RCAnonymousID:xyz",
      aliases: ["$RCAnonymousID:xyz", "firebase-uid-1"],
    })).toBe("firebase-uid-1");
  });

  it("zwraca null gdy wszystkie id anonimowe", () => {
    expect(resolveUid({ app_user_id: "$RCAnonymousID:xyz", aliases: ["$RCAnonymousID:abc"] })).toBeNull();
  });
});

describe("mapEventToSubscription", () => {
  it("INITIAL_PURCHASE w trialu => tier trial, active, willRenew", () => {
    const sub = mapEventToSubscription({
      type: "INITIAL_PURCHASE", product_id: "strengthsave_pro_yearly",
      period_type: "TRIAL", expiration_at_ms: EXP_MS,
    }, NOW);
    expect(sub).toMatchObject({ tier: "trial", status: "active", willRenew: true, expiresAt: "2026-07-11T12:00:00.000Z" });
  });

  it("RENEWAL yearly => tier yearly active", () => {
    const sub = mapEventToSubscription({
      type: "RENEWAL", product_id: "strengthsave_pro_yearly",
      period_type: "NORMAL", expiration_at_ms: EXP_MS,
    }, NOW);
    expect(sub).toMatchObject({ tier: "yearly", status: "active", willRenew: true });
  });

  it("RENEWAL monthly => tier monthly", () => {
    const sub = mapEventToSubscription({
      type: "RENEWAL", product_id: "strengthsave_pro_monthly",
      period_type: "NORMAL", expiration_at_ms: EXP_MS,
    }, NOW);
    expect(sub).toMatchObject({ tier: "monthly" });
  });

  it("CANCELLATION => dostęp zostaje (active), willRenew=false", () => {
    const sub = mapEventToSubscription({
      type: "CANCELLATION", product_id: "strengthsave_pro_monthly",
      period_type: "NORMAL", expiration_at_ms: EXP_MS,
    }, NOW);
    expect(sub).toMatchObject({ status: "active", willRenew: false });
  });

  it("BILLING_ISSUE => billing_issue (grace period)", () => {
    const sub = mapEventToSubscription({
      type: "BILLING_ISSUE", product_id: "strengthsave_pro_monthly", expiration_at_ms: EXP_MS,
    }, NOW);
    expect(sub).toMatchObject({ status: "billing_issue" });
  });

  it("EXPIRATION => tier none, expired", () => {
    const sub = mapEventToSubscription({
      type: "EXPIRATION", product_id: "strengthsave_pro_monthly", expiration_at_ms: EXP_MS,
    }, NOW);
    expect(sub).toMatchObject({ tier: "none", status: "expired", willRenew: false });
  });

  it("TEST i nieznane eventy => null (bez zmiany stanu)", () => {
    expect(mapEventToSubscription({ type: "TEST" }, NOW)).toBeNull();
    expect(mapEventToSubscription({ type: "SUBSCRIBER_ALIAS" }, NOW)).toBeNull();
  });

  it("nie pozwala starszemu EXPIRATION nadpisać nowszego RENEWAL", () => {
    const renewal = mapEventToSubscription({ type: "RENEWAL", id: "renewal-t2", event_timestamp_ms: 2_000, product_id: "strengthsave_pro_yearly" }, NOW)!;
    const expiration = mapEventToSubscription({ type: "EXPIRATION", id: "expiration-t1", event_timestamp_ms: 1_000 }, NOW)!;

    expect(shouldApplySubscriptionEvent(undefined, renewal)).toBe(true);
    expect(shouldApplySubscriptionEvent(renewal, expiration)).toBe(false);
  });

  it("ignoruje duplikat eventu RevenueCat", () => {
    const event = mapEventToSubscription({ type: "RENEWAL", id: "event-1", event_timestamp_ms: 2_000 }, NOW)!;
    expect(shouldApplySubscriptionEvent(event, event)).toBe(false);
  });
});
