// Z160: builder maila tygodniowego. Layout WYŁĄCZNIE <table> — Gmail/Outlook
// wycinają display:flex i rozsypują kafle w pion. i18n PL/EN (users.language),
// jednostki wg preferences.unit (kg kanoniczne, konwersja tylko tutaj — jak w UI).

import { esc, type Lang } from "./email-templates";
import { localizeExerciseNameEn } from "./exercise-name-en";
import type { DigestPR, WeekComparison, WeekStats } from "./weekly-digest-stats";

export type UnitSystem = "kg" | "lbs";

const APP_DEEP_LINK = "strengthsave://open";
const WEB_URL = "https://grzegorzee.github.io/strength-save/";

const KG_TO_LBS = 2.2046226218;

// Port formatTonnage (src/lib/units.ts): kg → "12.3 t", lbs → "27.1 k lbs".
export const formatTonnage = (kg: number, unit: UnitSystem): string =>
  unit === "lbs" ? `${((kg * KG_TO_LBS) / 1000).toFixed(1)} k lbs` : `${(kg / 1000).toFixed(1)} t`;

const formatWeight = (kg: number, unit: UnitSystem): string =>
  unit === "lbs" ? `${Math.round(kg * KG_TO_LBS)} lbs` : `${Math.round(kg * 10) / 10} kg`;

const formatDuration = (totalSec: number): string => {
  if (totalSec <= 0) return "—";
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
    cta: "Open Strength Save",
    ctaWeb: "or open in browser",
    footer: "You can turn this email off in the app: Settings → Notifications.",
    subject: (n: number, tonnage: string, range: string) =>
      `💪 ${n} ${n === 1 ? "workout" : "workouts"}, ${tonnage} — your week ${range}`,
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
    cta: "Otwórz Strength Save",
    ctaWeb: "albo otwórz w przeglądarce",
    footer: "Wyłączysz w aplikacji: Ustawienia → Powiadomienia.",
    subject: (n: number, tonnage: string, range: string) =>
      `💪 ${n} ${n === 1 ? "trening" : "treningów"}, ${tonnage} — Twój tydzień ${range}`,
  };

const tile = (label: string, value: string): string => `
<td width="33%" style="padding:6px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;">
    <tr><td style="padding:14px 8px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#0f172a;">${value}</div>
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">${label}</div>
    </td></tr>
  </table>
</td>`;

const sectionTitle = (label: string): string => `
<tr><td style="padding:20px 24px 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">${label}</td></tr>`;

const listRow = (left: string, right: string): string => `
<tr><td style="padding:6px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:14px;color:#0f172a;">${left}</td>
    <td align="right" style="font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;">${right}</td>
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
${sectionTitle(`🏆 ${t.prsTitle}`)}
${prs.slice(0, 6).map((pr) => listRow(esc(localizeName(pr.exerciseName, lang)), prValue(pr, unit, t))).join("")}` : "";

  const topSection = stats.topExercises.length > 0 ? `
${sectionTitle(t.topTitle)}
${stats.topExercises.map((ex) => listRow(esc(localizeName(ex.name, lang)), formatTonnage(ex.tonnageKg, unit))).join("")}` : "";

  const stravaSection = strava && strava.runCount > 0 ? `
${sectionTitle(`🏃 ${t.runTitle}`)}
${listRow(`${strava.runCount} ${t.runs}`, `${strava.totalRunKm} km`)}
${strava.bestRun ? listRow(`${t.bestRun}: ${esc(strava.bestRun.name)}`, `${strava.bestRun.km} km`) : ""}
${strava.longestRun ? listRow(`${t.longestRun}: ${esc(strava.longestRun.name)}`, `${strava.longestRun.km} km`) : ""}` : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${t.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
    <tr><td align="center" style="padding:20px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0f172a;padding:28px 24px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#ffffff;">💪 ${t.title}</div>
          <div style="margin-top:6px;font-size:13px;color:#cbd5e1;">${esc(rangeLabel)}</div>
        </td></tr>
        <tr><td style="padding:20px 24px 4px;font-size:14px;color:#334155;">${esc(t.hello(input.displayName ?? ""))}</td></tr>
        <tr><td style="padding:8px 18px 0;">
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
        <tr><td style="padding:28px 24px 8px;text-align:center;">
          <a href="${APP_DEEP_LINK}" style="display:inline-block;padding:13px 28px;background:#0f172a;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">${t.cta}</a>
          <div style="margin-top:10px;font-size:12px;"><a href="${WEB_URL}" style="color:#64748b;">${t.ctaWeb}</a></div>
        </td></tr>
        <tr><td style="padding:16px 24px 24px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">${t.footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
};
