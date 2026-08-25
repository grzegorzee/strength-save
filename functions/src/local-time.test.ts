import { describe, expect, it } from "vitest";
import { localDayParts, resolveTimeZone, shiftDateStr } from "./local-time";

// Bug 11 (X30): 07:00 CEST (05:00Z) to dla zachodu USA jeszcze 22:00 dnia
// poprzedniego — dzień tygodnia, data i pora muszą wychodzić ze strefy usera.
describe("localDayParts (bug 11, X30)", () => {
  const warsawMorning = new Date("2026-07-07T05:00:00Z"); // wtorek 07:00 CEST

  it("Warszawa: wtorek 07:00, data 2026-07-07", () => {
    expect(localDayParts(warsawMorning, "Europe/Warsaw")).toEqual({
      weekday: "tuesday", dateStr: "2026-07-07", hour: 7,
    });
  });

  it("Los Angeles o tej samej chwili: PONIEDZIAŁEK 22:00, data 2026-07-06", () => {
    expect(localDayParts(warsawMorning, "America/Los_Angeles")).toEqual({
      weekday: "monday", dateStr: "2026-07-06", hour: 22,
    });
  });

  it("Nowy Jork o tej samej chwili: wtorek 01:00 (nocne budzenie w raporcie)", () => {
    expect(localDayParts(warsawMorning, "America/New_York")).toEqual({
      weekday: "tuesday", dateStr: "2026-07-07", hour: 1,
    });
  });

  it("strefa z połówką (Kolkata +5:30): godzina 7 przy 01:30Z", () => {
    expect(localDayParts(new Date("2026-07-07T01:30:00Z"), "Asia/Kolkata").hour).toBe(7);
  });

  it("północ lokalna daje godzinę 0, nie 24", () => {
    expect(localDayParts(new Date("2026-07-06T22:00:00Z"), "Europe/Warsaw").hour).toBe(0);
  });

  it("brak strefy / nieznana strefa = Warszawa (niezmiennik dotychczasowego zachowania)", () => {
    expect(resolveTimeZone(undefined)).toBe("Europe/Warsaw");
    expect(resolveTimeZone("")).toBe("Europe/Warsaw");
    expect(resolveTimeZone("Mars/Olympus")).toBe("Europe/Warsaw");
    expect(localDayParts(warsawMorning, "Mars/Olympus")).toEqual(localDayParts(warsawMorning, "Europe/Warsaw"));
  });

  it("zima (CET): 07:00 Warszawy to 06:00Z", () => {
    expect(localDayParts(new Date("2026-01-12T06:00:00Z"), "Europe/Warsaw")).toEqual({
      weekday: "monday", dateStr: "2026-01-12", hour: 7,
    });
  });
});

describe("shiftDateStr", () => {
  it("przesuwa datę przez granicę miesiąca i roku", () => {
    expect(shiftDateStr("2026-06-29", -7)).toBe("2026-06-22");
    expect(shiftDateStr("2026-06-29", -1)).toBe("2026-06-28");
    expect(shiftDateStr("2026-01-01", -1)).toBe("2025-12-31");
  });
});
