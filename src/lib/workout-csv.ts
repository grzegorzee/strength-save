// J-T5: eksport treningów do CSV — generowany klientsko (Ustawienia → Dane).
// Format wg specyfikacji planu J (decyzja właściciela 2026-08-20: CSV tylko
// w aplikacji, maile bez załączników): nagłówki EN techniczne, wiersz = jedna
// seria, separator przecinek, UTF-8 z BOM (Excel), CRLF. Pola treningu
// (tonaż, czas, notatka dnia) powtórzone w każdym wierszu sesji (płaski
// format do filtrowania w arkuszu). Funkcje czyste.
import type { WorkoutSession } from '@/types';

export const WORKOUT_CSV_HEADERS = [
  'date', 'day', 'focus', 'exercise', 'set_no', 'set_type',
  'weight_kg', 'reps', 'completed', 'rpe', 'pain', 'exercise_note',
  'day_note', 'session_rating', 'tonnage_kg', 'duration_sec', 'prs',
] as const;

const UTF8_BOM = '﻿';

export const escapeCsvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const cell = (value: string | number | boolean | undefined): string => {
  if (value === undefined || value === '') return '';
  return escapeCsvField(String(value));
};

/** Ta sama definicja co w mailu historii: serie robocze ukończone, waga × powtórzenia. */
const tonnageKg = (workout: WorkoutSession): number =>
  workout.exercises.reduce((sum, ex) => sum + ex.sets
    .filter((s) => s.completed && !s.isWarmup)
    .reduce((acc, s) => acc + s.weight * s.reps, 0), 0);

/**
 * CSV z pełnym detalem serii, treningi chronologicznie. `prCounts` = liczba
 * nowych rekordów per trening (klucz: id sesji, np. z buildHistoryRowMeta) —
 * powtarzana w każdym wierszu sesji.
 */
export function buildWorkoutsCsv(workouts: WorkoutSession[], prCounts: Record<string, number> = {}): string {
  const rows: string[] = [WORKOUT_CSV_HEADERS.join(',')];
  const chronological = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  for (const workout of chronological) {
    const tonnage = tonnageKg(workout);
    const prs = prCounts[workout.id] ?? 0;
    for (const ex of workout.exercises) {
      ex.sets.forEach((set, i) => {
        rows.push([
          cell(workout.date),
          cell(workout.dayName),
          cell(workout.dayFocus),
          cell(ex.name || ex.exerciseId),
          cell(i + 1),
          cell(set.isWarmup ? 'warmup' : 'working'),
          cell(set.weight),
          cell(set.reps),
          cell(set.completed),
          cell(ex.rpe),
          cell(ex.pain),
          cell(ex.notes),
          cell(workout.notes),
          cell(workout.sessionRating),
          cell(tonnage),
          cell(workout.durationSec),
          cell(prs),
        ].join(','));
      });
    }
  }
  return `${UTF8_BOM}${rows.join('\r\n')}\r\n`;
}
