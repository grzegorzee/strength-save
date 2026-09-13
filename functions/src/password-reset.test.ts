import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";

// Moduł rejestracji ciągnie firebase-admin i sekrety; tu testujemy rdzeń
// z wstrzykniętymi zależnościami, więc transport mailowy jest atrapą.
vi.mock("./registration", () => ({ sendTransactionalEmail: vi.fn() }));

import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_DAILY_LIMIT,
  requestPasswordResetCore,
  rewriteResetLink,
  type PasswordResetRateDoc,
} from "./password-reset";
import { passwordResetEmailHtml, passwordResetSubject } from "./email-templates";

const FIREBASE_LINK =
  "https://fittracker-workouts.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC123&apiKey=KEY&lang=pl";

describe("rewriteResetLink", () => {
  it("przenosi link na auth.strengthsave.app i ustawia język, zachowując oobCode i apiKey", () => {
    const link = rewriteResetLink(FIREBASE_LINK, "en");
    const url = new URL(link);
    expect(url.origin).toBe("https://auth.strengthsave.app");
    expect(url.pathname).toBe("/__/auth/action");
    expect(url.searchParams.get("mode")).toBe("resetPassword");
    expect(url.searchParams.get("oobCode")).toBe("ABC123");
    expect(url.searchParams.get("apiKey")).toBe("KEY");
    expect(url.searchParams.get("lang")).toBe("en");
  });

  it("odrzuca link spoza handlera Firebase Auth (nie przepisuje dowolnego URL-a)", () => {
    expect(() => rewriteResetLink("https://evil.example.com/x?oobCode=1", "pl")).toThrow();
  });
});

describe("passwordResetEmailHtml", () => {
  const link = "https://auth.strengthsave.app/__/auth/action?mode=resetPassword&oobCode=A&apiKey=K&lang=pl";
  // Link w HTML jest escapowany (& -> &amp;). Trzy wystąpienia: href przycisku,
  // href linku zapasowego i jego widoczny tekst (do skopiowania).
  const htmlLink = link.replace(/&/g, "&amp;");

  it("PL: przycisk + ten sam link jako tekst zapasowy", () => {
    const html = passwordResetEmailHtml(link, "ktos@example.com", "pl");
    expect(html).toContain("Ustaw nowe hasło");
    expect(html).toContain("Przycisk nie działa?");
    expect(html.split(htmlLink).length - 1).toBe(3);
    expect(html).toContain("ktos@example.com");
    expect(passwordResetSubject("pl")).toBe("Strength Save: ustaw nowe hasło");
  });

  it("EN: przycisk + link zapasowy, zero polskich znaków", () => {
    const html = passwordResetEmailHtml(link, "ktos@example.com", "en");
    expect(html).toContain("Set a new password");
    expect(html).toContain("Button not working?");
    expect(html.split(htmlLink).length - 1).toBe(3);
    expect(html).not.toMatch(/[ąćęłńóśźż]/i);
    expect(passwordResetSubject("en")).toBe("Strength Save: set a new password");
  });

  it("escapuje adres e-mail w treści", () => {
    const html = passwordResetEmailHtml(link, "<b>x</b>@example.com", "pl");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("requestPasswordResetCore", () => {
  const NOW = Date.parse("2026-09-13T18:00:00.000Z");
  let rateDoc: PasswordResetRateDoc | null;
  let generateLink: ReturnType<typeof vi.fn>;
  let sendEmail: ReturnType<typeof vi.fn>;

  const run = (email = "Ktos@Example.com", language: unknown = "pl") =>
    requestPasswordResetCore(
      { email, language },
      {
        now: () => NOW,
        readRate: async () => rateDoc,
        writeRate: async (doc) => { rateDoc = doc; },
        generateLink,
        sendEmail,
      },
    );

  beforeEach(() => {
    rateDoc = null;
    generateLink = vi.fn(async () => FIREBASE_LINK);
    sendEmail = vi.fn(async () => undefined);
  });

  it("happy path: mail przez SES z linkiem na auth.strengthsave.app i w języku klienta", async () => {
    await expect(run("Ktos@Example.com", "en")).resolves.toEqual({ sent: true });
    expect(generateLink).toHaveBeenCalledWith("ktos@example.com");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = sendEmail.mock.calls[0][0];
    expect(call.to).toBe("ktos@example.com");
    expect(call.type).toBe("password_reset");
    expect(call.subject).toBe("Strength Save: set a new password");
    expect(call.html).toContain("https://auth.strengthsave.app/__/auth/action?");
    expect(call.html).toContain("oobCode=ABC123");
    expect(call.html).toContain("lang=en");
    expect(call.html).not.toContain("fittracker-workouts.firebaseapp.com");
    expect(rateDoc).toMatchObject({ lastRequestAt: new Date(NOW).toISOString(), count: 1 });
  });

  it("nieznany adres: odpowiedź identyczna jak sukces, bez maila (brak enumeracji kont)", async () => {
    generateLink = vi.fn(async () => {
      throw Object.assign(new Error("no user"), { code: "auth/user-not-found" });
    });
    await expect(run()).resolves.toEqual({ sent: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(rateDoc).not.toBeNull();
  });

  it("ochrona przed enumeracją: internal-error bez linku (produkcja) = sent:true bez maila", async () => {
    generateLink = vi.fn(async () => {
      throw Object.assign(new Error("INTERNAL ASSERT FAILED: Unable to create the email action link"), {
        code: "auth/internal-error",
      });
    });
    await expect(run()).resolves.toEqual({ sent: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("inna awaria generowania linku = unavailable (użytkownik ma wiedzieć, że mail nie wyszedł)", async () => {
    generateLink = vi.fn(async () => { throw new Error("backend down"); });
    await expect(run()).rejects.toMatchObject({ code: "unavailable" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("cooldown: druga prośba w ciągu minuty = resource-exhausted, bez maila", async () => {
    rateDoc = {
      lastRequestAt: new Date(NOW - PASSWORD_RESET_COOLDOWN_MS + 1000).toISOString(),
      windowStartedAt: new Date(NOW - 1000).toISOString(),
      count: 1,
    };
    await expect(run()).rejects.toBeInstanceOf(HttpsError);
    await expect(run()).rejects.toMatchObject({ code: "resource-exhausted" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("limit dobowy: po wyczerpaniu resource-exhausted, okno resetuje się po 24 h", async () => {
    rateDoc = {
      lastRequestAt: new Date(NOW - 2 * PASSWORD_RESET_COOLDOWN_MS).toISOString(),
      windowStartedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
      count: PASSWORD_RESET_DAILY_LIMIT,
    };
    await expect(run()).rejects.toMatchObject({ code: "resource-exhausted" });
    expect(sendEmail).not.toHaveBeenCalled();

    rateDoc = { ...rateDoc, windowStartedAt: new Date(NOW - 25 * 60 * 60 * 1000).toISOString() };
    await expect(run()).resolves.toEqual({ sent: true });
    expect(rateDoc).toMatchObject({ count: 1, windowStartedAt: new Date(NOW).toISOString() });
  });

  it("zły e-mail = invalid-argument przed jakimkolwiek odczytem", async () => {
    await expect(run("nie-mail")).rejects.toMatchObject({ code: "invalid-argument" });
    expect(generateLink).not.toHaveBeenCalled();
  });
});

describe("password reset transport contract", () => {
  it("callable wiąże sekrety SES i nie używa mailera Firebase", () => {
    const source = readFileSync(new URL("./password-reset.ts", import.meta.url), "utf8");
    expect(source).toMatch(/export const requestPasswordReset = onCall\(\{ secrets: \[\.\.\.SES_EMAIL_SECRETS/);
    expect(source).toContain("generatePasswordResetLink");
  });
});
