import { describe, it, expect } from 'vitest';
import { getWeekBounds, calculateTonnage, calculateStreak, calculateStreakDetails } from '@/lib/summary-utils';
import { formatLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

// Trening `dayOffset` dni od poniedziałku tygodnia `weeksBack` tygodni wstecz.
const workoutOn = (id: string, weeksBack: number, dayOffset: number): WorkoutSession => {
  const { start } = getWeekBounds(new Date());
  const d = new Date(start);
  d.setDate(d.getDate() - weeksBack * 7 + dayOffset);
  return { id, userId: 'test-user', dayId: 'day-1', date: formatLocalDate(d), completed: true, exercises: [] };
};

// Zaliczony tydzień: 2 treningi (pon + wt).
const fullWeek = (weeksBack: number): WorkoutSession[] => [
  workoutOn(`w${weeksBack}-a`, weeksBack, 0),
  workoutOn(`w${weeksBack}-b`, weeksBack, 1),
];

describe('calculateTonnage — typy serii (Z106, twarda zasada 4)', () => {
  const tw = (sets: WorkoutSession['exercises'][number]['sets']): WorkoutSession[] => [{
    id: 't1', userId: 'u1', dayId: 'd1', date: '2026-07-10', completed: true,
    exercises: [{ exerciseId: 'e1', sets }],
  }];

  it('zwykła seria: reps x weight (bez zmian)', () => {
    expect(calculateTonnage(tw([{ reps: 8, weight: 60, completed: true }]))).toBe(480);
  });

  it('seria czysto czasowa (duration) NIE wchodzi do tonażu', () => {
    expect(calculateTonnage(tw([{ reps: 0, weight: 0, completed: true, durationSec: 90 }]))).toBe(0);
  });

  it('seria z asystą NIE wchodzi do tonażu (weight=0)', () => {
    expect(calculateTonnage(tw([{ reps: 8, weight: 0, completed: true, assistWeight: 25 }]))).toBe(0);
  });

  it('ciężar+dystans+czas wchodzi jako ciężar x 1 na serię', () => {
    expect(calculateTonnage(tw([{ reps: 0, weight: 24, completed: true, distanceM: 40, durationSec: 60 }]))).toBe(24);
  });

  it('nieukończona/rozgrzewkowa nie wchodzi (regresja)', () => {
    expect(calculateTonnage(tw([
      { reps: 8, weight: 60, completed: false },
      { reps: 10, weight: 20, completed: true, isWarmup: true },
    ]))).toBe(0);
  });
});

describe('getWeekBounds', () => {
  it('returns Monday to Sunday for a Wednesday', () => {
    const wed = new Date('2026-02-25'); // Wednesday
    const { start, end } = getWeekBounds(wed);
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(start.getDate()).toBe(23); // Mon Feb 23
    expect(end.getDate()).toBe(1); // Sun Mar 1
  });

  it('returns correct bounds for Monday', () => {
    const mon = new Date('2026-02-23');
    const { start } = getWeekBounds(mon);
    expect(start.getDate()).toBe(23);
  });

  it('returns correct bounds for Sunday', () => {
    const sun = new Date('2026-03-01');
    const { start } = getWeekBounds(sun);
    expect(start.getDate()).toBe(23); // previous Monday
  });
});

describe('calculateTonnage', () => {
  it('sums reps × weight for completed working sets', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w1', userId: 'test-user', dayId: 'day-1', date: '2026-01-01', completed: true,
        exercises: [
          {
            exerciseId: 'ex-1-1',
            sets: [
              { reps: 5, weight: 20, completed: true, isWarmup: true }, // ignored
              { reps: 8, weight: 40, completed: true },  // 320
              { reps: 8, weight: 40, completed: true },  // 320
              { reps: 6, weight: 40, completed: true },  // 240
            ],
          },
        ],
      },
    ];
    expect(calculateTonnage(workouts)).toBe(880);
  });

  it('ignores incomplete sets', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w1', userId: 'test-user', dayId: 'day-1', date: '2026-01-01', completed: true,
        exercises: [
          {
            exerciseId: 'ex-1-1',
            sets: [
              { reps: 8, weight: 40, completed: false }, // ignored
              { reps: 8, weight: 40, completed: true },  // 320
            ],
          },
        ],
      },
    ];
    expect(calculateTonnage(workouts)).toBe(320);
  });

  it('returns 0 for empty workouts', () => {
    expect(calculateTonnage([])).toBe(0);
  });
});

describe('calculateStreak', () => {
  it('returns 0 for no workouts', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 0 for no completed workouts', () => {
    const workouts: WorkoutSession[] = [
      { id: 'w1', userId: 'test-user', dayId: 'day-1', date: '2026-02-23', completed: false, exercises: [] },
    ];
    expect(calculateStreak(workouts)).toBe(0);
  });

  // Regresja: weekStart parsowany jako UTC (new Date('YYYY-MM-DD')) wykluczał treningi
  // poniedziałkowe z licznika tygodnia w strefach UTC+ (d < weekStart o offset strefy).
  it('counts Monday workouts towards the week (no UTC/local mix)', () => {
    const workouts = [...fullWeek(0), ...fullWeek(1)];
    expect(calculateStreak(workouts)).toBe(2);
  });
});

describe('calculateStreakDetails (tarcza serii)', () => {
  it('pusty bieżący tydzień nie zeruje serii z poprzednich tygodni', () => {
    const workouts = [...fullWeek(1), ...fullWeek(2)];
    const { streak, frozenWeeks } = calculateStreakDetails(workouts);
    expect(streak).toBe(2);
    expect(frozenWeeks).toEqual([]);
  });

  it('jeden pusty tydzień między zaliczonymi jest ratowany tarczą', () => {
    const workouts = [...fullWeek(0), ...fullWeek(2)]; // tydzień -1 pusty
    const { streak, frozenWeeks } = calculateStreakDetails(workouts);
    expect(streak).toBe(2);
    expect(frozenWeeks).toHaveLength(1);
  });

  it('dwa puste tygodnie z rzędu łamią serię (tarcza nie chroni dziury bez kontynuacji)', () => {
    const workouts = [...fullWeek(0), ...fullWeek(3)]; // tygodnie -1 i -2 puste
    const { streak } = calculateStreakDetails(workouts);
    expect(streak).toBe(1);
  });

  it('druga tarcza w oknie 4 tygodni jest niedostępna', () => {
    // full(0), pusty(1)=tarcza, full(2), full(3), pusty(4) -> 4-1=3 < 4: brak tarczy, seria pęka.
    const workouts = [...fullWeek(0), ...fullWeek(2), ...fullWeek(3), ...fullWeek(5)];
    const { streak, frozenWeeks } = calculateStreakDetails(workouts);
    expect(streak).toBe(3);
    expect(frozenWeeks).toHaveLength(1);
  });

  it('druga tarcza po odstępie >= 4 tygodni działa', () => {
    // pusty(1)=tarcza, full(2..4), pusty(5): 5-1=4 -> druga tarcza, full(6).
    const workouts = [...fullWeek(0), ...fullWeek(2), ...fullWeek(3), ...fullWeek(4), ...fullWeek(6)];
    const { streak, frozenWeeks } = calculateStreakDetails(workouts);
    expect(streak).toBe(5);
    expect(frozenWeeks).toHaveLength(2);
  });

  it('tydzień z jednym treningiem nie kwalifikuje się, ale tarcza go ratuje', () => {
    const workouts = [...fullWeek(0), workoutOn('solo', 1, 2), ...fullWeek(2)];
    const { streak, frozenWeeks } = calculateStreakDetails(workouts);
    expect(streak).toBe(2);
    expect(frozenWeeks).toHaveLength(1);
  });
});
