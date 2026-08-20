// J-T4: pełny detal serii jako CSV — załącznik maili week/last30.
// JEDEN format współdzielony z eksportem w aplikacji (src/lib/workout-csv.ts):
// nagłówki EN techniczne, separator przecinek, UTF-8 z BOM (Excel), CRLF.
// Wiersz = jedna seria; pola treningu (tonaż, czas, notatka dnia) powtórzone
// w każdym wierszu tej sesji (płaski format do filtrowania w arkuszu).
import type { EmailWorkout } from "./email-workout";

export const WORKOUT_CSV_HEADERS = [
  "date", "day", "focus", "exercise", "set_no", "set_type",
  "weight_kg", "reps", "completed", "rpe", "pain", "exercise_note",
  "day_note", "session_rating", "tonnage_kg", "duration_sec", "prs",
] as const;

const UTF8_BOM = "﻿";

export const escapeCsvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const cell = (value: string | number | boolean | undefined): string => {
  if (value === undefined || value === "") return "";
  return escapeCsvField(String(value));
};

/** Ta sama definicja co w mailu: serie robocze ukończone, waga × powtórzenia. */
const tonnageKg = (workout: EmailWorkout): number =>
  (workout.exercises ?? []).reduce((sum, ex) => sum + (ex.sets ?? [])
    .filter((s) => s.completed && !s.isWarmup)
    .reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);

/**
 * CSV z pełnym detalem serii. `prCounts` = liczba nowych rekordów per trening
 * (klucz: id sesji) — powtarzana w każdym wierszu sesji.
 */
export function buildWorkoutsCsv(workouts: EmailWorkout[], prCounts: Record<string, number> = {}): string {
  const rows: string[] = [WORKOUT_CSV_HEADERS.join(",")];
  for (const workout of workouts) {
    const tonnage = tonnageKg(workout);
    const prs = prCounts[workout.id] ?? 0;
    for (const ex of workout.exercises ?? []) {
      (ex.sets ?? []).forEach((set, i) => {
        rows.push([
          cell(workout.date),
          cell(workout.dayName),
          cell(workout.dayFocus),
          cell(ex.name || ex.exerciseId),
          cell(i + 1),
          cell(set.isWarmup ? "warmup" : "working"),
          cell(typeof set.weight === "number" ? set.weight : undefined),
          cell(typeof set.reps === "number" ? set.reps : undefined),
          cell(Boolean(set.completed)),
          cell(typeof ex.rpe === "number" ? ex.rpe : undefined),
          cell(typeof ex.pain === "string" ? ex.pain : ex.pain ? "yes" : undefined),
          cell(ex.notes),
          cell(workout.notes),
          cell(workout.sessionRating),
          cell(tonnage),
          cell(typeof workout.durationSec === "number" ? workout.durationSec : undefined),
          cell(prs),
        ].join(","));
      });
    }
  }
  return `${UTF8_BOM}${rows.join("\r\n")}\r\n`;
}
