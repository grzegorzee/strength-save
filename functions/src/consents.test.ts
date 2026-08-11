import { describe, expect, it } from "vitest";
import { buildConsentMirror, extractClientIp, parseConsentPayload } from "./consents";
import { LEGAL_VERSIONS } from "./legal-versions";

const validEntry = {
  type: "terms",
  action: "granted",
  docVersion: LEGAL_VERSIONS.terms,
  lang: "pl",
  statementText: "Mam ukończone 16 lat i akceptuję Regulamin.",
};

const validPayload = {
  entries: [validEntry],
  channel: "ios",
  appVersion: "1.0.0 (87)",
};

describe("parseConsentPayload", () => {
  it("akceptuje poprawny payload", () => {
    const parsed = parseConsentPayload(validPayload);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.channel).toBe("ios");
    expect(parsed.appVersion).toBe("1.0.0 (87)");
  });

  it("odrzuca pusty entries i brak entries", () => {
    expect(() => parseConsentPayload({ ...validPayload, entries: [] })).toThrow(/entries/);
    expect(() => parseConsentPayload({ channel: "ios" })).toThrow(/entries/);
  });

  it("odrzuca nieznany typ zgody i nieznaną akcję", () => {
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, type: "cookies" }],
    })).toThrow(/consent type/);
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, action: "revoked" }],
    })).toThrow(/consent action/);
  });

  it("odrzuca przestarzałą wersję dokumentu (stary klient po bumpie)", () => {
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, docVersion: "1.0" }],
    })).toThrow(/stale docVersion/);
  });

  it("odrzuca withdrawn dla terms i privacy_ack (oświadczenia bez wariantu wycofania)", () => {
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, action: "withdrawn" }],
    })).toThrow(/cannot be withdrawn/);
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{
        type: "privacy_ack", action: "withdrawn",
        docVersion: LEGAL_VERSIONS.privacy, lang: "pl", statementText: "x",
      }],
    })).toThrow(/cannot be withdrawn/);
  });

  it("dopuszcza withdrawn dla health i marketing", () => {
    const parsed = parseConsentPayload({
      ...validPayload,
      entries: [
        { type: "health", action: "withdrawn", docVersion: LEGAL_VERSIONS.health, lang: "en", statementText: "I withdraw." },
        { type: "marketing", action: "withdrawn", docVersion: LEGAL_VERSIONS.marketing, lang: "en", statementText: "No mails." },
      ],
    });
    expect(parsed.entries.map((entry) => entry.action)).toEqual(["withdrawn", "withdrawn"]);
  });

  it("odrzuca zły kanał, język, pusty i za długi statementText", () => {
    expect(() => parseConsentPayload({ ...validPayload, channel: "watch" })).toThrow(/channel/);
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, lang: "de" }],
    })).toThrow(/lang/);
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, statementText: "  " }],
    })).toThrow(/statementText/);
    expect(() => parseConsentPayload({
      ...validPayload,
      entries: [{ ...validEntry, statementText: "x".repeat(2001) }],
    })).toThrow(/statementText/);
  });
});

describe("extractClientIp", () => {
  it("bierze pierwszy adres z x-forwarded-for (string z przecinkami)", () => {
    expect(extractClientIp({ headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } })).toBe("203.0.113.7");
  });

  it("bierze pierwszy element tablicy x-forwarded-for", () => {
    expect(extractClientIp({ headers: { "x-forwarded-for": ["198.51.100.2", "10.0.0.1"] } })).toBe("198.51.100.2");
  });

  it("fallback na req.ip, a bez niczego 'unknown'", () => {
    expect(extractClientIp({ headers: {}, ip: "192.0.2.1" })).toBe("192.0.2.1");
    expect(extractClientIp({})).toBe("unknown");
  });
});

describe("buildConsentMirror", () => {
  it("mapuje komplet zgód z onboardingu na mirror users/{uid}.consents", () => {
    const mirror = buildConsentMirror([
      { type: "terms", action: "granted", docVersion: LEGAL_VERSIONS.terms, lang: "pl", statementText: "t" },
      { type: "privacy_ack", action: "granted", docVersion: LEGAL_VERSIONS.privacy, lang: "pl", statementText: "p" },
      { type: "health", action: "granted", docVersion: LEGAL_VERSIONS.health, lang: "pl", statementText: "h" },
      { type: "marketing", action: "granted", docVersion: LEGAL_VERSIONS.marketing, lang: "pl", statementText: "m" },
    ]);
    expect(mirror).toEqual({
      "consents.termsVersion": LEGAL_VERSIONS.terms,
      "consents.privacyVersion": LEGAL_VERSIONS.privacy,
      "consents.healthGranted": true,
      "consents.healthVersion": LEGAL_VERSIONS.health,
      "consents.marketingGranted": true,
      "consents.marketingVersion": LEGAL_VERSIONS.marketing,
    });
  });

  it("wycofanie zdrowia ustawia healthGranted=false, nie dotyka innych pól", () => {
    const mirror = buildConsentMirror([
      { type: "health", action: "withdrawn", docVersion: LEGAL_VERSIONS.health, lang: "pl", statementText: "w" },
    ]);
    expect(mirror).toEqual({
      "consents.healthGranted": false,
      "consents.healthVersion": LEGAL_VERSIONS.health,
    });
  });
});

// Krok marketingowy onboardingu (spec 2026-08-11): dedykowany kanał w logu
// odróżnia zgodę z osobnego ekranu od checkboxa na Welcome.
describe("kanał onboarding-marketing-step", () => {
  it("akceptuje zgodę i odmowę marketingu z kanału kroku onboardingu", () => {
    const marketingEntry = {
      type: "marketing",
      action: "granted",
      docVersion: LEGAL_VERSIONS.marketing,
      lang: "pl",
      statementText: "Chcę otrzymywać informacje marketingowe.",
    };
    const parsed = parseConsentPayload({
      entries: [marketingEntry],
      channel: "onboarding-marketing-step",
      appVersion: "1.0.0 (92)",
    });
    expect(parsed.channel).toBe("onboarding-marketing-step");
    const declined = parseConsentPayload({
      entries: [{ ...marketingEntry, action: "withdrawn" }],
      channel: "onboarding-marketing-step",
      appVersion: "1.0.0 (92)",
    });
    expect(declined.entries[0].action).toBe("withdrawn");
    // Mirror: odmowa też zapisuje wersję — krok nie pokaże się drugi raz.
    const mirror = buildConsentMirror(declined.entries);
    expect(mirror["consents.marketingGranted"]).toBe(false);
    expect(mirror["consents.marketingVersion"]).toBe(LEGAL_VERSIONS.marketing);
  });
});
