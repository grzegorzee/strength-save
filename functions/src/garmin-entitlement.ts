export type GarminEntitlementTier = "monthly" | "yearly" | "trial" | "comp" | "none";

export interface GarminEntitlementProfile {
  role?: unknown;
  status?: unknown;
  access?: { enabled?: unknown } | null;
  subscription?: {
    tier?: unknown;
    status?: unknown;
    expiresAt?: unknown;
  } | null;
}

export interface GarminCapabilitySnapshot {
  /** Capability contract version. */
  v: 1;
  /** Active PRO capability (1/0 keeps Connect IQ JSON compact). */
  a: 0 | 1;
  /** Entitlement tier; never contains product/store identifiers. */
  t: GarminEntitlementTier;
  /** Expiry epoch ms; omitted for admin, indefinite comp and unavailable states. */
  x?: number;
}

export interface GarminEntitlementResult {
  active: boolean;
  tier: GarminEntitlementTier;
  expiresAt: number | null;
  reason: "active" | "inactive-profile" | "missing" | "expired" | "incomplete";
  snapshot: GarminCapabilitySnapshot;
}

const TIERS = new Set<GarminEntitlementTier>(["monthly", "yearly", "trial", "comp", "none"]);

const result = (
  active: boolean,
  tier: GarminEntitlementTier,
  expiresAt: number | null,
  reason: GarminEntitlementResult["reason"],
): GarminEntitlementResult => ({
  active,
  tier,
  expiresAt,
  reason,
  snapshot: {
    v: 1,
    a: active ? 1 : 0,
    t: tier,
    ...(expiresAt !== null ? { x: expiresAt } : {}),
  },
});

/** Server-side mirror of the Firestore/RevenueCat PRO contract used by clients. */
export function resolveGarminEntitlement(
  profile: GarminEntitlementProfile | undefined,
  now = Date.now(),
): GarminEntitlementResult {
  if (!profile) return result(false, "none", null, "missing");
  const profileActive = (profile.status === undefined || profile.status === "active")
    && profile.access?.enabled !== false;
  if (!profileActive) return result(false, "none", null, "inactive-profile");
  if (profile.role === "admin") return result(true, "comp", null, "active");

  const subscription = profile.subscription;
  const tier = TIERS.has(subscription?.tier as GarminEntitlementTier)
    ? subscription!.tier as GarminEntitlementTier
    : "none";
  if (tier === "comp") {
    if (subscription?.status !== "active") return result(false, tier, null, "expired");
    // Bug 21 (X30): grant admina może mieć datę końca (+30/+90/+365 z panelu) —
    // wygasa identycznie jak u klienta (isSubscriptionActive); brak daty = bezterminowo.
    if (typeof subscription.expiresAt !== "string" || subscription.expiresAt === "") {
      return result(true, tier, null, "active");
    }
    const compExpiresAt = Date.parse(subscription.expiresAt);
    if (!Number.isFinite(compExpiresAt)) return result(false, tier, null, "incomplete");
    return compExpiresAt > now
      ? result(true, tier, compExpiresAt, "active")
      : result(false, tier, compExpiresAt, "expired");
  }
  if (subscription?.status !== "active" && subscription?.status !== "billing_issue") {
    return result(false, tier, null, "missing");
  }
  if (typeof subscription.expiresAt !== "string") return result(false, tier, null, "incomplete");
  const expiresAt = Date.parse(subscription.expiresAt);
  if (!Number.isFinite(expiresAt)) return result(false, tier, null, "incomplete");
  return expiresAt > now
    ? result(true, tier, expiresAt, "active")
    : result(false, tier, expiresAt, "expired");
}
