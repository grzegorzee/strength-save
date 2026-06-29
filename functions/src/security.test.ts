import { describe, expect, it } from "vitest";

import {
  GDPR_DIRECT_DOC_COLLECTIONS,
  GDPR_UID_FIELD_COLLECTIONS,
  GDPR_USER_ID_COLLECTIONS,
  canUseApiExport,
  canUseStravaIntegration,
  hasCallableAppAccess,
  isValidStravaOAuthState,
  providerFromSignInProvider,
  providerGetsImmediateAccess,
  resendErrorMessage,
  type AccessProfile,
} from "./security";

const activeUser: AccessProfile = { role: "user", status: "active", access: { enabled: true } };
const pendingUser: AccessProfile = { role: "user", status: "pending_verification", access: { enabled: true } };
const adminUser: AccessProfile = { role: "admin", status: "active", access: { enabled: true } };

describe("providerFromSignInProvider", () => {
  it("maps known providers", () => {
    expect(providerFromSignInProvider("google.com")).toBe("google");
    expect(providerFromSignInProvider("apple.com")).toBe("apple");
    expect(providerFromSignInProvider("password")).toBe("password");
  });

  it("falls back to password for unknown values", () => {
    expect(providerFromSignInProvider("github.com")).toBe("password");
    expect(providerFromSignInProvider(undefined)).toBe("password");
    expect(providerFromSignInProvider(null)).toBe("password");
  });
});

describe("providerGetsImmediateAccess", () => {
  it("social providers get immediate access, password does not", () => {
    expect(providerGetsImmediateAccess("google")).toBe(true);
    expect(providerGetsImmediateAccess("apple")).toBe(true);
    expect(providerGetsImmediateAccess("password")).toBe(false);
  });
});

describe("hasCallableAppAccess", () => {
  it("allows active users with access enabled", () => {
    expect(hasCallableAppAccess(activeUser)).toBe(true);
    expect(hasCallableAppAccess({ status: "active", access: {} })).toBe(true);
    expect(hasCallableAppAccess({ status: "active", access: null })).toBe(true);
  });

  it("allows admin regardless of status", () => {
    expect(hasCallableAppAccess({ role: "admin", status: "suspended" })).toBe(true);
  });

  it("blocks pending_verification even with access.enabled=true", () => {
    expect(hasCallableAppAccess(pendingUser)).toBe(false);
  });

  it("blocks disabled access and missing profile DOC (undefined)", () => {
    expect(hasCallableAppAccess({ status: "active", access: { enabled: false } })).toBe(false);
    // Brak dokumentu profilu = brak dostępu (jak get() nieistniejącego doca w regułach).
    expect(hasCallableAppAccess(undefined)).toBe(false);
  });

  it("treats missing status as active — symetria z firestore.rules (#2)", () => {
    // Konta Google/legacy bez pola status: reguły pozwalają na zapis treningu,
    // callable (AI/Strava) musi traktować je tak samo, byle dokument profilu istniał.
    expect(hasCallableAppAccess({})).toBe(true);
    expect(hasCallableAppAccess({ role: "user", access: { enabled: true } })).toBe(true);
    // access.enabled === false nadal blokuje, nawet bez pola status.
    expect(hasCallableAppAccess({ access: { enabled: false } })).toBe(false);
    // jawnie nieaktywni nadal blokowani.
    expect(hasCallableAppAccess({ status: "pending_verification" })).toBe(false);
    expect(hasCallableAppAccess({ status: "suspended" })).toBe(false);
  });
});

describe("canUseApiExport", () => {
  it("requires admin role AND active status AND enabled access", () => {
    expect(canUseApiExport(adminUser)).toBe(true);
    expect(canUseApiExport({ role: "admin", status: "active", access: {} })).toBe(true);
    expect(canUseApiExport({ role: "admin", status: "pending_verification" })).toBe(false);
    expect(canUseApiExport({ role: "admin", status: "active", access: { enabled: false } })).toBe(false);
    expect(canUseApiExport(activeUser)).toBe(false);
    expect(canUseApiExport(undefined)).toBe(false);
  });
});

describe("canUseStravaIntegration", () => {
  it("allows admin and users with explicit features.strava === true", () => {
    expect(canUseStravaIntegration(adminUser)).toBe(true);
    expect(canUseStravaIntegration({ ...activeUser, features: { strava: true } })).toBe(true);
  });

  it("blocks active users without the feature flag", () => {
    expect(canUseStravaIntegration(activeUser)).toBe(false);
    expect(canUseStravaIntegration({ ...activeUser, features: { strava: "yes" } })).toBe(false);
    expect(canUseStravaIntegration({ ...activeUser, features: { strava: false } })).toBe(false);
  });

  it("blocks users without app access even with the feature flag", () => {
    expect(canUseStravaIntegration({ ...pendingUser, features: { strava: true } })).toBe(false);
    expect(canUseStravaIntegration(undefined)).toBe(false);
  });
});

describe("isValidStravaOAuthState", () => {
  it("accepts base64url-like strings of 32-256 chars", () => {
    expect(isValidStravaOAuthState("a".repeat(32))).toBe(true);
    expect(isValidStravaOAuthState("Ab1-_".repeat(20))).toBe(true);
    expect(isValidStravaOAuthState("z".repeat(256))).toBe(true);
  });

  it("rejects short, overlong, malformed and non-string state", () => {
    expect(isValidStravaOAuthState("a".repeat(31))).toBe(false);
    expect(isValidStravaOAuthState("z".repeat(257))).toBe(false);
    expect(isValidStravaOAuthState("a".repeat(31) + "!")).toBe(false);
    expect(isValidStravaOAuthState("a".repeat(16) + " " + "a".repeat(16))).toBe(false);
    expect(isValidStravaOAuthState(123)).toBe(false);
    expect(isValidStravaOAuthState(null)).toBe(false);
    expect(isValidStravaOAuthState(undefined)).toBe(false);
  });
});

describe("resendErrorMessage", () => {
  it("returns the provider error message when present", () => {
    expect(resendErrorMessage({ error: { message: "domain not verified" } })).toBe("domain not verified");
  });

  it("returns null when the send succeeded or message is empty", () => {
    expect(resendErrorMessage({})).toBeNull();
    expect(resendErrorMessage({ error: null })).toBeNull();
    expect(resendErrorMessage({ error: { message: "" } })).toBeNull();
    expect(resendErrorMessage({ error: { message: null } })).toBeNull();
  });
});

describe("GDPR collection coverage", () => {
  it("covers all per-userId collections required by the audit plan", () => {
    expect(GDPR_USER_ID_COLLECTIONS).toEqual(expect.arrayContaining([
      "workouts",
      "measurements",
      "plan_cycles",
      "strava_activities",
      "api_audit_logs",
      "notification_logs",
    ]));
  });

  it("covers uid-keyed and direct-doc collections", () => {
    expect(GDPR_UID_FIELD_COLLECTIONS).toContain("email_verification_codes");
    expect(GDPR_DIRECT_DOC_COLLECTIONS).toEqual(expect.arrayContaining([
      "strava_connections",
      "training_plans",
      "users",
    ]));
  });
});
