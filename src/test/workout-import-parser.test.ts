import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectFormat, parseWorkoutCsv } from '@/lib/workout-import/parser';

const strongCsv = readFileSync(join(__dirname, 'fixtures/strong-sample.csv'), 'utf8');
const hevyCsv = readFileSync(join(__dirname, 'fixtures/hevy-sample.csv'), 'utf8');

describe('detectFormat (Z109)', () => {
  it('rozpoznaje Strong po nagłówku', () => {
    expect(detectFormat(strongCsv.split('\n')[0])).toBe('strong');
  });

  it('rozpoznaje Hevy po nagłówku (z cudzysłowami)', () => {
    expect(detectFormat(hevyCsv.split('\n')[0])).toBe('hevy');
  });

  it('nieznany nagłówek => null', () => {
    expect(detectFormat('foo,bar,baz')).toBeNull();
    expect(detectFormat('')).toBeNull();
  });
});

describe('parseWorkoutCsv — Strong (Z109)', () => {
  const result = parseWorkoutCsv(strongCsv);

  it('grupuje wiersze w sesje po dacie i nazwie treningu', () => {
    expect(result.workouts).toHaveLength(3);
    expect(result.workouts.map((w) => w.date)).toEqual(['2026-05-04', '2026-05-06', '2026-05-08']);
    expect(result.workouts[0].dayName).toBe('Poniedziałek — Góra');
  });

  it('serie z reps/weight, warmup z Set Order=W, notatki ćwiczenia i treningu', () => {
    const bench = result.workouts[0].exercises.find((e) => e.name === 'Bench Press (Barbell)')!;
    expect(bench.sets).toHaveLength(3);
    expect(bench.sets[0]).toMatchObject({ reps: 10, weight: 40, isWarmup: true });
    expect(bench.sets[1]).toMatchObject({ reps: 8, weight: 80 });
    expect(bench.notes).toBe('pas na 3 dziurkę');
    expect(result.workouts[0].notes).toBe('Ciężki dzień, mało snu');
  });

  it('duration (Seconds) i distance (m) trafiają do serii', () => {
    const plank = result.workouts[0].exercises.find((e) => e.name === 'Plank')!;
    expect(plank.sets[0]).toMatchObject({ durationSec: 90 });
    const farmer = result.workouts[1].exercises.find((e) => e.name === "Farmer's Walk")!;
    expect(farmer.sets[0]).toMatchObject({ weight: 24, distanceM: 40, durationSec: 60 });
  });

  it('przecinek dziesiętny PL parsowany poprawnie', () => {
    const squat = result.workouts[1].exercises.find((e) => e.name === 'Squat (Barbell)')!;
    expect(squat.sets[0].weight).toBe(102.5);
  });

  it('uszkodzony wiersz pomijany z licznikiem, reszta parsuje się dalej', () => {
    expect(result.skippedRows).toBe(1);
    expect(result.workouts[2].exercises[0].sets).toHaveLength(2);
  });

  it('lbs -> kg przy jawnej opcji (Strong nie zapisuje jednostki w pliku)', () => {
    const lbsResult = parseWorkoutCsv(strongCsv, { strongWeightUnit: 'lbs' });
    const bench = lbsResult.workouts[0].exercises.find((e) => e.name === 'Bench Press (Barbell)')!;
    expect(bench.sets[1].weight).toBeCloseTo(36.287, 2); // 80 lbs -> kg
  });
});

describe('parseWorkoutCsv — Hevy (Z109)', () => {
  const result = parseWorkoutCsv(hevyCsv);

  it('grupuje po (title, start_time), daty z obu formatów Hevy', () => {
    expect(result.workouts).toHaveLength(3);
    expect(result.workouts[0].date).toBe('2026-05-04'); // "4 May 2026, 17:31"
    expect(result.workouts[1].date).toBe('2026-05-06'); // ISO
  });

  it('set_type warmup, notatki ćwiczenia i opis treningu', () => {
    const bench = result.workouts[0].exercises.find((e) => e.name === 'Bench Press (Barbell)')!;
    expect(bench.sets[0]).toMatchObject({ reps: 10, weight: 40, isWarmup: true });
    expect(bench.notes).toBe('pas na 3 dziurkę');
    expect(result.workouts[0].notes).toBe('Ciężki dzień');
  });

  it('duration_seconds i distance_km -> m', () => {
    const plank = result.workouts[0].exercises.find((e) => e.name === 'Plank')!;
    expect(plank.sets[0]).toMatchObject({ durationSec: 90 });
    const farmer = result.workouts[1].exercises.find((e) => e.name === "Farmer's Walk")!;
    expect(farmer.sets[0]).toMatchObject({ weight: 24, distanceM: 40, durationSec: 60 });
  });

  it('pusty plik => zero treningów, zero błędów', () => {
    expect(parseWorkoutCsv('')).toEqual({ workouts: [], skippedRows: 0, format: null });
  });
});
