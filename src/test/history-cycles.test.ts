import { describe, expect, it } from 'vitest';
import {
  assignWorkoutsToCycles,
  buildCycleSparkline,
  groupCycleWorkoutsByWeek,
  weekNoFor,
  windowCoversCycleStart,
} from '@/lib/history-cycles';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';

// Fala 2 (2026-08-20): grupowanie Historii po cyklach.
// Kluczowy niezmiennik (lekcja "testuj sekwencje, nie ekrany"):
// perCycle + outside == wejście — żadna sesja nie ginie i się nie dubluje.

const workout = (id: string, date: string, overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  exercises: [{
    exerciseId: 'ex-1',
    name: 'Przysiad',
    sets: [{ reps: 8, weight: 100, completed: true }],
  }] as WorkoutSession['exercises'],
  completed: true,
  ...overrides,
});

const cycle = (id: string, startDate: string, endDate: string, overrides: Partial<PlanCycle> = {}): PlanCycle => ({
  id,
  userId: 'u1',
  days: [],
  durationWeeks: 12,
  startDate,
  endDate,
  status: 'completed',
  createdAt: startDate,
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  ...overrides,
});

describe('assignWorkoutsToCycles', () => {
  const active = cycle('c-active', '2026-06-01', '2026-08-23', { status: 'active' });
  const past = cycle('c-past', '2026-03-02', '2026-05-24');

  it('cycleId wygrywa z zakresem dat', () => {
    // Data w zakresie c-active, ale cycleId wskazuje c-past.
    const w = workout('w1', '2026-06-10', { cycleId: 'c-past' });
    const { perCycle, outside } = assignWorkoutsToCycles([w], [active, past]);
    expect(perCycle.get('c-past')).toEqual([w]);
    expect(perCycle.get('c-active')).toBeUndefined();
    expect(outside).toEqual([]);
  });

  it('fallback po zakresie dat dla sesji bez cycleId (ad-hoc, import)', () => {
    const w = workout('w1', '2026-04-15');
    const { perCycle, outside } = assignWorkoutsToCycles([w], [active, past]);
    expect(perCycle.get('c-past')).toEqual([w]);
    expect(outside).toEqual([]);
  });

  it('sesja poza wszystkimi cyklami trafia do outside', () => {
    const w = workout('w1', '2025-01-01');
    const { perCycle, outside } = assignWorkoutsToCycles([w], [active, past]);
    expect(perCycle.size).toBe(0);
    expect(outside).toEqual([w]);
  });

  it('cycleId na niewidoczny cykl => outside (sesja nie ginie, nie wpada po zakresie dat)', () => {
    // Ryzyko 9 z planu: cykl techniczny/ukryty nie jest na liście widocznych.
    const w = workout('w1', '2026-06-10', { cycleId: 'c-hidden' });
    const { perCycle, outside } = assignWorkoutsToCycles([w], [active, past]);
    expect(perCycle.size).toBe(0);
    expect(outside).toEqual([w]);
  });

  it('nakładające się zakresy: wygrywa cykl aktywny, potem pierwszy z listy', () => {
    const overlapping = cycle('c-overlap', '2026-05-01', '2026-07-01');
    const w = workout('w1', '2026-06-10');
    const withActive = assignWorkoutsToCycles([w], [overlapping, active]);
    expect(withActive.perCycle.get('c-active')).toEqual([w]);

    const second = cycle('c-second', '2026-05-15', '2026-07-15');
    const noActive = assignWorkoutsToCycles([w], [overlapping, second]);
    expect(noActive.perCycle.get('c-overlap')).toEqual([w]);
  });

  it('NIEZMIENNIK KOMPLETNOŚCI: perCycle + outside == wejście (bez ubytków i duplikatów)', () => {
    const mix = [
      workout('adhoc', '2026-06-05'),
      workout('draft', '2026-06-06', { completed: false, cycleId: 'c-active' }),
      workout('legacy', '2025-11-11'),
      workout('hidden-ref', '2026-06-07', { cycleId: 'c-hidden' }),
      workout('past-range', '2026-04-01'),
      workout('active-id', '2026-08-01', { cycleId: 'c-active' }),
    ];
    const { perCycle, outside } = assignWorkoutsToCycles(mix, [active, past]);
    const assigned = [...perCycle.values()].flat();
    const all = [...assigned, ...outside];
    expect(all).toHaveLength(mix.length);
    expect(new Set(all.map((w) => w.id)).size).toBe(mix.length);
    expect(new Set(all.map((w) => w.id))).toEqual(new Set(mix.map((w) => w.id)));
  });
});

describe('weekNoFor + groupCycleWorkoutsByWeek', () => {
  // Start w poniedziałek 2026-06-01 => tydzień 1 = 01-07.06.
  const active = cycle('c1', '2026-06-01', '2026-08-23', { status: 'active' });

  it('sesja z datą startu cyklu => tydzień 1; granice tygodni poniedziałkowe', () => {
    expect(weekNoFor('2026-06-01', active)).toBe(1);
    expect(weekNoFor('2026-06-07', active)).toBe(1);
    expect(weekNoFor('2026-06-08', active)).toBe(2);
  });

  it('start w środku tygodnia: kotwica = poniedziałek tygodnia startu', () => {
    // 2026-06-03 to środa; poniedziałek tygodnia = 2026-06-01.
    const midWeek = cycle('c2', '2026-06-03', '2026-08-25');
    expect(weekNoFor('2026-06-03', midWeek)).toBe(1);
    expect(weekNoFor('2026-06-07', midWeek)).toBe(1);
    expect(weekNoFor('2026-06-08', midWeek)).toBe(2);
  });

  it('clamp: data przed startem => 1, po końcu => durationWeeks', () => {
    expect(weekNoFor('2026-05-20', active)).toBe(1);
    expect(weekNoFor('2027-01-01', active)).toBe(12);
  });

  it('grupuje malejąco po tygodniu i oznacza bieżący tydzień aktywnego cyklu', () => {
    const list = [
      workout('w3', '2026-06-10'),
      workout('w2', '2026-06-08'),
      workout('w1', '2026-06-02'),
    ];
    const groups = groupCycleWorkoutsByWeek(active, list, '2026-06-10');
    expect(groups.map((g) => g.weekNo)).toEqual([2, 1]);
    expect(groups[0].isCurrent).toBe(true);
    expect(groups[0].workouts.map((w) => w.id)).toEqual(['w3', 'w2']);
    expect(groups[1].isCurrent).toBe(false);
    expect(groups[1].workouts.map((w) => w.id)).toEqual(['w1']);
  });

  it('cykl zakończony nie ma tygodnia bieżącego', () => {
    const done = cycle('c3', '2026-03-02', '2026-05-24');
    const groups = groupCycleWorkoutsByWeek(done, [workout('w1', '2026-03-03')], '2026-03-03');
    expect(groups[0].isCurrent).toBe(false);
  });
});

describe('buildCycleSparkline', () => {
  const active = cycle('c1', '2026-06-01', '2026-08-23', { status: 'active', durationWeeks: 4 });

  it('durationWeeks kubełków, sumy tonażu per tydzień, pusty tydzień = 0', () => {
    const list = [
      workout('w1', '2026-06-02'), // tydz. 1: 8*100 = 800
      workout('w2', '2026-06-04'), // tydz. 1: +800
      workout('w3', '2026-06-09'), // tydz. 2: 800
    ];
    expect(buildCycleSparkline(active, list)).toEqual([1600, 800, 0, 0]);
  });

  it('serie nieukończone nie liczą się do tonażu (kontrakt calculateTonnage)', () => {
    const w = workout('w1', '2026-06-02', {
      exercises: [{
        exerciseId: 'ex-1',
        name: 'Przysiad',
        sets: [
          { reps: 8, weight: 100, completed: true },
          { reps: 8, weight: 100, completed: false },
        ],
      }] as WorkoutSession['exercises'],
    });
    expect(buildCycleSparkline(active, [w])[0]).toBe(800);
  });
});

describe('windowCoversCycleStart', () => {
  const c = { startDate: '2026-06-01' };

  it('hasMore=false => całość załadowana => true', () => {
    expect(windowCoversCycleStart('2026-07-01', c, false)).toBe(true);
    expect(windowCoversCycleStart(null, c, false)).toBe(true);
  });

  it('hasMore + najstarsza załadowana > startDate => false (dane niepełne)', () => {
    expect(windowCoversCycleStart('2026-06-15', c, true)).toBe(false);
    expect(windowCoversCycleStart(null, c, true)).toBe(false);
  });

  it('hasMore + najstarsza załadowana <= startDate => true', () => {
    expect(windowCoversCycleStart('2026-06-01', c, true)).toBe(true);
    expect(windowCoversCycleStart('2026-05-20', c, true)).toBe(true);
  });
});
