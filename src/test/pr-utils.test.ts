import { describe, it, expect } from 'vitest';
import {
  calculate1RM,
  detectNewPRs,
  getExerciseBest1RM,
  getExerciseBestDuration,
  getExerciseBestEffectiveLoad,
  getExerciseBestReps,
  getExerciseBestWeightDistance,
} from '@/lib/pr-utils';
import type { WorkoutSession } from '@/types';

describe('calculate1RM', () => {
  it('calculates Epley formula correctly', () => {
    // 80 × (1 + 6/30) = 80 × 1.2 = 96.0
    expect(calculate1RM(80, 6)).toBe(96);
  });

  it('returns weight directly for 1 rep', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('returns 0 for 0 weight', () => {
    expect(calculate1RM(0, 8)).toBe(0);
  });

  it('returns 0 for 0 reps', () => {
    expect(calculate1RM(80, 0)).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    // 50 × (1 + 8/30) = 50 × 1.2667 = 63.333...
    expect(calculate1RM(50, 8)).toBe(63.3);
  });
});

describe('getExerciseBest1RM', () => {
  const workouts: WorkoutSession[] = [
    {
      id: 'w1',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2026-01-01',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 5, weight: 20, completed: true, isWarmup: true },
            { reps: 8, weight: 40, completed: true },
            { reps: 7, weight: 42.5, completed: true },
            { reps: 6, weight: 45, completed: true },
          ],
        },
      ],
    },
  ];

  it('finds max weight', () => {
    const best = getExerciseBest1RM(workouts, 'ex-1-1');
    expect(best.maxWeight).toBe(45);
  });

  it('calculates best 1RM', () => {
    const best = getExerciseBest1RM(workouts, 'ex-1-1');
    // 40×(1+8/30)=50.7, 42.5×(1+7/30)=52.4, 45×(1+6/30)=54.0
    expect(best.best1RM).toBe(54);
  });

  it('ignores warmup sets', () => {
    const best = getExerciseBest1RM(workouts, 'ex-1-1');
    expect(best.maxWeight).toBe(45); // not 20 from warmup
  });

  it('returns zeros for unknown exercise', () => {
    const best = getExerciseBest1RM(workouts, 'ex-unknown');
    expect(best.maxWeight).toBe(0);
    expect(best.best1RM).toBe(0);
  });
});

describe('detectNewPRs', () => {
  const names = new Map([['ex-1-1', 'Bench Press']]);

  const previousWorkouts: WorkoutSession[] = [
    {
      id: 'w1',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2026-01-01',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 8, weight: 40, completed: true },
            { reps: 8, weight: 40, completed: true },
          ],
        },
      ],
    },
  ];

  it('detects weight PR', () => {
    const current: WorkoutSession = {
      id: 'w2',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 6, weight: 42.5, completed: true },
            { reps: 6, weight: 42.5, completed: true },
          ],
        },
      ],
    };
    const prs = detectNewPRs(current, previousWorkouts, names);
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('both'); // both weight and 1RM improved
    expect(prs[0].exerciseName).toBe('Bench Press');
  });

  it('returns empty when no PRs', () => {
    const current: WorkoutSession = {
      id: 'w2',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 6, weight: 35, completed: true },
          ],
        },
      ],
    };
    const prs = detectNewPRs(current, previousWorkouts, names);
    expect(prs).toHaveLength(0);
  });

  it('ignores exercises with no completed sets', () => {
    const current: WorkoutSession = {
      id: 'w2',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1',
          sets: [
            { reps: 8, weight: 50, completed: false },
          ],
        },
      ],
    };
    const prs = detectNewPRs(current, previousWorkouts, names);
    expect(prs).toHaveLength(0);
  });

  it('does not mix PR history after a swapped exercise receives a new identity', () => {
    const current: WorkoutSession = {
      id: 'w2',
      userId: 'test-user',
      dayId: 'day-1',
      date: '2026-01-08',
      completed: true,
      exercises: [
        {
          exerciseId: 'ex-1-1__swap-pompki',
          sets: [
            { reps: 10, weight: 0, completed: true },
          ],
        },
      ],
    };

    const prs = detectNewPRs(
      current,
      previousWorkouts,
      new Map([['ex-1-1__swap-pompki', 'Pompki']]),
      new Set(['ex-1-1__swap-pompki']),
    );
    expect(prs).toHaveLength(0);
  });
});

describe('getExerciseBestReps', () => {
  const workouts: WorkoutSession[] = [
    {
      id: 'w1', userId: 'u1', dayId: 'd1', date: '2024-01-01',
      completed: true,
      exercises: [{
        exerciseId: 'bw-1',
        sets: [
          { reps: 12, weight: 0, completed: true },
          { reps: 10, weight: 0, completed: true },
          { reps: 8, weight: 0, completed: true, isWarmup: true },
        ],
      }],
    },
  ];

  it('returns max reps from completed non-warmup sets', () => {
    expect(getExerciseBestReps(workouts, 'bw-1')).toBe(12);
  });

  it('returns 0 for unknown exercise', () => {
    expect(getExerciseBestReps(workouts, 'unknown')).toBe(0);
  });
});

describe('detectNewPRs with bodyweight', () => {
  const previousWorkouts: WorkoutSession[] = [
    {
      id: 'prev-bw', userId: 'u1', dayId: 'd1', date: '2024-01-01',
      completed: true,
      exercises: [{
        exerciseId: 'bw-1',
        sets: [
          { reps: 12, weight: 0, completed: true },
          { reps: 10, weight: 0, completed: true },
        ],
      }],
    },
  ];
  const names = new Map([['bw-1', 'Dead Bug']]);
  const bodyweightIds = new Set(['bw-1']);

  it('detects reps PR for bodyweight exercise', () => {
    const current: WorkoutSession = {
      id: 'cur-bw', userId: 'u1', dayId: 'd1', date: '2024-01-15',
      completed: true,
      exercises: [{
        exerciseId: 'bw-1',
        sets: [
          { reps: 15, weight: 0, completed: true },
          { reps: 12, weight: 0, completed: true },
        ],
      }],
    };
    const prs = detectNewPRs(current, previousWorkouts, names, bodyweightIds);
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('reps');
    expect(prs[0].newValue).toBe(15);
    expect(prs[0].oldValue).toBe(12);
  });

  it('no PR when reps equal', () => {
    const current: WorkoutSession = {
      id: 'cur-bw2', userId: 'u1', dayId: 'd1', date: '2024-01-15',
      completed: true,
      exercises: [{
        exerciseId: 'bw-1',
        sets: [
          { reps: 12, weight: 0, completed: true },
        ],
      }],
    };
    const prs = detectNewPRs(current, previousWorkouts, names, bodyweightIds);
    expect(prs).toHaveLength(0);
  });
});

// ===== Z106: PR per typ śledzenia =====

const trackedWorkout = (id: string, date: string, exerciseId: string, sets: WorkoutSession['exercises'][number]['sets']): WorkoutSession => ({
  id, userId: 'u1', dayId: 'd1', date, completed: true,
  exercises: [{ exerciseId, sets }],
});

describe('getExerciseBestDuration (Z106)', () => {
  it('zwraca najdłuższy czas ukończonej serii roboczej', () => {
    const ws = [
      trackedWorkout('w1', '2026-07-01', 'plank', [{ reps: 0, weight: 0, completed: true, durationSec: 60 }]),
      trackedWorkout('w2', '2026-07-05', 'plank', [{ reps: 0, weight: 0, completed: true, durationSec: 90 }]),
      trackedWorkout('w3', '2026-07-08', 'plank', [{ reps: 0, weight: 0, completed: false, durationSec: 300 }]),
    ];
    expect(getExerciseBestDuration(ws, 'plank')).toBe(90);
  });

  it('brak serii czasowych => 0', () => {
    expect(getExerciseBestDuration([], 'plank')).toBe(0);
  });
});

describe('getExerciseBestWeightDistance (Z106)', () => {
  it('zwraca najlepszy iloczyn ciężar x dystans z komponentami', () => {
    const ws = [
      trackedWorkout('w1', '2026-07-01', 'farmer', [{ reps: 0, weight: 24, completed: true, distanceM: 40 }]),
      trackedWorkout('w2', '2026-07-05', 'farmer', [{ reps: 0, weight: 32, completed: true, distanceM: 20 }]),
    ];
    const best = getExerciseBestWeightDistance(ws, 'farmer');
    expect(best.score).toBe(960);
    expect(best.weight).toBe(24);
    expect(best.distanceM).toBe(40);
  });
});

describe('getExerciseBestEffectiveLoad (Z106)', () => {
  const ws = [
    trackedWorkout('w1', '2026-07-01', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 30 }]),
    trackedWorkout('w2', '2026-07-05', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 25 }]),
  ];

  it('najlepsze obciążenie efektywne = waga ciała minus najmniejsza asysta', () => {
    const best = getExerciseBestEffectiveLoad(ws, 'apu', 80);
    expect(best).toEqual({ effectiveLoad: 55, reps: 8 });
  });

  it('brak wagi ciała => null', () => {
    expect(getExerciseBestEffectiveLoad(ws, 'apu', null)).toBeNull();
  });
});

describe('detectNewPRs — assisted_bodyweight (Z106, skarga z r/Hevy)', () => {
  const tracking = new Map([['apu', 'assisted_bodyweight' as const]]);
  const prev = [
    trackedWorkout('p1', '2026-07-01', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 30 }]),
  ];

  it('TA SAMA liczba powtórzeń, MNIEJSZA asysta => PR (effective load)', () => {
    const current = trackedWorkout('c1', '2026-07-10', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 25 }]);
    const prs = detectNewPRs(current, prev, new Map([['apu', 'Podciąganie wspomagane']]), undefined, {
      trackingByExerciseId: tracking,
      bodyWeightKg: 80,
    });
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('effective_load');
    expect(prs[0].newValue).toBe(55);
    expect(prs[0].oldValue).toBe(50);
  });

  it('większa asysta => brak PR', () => {
    const current = trackedWorkout('c2', '2026-07-10', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 35 }]);
    const prs = detectNewPRs(current, prev, new Map([['apu', 'Podciąganie wspomagane']]), undefined, {
      trackingByExerciseId: tracking,
      bodyWeightKg: 80,
    });
    expect(prs).toHaveLength(0);
  });

  it('mniejsza asysta ale mniej powtórzeń => brak PR', () => {
    const current = trackedWorkout('c3', '2026-07-10', 'apu', [{ reps: 5, weight: 0, completed: true, assistWeight: 25 }]);
    const prs = detectNewPRs(current, prev, new Map([['apu', 'Podciąganie wspomagane']]), undefined, {
      trackingByExerciseId: tracking,
      bodyWeightKg: 80,
    });
    expect(prs).toHaveLength(0);
  });

  it('brak wagi ciała => fallback: PR po powtórzeniach', () => {
    const current = trackedWorkout('c4', '2026-07-10', 'apu', [{ reps: 10, weight: 0, completed: true, assistWeight: 30 }]);
    const prs = detectNewPRs(current, prev, new Map([['apu', 'Podciąganie wspomagane']]), undefined, {
      trackingByExerciseId: tracking,
      bodyWeightKg: null,
    });
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('reps');
    expect(prs[0].newValue).toBe(10);
  });
});

describe('detectNewPRs — duration i weight_distance_duration (Z106)', () => {
  it('duration: dłuższy czas => PR czasu', () => {
    const prev = [trackedWorkout('p1', '2026-07-01', 'plank', [{ reps: 0, weight: 0, completed: true, durationSec: 60 }])];
    const current = trackedWorkout('c1', '2026-07-10', 'plank', [{ reps: 0, weight: 0, completed: true, durationSec: 90 }]);
    const prs = detectNewPRs(current, prev, new Map([['plank', 'Plank']]), undefined, {
      trackingByExerciseId: new Map([['plank', 'duration' as const]]),
    });
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('duration');
    expect(prs[0].newValue).toBe(90);
    expect(prs[0].oldValue).toBe(60);
  });

  it('weight_distance_duration: większy iloczyn kg x m => PR', () => {
    const prev = [trackedWorkout('p1', '2026-07-01', 'farmer', [{ reps: 0, weight: 24, completed: true, distanceM: 40 }])];
    const current = trackedWorkout('c1', '2026-07-10', 'farmer', [{ reps: 0, weight: 28, completed: true, distanceM: 40 }]);
    const prs = detectNewPRs(current, prev, new Map([['farmer', 'Spacer farmera']]), undefined, {
      trackingByExerciseId: new Map([['farmer', 'weight_distance_duration' as const]]),
    });
    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe('weight_distance');
    expect(prs[0].newValue).toBe(1120);
  });

  it('bez opcji trackingu: dotychczasowe zachowanie (regresja)', () => {
    const prev = [trackedWorkout('p1', '2026-07-01', 'bench', [{ reps: 8, weight: 100, completed: true }])];
    const current = trackedWorkout('c1', '2026-07-10', 'bench', [{ reps: 8, weight: 105, completed: true }]);
    const prs = detectNewPRs(current, prev, new Map([['bench', 'Wyciskanie']]));
    expect(prs).toHaveLength(1);
    expect(['weight', '1rm', 'both']).toContain(prs[0].type);
  });
});
