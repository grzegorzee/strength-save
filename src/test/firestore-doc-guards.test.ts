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
  // Bug 5 (X30): clampSet zapisuje pelny ksztalt serii Z105, a sanitizeSet obcinal
  // durationSec/distanceM/assistWeight/updatedAt/updatedEventId przy hydracji —
  // PR-y duration/wdd i wykresy progresji byly martwe po kazdym snapshotcie.
  it('serie: zachowuje pola Z105 (durationSec, distanceM, assistWeight, updatedAt, updatedEventId)', () => {
    const doc = sanitizeWorkoutDoc('w1', {
      ...validWorkout(),
      exercises: [{
        exerciseId: 'ex-1',
        sets: [{
          reps: 1, weight: 0, completed: true,
          durationSec: 60, distanceM: 50, assistWeight: 30,
          updatedAt: 1700000000000, updatedEventId: 'evt-1',
        }],
      }],
    });
    expect(doc!.exercises[0].sets[0]).toEqual({
      reps: 1, weight: 0, completed: true,
      durationSec: 60, distanceM: 50, assistWeight: 30,
      updatedAt: 1700000000000, updatedEventId: 'evt-1',
    });
  });
  it('serie: pola Z105 klamrowane do widelek clampSet, smieci znikaja', () => {
    const doc = sanitizeWorkoutDoc('w1', {
      ...validWorkout(),
      exercises: [{
        exerciseId: 'ex-1',
        sets: [{
          reps: 8, weight: 100, completed: true,
          durationSec: 100000, // > 86400 → klamra
          distanceM: -5, // < 0 → klamra do 0
          assistWeight: Number.NaN, // nie-finite → znika
          updatedAt: -1, // niedodatni → znika
          updatedEventId: 'x'.repeat(200), // > 120 → obciete
        }],
      }],
    });
    const set = doc!.exercises[0].sets[0];
    expect(set.durationSec).toBe(86400);
    expect(set.distanceM).toBe(0);
    expect(set.assistWeight).toBeUndefined();
    expect(set.updatedAt).toBeUndefined();
    expect(set.updatedEventId).toBe('x'.repeat(120));
  });
  it('serie: pusty updatedEventId znika (parytet z clampSet)', () => {
    const doc = sanitizeWorkoutDoc('w1', {
      ...validWorkout(),
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true, updatedEventId: '' }] }],
    });
    expect(doc!.exercises[0].sets[0].updatedEventId).toBeUndefined();
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

  // WP-6 (X33): odpowiedzi z kreatora na cyklu. Poprawna mapa przechodzi 1:1,
  // uszkodzona znika PO CICHU (cykl bez choice jest poprawny — stare cykle go nie mają).
  describe('choice (WP-6, X33)', () => {
    const choice = () => ({
      version: 1,
      chosenAt: '2026-08-25T10:30:00.000Z',
      level: 'intermediate',
      objective: 'build_muscle',
      daysPerWeek: 3,
      trainingDays: ['monday', 'wednesday', 'friday'],
      planSource: 'recommended',
      templateId: 'tpl-fullbody-3',
      recommendedTemplateId: 'tpl-fullbody-3',
      planName: 'Mój plan',
      entry: 'onboarding',
    });

    it('cykl bez choice: pole nie powstaje', () => {
      expect(sanitizePlanCycleDoc('c1', cycle())).not.toHaveProperty('choice');
    });

    it('pełny choice przechodzi bez zmian', () => {
      expect(sanitizePlanCycleDoc('c1', { ...cycle(), choice: choice() })?.choice).toEqual(choice());
    });

    it('choice bez pól opcjonalnych: pola nie powstają, entry replan / planSource custom', () => {
      const { templateId: _t, recommendedTemplateId: _r, planName: _p, ...minimal } = choice();
      const out = sanitizePlanCycleDoc('c1', { ...cycle(), choice: { ...minimal, planSource: 'custom', entry: 'replan' } })?.choice;
      expect(out).toEqual({ ...minimal, planSource: 'custom', entry: 'replan' });
      expect(out).not.toHaveProperty('templateId');
      expect(out).not.toHaveProperty('planName');
    });

    it('uszkodzony choice znika po cichu, cykl zostaje', () => {
      const broken: unknown[] = [
        'tekst',
        42,
        null,
        [],
        { ...choice(), version: 1.5 },
        { ...choice(), version: '1' },
        { ...choice(), level: 'pro' },
        { ...choice(), objective: 'cardio' },
        { ...choice(), planSource: 'magic' },
        { ...choice(), entry: 'admin' },
        { ...choice(), daysPerWeek: 'trzy' },
        { ...choice(), trainingDays: 'monday' },
        { ...choice(), chosenAt: 12345 },
      ];
      for (const bad of broken) {
        const out = sanitizePlanCycleDoc('c1', { ...cycle(), choice: bad });
        expect(out, JSON.stringify(bad)).not.toBeNull();
        expect(out, JSON.stringify(bad)).not.toHaveProperty('choice');
      }
    });

    it('nieznane dni tygodnia są odfiltrowane, stringi obcięte (planName 60, id 100)', () => {
      const out = sanitizePlanCycleDoc('c1', {
        ...cycle(),
        choice: {
          ...choice(),
          trainingDays: ['monday', 'someday', 7, 'friday'],
          planName: `  ${'x'.repeat(80)}  `,
          templateId: 'y'.repeat(150),
        },
      })?.choice;
      expect(out?.trainingDays).toEqual(['monday', 'friday']);
      expect(out?.planName).toBe('x'.repeat(60));
      expect(out?.templateId).toBe('y'.repeat(100));
    });

    it('nieznane klucze w choice są wycinane (hasOnly w rules)', () => {
      const out = sanitizePlanCycleDoc('c1', { ...cycle(), choice: { ...choice(), extra: 'x' } })?.choice;
      expect(out).toEqual(choice());
    });
  });
});
