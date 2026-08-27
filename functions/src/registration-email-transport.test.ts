import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("registration email transport contract", () => {
  const source = readFileSync(new URL("./registration.ts", import.meta.url), "utf8");

  it("uses the shared Amazon SES transport without a Resend fallback", () => {
    expect(source).toContain('from "./ses-email"');
    expect(source).toContain("sendSesEmail");
    expect(source).toContain("SES_EMAIL_SECRETS");
    expect(source).not.toContain('from "resend"');
    expect(source).not.toContain("RESEND_API_KEY");
    expect(source).not.toContain('transport: "resend"');
  });

  it("binds SES credentials to every callable that may send an email", () => {
    const emailCallables = [
      "syncUserProfile",
      "requestEmailVerificationCode",
      "verifyEmailCode",
      "createInvite",
      "updateUserAccess",
      "adminSendUserEmail",
      "adminResendVerification",
      "adminBroadcastEmail",
      "deleteOwnAccount",
    ];

    for (const callable of emailCallables) {
      expect(source).toMatch(new RegExp(
        `export const ${callable} = onCall\\(\\{ secrets: \\[\\.\\.\\.SES_EMAIL_SECRETS`,
      ));
    }
  });
});
