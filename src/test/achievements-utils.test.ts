import { describe, it, expect } from 'vitest';
import {
  getExercise1RMProgress,
  getMonthlyTonnage,
  detectPlateaus,
  computeMilestones,
  computeSpecialBadges,
} from '@/lib/achievements-utils';
import { medalForCompletionRate } from '@/lib/season-medals';
import type { WorkoutSession } from '@/types';

const wk = (id: string, date: string, exId: string, sets: { reps: number; weight: number; completed?: boolean; isWarmup?: boolean }[]): WorkoutSession => ({
  id,
  userId: 'u',
  dayId: 'd',
  date,
  completed: true,
  exercises: [{ exerciseId: exId, sets: sets.map(s => ({ completed: true, ...s })) }],
});

describe('getExercise1RMProgress', () => {
  it('zwraca rekord i deltę względem wcześniejszego najlepszego', () => {
    const workouts = [
      wk('w1', '2026-01-01', 'bench', [{ reps: 5, weight: 80 }]), // 1RM ~93.3
      wk('w2', '2026-02-01', 'bench', [{ reps: 5, weight: 90 }]), // 1RM 105 (rekord)
    ];
    const p = getExercise1RMProgress(workouts, 'bench');
    expect(p.best1RM).toBe(105);
    expect(p.bestDate).toBe('2026-02-01');
    expect(p.prevBest1RM).toBe(93.3);
    expect(p.delta).toBe(11.7);
  });

  it('delta 0 gdy rekord to pierwszy wynik', () => {
    const workouts = [wk('w1', '2026-01-01', 'bench', [{ reps: 1, weight: 100 }])];
    const p = getExercise1RMProgress(workouts, 'bench');
    expect(p.best1RM).toBe(100);
    expect(p.delta).toBe(0);
  });

  it('zwraca zera dla ćwiczenia bez wyników', () => {
    const p = getExercise1RMProgress([], 'x');
    expect(p).toEqual({ best1RM: 0, bestDate: '', prevBest1RM: 0, delta: 0 });
  });
});

describe('getMonthlyTonnage', () => {
  it('rozkłada tonaż na ostatnie N miesięcy z zerami dla pustych', () => {
    const workouts = [
      wk('w1', '2026-03-10', 'a', [{ reps: 10, weight: 100 }]), // 1000
      wk('w2', '2026-03-20', 'a', [{ reps: 5, weight: 100 }]),  // 500
      wk('w3', '2026-01-05', 'a', [{ reps: 10, weight: 50 }]),  // 500
    ];
    const res = getMonthlyTonnage(workouts, 3, new Date(2026, 2, 31)); // marzec
    expect(res.map(r => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(res[0].tonnage).toBe(500);
    expect(res[1].tonnage).toBe(0);
    expect(res[2].tonnage).toBe(1500);
  });

  it('pomija serie nieukończone', () => {
    const workouts = [wk('w1', '2026-03-10', 'a', [{ reps: 10, weight: 100, completed: false }])];
    const res = getMonthlyTonnage(workouts, 1, new Date(2026, 2, 1));
    expect(res[0].tonnage).toBe(0);
  });

  it('zawija na poprzedni rok', () => {
    const res = getMonthlyTonnage([], 3, new Date(2026, 1, 1)); // luty
    expect(res.map(r => r.month)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('detectPlateaus', () => {
  const names = new Map([['bench', 'Wyciskanie']]);

  it('wykrywa zastój gdy rekord jest starszy niż ostatnie sesje', () => {
    const workouts = [
      wk('w1', '2026-01-01', 'bench', [{ reps: 1, weight: 100 }]), // rekord 100
      wk('w2', '2026-01-08', 'bench', [{ reps: 1, weight: 95 }]),
      wk('w3', '2026-01-15', 'bench', [{ reps: 1, weight: 95 }]),
      wk('w4', '2026-01-22', 'bench', [{ reps: 1, weight: 95 }]),
    ];
    const res = detectPlateaus(workouts, names);
    expect(res).toHaveLength(1);
    expect(res[0].exerciseId).toBe('bench');
    expect(res[0].best1RM).toBe(100);
    expect(res[0].sessionCount).toBe(4);
  });

  it('brak zastoju gdy rekord w ostatnich sesjach', () => {
    const workouts = [
      wk('w1', '2026-01-01', 'bench', [{ reps: 1, weight: 90 }]),
      wk('w2', '2026-01-08', 'bench', [{ reps: 1, weight: 92 }]),
      wk('w3', '2026-01-15', 'bench', [{ reps: 1, weight: 95 }]),
      wk('w4', '2026-01-22', 'bench', [{ reps: 1, weight: 100 }]), // rekord ostatnio
    ];
    expect(detectPlateaus(workouts, names)).toHaveLength(0);
  });

  it('ignoruje ćwiczenia poniżej minimum sesji', () => {
    const workouts = [
      wk('w1', '2026-01-01', 'bench', [{ reps: 1, weight: 100 }]),
      wk('w2', '2026-01-08', 'bench', [{ reps: 1, weight: 95 }]),
    ];
    expect(detectPlateaus(workouts, names)).toHaveLength(0);
  });
});

describe('computeMilestones', () => {
  it('oznacza osiągnięte i zablokowane progi', () => {
    const res = computeMilestones({ completedWorkouts: 12, totalTonnage: 12000, exercisesWithRecord: 3 });
    const m = (id: string) => res.find(r => r.id === id)!;
    expect(m('workouts-10').achieved).toBe(true);
    expect(m('workouts-25').achieved).toBe(false);
    expect(m('tonnage-10000').achieved).toBe(true);
    expect(m('tonnage-50000').achieved).toBe(false);
    expect(m('records-1').achieved).toBe(true);
    expect(m('records-5').achieved).toBe(false);
  });
});

describe('computeSpecialBadges', () => {
  const base = (id: string, date: string, extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
    id, userId: 'u', dayId: 'd', date, completed: true, exercises: [], ...extra,
  });
  const badge = (workouts: WorkoutSession[], id: string, planDays?: number) =>
    computeSpecialBadges(workouts, planDays).find(b => b.id === id)!;

  it('early-bird: trening rozpoczęty przed 7:00 lokalnie', () => {
    const at6 = new Date(2026, 0, 5, 6, 30).getTime();
    const at9 = new Date(2026, 0, 6, 9, 0).getTime();
    expect(badge([base('a', '2026-01-05', { startedAt: at6 })], 'early-bird').achieved).toBe(true);
    expect(badge([base('b', '2026-01-06', { startedAt: at9 })], 'early-bird').achieved).toBe(false);
    expect(badge([base('c', '2026-01-06')], 'early-bird').achieved).toBe(false);
  });

  it('sunday-warrior: trening w niedzielę', () => {
    expect(badge([base('a', '2026-01-04')], 'sunday-warrior').achieved).toBe(true); // niedziela
    expect(badge([base('b', '2026-01-05')], 'sunday-warrior').achieved).toBe(false); // poniedziałek
  });

  it('comeback: powrót po przerwie >= 21 dni', () => {
    expect(badge([base('a', '2026-01-01'), base('b', '2026-01-22')], 'comeback').achieved).toBe(true);
    expect(badge([base('a', '2026-01-01'), base('b', '2026-01-15')], 'comeback').achieved).toBe(false);
    expect(badge([base('a', '2026-01-01')], 'comeback').achieved).toBe(false);
  });

  it('consistent-4: cztery kolejne tygodnie z kompletem treningów planu', () => {
    // 4 tygodnie (pon 2026-01-05, 12, 19, 26) po 2 treningi (pon+śr), plan 2 dni/tydz.
    const workouts = [
      base('a1', '2026-01-05'), base('a2', '2026-01-07'),
      base('b1', '2026-01-12'), base('b2', '2026-01-14'),
      base('c1', '2026-01-19'), base('c2', '2026-01-21'),
      base('d1', '2026-01-26'), base('d2', '2026-01-28'),
    ];
    expect(badge(workouts, 'consistent-4', 2).achieved).toBe(true);
    // Dziura w trzecim tygodniu — brak odznaki.
    const withGap = workouts.filter(w => !w.id.startsWith('c'));
    expect(badge(withGap, 'consistent-4', 2).achieved).toBe(false);
    // Plan 3 dni/tydzień: 2 treningi/tydzień to za mało.
    expect(badge(workouts, 'consistent-4', 3).achieved).toBe(false);
  });

  it('treningi nieukończone nie liczą się do odznak', () => {
    const at6 = new Date(2026, 0, 4, 6, 0).getTime();
    const incomplete = { ...{ id: 'x', userId: 'u', dayId: 'd', date: '2026-01-04', completed: false, exercises: [] }, startedAt: at6 } as WorkoutSession;
    const res = computeSpecialBadges([incomplete]);
    expect(res.every(b => !b.achieved)).toBe(true);
  });
});

describe('medalForCompletionRate', () => {
  it('przyznaje medale wg progów frekwencji', () => {
    expect(medalForCompletionRate(100)).toBe('gold');
    expect(medalForCompletionRate(85)).toBe('gold');
    expect(medalForCompletionRate(84)).toBe('silver');
    expect(medalForCompletionRate(65)).toBe('silver');
    expect(medalForCompletionRate(64)).toBe('bronze');
    expect(medalForCompletionRate(40)).toBe('bronze');
    expect(medalForCompletionRate(39)).toBeNull();
    expect(medalForCompletionRate(0)).toBeNull();
  });
});
