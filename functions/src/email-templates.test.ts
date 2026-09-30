import { describe, expect, it } from "vitest";
import { APP_OPEN_URL, appOpenInviteUrl, inviteEmailHtml, welcomeEmailHtml } from "./email-templates";

// Z167: mail zaproszenia per język. Default (bez lang) zostaje polski 1:1 —
// dziś wysyłki są PL, parametr jest przyszłościowy.

describe("inviteEmailHtml (Z167)", () => {
  it("EN: nagłówek i CTA po angielsku, zero polskich znaków", () => {
    const html = inviteEmailHtml("ABC123", "https://example.com/?invite=ABC123", null, "en");

    expect(html).toContain("You&#39;re invited to Strength Save");
    expect(html).toContain("Open the app");
    expect(html).toContain("ABC123");
    expect(html).not.toMatch(/[ąćęłńóśźż]/i);
  });

  it("default (bez lang) = dotychczasowy PL", () => {
    const html = inviteEmailHtml("ABC123", "https://example.com/?invite=ABC123", null);

    expect(html).toContain("Masz zaproszenie do Strength Save");
    expect(html).toContain("Otwórz aplikację");
  });

  it("notatka admina trafia do maila w obu językach", () => {
    expect(inviteEmailHtml("A", "u", "Zapraszam", "pl")).toContain("Zapraszam");
    expect(inviteEmailHtml("A", "u", "See you", "en")).toContain("See you");
  });
});

// X29 WP-J: deep link z custom URL scheme jest martwy w webmailach (Gmail/Outlook
// go nie otworzą). Przycisk powitalny prowadzi na https.
// 2026-09-30 (zgłoszenie właściciela): "Otwórz aplikację" ma otwierać aplikację
// na telefonie, więc CTA idzie na strengthsave.app/open (sklep albo apka,
// na komputerze wybór z wersją w przeglądarce), nie wprost na web app.
describe("welcomeEmailHtml (X29 WP-J, 2026-09-30)", () => {
  it("CTA prowadzi na https://strengthsave.app/open, nie na web app ani deep link (PL i EN)", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = welcomeEmailHtml("Grzegorz", lang);
      expect(html).toContain('href="https://strengthsave.app/open"');
      expect(html).not.toContain("app.strengthsave.app");
      expect(html).not.toContain("strengthsave://");
    }
  });
});

describe("appOpenInviteUrl (2026-09-30)", () => {
  it("link zaproszenia idzie przez /open z kodem w parametrze invite", () => {
    expect(appOpenInviteUrl("K7Q2MZ9A")).toBe("https://strengthsave.app/open?invite=K7Q2MZ9A");
    expect(APP_OPEN_URL).toBe("https://strengthsave.app/open");
  });

  it("koduje znaki spoza alfabetu kodu", () => {
    expect(appOpenInviteUrl("A B&C")).toBe("https://strengthsave.app/open?invite=A%20B%26C");
  });
});
