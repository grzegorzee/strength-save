// F-T3: wysyłka podsumowania treningu mailem (np. do trenera).
// Czysta logika + wstrzykiwane deps (ten sam wzorzec co weekly-digest):
// callable w index.ts skleja Firestore + wspólny transport Amazon SES.
import { esc, type Lang } from "./email-templates";
import { detectEmailPRs, type EmailPR } from "./email-prs";
import { localizeExerciseNameEn } from "./exercise-name-en";
import { localizeFocusEn } from "./focus-en";

/** WP-I: jednostka maila wg users/{uid}.preferences.unit (kg kanoniczne). */
export type EmailUnit = "kg" | "lbs";

export interface EmailSet {
  reps?: number;
  weight?: number;
  completed?: boolean;
  isWarmup?: boolean;
  durationSec?: number;
  assistWeight?: number;
}

export interface EmailExercise {
  exerciseId: string;
  name?: string;
  sets?: EmailSet[];
  notes?: string;
  rpe?: number;
  pain?: boolean | string;
}

export interface EmailWorkout {
  id: string;
  userId: string;
  date: string;
  dayName?: string;
  dayFocus?: string;
  completed?: boolean;
  notes?: string;
  durationSec?: number;
  sessionRating?: "up" | "down";
  sessionRatingReasons?: string[];
  exercises?: EmailExercise[];
}

/** Metadane transportu z wysyłki. `resend` pozostaje tylko w typie dla
 *  zgodności historycznych wpisów; nowy runtime wysyła wyłącznie przez SES. */
export interface SendEmailResult {
  transport?: "ses" | "resend";
  sesMessageId?: string;
  error?: { message: string };
}

/** Wpis rejestru wysyłek email_log — czyta go wyłącznie panel admina. */
export interface EmailLogEntry {
  uid: string;
  to: string;
  type: "workout" | "history";
  workoutId?: string;
  subject: string;
  transport?: "ses" | "resend";
  sesMessageId?: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: string;
  lang: Lang;
}

/** H-T2: zakres maila historii — tydzień (default) albo 30 ostatnich. */
export type HistoryEmailRange = "week" | "last30";

/** H-T3: kontekst usera z users doc (language jak w weekly-digest + displayName).
 *  WP-I: + unit (preferences.unit) — jednostki maila wg ustawień usera. */
export interface EmailUserContext {
  language?: string;
  displayName?: string;
  unit?: string;
}

export interface EmailWorkoutDeps {
  /** WP-I: ownership egzekwuje ADAPTER — cudzy dokument wraca jako null,
   *  logika wyżej nie ma ścieżki do treningu innego usera. */
  getWorkout: (workoutId: string, uid: string) => Promise<EmailWorkout | null>;
  /** Ukończone treningi usera, date desc; sinceDate zawęża od dołu,
   *  beforeDate od góry (baseline PR; obie granice YYYY-MM-DD). */
  listWorkoutsInRange: (uid: string, opts: { sinceDate?: string; beforeDate?: string; limit: number }) => Promise<EmailWorkout[]>;
  /** Jedno czytanie users doc: język maila (źródło prawdy) + displayName do tytułu. */
  getUserContext: (uid: string) => Promise<EmailUserContext>;
  /** Zwraca true, gdy wysyłka mieści się w dziennym limicie (i zalicza ją). */
  consumeQuota: (uid: string, today: string) => Promise<boolean>;
  sendEmail: (to: string, subject: string, html: string) => Promise<SendEmailResult>;
  /** T21a: html trafia do podkolekcji content (podgląd w panelu admina). */
  logEmail: (entry: EmailLogEntry, html?: string) => Promise<void>;
}

export const EMAIL_DAILY_LIMIT = 10;
/** H-T2: koniec z wysyłką 200 naraz — twardy limit 30. */
export const HISTORY_EMAIL_MAX_WORKOUTS = 30;
/** J-T4: powyżej tylu treningów mail historii to tabela-przegląd (nie ściana
 *  pełnych sekcji). Decyzja właściciela 2026-08-20: bez załączników w mailach. */
export const HISTORY_FULL_SECTIONS_MAX = 7;
/** Tydzień = 7 dni włącznie z dziś; limit bezpieczeństwa na liczbę sesji. */
export const WEEK_RANGE_MAX_WORKOUTS = 14;
/** H-T4: ile wcześniejszych sesji służy za bazę do detekcji PR. */
export const PR_BASELINE_LIMIT = 100;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidRecipient = (to: unknown): to is string =>
  typeof to === "string" && to.length <= 254 && EMAIL_RE.test(to);

/** WP-I: imię trenera z payloadu klienta — opcjonalne, trim, twarde 80 znaków.
 *  Śmieć (nie-string, pusty) = brak powitania, nigdy blokada wysyłki. */
export const sanitizeTrainerName = (input: unknown): string | undefined => {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim().slice(0, 80).trim();
  return trimmed || undefined;
};

// WP-I: konwersja tylko przy renderze (kg kanoniczne, jak useUnit w UI).
// Funty zaokrąglamy do 0.5 lb — dokładność talerzy, bez ogona po przecinku.
const KG_TO_LB = 2.20462;

const lbValue = (kg: number): string => {
  const v = Math.round(kg * KG_TO_LB * 2) / 2;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

const weightLabel = (kg: number, unit: EmailUnit): string =>
  unit === "lbs" ? `${lbValue(kg)} lb` : `${kg} kg`;

const fmtSet = (set: EmailSet, unit: EmailUnit): string => {
  if (typeof set.durationSec === "number" && set.durationSec > 0) {
    const m = Math.floor(set.durationSec / 60);
    const s = set.durationSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const weight = typeof set.weight === "number" ? set.weight : 0;
  const reps = typeof set.reps === "number" ? set.reps : 0;
  return `${weightLabel(weight, unit)} × ${reps}`;
};

const t = (lang: Lang, pl: string, en: string): string => (lang === "pl" ? pl : en);

const ratingLabel = (workout: EmailWorkout, lang: Lang): string | null => {
  if (!workout.sessionRating) return null;
  const base = workout.sessionRating === "up"
    ? t(lang, "Dobrze", "Good")
    : t(lang, "Ciężko", "Hard");
  const reasons = (workout.sessionRatingReasons ?? []).map((r) => ({
    too_heavy: t(lang, "za ciężko", "too heavy"),
    too_long: t(lang, "za długo", "too long"),
    weak_day: t(lang, "słabszy dzień", "weak day"),
  }[r] ?? r)).join(", ");
  return reasons ? `${base} (${reasons})` : base;
};

const tonnageKg = (workout: EmailWorkout): number =>
  (workout.exercises ?? []).reduce((sum, ex) => sum + (ex.sets ?? [])
    .filter((s) => s.completed && !s.isWarmup)
    .reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);

const durationLabel = (sec: number | undefined, lang: Lang): string | null => {
  if (typeof sec !== "number" || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

// H-T4: daty i dni tygodnia per język (pl: DD.MM.RRRR, en: Mon D, YYYY);
// rachunek w UTC na stringu daty, żeby strefa serwera nie przesuwała dnia.
const WEEKDAYS_PL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseDateUTC = (date: string): Date | null => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const weekdayName = (date: string, lang: Lang): string => {
  const parsed = parseDateUTC(date);
  if (!parsed) return "";
  return (lang === "pl" ? WEEKDAYS_PL : WEEKDAYS_EN)[parsed.getUTCDay()];
};

const fmtDateLang = (date: string, lang: Lang): string => {
  const parsed = parseDateUTC(date);
  if (!parsed) return date;
  return lang === "pl"
    ? `${String(parsed.getUTCDate()).padStart(2, "0")}.${String(parsed.getUTCMonth() + 1).padStart(2, "0")}.${parsed.getUTCFullYear()}`
    : `${MONTHS_EN[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
};

const historyDateRangeLabel = (workouts: EmailWorkout[], lang: Lang): string => {
  const dates = workouts.map((w) => w.date).sort();
  const first = dates[0] ?? "";
  const last = dates[dates.length - 1] ?? "";
  if (!first || first === last) return fmtDateLang(last || first, lang);
  return t(lang, `${fmtDateLang(first, "pl")} do ${fmtDateLang(last, "pl")}`, `${fmtDateLang(first, "en")} to ${fmtDateLang(last, "en")}`);
};

// J-T3: mail w 100% jednym języku. Kanoniczne dane są PL — przy lang=en
// tłumaczymy słownikami digestu (nazwy ćwiczeń, focus) i dniami tygodnia.
// Nieznana nazwa zostaje (nazwa własna usera; NIE wymyślamy tłumaczeń).
const DAY_NAME_EN: Record<string, string> = {
  "Poniedziałek": "Monday",
  "Wtorek": "Tuesday",
  "Środa": "Wednesday",
  "Czwartek": "Thursday",
  "Piątek": "Friday",
  "Sobota": "Saturday",
  "Niedziela": "Sunday",
};

export const localizeEmailWorkout = (workout: EmailWorkout, lang: Lang): EmailWorkout => {
  if (lang !== "en") return workout;
  return {
    ...workout,
    ...(workout.dayName ? { dayName: DAY_NAME_EN[workout.dayName] ?? localizeFocusEn(workout.dayName) } : {}),
    ...(workout.dayFocus ? { dayFocus: localizeFocusEn(workout.dayFocus) } : {}),
    ...(workout.exercises
      ? { exercises: workout.exercises.map((ex) => (ex.name ? { ...ex, name: localizeExerciseNameEn(ex.name) } : ex)) }
      : {}),
  };
};

/** H-T4: tytuł bez pauz, z imieniem usera (fallback: bez imienia, nigdy "undefined"). */
export function workoutEmailSubject(workout: EmailWorkout, lang: Lang, displayName?: string): string {
  const when = `${weekdayName(workout.date, lang)}${lang === "pl" ? " " : ", "}${fmtDateLang(workout.date, lang)}`;
  return lang === "pl"
    ? `Strength Save: trening${displayName ? ` ${displayName}` : ""}, ${when}`
    : `Strength Save: ${displayName ? `${displayName}'s ` : ""}workout, ${when}`;
}

export function historyEmailSubject(workouts: EmailWorkout[], lang: Lang, displayName?: string): string {
  const range = historyDateRangeLabel(workouts, lang);
  return lang === "pl"
    ? `Strength Save: treningi${displayName ? ` ${displayName}` : ""}, ${range}`
    : `Strength Save: ${displayName ? `${displayName}'s ` : ""}workouts, ${range}`;
}

// --- G-T3: szablon w stylu marki (klienci pocztowi: tabele + inline CSS,
// zero obrazków i zewnętrznych zasobów, limonka tylko jako akcent). ---

const FONT = "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const C = {
  bg: "#f6f7f9",
  card: "#ffffff",
  text: "#111827",
  body: "#374151",
  muted: "#6b7280",
  border: "#e5e7eb",
  lime: "#cefc22",
  pain: "#b45309",
} as const;

/** H-T4: serie robocze zrobione/planowane (rozgrzewkowe nie liczą się). */
const workingSetCounts = (workout: EmailWorkout): { done: number; planned: number } =>
  (workout.exercises ?? []).reduce((acc, ex) => {
    (ex.sets ?? []).forEach((s) => {
      if (s.isWarmup) return;
      acc.planned += 1;
      if (s.completed) acc.done += 1;
    });
    return acc;
  }, { done: 0, planned: 0 });

const tonnageLabel = (kg: number, unit: EmailUnit): string =>
  unit === "lbs" ? `${((kg * KG_TO_LB) / 1000).toFixed(1)} k lb` : `${(kg / 1000).toFixed(1)} t`;

/** Nagłówek sekcji treningu: dzień tygodnia, data · dzień planu (focus). */
const workoutTitleHtml = (workout: EmailWorkout, lang: Lang, size: number): string =>
  `<div style="${FONT}font-size:${size}px;font-weight:700;color:${C.text};">${esc(`${weekdayName(workout.date, lang)}, ${fmtDateLang(workout.date, lang)}`)}${workout.dayName ? ` · ${esc(workout.dayName)}` : ""}${workout.dayFocus ? ` <span style="color:${C.muted};font-weight:400;">(${esc(workout.dayFocus)})</span>` : ""}</div>`;

/** H-T4: wartość PR w mailu (ciężar / powtórzenia / e1RM). */
const prValueLabel = (pr: EmailPR, lang: Lang, value: number, unit: EmailUnit): string =>
  pr.type === "reps" ? t(lang, `${value} powt.`, `${value} reps`)
    : pr.type === "e1rm" ? `${weightLabel(value, unit)} e1RM`
      : weightLabel(value, unit);

/** Sekcja nowych rekordów (tylko gdy są). */
const prSectionHtml = (prs: EmailPR[], lang: Lang, unit: EmailUnit): string => {
  if (prs.length === 0) return "";
  const rows = prs.map((pr) =>
    `<li style="margin:2px 0;"><strong>${esc(pr.exerciseName)}</strong>: ${esc(prValueLabel(pr, lang, pr.newValue, unit))} <span style="color:${C.muted};">(${t(lang, "poprzednio", "previously")} ${esc(prValueLabel(pr, lang, pr.oldValue, unit))})</span></li>`).join("");
  return `
  <div style="margin-top:16px;padding:12px;background-color:${C.bg};border-left:3px solid ${C.lime};">
    <div style="${FONT}font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.text};">${t(lang, "Nowe rekordy", "New records")}</div>
    <ul style="${FONT}margin:6px 0 0 18px;padding:0;font-size:13px;color:${C.body};">${rows}</ul>
  </div>`;
};

/** Kafle hero: tonaż, czas, serie zrobione/planowane, ćwiczenia, rekordy. */
const heroTilesHtml = (workout: EmailWorkout, lang: Lang, prCount: number, unit: EmailUnit): string => {
  const tiles: Array<[string, string]> = [];
  tiles.push([t(lang, "Tonaż", "Tonnage"), tonnageLabel(tonnageKg(workout), unit)]);
  const dur = durationLabel(workout.durationSec, lang);
  if (dur) tiles.push([t(lang, "Czas", "Time"), dur]);
  const sets = workingSetCounts(workout);
  tiles.push([t(lang, "Serie", "Sets"), `${sets.done}/${sets.planned}`]);
  tiles.push([t(lang, "Ćwiczenia", "Exercises"), String((workout.exercises ?? []).length)]);
  if (prCount > 0) tiles.push([t(lang, "Rekordy", "Records"), String(prCount)]);
  const gap = `<td width="8" style="font-size:0;line-height:0;">&nbsp;</td>`;
  const cells = tiles.map(([label, value]) =>
    `<td valign="top" style="padding:10px 12px;background-color:${C.bg};border-top:3px solid ${C.lime};">
      <div style="${FONT}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};">${esc(label)}</div>
      <div style="${FONT}font-size:18px;font-weight:700;color:${C.text};">${esc(value)}</div>
    </td>`).join(gap);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:16px 0 4px;"><tr>${cells}</tr></table>`;
};

const dayNoteHtml = (workout: EmailWorkout, lang: Lang): string =>
  workout.notes
    ? `<div style="${FONT}font-size:13px;color:${C.body};margin-top:8px;">${t(lang, "Notatka dnia", "Day note")}: ${esc(workout.notes)}</div>`
    : "";

const ratingHtml = (workout: EmailWorkout, lang: Lang): string => {
  const rating = ratingLabel(workout, lang);
  return rating
    ? `<div style="${FONT}font-size:13px;color:${C.body};margin-top:8px;">${t(lang, "Ocena sesji", "Session rating")}: ${esc(rating)}</div>`
    : "";
};

/** H-T4: najlepsza seria robocza ćwiczenia (max e1RM; przy bodyweight max powt.). */
const pickBestSetIndex = (ex: EmailExercise): number => {
  const sets = ex.sets ?? [];
  let bestIndex = -1;
  let bestScore = 0;
  sets.forEach((s, i) => {
    if (!s.completed || s.isWarmup) return;
    const weight = s.weight ?? 0;
    const reps = s.reps ?? 0;
    // e1RM (Epley) dla serii z ciężarem; bodyweight porównujemy po powtórzeniach.
    const score = weight > 0 ? weight * (1 + reps / 30) * 1000 : reps;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  });
  return bestIndex;
};

/** H-T4: podsumowanie setów w nagłówku wiersza, np. "1/2 serie robocze + 1 rozgrzewkowa". */
const exerciseSetsSummary = (ex: EmailExercise, lang: Lang): string => {
  let done = 0;
  let planned = 0;
  let warmups = 0;
  (ex.sets ?? []).forEach((s) => {
    if (s.isWarmup) {
      warmups += 1;
      return;
    }
    planned += 1;
    if (s.completed) done += 1;
  });
  const base = t(lang, `${done}/${planned} serie robocze`, `${done}/${planned} working sets`);
  if (warmups === 0) return base;
  const warmupLabel = t(lang, warmups === 1 ? "rozgrzewkowa" : "rozgrzewkowe", warmups === 1 ? "warm-up" : "warm-ups");
  return `${base} + ${warmups} ${warmupLabel}`;
};

/** Tabela ćwiczeń: serie (rozgrzewkowe wyraźnie oznaczone, najlepsza wyróżniona),
 *  podsumowanie setów, notatki, RPE i ból. */
const exercisesTableHtml = (workout: EmailWorkout, lang: Lang, unit: EmailUnit): string => {
  const rows = (workout.exercises ?? []).map((ex) => {
    const bestIndex = pickBestSetIndex(ex);
    const sets = (ex.sets ?? []).map((s, i) => {
      const warmupBadge = s.isWarmup
        ? ` <span style="background-color:#fef3c7;color:${C.pain};font-size:11px;font-weight:700;padding:0 6px;border-radius:8px;">${t(lang, "rozgrzewkowa", "warm-up")}</span>`
        : "";
      const bestBadge = i === bestIndex
        ? ` <span style="background-color:${C.lime};color:${C.text};font-size:11px;font-weight:700;padding:0 6px;border-radius:8px;">${t(lang, "najlepsza", "best")}</span>`
        : "";
      const status = s.isWarmup ? "" : ` <span style="color:${C.muted};">(${s.completed ? t(lang, "zrobiona", "done") : t(lang, "pominięta", "skipped")})</span>`;
      return `<li style="margin:2px 0;">${esc(fmtSet(s, unit))}${status}${warmupBadge}${bestBadge}</li>`;
    }).join("");
    const extras: string[] = [];
    if (typeof ex.rpe === "number") extras.push(`RPE ${ex.rpe}`);
    if (ex.pain) extras.push(t(lang, `ból: ${typeof ex.pain === "string" ? ex.pain : "tak"}`, `pain: ${typeof ex.pain === "string" ? ex.pain : "yes"}`));
    const meta = extras.length ? `<div style="${FONT}font-size:12px;color:${C.pain};margin-top:2px;">${esc(extras.join(" · "))}</div>` : "";
    const note = ex.notes ? `<div style="${FONT}font-size:12px;color:${C.muted};margin-top:2px;">${t(lang, "Notatka", "Note")}: ${esc(ex.notes)}</div>` : "";
    return `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.border};">
      <div style="${FONT}font-size:14px;font-weight:700;color:${C.text};">${esc(ex.name || ex.exerciseId)} <span style="color:${C.muted};font-weight:400;font-size:12px;">${esc(exerciseSetsSummary(ex, lang))}</span></div>
      <ul style="${FONT}margin:4px 0 0 18px;padding:0;font-size:13px;color:${C.body};">${sets}</ul>
      ${meta}${note}
    </td></tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">${rows}</table>`;
};

/** Sekcja jednego treningu — kompaktowa, wspólny moduł dla historii. */
export function workoutSectionHtml(workout: EmailWorkout, lang: Lang, prs: EmailPR[] = [], unit: EmailUnit = "kg"): string {
  const facts: string[] = [];
  const tn = tonnageKg(workout);
  if (tn > 0) facts.push(`${t(lang, "Tonaż", "Tonnage")}: ${tonnageLabel(tn, unit)}`);
  const dur = durationLabel(workout.durationSec, lang);
  if (dur) facts.push(`${t(lang, "Czas", "Time")}: ${dur}`);
  const rating = ratingLabel(workout, lang);
  if (rating) facts.push(`${t(lang, "Ocena sesji", "Session rating")}: ${rating}`);

  return `
  <div style="margin-bottom:24px;">
    ${workoutTitleHtml(workout, lang, 16)}
    ${facts.length ? `<div style="${FONT}font-size:13px;color:${C.body};margin-top:2px;">${facts.map(esc).join(" · ")}</div>` : ""}
    ${dayNoteHtml(workout, lang)}
    ${prSectionHtml(prs, lang, unit)}
    ${exercisesTableHtml(workout, lang, unit)}
  </div>`;
}

/** WP-I: powitanie z imieniem trenera (tylko gdy klient je przekazał). */
const greetingHtml = (trainerName: string | undefined, lang: Lang): string =>
  trainerName
    ? `<div style="${FONT}font-size:15px;color:${C.body};margin-bottom:12px;">${t(lang, "Cześć", "Hi")} ${esc(trainerName)},</div>`
    : "";

/** Rama maila: jasne tło, biała karta, logo tekstowe z limonkowym akcentem. */
const wrap = (bodyHtml: string, lang: Lang): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${C.bg};margin:0;padding:0;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:640px;">
        <tr><td style="padding:0 4px 12px;">
          <div style="${FONT}font-size:14px;font-weight:800;letter-spacing:3px;color:${C.text};">STRENGTH SAVE</div>
          <div style="height:4px;width:56px;background-color:${C.lime};margin-top:4px;font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>
        <tr><td style="background-color:${C.card};border:1px solid ${C.border};border-radius:12px;padding:24px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 4px 0;">
          <div style="${FONT}font-size:12px;color:${C.muted};">${t(lang,
    "Wysłane ze Strength Save na prośbę właściciela konta.",
    "Sent from Strength Save at the account owner's request.")}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

export interface WorkoutEmailOptions {
  /** H-T4: nowe rekordy sesji (liczone server-side względem wcześniejszych treningów). */
  prs?: EmailPR[];
  /** WP-I: jednostka ciężarów/tonażu (default kg = zachowanie jak dotąd). */
  unit?: EmailUnit;
  /** WP-I: imię odbiorcy do powitania (już zwalidowane). */
  trainerName?: string;
}

export function buildWorkoutEmailHtml(workout: EmailWorkout, lang: Lang, options: WorkoutEmailOptions = {}): string {
  const prs = options.prs ?? [];
  const unit = options.unit ?? "kg";
  const body = `
    ${greetingHtml(options.trainerName, lang)}
    ${workoutTitleHtml(workout, lang, 20)}
    ${heroTilesHtml(workout, lang, prs.length, unit)}
    ${ratingHtml(workout, lang)}
    ${dayNoteHtml(workout, lang)}
    ${prSectionHtml(prs, lang, unit)}
    ${exercisesTableHtml(workout, lang, unit)}`;
  return wrap(body, lang);
}

export interface HistoryEmailOptions {
  /** H-T4: nowe rekordy per sesja (klucz = id treningu). */
  prsBySession?: Record<string, EmailPR[]>;
  /** WP-I: jednostka ciężarów/tonażu (default kg = zachowanie jak dotąd). */
  unit?: EmailUnit;
  /** WP-I: imię odbiorcy do powitania (już zwalidowane). */
  trainerName?: string;
}

/** J-T4: przegląd — wiersz na trening (data, dzień, tonaż, czas, serie, PR). */
const historyOverviewTableHtml = (workouts: EmailWorkout[], lang: Lang, options: HistoryEmailOptions, unit: EmailUnit): string => {
  const th = (label: string, align: "left" | "right" = "left"): string =>
    `<th align="${align}" style="${FONT}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};padding:6px 8px;border-bottom:2px solid ${C.border};">${esc(label)}</th>`;
  const td = (value: string, align: "left" | "right" = "left"): string =>
    `<td align="${align}" style="${FONT}font-size:13px;color:${C.body};padding:6px 8px;border-bottom:1px solid ${C.border};">${esc(value)}</td>`;
  const rows = workouts.map((w) => {
    const sets = workingSetCounts(w);
    const prCount = (options.prsBySession?.[w.id] ?? []).length;
    const dayLabel = [w.dayName, w.dayFocus].filter(Boolean).join(" · ");
    return `<tr>${td(fmtDateLang(w.date, lang))}${td(dayLabel || "-")}${td(tonnageLabel(tonnageKg(w), unit), "right")}${td(durationLabel(w.durationSec, lang) ?? "-", "right")}${td(`${sets.done}/${sets.planned}`, "right")}${td(prCount > 0 ? String(prCount) : "-", "right")}</tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:4px;">
    <tr>${th(t(lang, "Data", "Date"))}${th(t(lang, "Dzień", "Day"))}${th(t(lang, "Tonaż", "Tonnage"), "right")}${th(t(lang, "Czas", "Time"), "right")}${th(t(lang, "Serie", "Sets"), "right")}${th("PR", "right")}</tr>
    ${rows}
  </table>`;
};

export function buildHistoryEmailHtml(workouts: EmailWorkout[], lang: Lang, options: HistoryEmailOptions = {}): string {
  const unit = options.unit ?? "kg";
  const totalTonnage = workouts.reduce((sum, w) => sum + tonnageKg(w), 0);
  const totalSec = workouts.reduce((sum, w) => sum + (typeof w.durationSec === "number" && w.durationSec > 0 ? w.durationSec : 0), 0);
  const totalWorkingSets = workouts.reduce((sum, w) => sum + workingSetCounts(w).done, 0);
  const facts: string[] = [];
  facts.push(t(lang, `Zakres: ${historyDateRangeLabel(workouts, "pl")}`, `Range: ${historyDateRangeLabel(workouts, "en")}`));
  if (totalTonnage > 0) facts.push(`${t(lang, "Suma tonażu", "Total tonnage")}: ${tonnageLabel(totalTonnage, unit)}`);
  const totalDur = durationLabel(totalSec, lang);
  if (totalDur) facts.push(`${t(lang, "Łączny czas", "Total time")}: ${totalDur}`);
  facts.push(`${t(lang, "Serie robocze", "Working sets")}: ${totalWorkingSets}`);

  const header = `
    ${greetingHtml(options.trainerName, lang)}
    <div style="${FONT}font-size:20px;font-weight:700;color:${C.text};">${t(lang, "Historia treningów", "Workout history")} (${workouts.length})</div>
    ${facts.length ? `<div style="${FONT}font-size:13px;color:${C.body};margin:4px 0 20px;">${facts.map(esc).join(" · ")}</div>` : ""}`;
  // J-T4: powyżej progu pełne sekcje robią ścianę — wchodzi tabela-przegląd.
  const body = workouts.length > HISTORY_FULL_SECTIONS_MAX
    ? historyOverviewTableHtml(workouts, lang, options, unit)
    : workouts.map((w) => workoutSectionHtml(w, lang, options.prsBySession?.[w.id] ?? [], unit)).join("");
  return wrap(header + body, lang);
}

export type EmailWorkoutResult =
  | { ok: true }
  | { ok: false; code: "invalid-recipient" | "not-found" | "forbidden" | "quota-exceeded" | "send-failed" | "empty-history" | "invalid-range" };

/** G-T1: wpis do email_log po KAŻDEJ próbie wysyłki (udanej i nieudanej).
 *  Awaria logu nie może zabrać userowi maila, który już wyszedł. */
const logEmailSafe = async (
  deps: EmailWorkoutDeps,
  base: { uid: string; to: string; type: "workout" | "history"; workoutId?: string; subject: string; lang: Lang },
  response: SendEmailResult,
  html?: string,
): Promise<void> => {
  const entry: EmailLogEntry = {
    uid: base.uid,
    to: base.to,
    type: base.type,
    ...(base.workoutId ? { workoutId: base.workoutId } : {}),
    subject: base.subject,
    ...(response.transport ? { transport: response.transport } : {}),
    ...(response.sesMessageId ? { sesMessageId: response.sesMessageId } : {}),
    status: response.error ? "failed" : "sent",
    ...(response.error ? { error: response.error.message } : {}),
    sentAt: new Date().toISOString(),
    lang: base.lang,
  };
  try {
    await deps.logEmail(entry, html);
  } catch {
    // Rejestr jest pomocniczy: brak wpisu nie unieważnia wysłanego maila.
  }
};

export async function runEmailWorkout(
  deps: EmailWorkoutDeps,
  params: { uid: string; workoutId: string; to: unknown; lang?: Lang; today: string; trainerName?: unknown },
): Promise<EmailWorkoutResult> {
  if (!isValidRecipient(params.to)) return { ok: false, code: "invalid-recipient" };
  // WP-I: adapter filtruje ownership (cudzy = null); check niżej zostaje jako
  // pas i szelki na wypadek adaptera bez filtra.
  const workout = await deps.getWorkout(params.workoutId, params.uid);
  if (!workout) return { ok: false, code: "not-found" };
  if (workout.userId !== params.uid) return { ok: false, code: "forbidden" };
  if (!(await deps.consumeQuota(params.uid, params.today))) return { ok: false, code: "quota-exceeded" };
  const { lang, displayName, unit } = await resolveUserContext(deps, params.uid, params.lang);
  // J-T3: tłumaczenie PRZED detekcją PR — nazwy w sekcji rekordów idą z sesji.
  const localized = localizeEmailWorkout(workout, lang);
  // H-T4: baseline PR z wcześniejszych treningów; awaria odczytu = mail bez sekcji rekordów.
  let earlier: EmailWorkout[] = [];
  try {
    earlier = await deps.listWorkoutsInRange(params.uid, { beforeDate: workout.date, limit: PR_BASELINE_LIMIT });
  } catch {
    // Sekcja PR jest dodatkiem: mail ma wyjść mimo braku bazy.
  }
  const { prs } = detectEmailPRs(localized, earlier.filter((w) => w.id !== workout.id));
  const subject = workoutEmailSubject(localized, lang, displayName);
  const html = buildWorkoutEmailHtml(localized, lang, { prs, unit, trainerName: sanitizeTrainerName(params.trainerName) });
  const response = await deps.sendEmail(params.to, subject, html);
  await logEmailSafe(deps, { uid: params.uid, to: params.to, type: "workout", workoutId: workout.id, subject, lang }, response, html);
  if (response.error) return { ok: false, code: "send-failed" };
  return { ok: true };
}

/** date - days dni w formacie YYYY-MM-DD (rachunek w UTC na stringu daty). */
const dateMinusDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) - days * 86400000).toISOString().slice(0, 10);

/** H-T3: język z profilu usera wygrywa; parametr klienta tylko fallback;
 *  awaria odczytu profilu nie blokuje wysyłki. WP-I: + jednostka maila. */
const resolveUserContext = async (
  deps: EmailWorkoutDeps,
  uid: string,
  clientLang: Lang | undefined,
): Promise<{ lang: Lang; displayName?: string; unit: EmailUnit }> => {
  let ctx: EmailUserContext = {};
  try {
    ctx = await deps.getUserContext(uid);
  } catch {
    // Profil chwilowo niedostępny: mail ma wyjść, decyduje parametr klienta.
  }
  const lang: Lang = ctx.language === "en" ? "en"
    : ctx.language === "pl" ? "pl"
      : clientLang === "en" ? "en" : "pl";
  const unit: EmailUnit = ctx.unit === "lbs" ? "lbs" : "kg";
  return { lang, unit, ...(ctx.displayName ? { displayName: ctx.displayName } : {}) };
};

export async function runEmailHistory(
  deps: EmailWorkoutDeps,
  params: { uid: string; to: unknown; lang?: Lang; today: string; range?: HistoryEmailRange; trainerName?: unknown },
): Promise<EmailWorkoutResult> {
  if (!isValidRecipient(params.to)) return { ok: false, code: "invalid-recipient" };
  const range = params.range ?? "week";
  if (range !== "week" && range !== "last30") return { ok: false, code: "invalid-range" };
  const workouts = await deps.listWorkoutsInRange(params.uid, range === "week"
    ? { sinceDate: dateMinusDays(params.today, 6), limit: WEEK_RANGE_MAX_WORKOUTS }
    : { limit: HISTORY_EMAIL_MAX_WORKOUTS });
  if (workouts.length === 0) return { ok: false, code: "empty-history" };
  if (!(await deps.consumeQuota(params.uid, params.today))) return { ok: false, code: "quota-exceeded" };
  const { lang, displayName, unit } = await resolveUserContext(deps, params.uid, params.lang);
  // J-T3: tłumaczenie PRZED detekcją PR — nazwy w sekcjach rekordów idą z sesji.
  const localizedWorkouts = workouts.map((w) => localizeEmailWorkout(w, lang));
  // H-T4: PR-y per sesja — baseline sprzed zakresu, potem narastająco sesje zakresu.
  const rangeIds = new Set(workouts.map((w) => w.id));
  const oldestDate = workouts.map((w) => w.date).sort()[0];
  let baseline: EmailWorkout[] = [];
  try {
    baseline = await deps.listWorkoutsInRange(params.uid, { beforeDate: oldestDate, limit: PR_BASELINE_LIMIT });
  } catch {
    // Sekcje PR to dodatek: historia ma wyjść mimo braku bazy.
  }
  let accumulated = baseline.filter((w) => !rangeIds.has(w.id));
  const prsBySession: Record<string, EmailPR[]> = {};
  for (const session of [...localizedWorkouts].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    prsBySession[session.id] = detectEmailPRs(session, accumulated).prs;
    accumulated = [...accumulated, session];
  }
  const subject = historyEmailSubject(localizedWorkouts, lang, displayName);
  const html = buildHistoryEmailHtml(localizedWorkouts, lang, { prsBySession, unit, trainerName: sanitizeTrainerName(params.trainerName) });
  const response = await deps.sendEmail(params.to, subject, html);
  await logEmailSafe(deps, { uid: params.uid, to: params.to, type: "history", subject, lang }, response, html);
  if (response.error) return { ok: false, code: "send-failed" };
  return { ok: true };
}
