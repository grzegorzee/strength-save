// X17D Z138: statystyki WSZYSTKICH treningów. Prośba usera: po tapnięciu w licznik
// treningów zobaczyć ile czasu spędził na siłowni i ile ton podniósł.
import { describe, expect, it } from 'vitest';
import { buildAllTimeActivityStats, buildAllTimeStats, type StatsActivity } from '@/lib/all-time-stats';
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

// CRASH z 2026-07-20 (build 73): user zgłosił „Coś poszło nie tak" po niezapisanym
// szybkim treningu. AllTimeStatsSheet liczy statystyki przy KAŻDYM renderze (jest
// montowany przez AppHeader na każdej stronie), więc jeden trening o niepełnym
// kształcie wywracał całą stronę, a nie tylko arkusz statystyk.
describe('odporność na niepełne dane treningu (crash 2026-07-20)', () => {
  it('trening bez pola exercises nie wywraca liczenia', () => {
    const broken = { id: 'x', userId: 'u', dayId: 'd', date: '2026-07-01', completed: true } as unknown as WorkoutSession;
    expect(() => buildAllTimeStats([broken])).not.toThrow();
    expect(buildAllTimeStats([broken]).workoutCount).toBe(0);
  });

  it('ćwiczenie bez pola sets nie wywraca liczenia', () => {
    const broken = workout({
      exercises: [{ exerciseId: 'a' } as unknown as WorkoutSession['exercises'][number]],
    });
    expect(() => buildAllTimeStats([broken])).not.toThrow();
  });

  it('seria z brakującymi liczbami liczy się jako zero, nie jako NaN', () => {
    const broken = workout({
      exercises: [{ exerciseId: 'a', sets: [{ completed: true } as unknown as SetData] }],
    });
    const s = buildAllTimeStats([broken]);
    expect(Number.isNaN(s.totalReps)).toBe(false);
    expect(Number.isNaN(s.totalTonnageKg)).toBe(false);
  });

  it('mieszanka poprawnych i uszkodzonych treningów liczy te poprawne', () => {
    const broken = { id: 'x', userId: 'u', dayId: 'd', date: '2026-07-02', completed: true } as unknown as WorkoutSession;
    const ok = withSets('w1', '2026-07-01', [set({ weight: 100, reps: 5, completed: true })]);
    const s = buildAllTimeStats([broken, ok]);
    expect(s.workoutCount).toBe(1);
    expect(s.totalTonnageKg).toBe(500);
  });
});

// Feedback 2026-09-03: 87 w nagłówku (agregat v1: każdy completed) vs 86 w
// szczegółach. Jedna definicja: completed + >=1 ukończona seria robocza,
// para provisional→remote liczona raz. Ten moduł zasila „Twoje liczby".
describe('jedna semantyka ukończonego treningu (nagłówek = szczegóły)', () => {
  it('completed bez serii roboczej (pusty albo sama rozgrzewka) nie liczy się do treningów', () => {
    const s = buildAllTimeStats([
      withSets('w1', '2026-07-01', [set({ weight: 100, reps: 5, completed: true })]),
      withSets('empty', '2026-07-02', [set({ weight: 100, reps: 5 })]),
      withSets('warmup', '2026-07-03', [set({ isWarmup: true, weight: 20, reps: 10, completed: true })]),
    ]);
    expect(s.workoutCount).toBe(1);
    expect(s.totalTonnageKg).toBe(500);
    expect(s.totalSets).toBe(1);
  });

  it('para provisional→remote w jednym snapshotcie nie podwaja licznika ani tonażu', () => {
    const remote = withSets('workout-u1-day-1-2026-07-01', '2026-07-01', [set({ weight: 100, reps: 5, completed: true })]);
    const provisional: WorkoutSession = { ...remote, id: `local-${remote.id}` };
    const s = buildAllTimeStats([provisional, remote]);
    expect(s.workoutCount).toBe(1);
    expect(s.totalTonnageKg).toBe(500);
    expect(s.totalSets).toBe(1);
  });

  it('dwa szybkie treningi tego samego dnia liczą się osobno', () => {
    const s = buildAllTimeStats([
      withSets('workout-u1-adhoc-2026-07-01-1000-2026-07-01', '2026-07-01', [set({ weight: 100, reps: 5, completed: true })], { dayId: 'adhoc-2026-07-01-1000' }),
      withSets('workout-u1-adhoc-2026-07-01-2000-2026-07-01', '2026-07-01', [set({ weight: 50, reps: 5, completed: true })], { dayId: 'adhoc-2026-07-01-2000' }),
    ]);
    expect(s.workoutCount).toBe(2);
    expect(s.totalTonnageKg).toBe(750);
  });
});

// F5 (2026-09-29, wariant A właściciela): „Ukończone aktywności" liczone od
// pierwszego ukończonego treningu siłowego w apce, z rozbiciem na źródła i typy.
describe('F5: okno „od pierwszego treningu" i rozbicie cardio', () => {
  const cardio = (id: string, date: string, type: string, source: StatsActivity['source'] = 'strava', extra: Partial<StatsActivity> = {}): StatsActivity => ({
    id, userId: 'u1', source, type, date, movingTime: 600,
    ...(source === 'strava' ? { stravaId: Number(id.replace(/\D/g, '')) || 1 } : {}),
    ...extra,
  });
  const strength = [
    withSets('s1', '2026-01-26', [set({ reps: 5, weight: 100, completed: true })]),
    withSets('s2', '2026-03-01', [set({ reps: 5, weight: 100, completed: true })]),
  ];
  const activities = [
    cardio('r1', '2025-04-04', 'Run'), cardio('r2', '2026-01-25', 'Run'),
    cardio('r3', '2026-01-26', 'Run'), cardio('r4', '2026-05-01', 'Run'),
    cardio('h5', '2026-02-10', 'Hike'), cardio('y6', '2026-06-01', 'Yoga'),
    cardio('m1', '2025-12-01', 'Swim', 'manual'), cardio('m2', '2026-08-01', 'Swim', 'manual'),
    cardio('w7', '2026-04-01', 'WeightTraining'),
  ];

  it('liczy od daty pierwszego ukończonego treningu siłowego (włącznie), starsze wykluczone i policzone osobno', () => {
    const r = buildAllTimeActivityStats(strength, activities);
    expect(r.since).toBe('2026-01-26');
    expect(r.sinceSource).toBe('strength');
    expect(r.cardioCount).toBe(5);
    expect(r.beforeSince).toEqual({ strava: 2, manual: 1 });
    expect(r.cardioDurationSec).toBe(5 * 600);
  });

  it('niezmienniki: aktywności = siłowe + cardio; cardio = suma źródeł = suma typów', () => {
    const r = buildAllTimeActivityStats(strength, activities);
    expect(r.activityCount).toBe(r.strength.workoutCount + r.cardioCount);
    expect(r.cardioBySource.strava + r.cardioBySource.manual).toBe(r.cardioCount);
    expect(r.cardioByType.reduce((sum, t) => sum + t.count, 0)).toBe(r.cardioCount);
    expect(r.cardioBySource).toEqual({ strava: 4, manual: 1 });
    expect(r.cardioByType).toEqual([
      { type: 'Run', count: 2 }, { type: 'Hike', count: 1 }, { type: 'Swim', count: 1 }, { type: 'Yoga', count: 1 },
    ]);
  });

  it('WeightTraining/Crossfit ze Stravy nie wchodzą ani do cardio, ani do typów, ani do „starszych"', () => {
    const r = buildAllTimeActivityStats(strength, [cardio('w1', '2025-01-01', 'WeightTraining'), cardio('c2', '2026-05-01', 'Crossfit')]);
    expect(r.cardioCount).toBe(0);
    expect(r.cardioByType).toEqual([]);
    expect(r.beforeSince).toEqual({ strava: 0, manual: 0 });
  });

  it('bez treningów siłowych okno zaczyna się od najstarszej aktywności i nic nie jest wykluczone', () => {
    const r = buildAllTimeActivityStats([], [cardio('m1', '2026-03-05', 'Swim', 'manual'), cardio('m2', '2026-02-01', 'Walk', 'manual')]);
    expect(r.since).toBe('2026-02-01');
    expect(r.sinceSource).toBe('activity');
    expect(r.activityCount).toBe(2);
    expect(r.beforeSince).toEqual({ strava: 0, manual: 0 });
  });

  it('pusta historia: brak daty „od" i same zera', () => {
    const r = buildAllTimeActivityStats([], []);
    expect(r).toMatchObject({ since: null, sinceSource: null, activityCount: 0, cardioCount: 0, cardioByType: [] });
  });

  it('nieukończony trening nie przesuwa daty „od"', () => {
    const r = buildAllTimeActivityStats(
      [workout({ id: 'draft', date: '2025-01-01', completed: false }), ...strength],
      activities,
    );
    expect(r.since).toBe('2026-01-26');
  });

  it('aktywność bez daty (stary kształt) jest liczona, a nie gubiona', () => {
    const r = buildAllTimeActivityStats(strength, [{ id: 'x', userId: 'u1', source: 'manual', type: 'Swim' }]);
    expect(r.cardioCount).toBe(1);
  });
});
