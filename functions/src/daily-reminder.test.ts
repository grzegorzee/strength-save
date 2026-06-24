import { describe, expect, it } from "vitest";
import { getInvalidFcmTokens } from "./daily-reminder";

describe("getInvalidFcmTokens", () => {
  it("keeps only tokens rejected permanently by FCM", () => {
    expect(getInvalidFcmTokens(["valid", "expired", "transient"], [
      { success: true },
      { success: false, error: { code: "messaging/registration-token-not-registered" } },
      { success: false, error: { code: "messaging/internal-error" } },
    ])).toEqual(["expired"]);
  });
});
