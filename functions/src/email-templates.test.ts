import { describe, expect, it } from "vitest";
import { inviteEmailHtml } from "./email-templates";

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
