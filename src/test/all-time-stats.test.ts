// X17D Z138: statystyki WSZYSTKICH treningów. Prośba usera: po tapnięciu w licznik
// treningów zobaczyć ile czasu spędził na siłowni i ile ton podniósł.
import { describe, expect, it } from 'vitest';
import { buildAllTimeStats } from '@/lib/all-time-stats';
import { calculateTonnage } from '@/lib/summary-utils';
import type { WorkoutSession, SetData } from '@/types';

const set = (over: Partial<SetData> = {}): SetData => ({ reps: 0, weight: 0, completed: false, ...over });

const workout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-07-01',
  completed: true,
  exercises: [],
  ...over,
});

const withSets = (id: string, date: string, sets: SetData[], extra: Partial<WorkoutSession> = {}) =>
  workout({ id, date, exercises: [{ exerciseId: 'ex-1', name: 'Przysiad ze sztangą (High Bar)', sets }], ...extra });

describe('buildAllTimeStats (Z138.1)', () => {
  it('pusta historia daje same zera, bez wywrotki', () => {
    const s = buildAllTimeStats([]);
    expect(s.workoutCount).toBe(0);
    expect(s.totalDurationSec).toBe(0);
    expect(s.workoutsWithDuration).toBe(0);
    expect(s.totalTonnageKg).toBe(0);
    expect(s.totalSets).toBe(0);
    expect(s.totalReps).toBe(0);
    expect(s.firstWorkoutDate).toBeNull();
    expect(s.favoriteExercise).toBeNull();
  });

  it('liczy treningi, serie i powtórzenia z ukończonych serii roboczych', () => {
    const s = buildAllTimeStats([
      withSets('w1', '2026-07-01', [
        set({ isWarmup: true, weight: 20, reps: 10, completed: true }),
        set({ weight: 100, reps: 5, completed: true }),
        set({ weight: 100, reps: 5, completed: true }),
        set({ weight: 100, reps: 5 }),
      ]),
      withSets('w2', '2026-07-03', [set({ weight: 80, reps: 8, completed: true })]),
    ]);
    expect(s.workoutCount).toBe(2);
    // Rozgrzewka i seria nieodhaczona nie liczą się do serii roboczych.
    expect(s.totalSets).toBe(3);
    expect(s.totalReps).toBe(5 + 5 + 8);
  });

  it('tonaż liczony TĄ SAMĄ regułą co reszta apki (calculateTonnage)', () => {
    const workouts = [
      withSets('w1', '2026-07-01', [
        set({ isWarmup: true, weight: 20, reps: 10, completed: true }),
        set({ weight: 100, reps: 5, completed: true }),
        set({ weight: 100, reps: 5 }),
      ]),
    ];
    const s = buildAllTimeStats(workouts);
    expect(s.totalTonnageKg).toBe(calculateTonnage(workouts));
    // Rozgrzewka (20×10) i seria nieodhaczona NIE wchodzą: zostaje 100×5.
    expect(s.totalTonnageKg).toBe(500);
  });

  it('czas liczy tylko sesje z pomiarem i osobno je zlicza (treningi sprzed M32 go nie mają)', () => {
    const s = buildAllTimeStats([
      withSets('w1', '2026-07-01', [set({ weight: 50, reps: 5, completed: true })], { durationSec: 3600 }),
      withSets('w2', '2026-07-02', [set({ weight: 50, reps: 5, completed: true })]),
      withSets('w3', '2026-07-03', [set({ weight: 50, reps: 5, completed: true })], { startedAt: 1000, completedAt: 1000 + 1800_000 }),
    ]);
    expect(s.totalDurationSec).toBe(3600 + 1800);
    expect(s.workoutsWithDuration).toBe(2);
    expect(s.workoutCount).toBe(3);
  });

  it('data pierwszego treningu to najstarsza, nie pierwsza z listy', () => {
    const s = buildAllTimeStats([
      withSets('w2', '2026-07-10', [set({ weight: 50, reps: 5, completed: true })]),
      withSets('w1', '2026-03-02', [set({ weight: 50, reps: 5, completed: true })]),
    ]);
    expect(s.firstWorkoutDate).toBe('2026-03-02');
  });

  it('ulubione ćwiczenie = najczęściej wykonywane, z liczbą sesji', () => {
    const s = buildAllTimeStats([
      workout({
        id: 'w1', date: '2026-07-01', exercises: [
          { exerciseId: 'a', name: 'Przysiad', sets: [set({ weight: 100, reps: 5, completed: true })] },
          { exerciseId: 'b', name: 'Wyciskanie', sets: [set({ weight: 80, reps: 5, completed: true })] },
        ],
      }),
      workout({
        id: 'w2', date: '2026-07-03', exercises: [
          { exerciseId: 'a', name: 'Przysiad', sets: [set({ weight: 100, reps: 5, completed: true })] },
        ],
      }),
    ]);
    expect(s.favoriteExercise).toEqual({ name: 'Przysiad', sessions: 2 });
  });

  it('pomija treningi nieukończone', () => {
    const s = buildAllTimeStats([
      withSets('w1', '2026-07-01', [set({ weight: 100, reps: 5, completed: true })]),
      withSets('w2', '2026-07-02', [set({ weight: 100, reps: 5, completed: true })], { completed: false }),
    ]);
    expect(s.workoutCount).toBe(1);
    expect(s.totalTonnageKg).toBe(500);
  });

  it('podaje streak bieżący i rekordowy', () => {
    const s = buildAllTimeStats([
      withSets('w1', '2026-07-01', [set({ weight: 50, reps: 5, completed: true })]),
      withSets('w2', '2026-07-03', [set({ weight: 50, reps: 5, completed: true })]),
    ]);
    expect(typeof s.currentStreak).toBe('number');
    expect(typeof s.longestStreak).toBe('number');
    expect(s.longestStreak).toBeGreaterThanOrEqual(0);
  });

  it('sumuje rekordy (PR) z historii', () => {
    const s = buildAllTimeStats([
      withSets('w1', '2026-07-01', [set({ weight: 100, reps: 5, completed: true })]),
      withSets('w2', '2026-07-08', [set({ weight: 110, reps: 5, completed: true })]),
    ]);
    expect(s.totalPRs).toBeGreaterThanOrEqual(1);
  });
});

// Z138.5: dług — dwie metody liczenia tonażu dawały różne liczby na Dashboardzie
// i w raporcie PDF. Ten test utrwala, KTÓRA jest poprawna.
describe('ujednolicenie tonażu (Z138.5)', () => {
  const legacyGetTotalWeight = (workouts: WorkoutSession[]): number =>
    workouts.reduce((total, w) => total + w.exercises.reduce((exTotal, ex) =>
      exTotal + ex.sets.reduce((setTotal, s) => setTotal + (s.completed ? s.reps * s.weight : 0), 0), 0), 0);

  it('stara metoda zawyżała tonaż o rozgrzewkę — nowa jej nie liczy', () => {
    const workouts = [
      withSets('w1', '2026-07-01', [
        set({ isWarmup: true, weight: 60, reps: 10, completed: true }),
        set({ weight: 100, reps: 5, completed: true }),
      ]),
    ];
    // Dowód, że różnica jest realna, a nie teoretyczna: 600 kg rozgrzewki.
    expect(legacyGetTotalWeight(workouts)).toBe(1100);
    expect(buildAllTimeStats(workouts).totalTonnageKg).toBe(500);
  });
});
