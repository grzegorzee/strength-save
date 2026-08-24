import { describe, expect, it } from "vitest";
import { buildWeeklyDigest, formatTonnage, type WeeklyDigestInput } from "./weekly-digest-html";
import type { WeekStats } from "./weekly-digest-stats";

const stats = (over: Partial<WeekStats> = {}): WeekStats => ({
  sessions: 3,
  workingSets: 24,
  reps: 180,
  tonnageKg: 12400,
  durationSec: 3 * 3600 + 15 * 60,
  topExercises: [{ name: "Przysiad ze sztangą", tonnageKg: 4000 }],
  ...over,
});

const baseInput = (over: Partial<WeeklyDigestInput> = {}): WeeklyDigestInput => ({
  stats: stats(),
  comparison: { sessionsDelta: 1, tonnageDeltaKg: 1500 },
  prs: [{ exerciseName: "Przysiad ze sztangą", type: "weight", newValue: 120, oldValue: 110 }],
  strava: null,
  lang: "pl",
  unit: "kg",
  displayName: "Grzegorz",
  rangeLabel: "21 - 27 lipca 2026",
  ...over,
});

describe("buildWeeklyDigest (Z160)", () => {
  it("layout bez display:flex (Gmail/Outlook wycinają flex)", () => {
    const { html } = buildWeeklyDigest(baseInput());
    expect(html).not.toContain("display:flex");
    expect(html).toContain("<table");
  });

  it("wariant PL: tytuły sekcji i temat po polsku", () => {
    const { subject, html } = buildWeeklyDigest(baseInput());
    expect(subject).toContain("3 treningów");
    expect(subject).toContain("12.4 t");
    expect(subject).toContain("Twój tydzień 21 - 27 lipca 2026");
    expect(html).toContain("Rekordy tygodnia");
    expect(html).toContain("vs poprzedni tydzień");
    expect(html).toContain("Wyłączysz w aplikacji");
    expect(html).toContain("Przysiad ze sztangą");
  });

  it("wariant EN: sekcje po angielsku, nazwy ćwiczeń przetłumaczone", () => {
    const { subject, html } = buildWeeklyDigest(baseInput({ lang: "en" }));
    expect(subject).toContain("your week");
    expect(html).toContain("PRs this week");
    expect(html).toContain("Barbell Squat");
    expect(html).not.toContain("Przysiad ze sztangą");
  });

  it("escaping: nazwa ćwiczenia z < nie wstrzykuje HTML", () => {
    const { html } = buildWeeklyDigest(baseInput({
      prs: [{ exerciseName: "<img src=x onerror=alert(1)>", type: "weight", newValue: 100, oldValue: 90 }],
    }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("jednostki: lbs w kaflach i PR-ach dla preferences.unit=lbs", () => {
    const { subject, html } = buildWeeklyDigest(baseInput({ unit: "lbs" }));
    expect(subject).toContain("27.3 k lbs");
    expect(html).toContain("265 lbs"); // PR 120 kg -> 265 lbs
    expect(html).not.toContain("120 kg");
  });

  it("pusty tydzień Strava → sekcja biegowa pominięta", () => {
    const { html } = buildWeeklyDigest(baseInput({ strava: { runCount: 0, totalRunKm: 0 } }));
    expect(html).not.toContain("Bieganie");
  });

  it("sekcja biegowa z danymi Strava", () => {
    const { html } = buildWeeklyDigest(baseInput({
      strava: { runCount: 2, totalRunKm: 15.4, bestRun: { name: "Morning Run", km: 5.2 } },
    }));
    expect(html).toContain("Bieganie");
    expect(html).toContain("Morning Run");
    expect(html).toContain("15.4 km");
  });

  it("puste PR-y i brak porównania → sekcje pominięte", () => {
    const { html } = buildWeeklyDigest(baseInput({ prs: [], comparison: null }));
    expect(html).not.toContain("Rekordy tygodnia");
    expect(html).not.toContain("vs poprzedni tydzień");
  });

  it("mail raportowy bez przycisku CTA: zero deep linku i zero linków <a> (PL i EN)", () => {
    for (const lang of ["pl", "en"] as const) {
      const { html } = buildWeeklyDigest(baseInput({ lang }));
      expect(html).not.toContain("strengthsave://");
      expect(html).not.toContain("<a ");
      expect(html).not.toContain("Otwórz Strength Save");
      expect(html).not.toContain("Open Strength Save");
      expect(html).not.toContain("albo otwórz w przeglądarce");
      expect(html).not.toContain("or open in browser");
    }
  });
});

describe("formatTonnage (port units.ts)", () => {
  it("kg → t, lbs → k lbs", () => {
    expect(formatTonnage(12400, "kg")).toBe("12.4 t");
    expect(formatTonnage(12400, "lbs")).toBe("27.3 k lbs");
  });
});
