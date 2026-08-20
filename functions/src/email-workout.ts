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

export interface EmailWorkoutDeps {
  getWorkout: (workoutId: string) => Promise<EmailWorkout | null>;
  listWorkouts: (uid: string, limit: number) => Promise<EmailWorkout[]>;
  /** Zwraca true, gdy wysyłka mieści się w dziennym limicie (i zalicza ją). */
  consumeQuota: (uid: string, today: string) => Promise<boolean>;
  sendEmail: (to: string, subject: string, html: string) => Promise<{ error?: { message: string } }>;
}

export const EMAIL_DAILY_LIMIT = 10;
export const HISTORY_EMAIL_MAX_WORKOUTS = 200;

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
  const day = workout.dayName ? ` — ${workout.dayName}` : "";
  return t(lang, `Trening ${workout.date}${day} (Strength Save)`, `Workout ${workout.date}${day} (Strength Save)`);
}

export function historyEmailSubject(count: number, lang: Lang): string {
  return t(lang, `Historia treningów (${count}) — Strength Save`, `Workout history (${count}) — Strength Save`);
}

/** Sekcja jednego treningu — wspólna dla maila pojedynczego i historii. */
export function workoutSectionHtml(workout: EmailWorkout, lang: Lang): string {
  const rows = (workout.exercises ?? []).map((ex) => {
    const sets = (ex.sets ?? []).map((s) => {
      const status = s.isWarmup ? t(lang, "rozgrzewkowa", "warm-up")
        : s.completed ? t(lang, "zrobiona", "done") : t(lang, "pominięta", "skipped");
      return `<li>${esc(fmtKg(s))} <span style="color:#8a8f98;">(${status})</span></li>`;
    }).join("");
    const extras: string[] = [];
    if (typeof ex.rpe === "number") extras.push(`RPE ${ex.rpe}`);
    if (ex.pain) extras.push(t(lang, `ból: ${typeof ex.pain === "string" ? ex.pain : "tak"}`, `pain: ${typeof ex.pain === "string" ? ex.pain : "yes"}`));
    const meta = extras.length ? `<div style="font-size:12px;color:#b5651d;">${esc(extras.join(" · "))}</div>` : "";
    const note = ex.notes ? `<div style="font-size:12px;color:#8a8f98;">${t(lang, "Notatka", "Note")}: ${esc(ex.notes)}</div>` : "";
    return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">
      <strong>${esc(ex.name || ex.exerciseId)}</strong>
      <ul style="margin:4px 0 0 16px;padding:0;font-size:13px;">${sets}</ul>
      ${meta}${note}
    </td></tr>`;
  }).join("");

  const facts: string[] = [];
  const tn = tonnageKg(workout);
  if (tn > 0) facts.push(`${t(lang, "Tonaż", "Tonnage")}: ${(tn / 1000).toFixed(1)} t`);
  const dur = durationLabel(workout.durationSec, lang);
  if (dur) facts.push(`${t(lang, "Czas", "Time")}: ${dur}`);
  const rating = ratingLabel(workout, lang);
  if (rating) facts.push(`${t(lang, "Ocena sesji", "Session rating")}: ${rating}`);

  return `
  <div style="margin-bottom:24px;">
    <h2 style="margin:0 0 4px;font-size:16px;">${esc(workout.date)}${workout.dayName ? ` — ${esc(workout.dayName)}` : ""}${workout.dayFocus ? ` <span style="color:#8a8f98;font-weight:400;">(${esc(workout.dayFocus)})</span>` : ""}</h2>
    ${facts.length ? `<div style="font-size:13px;color:#444;">${facts.map(esc).join(" · ")}</div>` : ""}
    ${workout.notes ? `<div style="font-size:13px;color:#444;margin-top:4px;">${t(lang, "Notatka dnia", "Day note")}: ${esc(workout.notes)}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">${rows}</table>
  </div>`;
}

const wrap = (bodyHtml: string, lang: Lang): string => `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;color:#111;">
    ${bodyHtml}
    <p style="font-size:12px;color:#8a8f98;margin-top:24px;">${t(lang,
    "Wysłane z aplikacji Strength Save na prośbę właściciela konta.",
    "Sent from the Strength Save app at the account owner's request.")}</p>
  </div>`;

export function buildWorkoutEmailHtml(workout: EmailWorkout, lang: Lang): string {
  return wrap(workoutSectionHtml(workout, lang), lang);
}

export function buildHistoryEmailHtml(workouts: EmailWorkout[], lang: Lang): string {
  const sections = workouts.map((w) => workoutSectionHtml(w, lang)).join("");
  const header = `<h1 style="font-size:18px;">${t(lang, "Historia treningów", "Workout history")} (${workouts.length})</h1>`;
  return wrap(header + sections, lang);
}

export type EmailWorkoutResult =
  | { ok: true }
  | { ok: false; code: "invalid-recipient" | "not-found" | "forbidden" | "quota-exceeded" | "send-failed" | "empty-history" };

export async function runEmailWorkout(
  deps: EmailWorkoutDeps,
  params: { uid: string; workoutId: string; to: unknown; lang?: Lang; today: string },
): Promise<EmailWorkoutResult> {
  if (!isValidRecipient(params.to)) return { ok: false, code: "invalid-recipient" };
  const workout = await deps.getWorkout(params.workoutId);
  if (!workout) return { ok: false, code: "not-found" };
  if (workout.userId !== params.uid) return { ok: false, code: "forbidden" };
  if (!(await deps.consumeQuota(params.uid, params.today))) return { ok: false, code: "quota-exceeded" };
  const lang: Lang = params.lang === "en" ? "en" : "pl";
  const response = await deps.sendEmail(params.to, workoutEmailSubject(workout, lang), buildWorkoutEmailHtml(workout, lang));
  if (response.error) return { ok: false, code: "send-failed" };
  return { ok: true };
}

export async function runEmailHistory(
  deps: EmailWorkoutDeps,
  params: { uid: string; to: unknown; lang?: Lang; today: string },
): Promise<EmailWorkoutResult> {
  if (!isValidRecipient(params.to)) return { ok: false, code: "invalid-recipient" };
  const workouts = await deps.listWorkouts(params.uid, HISTORY_EMAIL_MAX_WORKOUTS);
  if (workouts.length === 0) return { ok: false, code: "empty-history" };
  if (!(await deps.consumeQuota(params.uid, params.today))) return { ok: false, code: "quota-exceeded" };
  const lang: Lang = params.lang === "en" ? "en" : "pl";
  const response = await deps.sendEmail(params.to, historyEmailSubject(workouts.length, lang), buildHistoryEmailHtml(workouts, lang));
  if (response.error) return { ok: false, code: "send-failed" };
  return { ok: true };
}
