import { describe, expect, it } from 'vitest';
import { buildExerciseRecommendation, buildReadiness } from '@/lib/adaptive-coach';
import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';

const NOW = new Date('2026-07-03T12:00:00');

const makeWorkout = (over: Partial<WorkoutSession> & { date: string }): WorkoutSession => ({
  id: `w-${over.date}`,
  userId: 'u1',
  dayId: 'day-1',
  completed: true,
  exercises: [],
  ...over,
} as WorkoutSession);

const benchSession = (over: {
  date: string;
  rpe?: number;
  pain?: number;
  sets?: Array<{ reps: number; weight: number; completed: boolean; isWarmup?: boolean }>;
}): WorkoutSession => makeWorkout({
  date: over.date,
  exercises: [{
    exerciseId: 'ex-bench',
    name: 'Wyciskanie sztangi na ławce płaskiej',
    ...(over.rpe !== undefined && { rpe: over.rpe }),
    ...(over.pain !== undefined && { pain: over.pain }),
    sets: over.sets ?? [
      { reps: 8, weight: 80, completed: true },
      { reps: 8, weight: 80, completed: true },
      { reps: 8, weight: 80, completed: true },
    ],
  }],
});

describe('buildExerciseRecommendation (Z63)', () => {
  it('ból >= 3 => deload -10% z reasonKey pain', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({ date: '2026-07-01', rpe: 7, pain: 4 })],
      exerciseId: 'ex-bench',
      exerciseName: 'Wyciskanie sztangi na ławce płaskiej',
      isBodyweight: false,
    });

    expect(rec?.action).toBe('deload');
    expect(rec?.reasonKey).toBe('coachx.reason.pain');
    expect(rec?.weightDeltaKg).toBe(-8); // -10% z 80 kg
    expect(rec?.metrics.maxPain).toBe(4);
  });

  it('RPE >= 9 => hold z reasonKey hardSession', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({ date: '2026-07-01', rpe: 9.5 })],
      exerciseId: 'ex-bench',
      isBodyweight: false,
    });

    expect(rec?.action).toBe('hold');
    expect(rec?.reasonKey).toBe('coachx.reason.hardSession');
    expect(rec?.weightDeltaKg).toBe(0);
  });

  it('completionRate < 0.8 => hold z reasonKey hardSession', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({
        date: '2026-07-01',
        rpe: 8,
        sets: [
          { reps: 8, weight: 80, completed: true },
          { reps: 8, weight: 80, completed: true },
          { reps: 0, weight: 80, completed: false },
          { reps: 0, weight: 80, completed: false },
        ],
      })],
      exerciseId: 'ex-bench',
      isBodyweight: false,
    });

    expect(rec?.action).toBe('hold');
    expect(rec?.reasonKey).toBe('coachx.reason.hardSession');
    expect(rec?.metrics.completionRate).toBe(0.5);
  });

  it('RPE <= 7.5 i komplet serii => progress +2.5 kg (górne partie)', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({ date: '2026-07-01', rpe: 7 })],
      exerciseId: 'ex-bench',
      exerciseName: 'Wyciskanie sztangi na ławce płaskiej',
      isBodyweight: false,
    });

    expect(rec?.action).toBe('progress');
    expect(rec?.reasonKey).toBe('coachx.reason.readyToProgress');
    expect(rec?.weightDeltaKg).toBe(2.5);
  });

  it('progress na nogach/martwym => +5 kg (heurystyka po nazwie)', () => {
    const squat: WorkoutSession = makeWorkout({
      date: '2026-07-01',
      exercises: [{
        exerciseId: 'ex-squat',
        name: 'Przysiad ze sztangą (High Bar)',
        rpe: 7,
        sets: [{ reps: 5, weight: 120, completed: true }],
      }],
    });

    const rec = buildExerciseRecommendation({
      history: [squat],
      exerciseId: 'ex-squat',
      exerciseName: 'Przysiad ze sztangą (High Bar)',
      isBodyweight: false,
    });

    expect(rec?.action).toBe('progress');
    expect(rec?.weightDeltaKg).toBe(5);
  });

  it('ból ma priorytet nad niskim RPE (deload wygrywa z progress)', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({ date: '2026-07-01', rpe: 6, pain: 3 })],
      exerciseId: 'ex-bench',
      isBodyweight: false,
    });

    expect(rec?.action).toBe('deload');
    expect(rec?.reasonKey).toBe('coachx.reason.pain');
  });

  it('brak metryk (rpe/ból) => null (UI spada na nextAdvice)', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({ date: '2026-07-01' })],
      exerciseId: 'ex-bench',
      isBodyweight: false,
    });

    expect(rec).toBeNull();
  });

  it('strefa środkowa (RPE 8, komplet) => null — coach mówi tylko przy jasnym sygnale', () => {
    const rec = buildExerciseRecommendation({
      history: [benchSession({ date: '2026-07-01', rpe: 8 })],
      exerciseId: 'ex-bench',
      isBodyweight: false,
    });

    expect(rec).toBeNull();
  });

  it('brak historii ćwiczenia => null', () => {
    expect(buildExerciseRecommendation({
      history: [],
      exerciseId: 'ex-bench',
      isBodyweight: false,
    })).toBeNull();
  });

  it('bodyweight: deload przy bólu bez delty kg', () => {
    const bw: WorkoutSession = makeWorkout({
      date: '2026-07-01',
      exercises: [{
        exerciseId: 'ex-pullup',
        name: 'Podciąganie na drążku',
        pain: 4,
        sets: [{ reps: 8, weight: 0, completed: true }],
      }],
    });

    const rec = buildExerciseRecommendation({
      history: [bw],
      exerciseId: 'ex-pullup',
      isBodyweight: true,
    });

    expect(rec?.action).toBe('deload');
    expect(rec?.weightDeltaKg).toBe(0);
  });
});

describe('buildReadiness (Z63)', () => {
  const tonnageWorkout = (date: string, weight: number): WorkoutSession => makeWorkout({
    date,
    exercises: [{
      exerciseId: 'ex-1',
      sets: [{ reps: 10, weight, completed: true }],
    }],
  });

  it('puste dane => ok / 50', () => {
    const readiness = buildReadiness({ workouts: [], stravaActivities: [], now: NOW });

    expect(readiness.level).toBe('ok');
    expect(readiness.score).toBe(50);
  });

  it('tonaż 7 dni znacznie ponad średnią 28 dni => overreached (ratio > 1.5)', () => {
    // Stary lekki tydzień + świeży bardzo ciężki tydzień.
    const workouts = [
      tonnageWorkout('2026-06-10', 50),
      tonnageWorkout('2026-07-01', 400),
      tonnageWorkout('2026-07-02', 400),
    ];

    const readiness = buildReadiness({ workouts, stravaActivities: [], now: NOW });

    expect(readiness.level).toBe('overreached');
    expect(readiness.score).toBeLessThan(30);
  });

  it('tydzień lekki po cięższym miesiącu => fresh (ratio < 0.8)', () => {
    const workouts = [
      tonnageWorkout('2026-06-08', 300),
      tonnageWorkout('2026-06-12', 300),
      tonnageWorkout('2026-06-18', 300),
      tonnageWorkout('2026-06-24', 300),
    ];

    const readiness = buildReadiness({ workouts, stravaActivities: [], now: NOW });

    expect(readiness.level).toBe('fresh');
    expect(readiness.score).toBeGreaterThan(60);
  });

  it('obciążenie biegowe (TRIMP) wchodzi do ratio — ciężki tydzień biegowy podnosi poziom', () => {
    const run = (date: string): StravaActivity => ({
      id: `run-${date}`,
      userId: 'u1',
      date,
      name: 'Bieg',
      type: 'Run',
      distance: 10000,
      movingTime: 3600,
      averageHeartrate: 165,
    } as StravaActivity);

    const balanced = buildReadiness({
      workouts: [],
      stravaActivities: [run('2026-06-10'), run('2026-06-17'), run('2026-06-24'), run('2026-07-01')],
      now: NOW,
    });
    const heavyWeek = buildReadiness({
      workouts: [],
      stravaActivities: [run('2026-06-10'), run('2026-06-28'), run('2026-06-30'), run('2026-07-01'), run('2026-07-02')],
      now: NOW,
    });

    expect(heavyWeek.score).toBeLessThan(balanced.score);
    expect(['loaded', 'overreached']).toContain(heavyWeek.level);
  });
});
