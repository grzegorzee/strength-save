// Fala 2 (2026-08-20): pasek obciążenia dnia na kartach Planu + wybór dnia NASTĘPNY.
// Niezmiennik danych: procenty TYLKO z ukończonych treningów; brak tonażu = brak pasków.
import { describe, expect, it } from 'vitest';
import { buildDayLoadMap, findNextPlannedDate } from '@/lib/plan-day-load';
import type { WorkoutSession } from '@/types';

const workout = (
  date: string,
  weights: number[],
  over: Partial<WorkoutSession> = {},
): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'day-1',
  dayName: 'Dzień',
  dayFocus: '',
  date,
  completed: true,
  exercises: [{
    exerciseId: 'ex-1',
    name: 'Przysiad',
    sets: weights.map((weight) => ({ reps: 10, weight, completed: true })),
  }],
  ...over,
} as WorkoutSession);

describe('buildDayLoadMap', () => {
  it('liczy procent względem najcięższego dnia tygodnia', () => {
    const map = buildDayLoadMap([
      workout('2026-08-17', [50, 50]),   // 1000
      workout('2026-08-18', [100, 100]), // 2000 = max
    ], '2026-08-17', '2026-08-23');
    expect(map.get('2026-08-17')).toBe(50);
    expect(map.get('2026-08-18')).toBe(100);
  });

  it('jeden trening w tygodniu = 100%', () => {
    const map = buildDayLoadMap([workout('2026-08-19', [60])], '2026-08-17', '2026-08-23');
    expect(map.get('2026-08-19')).toBe(100);
    expect(map.size).toBe(1);
  });

  it('tydzień bez tonażu = pusta mapa (kart bez paska)', () => {
    expect(buildDayLoadMap([], '2026-08-17', '2026-08-23').size).toBe(0);
  });

  it('trening z samą rozgrzewką ma tonaż 0 i nie tworzy pasków', () => {
    const warmupOnly = workout('2026-08-17', []);
    warmupOnly.exercises[0].sets = [{ reps: 10, weight: 40, completed: true, isWarmup: true }];
    expect(buildDayLoadMap([warmupOnly], '2026-08-17', '2026-08-23').size).toBe(0);
  });

  it('pomija treningi nieukończone i spoza zakresu tygodnia', () => {
    const map = buildDayLoadMap([
      workout('2026-08-17', [100]),
      workout('2026-08-18', [200], { completed: false }),
      workout('2026-08-10', [300]), // poprzedni tydzień
    ], '2026-08-17', '2026-08-23');
    expect(map.size).toBe(1);
    expect(map.get('2026-08-17')).toBe(100);
  });

  it('dwa treningi tego samego dnia sumują się do jednego wpisu', () => {
    const map = buildDayLoadMap([
      workout('2026-08-17', [50]),  // 500
      { ...workout('2026-08-17', [50]), id: 'w-2' }, // +500 = 1000
      workout('2026-08-18', [100]), // 1000
    ], '2026-08-17', '2026-08-23');
    expect(map.get('2026-08-17')).toBe(100);
    expect(map.get('2026-08-18')).toBe(100);
  });
});

describe('findNextPlannedDate', () => {
  const week = ['2026-08-17', '2026-08-18', '2026-08-20', '2026-08-21'];

  it('zwraca najwcześniejszą datę >= dziś, nieukończoną i niepominiętą', () => {
    const next = findNextPlannedDate(week, new Set(['2026-08-17', '2026-08-18']), [], '2026-08-18');
    expect(next).toBe('2026-08-20');
  });

  it('pomija dni pominięte (skipped)', () => {
    const next = findNextPlannedDate(week, new Set(['2026-08-17']), ['2026-08-20'], '2026-08-19');
    expect(next).toBe('2026-08-21');
  });

  it('dzisiejszy nieukończony dzień jest kandydatem', () => {
    const next = findNextPlannedDate(week, new Set(), [], '2026-08-17');
    expect(next).toBe('2026-08-17');
  });

  it('brak kandydata (wszystko zrobione lub tydzień historyczny) = null', () => {
    expect(findNextPlannedDate(week, new Set(week), [], '2026-08-17')).toBeNull();
    expect(findNextPlannedDate(week, new Set(), [], '2026-08-25')).toBeNull();
  });

  it('kolejność wejścia nie ma znaczenia — zawsze najwcześniejsza data', () => {
    const shuffled = ['2026-08-21', '2026-08-17', '2026-08-20'];
    expect(findNextPlannedDate(shuffled, new Set(), [], '2026-08-16')).toBe('2026-08-17');
  });
});
