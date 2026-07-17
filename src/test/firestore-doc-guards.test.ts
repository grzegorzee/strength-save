import { describe, expect, it } from 'vitest';
import {
  sanitizeMeasurementDoc,
  sanitizePlanCycleDoc,
  sanitizeTrainingPlanDays,
  sanitizeWorkoutDoc,
} from '@/lib/firestore-doc-guards';

// P0: hydracja z Firestore bez walidacji renderowała śmieci (NaN w seriach,
// dokumenty bez date/exercises wywracały widoki). Uszkodzony dokument = odrzucony
// i zaraportowany, uszkodzony fragment (seria/ćwiczenie) = odfiltrowany.

const validWorkout = () => ({
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-07-10',
  completed: true,
  exercises: [{
    exerciseId: 'ex-1',
    sets: [{ reps: 8, weight: 100, completed: true }],
  }],
});

describe('sanitizeWorkoutDoc (P0)', () => {
  it('poprawny dokument przechodzi z id', () => {
    const doc = sanitizeWorkoutDoc('w1', validWorkout());
    expect(doc?.id).toBe('w1');
    expect(doc?.exercises[0].sets[0]).toEqual({ reps: 8, weight: 100, completed: true });
  });
  it('odrzuca null, nie-obiekt i brak pól krytycznych', () => {
    expect(sanitizeWorkoutDoc('w1', null)).toBeNull();
    expect(sanitizeWorkoutDoc('w1', 'string')).toBeNull();
    expect(sanitizeWorkoutDoc('w1', { ...validWorkout(), userId: undefined })).toBeNull();
    expect(sanitizeWorkoutDoc('w1', { ...validWorkout(), dayId: 42 })).toBeNull();
    expect(sanitizeWorkoutDoc('w1', { ...validWorkout(), exercises: 'zepsute' })).toBeNull();
  });
  it('odrzuca date w złym formacie', () => {
    expect(sanitizeWorkoutDoc('w1', { ...validWorkout(), date: 'wczoraj' })).toBeNull();
    expect(sanitizeWorkoutDoc('w1', { ...validWorkout(), date: 20260710 })).toBeNull();
  });
  it('filtruje uszkodzone serie i ćwiczenia zamiast odrzucać cały trening', () => {
    const doc = sanitizeWorkoutDoc('w1', {
      ...validWorkout(),
      exercises: [
        {
          exerciseId: 'ex-1',
          sets: [
            { reps: 8, weight: 100, completed: true },
            { reps: 'osiem', weight: 100, completed: true },
            { reps: 8, weight: Number.NaN, completed: true },
            null,
          ],
        },
        { exerciseId: 42, sets: [] },
        null,
        { exerciseId: 'ex-2', sets: 'zepsute' },
      ],
    });
    expect(doc).not.toBeNull();
    expect(doc!.exercises).toHaveLength(1);
    expect(doc!.exercises[0].sets).toHaveLength(1);
  });
  it('koercja: completed nie-bool na bool, liczby stringowe na liczby', () => {
    const doc = sanitizeWorkoutDoc('w1', {
      ...validWorkout(),
      completed: 1,
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: '8', weight: '102.5', completed: 0 }] }],
    });
    expect(doc!.completed).toBe(true);
    expect(doc!.exercises[0].sets[0]).toEqual({ reps: 8, weight: 102.5, completed: false });
  });
  it('zachowuje opcjonalne pola (durationSec, snapshoty nazw), odrzuca nie-finite', () => {
    const doc = sanitizeWorkoutDoc('w1', {
      ...validWorkout(),
      durationSec: 3600,
      startedAt: Number.POSITIVE_INFINITY,
      dayName: 'Poniedziałek',
    });
    expect(doc!.durationSec).toBe(3600);
    expect(doc!.startedAt).toBeUndefined();
    expect(doc!.dayName).toBe('Poniedziałek');
  });
});

describe('sanitizeMeasurementDoc (P0)', () => {
  it('poprawny przechodzi, uszkodzony odpada', () => {
    expect(sanitizeMeasurementDoc('m1', { userId: 'u1', date: '2026-07-01', weight: 82.5 })?.weight).toBe(82.5);
    expect(sanitizeMeasurementDoc('m1', { userId: 'u1', date: 'zaraz' })).toBeNull();
    expect(sanitizeMeasurementDoc('m1', null)).toBeNull();
  });
  it('nie-finite pola liczbowe znikają zamiast wywracać wykresy', () => {
    const doc = sanitizeMeasurementDoc('m1', { userId: 'u1', date: '2026-07-01', weight: Number.NaN, waist: 90 });
    expect(doc!.weight).toBeUndefined();
    expect(doc!.waist).toBe(90);
  });
});

describe('sanitizeTrainingPlanDays (P0)', () => {
  const day = () => ({
    id: 'day-1',
    dayName: 'Poniedziałek',
    weekday: 'monday',
    focus: 'Push',
    exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
  });
  it('poprawna lista dni przechodzi', () => {
    expect(sanitizeTrainingPlanDays([day()])).toHaveLength(1);
  });
  it('odrzuca nie-tablicę i dni bez pól krytycznych', () => {
    expect(sanitizeTrainingPlanDays('zepsute')).toBeNull();
    expect(sanitizeTrainingPlanDays([{ ...day(), id: 7 }])).toBeNull();
    expect(sanitizeTrainingPlanDays([{ ...day(), exercises: 'zepsute' }])).toBeNull();
  });
  it('filtruje uszkodzone ćwiczenia dnia, dzień zostaje', () => {
    const days = sanitizeTrainingPlanDays([{
      ...day(),
      exercises: [
        { id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] },
        { id: 42, name: 'Zepsute' },
        null,
      ],
    }]);
    expect(days).toHaveLength(1);
    expect(days![0].exercises).toHaveLength(1);
  });
});

describe('sanitizePlanCycleDoc (P0)', () => {
  const cycle = () => ({
    userId: 'u1',
    days: [{
      id: 'day-1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Push',
      exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
    }],
    durationWeeks: 12,
    startDate: '2026-06-01',
    endDate: '',
    status: 'active',
    createdAt: '2026-06-01T00:00:00.000Z',
    stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  });
  it('poprawny cykl przechodzi z id', () => {
    expect(sanitizePlanCycleDoc('c1', cycle())?.id).toBe('c1');
  });
  it('odrzuca zły status, brak userId, zepsute days', () => {
    expect(sanitizePlanCycleDoc('c1', { ...cycle(), status: 'weird' })).toBeNull();
    expect(sanitizePlanCycleDoc('c1', { ...cycle(), userId: null })).toBeNull();
    expect(sanitizePlanCycleDoc('c1', { ...cycle(), days: 'zepsute' })).toBeNull();
  });
});
