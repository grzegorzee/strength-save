// Z160: builder maila tygodniowego. Layout WYŁĄCZNIE <table> — Gmail/Outlook
// wycinają display:flex i rozsypują kafle w pion. i18n PL/EN (users.language),
// jednostki wg preferences.unit (kg kanoniczne, konwersja tylko tutaj — jak w UI).

import { esc, type Lang } from "./email-templates";
import { EMAIL_FONT, emailHeading, renderEmailLayout } from "./email-layout";
import { localizeExerciseNameEn } from "./exercise-name-en";
import type { DigestPR, WeekComparison, WeekStats } from "./weekly-digest-stats";

export type UnitSystem = "kg" | "lbs";

const KG_TO_LBS = 2.2046226218;

// Port formatTonnage (src/lib/units.ts): kg → "12.3 t", lbs → "27.1 k lbs".
export const formatTonnage = (kg: number, unit: UnitSystem): string =>
  unit === "lbs" ? `${((kg * KG_TO_LBS) / 1000).toFixed(1)} k lbs` : `${(kg / 1000).toFixed(1)} t`;

const formatWeight = (kg: number, unit: UnitSystem): string =>
  unit === "lbs" ? `${Math.round(kg * KG_TO_LBS)} lbs` : `${Math.round(kg * 10) / 10} kg`;

const formatDuration = (totalSec: number): string => {
  if (totalSec <= 0) return "-";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.round((totalSec % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
};

const localizeName = (name: string, lang: Lang): string =>
  lang === "en" ? localizeExerciseNameEn(name) : name;

export interface DigestStrava {
  runCount: number;
  totalRunKm: number;
  bestRun?: { name: string; km: number };
  longestRun?: { name: string; km: number };
}

export interface WeeklyDigestInput {
  stats: WeekStats;
  comparison: WeekComparison | null;
  prs: DigestPR[];
  strava: DigestStrava | null;
  lang: Lang;
  unit: UnitSystem;
  displayName?: string;
  /** Etykieta zakresu dat (np. "21 - 27 lipca 2026"). */
  rangeLabel: string;
}

/** Odmiana PL: 1 trening, 2-4 treningi (poza 12-14), reszta treningów. */
const plTrainings = (n: number): string => {
  if (n === 1) return "trening";
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? "treningi" : "treningów";
};

const texts = (lang: Lang) => lang === "en"
  ? {
    preheader: "Your training week in numbers",
    title: "Your training week",
    hello: (name: string) => (name ? `${name}, here is your week:` : "Here is your week:"),
    workouts: "Workouts",
    tonnage: "Tonnage",
    sets: "Working sets",
    reps: "Reps",
    time: "Time in the gym",
    vsPrev: "vs previous week",
    sessionsDelta: "workouts",
    prsTitle: "PRs this week",
    prReps: (n: number) => `${n} reps`,
    topTitle: "Top exercises",
    runTitle: "Running",
    runs: "runs",
    bestRun: "Fastest run",
    longestRun: "Longest run",
    reason: "You got this summary because the weekly email report is on in Strength Save. To turn it off, go to Profile, Notifications in the app.",
    subject: (n: number, tonnage: string, range: string) =>
      `Strength Save: your week ${range}, ${n} ${n === 1 ? "workout" : "workouts"}, ${tonnage}`,
  }
  : {
    preheader: "Twój tydzień treningowy w liczbach",
    title: "Twój tydzień treningowy",
    hello: (name: string) => (name ? `${name}, tak wyglądał Twój tydzień:` : "Tak wyglądał Twój tydzień:"),
    workouts: "Treningi",
    tonnage: "Tonaż",
    sets: "Serie robocze",
    reps: "Powtórzenia",
    time: "Czas na siłowni",
    vsPrev: "vs poprzedni tydzień",
    sessionsDelta: "treningi",
    prsTitle: "Rekordy tygodnia",
    prReps: (n: number) => `${n} powt.`,
    topTitle: "Top ćwiczenia",
    runTitle: "Bieganie",
    runs: "biegi",
    bestRun: "Najszybszy bieg",
    longestRun: "Najdłuższy dystans",
    reason: "Dostajesz to podsumowanie, bo masz włączony cotygodniowy raport e-mail w Strength Save. Wyłączysz w aplikacji: Profil, Powiadomienia.",
    subject: (n: number, tonnage: string, range: string) =>
      `Strength Save: Twój tydzień ${range}, ${n} ${plTrainings(n)}, ${tonnage}`,
  };

const tile = (label: string, value: string): string => `
<td width="33%" valign="top" style="padding:6px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;">
    <tr><td style="padding:14px 8px;text-align:center;">
      <div style="${EMAIL_FONT}font-size:22px;font-weight:700;color:#0f172a;">${value}</div>
      <div style="${EMAIL_FONT}font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">${label}</div>
    </td></tr>
  </table>
</td>`;

const sectionTitle = (label: string): string => `
<tr><td style="padding:20px 0 8px;${EMAIL_FONT}font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">${label}</td></tr>`;

const listRow = (left: string, right: string): string => `
<tr><td style="padding:6px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="${EMAIL_FONT}font-size:14px;color:#0f172a;">${left}</td>
    <td align="right" style="${EMAIL_FONT}font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;">${right}</td>
  </tr></table>
</td></tr>`;

const prValue = (pr: DigestPR, unit: UnitSystem, t: ReturnType<typeof texts>): string =>
  pr.type === "reps" ? t.prReps(pr.newValue) : formatWeight(pr.newValue, unit);

export const buildWeeklyDigest = (input: WeeklyDigestInput): { subject: string; html: string } => {
  const { stats, comparison, prs, strava, lang, unit, rangeLabel } = input;
  const t = texts(lang);
  const tonnageStr = formatTonnage(stats.tonnageKg, unit);
  const subject = t.subject(stats.sessions, tonnageStr, rangeLabel);

  const deltaArrow = (delta: number): string => (delta > 0 ? "▲" : delta < 0 ? "▼" : "＝");
  const deltaColor = (delta: number): string => (delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#64748b");

  const comparisonSection = comparison ? `
${sectionTitle(t.vsPrev)}
${listRow(
    `${deltaArrow(comparison.sessionsDelta)} ${t.sessionsDelta}`,
    `<span style="color:${deltaColor(comparison.sessionsDelta)};">${comparison.sessionsDelta > 0 ? "+" : ""}${comparison.sessionsDelta}</span>`,
  )}
${listRow(
    `${deltaArrow(comparison.tonnageDeltaKg)} ${t.tonnage.toLowerCase()}`,
    `<span style="color:${deltaColor(comparison.tonnageDeltaKg)};">${comparison.tonnageDeltaKg > 0 ? "+" : ""}${formatTonnage(comparison.tonnageDeltaKg, unit)}</span>`,
  )}` : "";

  const prsSection = prs.length > 0 ? `
${sectionTitle(t.prsTitle)}
${prs.slice(0, 6).map((pr) => listRow(esc(localizeName(pr.exerciseName, lang)), prValue(pr, unit, t))).join("")}` : "";

  const topSection = stats.topExercises.length > 0 ? `
${sectionTitle(t.topTitle)}
${stats.topExercises.map((ex) => listRow(esc(localizeName(ex.name, lang)), formatTonnage(ex.tonnageKg, unit))).join("")}` : "";

  const stravaSection = strava && strava.runCount > 0 ? `
${sectionTitle(t.runTitle)}
${listRow(`${strava.runCount} ${t.runs}`, `${strava.totalRunKm} km`)}
${strava.bestRun ? listRow(`${t.bestRun}: ${esc(strava.bestRun.name)}`, `${strava.bestRun.km} km`) : ""}
${strava.longestRun ? listRow(`${t.longestRun}: ${esc(strava.longestRun.name)}`, `${strava.longestRun.km} km`) : ""}` : "";

  const bodyHtml = `${emailHeading(t.title)}
<p style="${EMAIL_FONT}margin:0 0 4px;font-size:13px;color:#6b7280;">${esc(rangeLabel)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr><td style="padding:12px 0 4px;${EMAIL_FONT}font-size:14px;color:#334155;">${esc(t.hello(input.displayName ?? ""))}</td></tr>
  <tr><td style="padding:8px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${tile(t.workouts, String(stats.sessions))}
        ${tile(t.tonnage, tonnageStr)}
        ${tile(t.time, formatDuration(stats.durationSec))}
      </tr>
      <tr>
        ${tile(t.sets, String(stats.workingSets))}
        ${tile(t.reps, String(stats.reps))}
        <td width="33%" style="padding:6px;"></td>
      </tr>
    </table>
  </td></tr>
  ${comparisonSection}
  ${prsSection}
  ${topSection}
  ${stravaSection}
</table>`;

  // X29: mail raportowy bez linków i CTA; wyłączenie opisane w stopce, a
  // one-click unsubscribe idzie nagłówkiem List-Unsubscribe (weekly-digest.ts).
  const html = renderEmailLayout({
    lang,
    preheader: t.preheader,
    reason: t.reason,
    replyHint: true,
    bodyHtml,
  });

  return { subject, html };
};
