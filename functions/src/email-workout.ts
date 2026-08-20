// F-T3: wysyłka podsumowania treningu mailem (np. do trenera).
// Czysta logika + wstrzykiwane deps (ten sam wzorzec co weekly-digest):
// callable w index.ts skleja Firestore + transport (SES z fallbackiem Resend).
import { esc, type Lang } from "./email-templates";

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

/** Metadane transportu z wysyłki: SES daje MessageId (klucz korelacji ze
 *  zdarzeniami SES), fallback Resend już nie. Błąd totalny = error. */
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

/** H-T3: kontekst usera z users doc (language jak w weekly-digest + displayName). */
export interface EmailUserContext {
  language?: string;
  displayName?: string;
}

export interface EmailWorkoutDeps {
  getWorkout: (workoutId: string) => Promise<EmailWorkout | null>;
  /** Ukończone treningi usera, date desc; sinceDate zawęża od dołu (YYYY-MM-DD). */
  listWorkoutsInRange: (uid: string, opts: { sinceDate?: string; limit: number }) => Promise<EmailWorkout[]>;
  /** Jedno czytanie users doc: język maila (źródło prawdy) + displayName do tytułu. */
  getUserContext: (uid: string) => Promise<EmailUserContext>;
  /** Zwraca true, gdy wysyłka mieści się w dziennym limicie (i zalicza ją). */
  consumeQuota: (uid: string, today: string) => Promise<boolean>;
  sendEmail: (to: string, subject: string, html: string) => Promise<SendEmailResult>;
  logEmail: (entry: EmailLogEntry) => Promise<void>;
}

export const EMAIL_DAILY_LIMIT = 10;
/** H-T2: koniec z wysyłką 200 naraz — twardy limit 30. */
export const HISTORY_EMAIL_MAX_WORKOUTS = 30;
/** Tydzień = 7 dni włącznie z dziś; limit bezpieczeństwa na liczbę sesji. */
export const WEEK_RANGE_MAX_WORKOUTS = 14;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidRecipient = (to: unknown): to is string =>
  typeof to === "string" && to.length <= 254 && EMAIL_RE.test(to);

const fmtKg = (set: EmailSet): string => {
  if (typeof set.durationSec === "number" && set.durationSec > 0) {
    const m = Math.floor(set.durationSec / 60);
    const s = set.durationSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const weight = typeof set.weight === "number" ? set.weight : 0;
  const reps = typeof set.reps === "number" ? set.reps : 0;
  return `${weight} kg × ${reps}`;
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

export function workoutEmailSubject(workout: EmailWorkout, lang: Lang): string {
  const day = workout.dayName ? `, ${workout.dayName}` : "";
  return t(lang, `Trening ${workout.date}${day} (Strength Save)`, `Workout ${workout.date}${day} (Strength Save)`);
}

export function historyEmailSubject(count: number, lang: Lang): string {
  return t(lang, `Historia treningów (${count}), Strength Save`, `Workout history (${count}), Strength Save`);
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

const doneSetsCount = (workout: EmailWorkout): number =>
  (workout.exercises ?? []).reduce((sum, ex) => sum + (ex.sets ?? [])
    .filter((s) => s.completed && !s.isWarmup).length, 0);

const tonnageLabel = (kg: number): string => `${(kg / 1000).toFixed(1)} t`;

/** Nagłówek sekcji treningu: data · dzień (focus). */
const workoutTitleHtml = (workout: EmailWorkout, size: number): string =>
  `<div style="${FONT}font-size:${size}px;font-weight:700;color:${C.text};">${esc(workout.date)}${workout.dayName ? ` · ${esc(workout.dayName)}` : ""}${workout.dayFocus ? ` <span style="color:${C.muted};font-weight:400;">(${esc(workout.dayFocus)})</span>` : ""}</div>`;

/** Kafle hero: tonaż, czas, serie, ćwiczenia. */
const heroTilesHtml = (workout: EmailWorkout, lang: Lang): string => {
  const tiles: Array<[string, string]> = [];
  tiles.push([t(lang, "Tonaż", "Tonnage"), tonnageLabel(tonnageKg(workout))]);
  const dur = durationLabel(workout.durationSec, lang);
  if (dur) tiles.push([t(lang, "Czas", "Time"), dur]);
  tiles.push([t(lang, "Serie", "Sets"), String(doneSetsCount(workout))]);
  tiles.push([t(lang, "Ćwiczenia", "Exercises"), String((workout.exercises ?? []).length)]);
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

/** Tabela ćwiczeń z seriami, notatkami, RPE i bólem. */
const exercisesTableHtml = (workout: EmailWorkout, lang: Lang): string => {
  const rows = (workout.exercises ?? []).map((ex) => {
    const sets = (ex.sets ?? []).map((s) => {
      const status = s.isWarmup ? t(lang, "rozgrzewkowa", "warm-up")
        : s.completed ? t(lang, "zrobiona", "done") : t(lang, "pominięta", "skipped");
      return `<li style="margin:2px 0;">${esc(fmtKg(s))} <span style="color:${C.muted};">(${status})</span></li>`;
    }).join("");
    const extras: string[] = [];
    if (typeof ex.rpe === "number") extras.push(`RPE ${ex.rpe}`);
    if (ex.pain) extras.push(t(lang, `ból: ${typeof ex.pain === "string" ? ex.pain : "tak"}`, `pain: ${typeof ex.pain === "string" ? ex.pain : "yes"}`));
    const meta = extras.length ? `<div style="${FONT}font-size:12px;color:${C.pain};margin-top:2px;">${esc(extras.join(" · "))}</div>` : "";
    const note = ex.notes ? `<div style="${FONT}font-size:12px;color:${C.muted};margin-top:2px;">${t(lang, "Notatka", "Note")}: ${esc(ex.notes)}</div>` : "";
    return `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.border};">
      <div style="${FONT}font-size:14px;font-weight:700;color:${C.text};">${esc(ex.name || ex.exerciseId)}</div>
      <ul style="${FONT}margin:4px 0 0 18px;padding:0;font-size:13px;color:${C.body};">${sets}</ul>
      ${meta}${note}
    </td></tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">${rows}</table>`;
};

/** Sekcja jednego treningu — kompaktowa, wspólny moduł dla historii. */
export function workoutSectionHtml(workout: EmailWorkout, lang: Lang): string {
  const facts: string[] = [];
  const tn = tonnageKg(workout);
  if (tn > 0) facts.push(`${t(lang, "Tonaż", "Tonnage")}: ${tonnageLabel(tn)}`);
  const dur = durationLabel(workout.durationSec, lang);
  if (dur) facts.push(`${t(lang, "Czas", "Time")}: ${dur}`);
  const rating = ratingLabel(workout, lang);
  if (rating) facts.push(`${t(lang, "Ocena sesji", "Session rating")}: ${rating}`);

  return `
  <div style="margin-bottom:24px;">
    ${workoutTitleHtml(workout, 16)}
    ${facts.length ? `<div style="${FONT}font-size:13px;color:${C.body};margin-top:2px;">${facts.map(esc).join(" · ")}</div>` : ""}
    ${dayNoteHtml(workout, lang)}
    ${exercisesTableHtml(workout, lang)}
  </div>`;
}

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

export function buildWorkoutEmailHtml(workout: EmailWorkout, lang: Lang): string {
  const body = `
    ${workoutTitleHtml(workout, 20)}
    ${heroTilesHtml(workout, lang)}
    ${ratingHtml(workout, lang)}
    ${dayNoteHtml(workout, lang)}
    ${exercisesTableHtml(workout, lang)}`;
  return wrap(body, lang);
}

export function buildHistoryEmailHtml(workouts: EmailWorkout[], lang: Lang): string {
  const dates = workouts.map((w) => w.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const totalTonnage = workouts.reduce((sum, w) => sum + tonnageKg(w), 0);
  const totalSec = workouts.reduce((sum, w) => sum + (typeof w.durationSec === "number" && w.durationSec > 0 ? w.durationSec : 0), 0);
  const facts: string[] = [];
  if (first && last) facts.push(t(lang, `Zakres: ${first} do ${last}`, `Range: ${first} to ${last}`));
  if (totalTonnage > 0) facts.push(`${t(lang, "Suma tonażu", "Total tonnage")}: ${tonnageLabel(totalTonnage)}`);
  const totalDur = durationLabel(totalSec, lang);
  if (totalDur) facts.push(`${t(lang, "Łączny czas", "Total time")}: ${totalDur}`);

  const header = `
    <div style="${FONT}font-size:20px;font-weight:700;color:${C.text};">${t(lang, "Historia treningów", "Workout history")} (${workouts.length})</div>
    ${facts.length ? `<div style="${FONT}font-size:13px;color:${C.body};margin:4px 0 20px;">${facts.map(esc).join(" · ")}</div>` : ""}`;
  const sections = workouts.map((w) => workoutSectionHtml(w, lang)).join("");
  return wrap(header + sections, lang);
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
    await deps.logEmail(entry);
  } catch {
    // Rejestr jest pomocniczy: brak wpisu nie unieważnia wysłanego maila.
  }
};

export async function runEmailWorkout(
  deps: EmailWorkoutDeps,
  params: { uid: string; workoutId: string; to: unknown; lang?: Lang; today: string },
): Promise<EmailWorkoutResult> {
  if (!isValidRecipient(params.to)) return { ok: false, code: "invalid-recipient" };
  const workout = await deps.getWorkout(params.workoutId);
  if (!workout) return { ok: false, code: "not-found" };
  if (workout.userId !== params.uid) return { ok: false, code: "forbidden" };
  if (!(await deps.consumeQuota(params.uid, params.today))) return { ok: false, code: "quota-exceeded" };
  const { lang } = await resolveUserContext(deps, params.uid, params.lang);
  const subject = workoutEmailSubject(workout, lang);
  const response = await deps.sendEmail(params.to, subject, buildWorkoutEmailHtml(workout, lang));
  await logEmailSafe(deps, { uid: params.uid, to: params.to, type: "workout", workoutId: workout.id, subject, lang }, response);
  if (response.error) return { ok: false, code: "send-failed" };
  return { ok: true };
}

/** date - days dni w formacie YYYY-MM-DD (rachunek w UTC na stringu daty). */
const dateMinusDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) - days * 86400000).toISOString().slice(0, 10);

/** H-T3: język z profilu usera wygrywa; parametr klienta tylko fallback;
 *  awaria odczytu profilu nie blokuje wysyłki. */
const resolveUserContext = async (
  deps: EmailWorkoutDeps,
  uid: string,
  clientLang: Lang | undefined,
): Promise<{ lang: Lang; displayName?: string }> => {
  let ctx: EmailUserContext = {};
  try {
    ctx = await deps.getUserContext(uid);
  } catch {
    // Profil chwilowo niedostępny: mail ma wyjść, decyduje parametr klienta.
  }
  const lang: Lang = ctx.language === "en" ? "en"
    : ctx.language === "pl" ? "pl"
      : clientLang === "en" ? "en" : "pl";
  return { lang, ...(ctx.displayName ? { displayName: ctx.displayName } : {}) };
};

export async function runEmailHistory(
  deps: EmailWorkoutDeps,
  params: { uid: string; to: unknown; lang?: Lang; today: string; range?: HistoryEmailRange },
): Promise<EmailWorkoutResult> {
  if (!isValidRecipient(params.to)) return { ok: false, code: "invalid-recipient" };
  const range = params.range ?? "week";
  if (range !== "week" && range !== "last30") return { ok: false, code: "invalid-range" };
  const workouts = await deps.listWorkoutsInRange(params.uid, range === "week"
    ? { sinceDate: dateMinusDays(params.today, 6), limit: WEEK_RANGE_MAX_WORKOUTS }
    : { limit: HISTORY_EMAIL_MAX_WORKOUTS });
  if (workouts.length === 0) return { ok: false, code: "empty-history" };
  if (!(await deps.consumeQuota(params.uid, params.today))) return { ok: false, code: "quota-exceeded" };
  const { lang } = await resolveUserContext(deps, params.uid, params.lang);
  const subject = historyEmailSubject(workouts.length, lang);
  const response = await deps.sendEmail(params.to, subject, buildHistoryEmailHtml(workouts, lang));
  await logEmailSafe(deps, { uid: params.uid, to: params.to, type: "history", subject, lang }, response);
  if (response.error) return { ok: false, code: "send-failed" };
  return { ok: true };
}
