// J-T5: klientski eksport treningów do CSV (Ustawienia → Dane).
// Format wg specyfikacji planu J: nagłówki EN techniczne, wiersz per seria,
// escapowanie RFC 4180, UTF-8 z BOM (Excel), separator przecinek, CRLF.
import { describe, expect, it } from 'vitest';
import { WORKOUT_CSV_HEADERS, buildWorkoutsCsv, escapeCsvField } from '@/lib/workout-csv';
import type { WorkoutSession } from '@/types';

const workout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-20',
  dayName: 'Czwartek',
  dayFocus: 'Góra B',
  completed: true,
  durationSec: 3617,
  notes: 'Dobra energia',
  sessionRating: 'down',
  exercises: [{
    exerciseId: 'ex-1',
    name: 'Wyciskanie sztangi',
    rpe: 8,
    pain: 3,
    quality: 4,
    notes: 'lekki dyskomfort',
    sets: [
      { reps: 10, weight: 40, completed: true, isWarmup: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: false },
    ],
  }],
  ...over,
});

describe('escapeCsvField', () => {
  it('zwykłe wartości bez zmian, przecinki/cudzysłowy/nowe linie w cudzysłowach', () => {
    expect(escapeCsvField('abc')).toBe('abc');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
  });
});

describe('buildWorkoutsCsv', () => {
  it('nagłówki EN techniczne w ustalonej kolejności, UTF-8 BOM, CRLF', () => {
    const csv = buildWorkoutsCsv([workout()]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(WORKOUT_CSV_HEADERS.join(','));
    expect(WORKOUT_CSV_HEADERS).toEqual([
      'date', 'day', 'focus', 'exercise', 'set_no', 'set_type',
      'weight_kg', 'reps', 'completed', 'rpe', 'pain', 'quality', 'exercise_note',
      'day_note', 'session_rating', 'tonnage_kg', 'duration_sec', 'prs',
    ]);
  });

  it('wiersz per seria: set_no 1-based, warmup/working, tonaż i czas per trening', () => {
    const csv = buildWorkoutsCsv([workout()], { w1: 2 });
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines).toHaveLength(4); // nagłówek + 3 serie
    expect(lines[1]).toBe(
      '2026-08-20,Czwartek,Góra B,Wyciskanie sztangi,1,warmup,40,10,true,8,3,4,lekki dyskomfort,Dobra energia,down,500,3617,2',
    );
    expect(lines[2]).toContain(',2,working,100,5,true,');
    expect(lines[3]).toContain(',3,working,100,5,false,');
  });

  it('escapuje dane usera (nazwa z przecinkiem, notatka z cudzysłowem)', () => {
    const tricky = workout({
      notes: 'cytat: "mocno"',
      exercises: [{
        exerciseId: 'ex-1',
        name: 'Wyciskanie, skos',
        sets: [{ reps: 5, weight: 100, completed: true }],
      }],
    });
    const csv = buildWorkoutsCsv([tricky]);
    expect(csv).toContain('"Wyciskanie, skos"');
    expect(csv).toContain('"cytat: ""mocno"""');
  });

  it('brakujące pola = puste kolumny; trening bez serii pomijany; sort chronologiczny', () => {
    const bare = workout({
      id: 'w-b',
      date: '2026-08-10',
      durationSec: undefined,
      notes: undefined,
      sessionRating: undefined,
      exercises: [{
        exerciseId: 'ex-x',
        sets: [{ reps: 0, weight: 0, completed: true, durationSec: 60 }],
      }],
    });
    const csv = buildWorkoutsCsv([workout(), bare, workout({ id: 'w-empty', date: '2026-08-01', exercises: [] })]);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines).toHaveLength(5); // nagłówek + 1 seria bare + 3 serie w1
    // Chronologicznie: najpierw 2026-08-10 (bare), potem 2026-08-20.
    expect(lines[1]).toBe('2026-08-10,Czwartek,Góra B,ex-x,1,working,0,0,true,,,,,,,0,,0');
    expect(lines[2].startsWith('2026-08-20')).toBe(true);
  });
});
