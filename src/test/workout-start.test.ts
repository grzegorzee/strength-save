import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { SetData } from '@/types';
import {
  areWorkoutStartSourcesReady,
  buildStartDraft,
  buildStartExerciseSets,
  buildWorkoutStartSnapshot,
  findUniqueCycleForDate,
} from '@/lib/workout-start';

const day: TrainingDay = {
  id: 'day-1',
  dayName: 'Monday',
  weekday: 'monday',
  focus: 'Upper',
  exercises: [{
    id: 'custom-exercise',
    name: 'Custom exercise',
    sets: '3 x 8',
    instructions: [],
  }],
};

const cycle = (overrides: Partial<PlanCycle> = {}): PlanCycle => ({
  id: 'active-cycle',
  userId: 'user-1',
  days: [day],
  durationWeeks: 12,
  startDate: '2026-06-01',
  endDate: '',
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  ...overrides,
});

describe('workout start readiness', () => {
  it.each([
    ['workouts → plan → cycles → draft', ['workoutsLoaded', 'planLoaded', 'cyclesLoaded', 'draftLoaded']],
    ['workouts → cycles → plan → draft', ['workoutsLoaded', 'cyclesLoaded', 'planLoaded', 'draftLoaded']],
    ['plan → workouts → cycles → draft', ['planLoaded', 'workoutsLoaded', 'cyclesLoaded', 'draftLoaded']],
    ['plan → cycles → workouts → draft', ['planLoaded', 'cyclesLoaded', 'workoutsLoaded', 'draftLoaded']],
    ['cycles → workouts → plan → draft', ['cyclesLoaded', 'workoutsLoaded', 'planLoaded', 'draftLoaded']],
    ['cycles → plan → workouts → draft', ['cyclesLoaded', 'planLoaded', 'workoutsLoaded', 'draftLoaded']],
  ] as const)('blocks every partial load order: %s', (_label, order) => {
    const state = {
      workoutsLoaded: false,
      planLoaded: false,
      cyclesLoaded: false,
      draftLoaded: false,
    };
    order.forEach((key, index) => {
      state[key] = true;
      expect(areWorkoutStartSourcesReady(state)).toBe(index === order.length - 1);
    });
  });

  it('captures custom exercises and active cycle without retaining mutable references', () => {
    const sourceCycle = cycle();
    const snapshot = buildWorkoutStartSnapshot(day, '2026-06-27', [sourceCycle]);

    day.exercises[0].name = 'Changed after start';
    sourceCycle.id = 'changed-cycle';

    expect(snapshot.activeCycleId).toBe('active-cycle');
    expect(snapshot.day.exercises.map((exercise) => exercise.name)).toEqual(['Custom exercise']);
  });

  it('przy 2 aktywnych cyklach na datę wybiera deterministycznie najnowszy zamiast rzucać (#7)', () => {
    const older = cycle({ id: 'older', createdAt: '2026-06-01T00:00:00.000Z' });
    const newer = cycle({ id: 'newer', createdAt: '2026-06-10T00:00:00.000Z' });
    // Wynik niezależny od kolejności wejścia (determinizm), bez wyjątku blokującego start.
    expect(buildWorkoutStartSnapshot(day, '2026-06-27', [older, newer]).activeCycleId).toBe('newer');
    expect(buildWorkoutStartSnapshot(day, '2026-06-27', [newer, older]).activeCycleId).toBe('newer');
  });

  it('does not silently choose between overlapping cycles', () => {
    expect(findUniqueCycleForDate([
      cycle(),
      cycle({ id: 'overlap', status: 'completed', endDate: '2026-06-30' }),
    ], '2026-06-20')).toBeNull();
  });

  it('finds the only cycle containing an orphan workout date', () => {
    expect(findUniqueCycleForDate([cycle()], '2026-06-20')?.id).toBe('active-cycle');
  });
});

// Z141.2: guard bliźniak — start NIGDY nie niszczy żywego draftu, może go tylko uzupełnić.

const twoExercises = [
  { id: 'ex-a', name: 'Przysiad', sets: '3 x 8' },
  { id: 'ex-b', name: 'Wyciskanie', sets: '3 x 8' },
];

const prefill = (): SetData[] => [
  { reps: 8, weight: 0, completed: false },
  { reps: 8, weight: 0, completed: false },
  { reps: 8, weight: 0, completed: false },
];

const draftFixture = (overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'old-session',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-07-24',
  cycleId: 'cycle-1',
  sessionOrigin: 'provisional',
  remoteSessionId: null,
  exerciseSets: { 'ex-a': [{ reps: 8, weight: 80, completed: true }] },
  exerciseNotes: { 'ex-a': 'ciężko' },
  exerciseMetrics: { 'ex-a': { rpe: 8 } },
  dayNotes: 'notatka dnia',
  skippedExercises: ['ex-skip'],
  lastTouchedExerciseId: 'ex-a',
  startedAt: 111_000,
  updatedAt: 222_000,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 7,
  ...overrides,
});

describe('buildStartExerciseSets (Z141.2)', () => {
  it('draft z treścią jest źródłem prawdy: serie z draftu bez zmian, dokłada tylko brakujące ćwiczenia', () => {
    const draftSets = { 'ex-a': [{ reps: 5, weight: 100, completed: true }] };
    const result = buildStartExerciseSets({
      exercises: twoExercises,
      draftSets,
      stateSets: {},
      buildPrefill: prefill,
    });
    expect(result.sets['ex-a']).toEqual([{ reps: 5, weight: 100, completed: true }]);
    expect(result.sets['ex-b']).toEqual(prefill());
    expect(result.added).toBe(true);
  });

  it('draft ma wszystkie ćwiczenia → nic nie dokłada (added=false)', () => {
    const draftSets = {
      'ex-a': [{ reps: 5, weight: 100, completed: true }],
      'ex-b': [{ reps: 8, weight: 60, completed: false }],
    };
    const result = buildStartExerciseSets({
      exercises: twoExercises,
      draftSets,
      stateSets: {},
      buildPrefill: prefill,
    });
    expect(result.sets).toEqual(draftSets);
    expect(result.added).toBe(false);
  });

  it('brak draftu → fallback na stan komponentu (ref), dokłada brakujące', () => {
    const stateSets = { 'ex-a': [{ reps: 6, weight: 70, completed: true }] };
    const result = buildStartExerciseSets({
      exercises: twoExercises,
      draftSets: null,
      stateSets,
      buildPrefill: prefill,
    });
    expect(result.sets['ex-a']).toEqual(stateSets['ex-a']);
    expect(result.sets['ex-b']).toEqual(prefill());
  });

  it('brak draftu i pusty stan → dotychczasowy prefill dla wszystkich ćwiczeń', () => {
    const result = buildStartExerciseSets({
      exercises: twoExercises,
      draftSets: null,
      stateSets: {},
      buildPrefill: prefill,
    });
    expect(result.sets['ex-a']).toEqual(prefill());
    expect(result.sets['ex-b']).toEqual(prefill());
    expect(result.added).toBe(true);
  });
});

describe('buildStartDraft (Z141.2)', () => {
  const snapshot = buildWorkoutStartSnapshot(day, '2026-07-24', [cycle({ startDate: '2026-07-01' })]);
  const session = { sessionId: 'new-session', provisional: false, cloudUpdatedAt: 555, cloudRevision: 3 };
  const sets = { 'ex-a': [{ reps: 5, weight: 100, completed: true }] };

  it('adopcja żywego draftu: serie, notatki, metryki, skipy, startedAt i wersja ZOSTAJĄ', () => {
    const adopted = draftFixture();
    const draft = buildStartDraft({
      uid: 'user-1', session, snapshot, adoptedDraft: adopted, sets, now: 999_000,
    });
    expect(draft.exerciseSets).toEqual(sets);
    expect(draft.exerciseNotes).toEqual(adopted.exerciseNotes);
    expect(draft.exerciseMetrics).toEqual(adopted.exerciseMetrics);
    expect(draft.dayNotes).toBe('notatka dnia');
    expect(draft.skippedExercises).toEqual(['ex-skip']);
    expect(draft.startedAt).toBe(111_000);
    expect(draft.version).toBe(7);
    expect(draft.lastTouchedExerciseId).toBe('ex-a');
  });

  it('adopcja aktualizuje tylko tożsamość sesji i cloud-meta', () => {
    const draft = buildStartDraft({
      uid: 'user-1', session, snapshot, adoptedDraft: draftFixture(), sets, now: 999_000,
    });
    expect(draft.sessionId).toBe('new-session');
    expect(draft.sessionOrigin).toBe('remote');
    expect(draft.remoteSessionId).toBe('new-session');
    expect(draft.cloudUpdatedAt).toBe(555);
    expect(draft.cloudRevision).toBe(3);
    expect(draft.updatedAt).toBe(999_000);
    expect(draft.dirty).toBe(true);
  });

  it('sesja provisional → sessionOrigin provisional, remoteSessionId null', () => {
    const draft = buildStartDraft({
      uid: 'user-1',
      session: { sessionId: 'prov-1', provisional: true },
      snapshot,
      adoptedDraft: null,
      sets,
      now: 999_000,
    });
    expect(draft.sessionOrigin).toBe('provisional');
    expect(draft.remoteSessionId).toBeNull();
  });

  it('brak draftu → świeży draft jak dotąd: version 1, startedAt=now, puste notatki', () => {
    const draft = buildStartDraft({
      uid: 'user-1', session, snapshot, adoptedDraft: null, sets, now: 999_000,
    });
    expect(draft.version).toBe(1);
    expect(draft.startedAt).toBe(999_000);
    expect(draft.exerciseNotes).toEqual({});
    expect(draft.dayNotes).toBe('');
    expect(draft.skippedExercises).toEqual([]);
    expect(draft.dayId).toBe('day-1');
    expect(draft.cycleId).toBe('active-cycle');
  });
});
