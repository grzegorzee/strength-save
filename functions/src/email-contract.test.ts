import { describe, expect, it } from "vitest";
import {
  accessChangedEmailHtml,
  adminMessageEmailHtml,
  inviteEmailHtml,
  passwordResetEmailHtml,
  verificationEmailHtml,
  welcomeEmailHtml,
  type Lang,
} from "./email-templates";
import { buildWeeklyDigest } from "./weekly-digest-html";
import { buildHistoryEmailHtml, buildWorkoutEmailHtml, localizeEmailWorkout, type EmailWorkout } from "./email-workout";
import { htmlToPlainText } from "./ses-email";

// 2026-09-29 (audyt maili): wspólny kontrakt KAŻDEGO maila do użytkownika.
// Szablony dzielą jeden layout: dokument HTML z deklaracją jasnego motywu,
// ukryty preheader, tabele zamiast flex/grid, inline CSS bez zewnętrznych
// arkuszy, linki wyłącznie https/mailto, stopka z nadawcą i powodem wysyłki,
// sensowna wersja text/plain i rozmiar poniżej limitu obcinania Gmaila.

const GMAIL_CLIP_BYTES = 102 * 1024;
const RESET_LINK = "https://auth.strengthsave.app/__/auth/action?mode=resetPassword&oobCode=ABC&apiKey=K&lang=pl";

const workout: EmailWorkout = {
  id: "w1",
  userId: "u1",
  date: "2026-09-24",
  dayName: "Czwartek",
  dayFocus: "Góra B",
  completed: true,
  durationSec: 3900,
  exercises: [
    { exerciseId: "bench", name: "Wyciskanie", sets: [{ reps: 5, weight: 100, completed: true }, { reps: 10, weight: 40, completed: true, isWarmup: true }] },
  ],
};

const digest = (lang: Lang) => buildWeeklyDigest({
  stats: { sessions: 4, workingSets: 62, reps: 410, tonnageKg: 18450, durationSec: 17400, topExercises: [{ name: "Przysiad ze sztangą", tonnageKg: 6200 }] },
  comparison: { sessionsDelta: 1, tonnageDeltaKg: 2300 },
  prs: [{ exerciseName: "Przysiad ze sztangą", type: "weight", newValue: 140, oldValue: 135 }],
  strava: null,
  lang,
  unit: "kg",
  displayName: "Jan",
  rangeLabel: lang === "en" ? "September 21 - September 27, 2026" : "21 września - 27 września 2026",
});

const templates = (lang: Lang): Array<[string, string]> => [
  ["verification", verificationEmailHtml("482913", "jan@example.com", lang)],
  ["password-reset", passwordResetEmailHtml(RESET_LINK, "jan@example.com", lang)],
  ["welcome", welcomeEmailHtml("Jan", lang)],
  ["invite", inviteEmailHtml("K7Q2MZ", "https://app.strengthsave.app/?invite=K7Q2MZ", "Notatka", lang)],
  ["access-changed", accessChangedEmailHtml(false, lang)],
  ["weekly-digest", digest(lang).html],
  ["workout", buildWorkoutEmailHtml(localizeEmailWorkout(workout, lang), lang)],
  ["history", buildHistoryEmailHtml([workout, { ...workout, id: "w2", date: "2026-09-22" }].map((w) => localizeEmailWorkout(w, lang)), lang)],
  ...(lang === "pl" ? [["admin-message", adminMessageEmailHtml("Cześć,\n\ntreść.")] as [string, string]] : []),
];

describe.each(["pl", "en"] as const)("kontrakt maili (%s)", (lang) => {
  it.each(templates(lang))("%s: pełny dokument z jasnym motywem i językiem", (_name, html) => {
    expect(html.trimStart().startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain(`<html lang="${lang}"`);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('<meta name="color-scheme" content="light">');
  });

  it.each(templates(lang))("%s: ukryty preheader na początku body", (_name, html) => {
    const body = html.slice(html.indexOf("<body"));
    expect(body).toMatch(/^<body[^>]*>\s*<!--preheader--><div style="display:none;[^"]*">[^<]{12,}/);
  });

  it.each(templates(lang))("%s: tabele i inline CSS, bez flex/grid i zewnętrznych zasobów", (_name, html) => {
    expect(html).toContain('role="presentation"');
    expect(html).not.toMatch(/display:\s*(flex|grid)/);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/url\(/i);
  });

  it.each(templates(lang))("%s: każdy link https albo mailto, każdy obraz z alt", (_name, html) => {
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    hrefs.forEach((href) => expect(href).toMatch(/^(https:\/\/|mailto:)/));
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    imgs.forEach((img) => expect(img).toMatch(/\balt="[^"]+"/));
  });

  it.each(templates(lang))("%s: wordmark marki z akcentem #ccfc22 i stopka z nadawcą", (_name, html) => {
    expect(html).toContain("STRENGTH SAVE");
    expect(html.toLowerCase()).toContain("#ccfc22");
    expect(html).toContain("WEB3 POWER Grzegorz Jasionowicz");
    expect(html).toContain("Osiek Jasielski 46");
  });

  it.each(templates(lang))("%s: rozmiar poniżej limitu obcinania Gmaila", (_name, html) => {
    expect(Buffer.byteLength(html)).toBeLessThan(GMAIL_CLIP_BYTES);
  });

  it.each(templates(lang))("%s: bez pauz (em/en dash) i wykrzykników w treści", (_name, html) => {
    const text = htmlToPlainText(html);
    expect(html).not.toMatch(/[–—]/);
    expect(text).not.toContain("!");
  });

  it.each(templates(lang))("%s: text/plain czytelny, bez tagów, CSS i preheadera", (_name, html) => {
    const text = htmlToPlainText(html);
    expect(text.length).toBeGreaterThan(40);
    expect(text).not.toMatch(/<[a-z!/]/i);
    expect(text).not.toMatch(/[{};]\s*$/m);
    expect(text).not.toContain("color-scheme");
    expect(text.split("\n").every((line) => line === line.trim())).toBe(true);
  });

  if (lang === "en") {
    it.each(templates(lang))("%s: EN bez polskich znaków", (_name, html) => {
      expect(html).not.toMatch(/[ąćęłńóśźż]/i);
    });
  }
});

describe("text/plain zachowuje linki i kody", () => {
  it("reset hasła: link w wersji tekstowej", () => {
    const text = htmlToPlainText(passwordResetEmailHtml(RESET_LINK, "jan@example.com", "pl"));
    expect(text).toContain(RESET_LINK);
    expect(text).toContain("Ustaw nowe hasło");
  });

  it("powitanie: przycisk zamienia się na etykietę z adresem", () => {
    const text = htmlToPlainText(welcomeEmailHtml("Jan", "pl"));
    expect(text).toContain("Otwórz aplikację: https://app.strengthsave.app/");
  });

  it("kod weryfikacyjny obecny w wersji tekstowej", () => {
    expect(htmlToPlainText(verificationEmailHtml("482913", "jan@example.com", "en"))).toContain("482913");
  });
});

describe("linki z danymi logowania nie przechodzą przez śledzenie kliknięć SES", () => {
  it("reset hasła: oba linki mają ses:no-track", () => {
    const html = passwordResetEmailHtml(RESET_LINK, "jan@example.com", "pl");
    const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
    expect(anchors).toHaveLength(2);
    anchors.forEach((a) => expect(a).toContain("ses:no-track"));
  });

  it("zaproszenie: link z kodem ma ses:no-track", () => {
    const html = inviteEmailHtml("K7Q2MZ", "https://app.strengthsave.app/?invite=K7Q2MZ", null, "pl");
    [...html.matchAll(/<a\b[^>]*invite=[^>]*>/g)].forEach((m) => expect(m[0]).toContain("ses:no-track"));
  });
});

describe("digest tygodniowy: temat i stopka", () => {
  it("PL: poprawna odmiana i bez pauzy w temacie", () => {
    expect(digest("pl").subject).toBe("Strength Save: Twój tydzień 21 września - 27 września 2026, 4 treningi, 18.4 t");
    expect(digest("pl").subject).not.toMatch(/[–—]/);
    const five = buildWeeklyDigest({ ...{ stats: { sessions: 5, workingSets: 1, reps: 1, tonnageKg: 1000, durationSec: 0, topExercises: [] }, comparison: null, prs: [], strava: null, lang: "pl", unit: "kg", rangeLabel: "x" } });
    expect(five.subject).toContain("5 treningów");
    const one = buildWeeklyDigest({ stats: { sessions: 1, workingSets: 1, reps: 1, tonnageKg: 1000, durationSec: 0, topExercises: [] }, comparison: null, prs: [], strava: null, lang: "pl", unit: "kg", rangeLabel: "x" });
    expect(one.subject).toContain("1 trening,");
    expect(one.html).not.toMatch(/[–—]/);
  });

  it("stopka wskazuje realne miejsce przełącznika (Profil, Powiadomienia), bez linków (X29)", () => {
    const { html } = digest("pl");
    expect(html).toContain("Profil, Powiadomienia");
    expect(html).not.toContain("Ustawienia → Powiadomienia");
    expect(html).not.toContain("<a ");
    expect(digest("en").html).toContain("Profile, Notifications");
  });
});

describe("workout: kafle nie rozpychają maila na telefonie", () => {
  it("kafle jako inline-block (zawijają się przy 375 px), nie komórki jednej tabeli", () => {
    const html = buildWorkoutEmailHtml(workout, "pl");
    expect(html).toContain("display:inline-block");
  });
});

describe("broadcast admina: stopka z wypisem", () => {
  it("wersja broadcast mówi, jak wyłączyć ogłoszenia; wiadomość 1:1 nie", () => {
    const broadcast = adminMessageEmailHtml("Treść", { broadcast: true });
    expect(broadcast).toContain("Profil, Powiadomienia");
    expect(broadcast).toContain("ogłoszenia e-mail");
    expect(adminMessageEmailHtml("Treść")).not.toContain("Profil, Powiadomienia");
  });
});
