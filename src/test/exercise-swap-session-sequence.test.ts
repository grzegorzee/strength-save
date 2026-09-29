// F4 (2026-09-29): zamiana ćwiczenia w trakcie treningu.
// Produkcja 28.09 (sesja d1): zamiana "Na stałe" na pozycji 3 zmieniła tylko plan,
// draft został ze starym kluczem, nowe ćwiczenie wylądowało na końcu listy
// i na końcu historii. Payload sortował po kolejności kluczy draftu, więc także
// "tylko dziś" zapisywało nowe ćwiczenie na końcu historii.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import {
  applySessionExerciseSwap,
  planExerciseSwap,
  resolvePlanExerciseId,
  swapExerciseIdentity,
  type SessionExerciseState,
} from '@/lib/exercise-swap';
import { buildDayFromDraft } from '@/lib/workout-day-view';
import { buildWorkoutDraftSnapshot, type DraftSnapshotContext } from '@/lib/workout-draft-snapshot';
import {
  __resetWorkoutDraftDbConnectionForTests,
  workoutDraftDb,
  type ActiveWorkoutDraft,
} from '@/lib/workout-draft-db';
import {
  buildDraftExercisesPayload,
  syncWorkoutSession,
  type WorkoutSyncDeps,
} from '@/lib/workout-sync-engine';
import { buildDraftFinalExpectation } from '@/lib/workout-final-sync';

const planDay: TrainingDay = {
  id: 'd1',
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus: 'Góra',
  exercises: [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `tpl-ex-1${n}`,
    name: `Ćwiczenie ${n}`,
    sets: '3 x 8-10',
    instructions: [],
  })),
};

const open = (n: number, weight = 40): SetData[] =>
  Array.from({ length: n }, () => ({ reps: 8, weight, completed: false }));
const done = (n: number, weight = 40): SetData[] =>
  Array.from({ length: n }, () => ({ reps: 8, weight, completed: true }));

const emptyState = (exerciseSets: Record<string, SetData[]>): SessionExerciseState => ({
  exerciseSets,
  exerciseNotes: {},
  exerciseMetrics: {},
  exerciseMetricGrants: {},
  skippedExercises: [],
  sessionSwaps: {},
});

const prefilled = (): Record<string, SetData[]> =>
  Object.fromEntries(planDay.exercises.map((exercise) => [exercise.id, open(3)]));

describe('applySessionExerciseSwap: migracja bieżącej sesji', () => {
  it('bez odhaczonych serii: klucz podmieniony NA TEJ SAMEJ pozycji, stary znika, notatki i metryki idą za zamianą', () => {
    const state: SessionExerciseState = {
      ...emptyState(prefilled()),
      exerciseNotes: { 'tpl-ex-13': 'łokieć' },
      exerciseMetrics: { 'tpl-ex-13': { rpe: 8 } },
      skippedExercises: ['tpl-ex-13'],
    };
    const next = applySessionExerciseSwap(state, {
      fromId: 'tpl-ex-13',
      toId: 'tpl-ex-13__swap-b',
      fromName: 'Ćwiczenie 3',
      toName: 'B',
      sets: '3 x 8-10',
      createSets: () => open(3, 0),
    });
    expect(Object.keys(next.exerciseSets)).toEqual([
      'tpl-ex-11', 'tpl-ex-12', 'tpl-ex-13__swap-b', 'tpl-ex-14', 'tpl-ex-15', 'tpl-ex-16',
    ]);
    expect(next.exerciseNotes).toEqual({ 'tpl-ex-13__swap-b': 'łokieć' });
    expect(next.exerciseMetrics).toEqual({ 'tpl-ex-13__swap-b': { rpe: 8 } });
    expect(next.skippedExercises).toEqual([]);
    expect(next.sessionSwaps['tpl-ex-13']).toEqual({ id: 'tpl-ex-13__swap-b', name: 'B', sets: '3 x 8-10' });
    // Wejście nietknięte (czysta funkcja).
    expect(Object.keys(state.exerciseSets)).toContain('tpl-ex-13');
  });

  it('z odhaczonymi seriami: stare ZOSTAJE ze swoimi seriami i notatką, nowe dostaje świeże serie tuż za nim', () => {
    const state: SessionExerciseState = {
      ...emptyState({ ...prefilled(), 'tpl-ex-13': [...done(2), ...open(1)] }),
      exerciseNotes: { 'tpl-ex-13': 'łokieć' },
    };
    const next = applySessionExerciseSwap(state, {
      fromId: 'tpl-ex-13',
      toId: 'tpl-ex-13__swap-b',
      fromName: 'Ćwiczenie 3',
      toName: 'B',
      sets: '3 x 8-10',
      createSets: () => open(3, 0),
    });
    expect(Object.keys(next.exerciseSets).slice(2, 4)).toEqual(['tpl-ex-13', 'tpl-ex-13__swap-b']);
    expect(next.exerciseSets['tpl-ex-13']).toEqual([...done(2), ...open(1)]);
    expect(next.exerciseSets['tpl-ex-13__swap-b']).toEqual(open(3, 0));
    expect(next.exerciseNotes).toEqual({ 'tpl-ex-13': 'łokieć' });
    expect(next.sessionSwaps['tpl-ex-13'].id).toBe('tpl-ex-13__swap-b');
  });

  it('z odhaczonymi seriami i zmianą na masę ciała: odhaczone serie NIE są zerowane', () => {
    const state = emptyState({ ...prefilled(), 'tpl-ex-13': done(2, 80) });
    const next = applySessionExerciseSwap(state, {
      fromId: 'tpl-ex-13',
      toId: 'tpl-ex-13__swap-pompki',
      fromName: 'Wyciskanie sztangi na ławce płaskiej',
      toName: 'Pompki',
      sets: '3 x 8-10',
      createSets: () => open(3, 0),
    });
    expect(next.exerciseSets['tpl-ex-13']).toEqual(done(2, 80));
  });

  it('ta sama nazwa (id bez zmian przy zamianie na stałe): sesja bez zmian', () => {
    const state = emptyState(prefilled());
    const next = applySessionExerciseSwap(state, {
      fromId: 'tpl-ex-13', toId: 'tpl-ex-13', fromName: 'A', toName: 'A', sets: '3 x 8-10', createSets: () => [],
    });
    expect(next).toBe(state);
  });
});

describe('snapshot draftu: klucze w kolejności dnia (payload historii)', () => {
  const context = (
    exerciseSets: Record<string, SetData[]>,
    planExerciseIds: string[] | undefined,
    previousDraft: ActiveWorkoutDraft | null = null,
  ): DraftSnapshotContext => ({
    userId: 'u1',
    sessionId: 's1',
    dayId: 'd1',
    date: '2026-09-28',
    previousDraft,
    exerciseSets,
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    skippedExercises: [],
    dayNames: {},
    cloudMeta: null,
    now: 1000,
    ...(planExerciseIds && { planExerciseIds }),
  });

  it('"tylko dziś": nowy klucz dopisany na końcu obiektu trafia do payloadu na pozycji 3', () => {
    const sets = { ...prefilled() };
    delete sets['tpl-ex-13'];
    sets['tpl-ex-13__swap-b'] = open(3);
    const draft = buildWorkoutDraftSnapshot(
      context(sets, planDay.exercises.map((e) => e.id)),
      { sessionSwaps: { 'tpl-ex-13': { id: 'tpl-ex-13__swap-b', name: 'B', sets: '3 x 8-10' } } },
    )!;
    expect(buildDraftExercisesPayload(draft).map((e) => e.exerciseId)).toEqual([
      'tpl-ex-11', 'tpl-ex-12', 'tpl-ex-13__swap-b', 'tpl-ex-14', 'tpl-ex-15', 'tpl-ex-16',
    ]);
  });

  it('"Na stałe" (plan już z nowym id): payload w kolejności planu', () => {
    const newId = 'tpl-ex-13__swap-b';
    const planIds = planDay.exercises.map((e) => (e.id === 'tpl-ex-13' ? newId : e.id));
    const sets = { ...prefilled() };
    delete sets['tpl-ex-13'];
    sets[newId] = open(3);
    const draft = buildWorkoutDraftSnapshot(context(sets, planIds))!;
    expect(buildDraftExercisesPayload(draft).map((e) => e.exerciseId)).toEqual(planIds);
  });

  it('sesja ze starego buildu (stary klucz + nowy na końcu): stary przy nowym, nie na końcu', () => {
    const newId = 'tpl-ex-13__swap-b';
    const planIds = planDay.exercises.map((e) => (e.id === 'tpl-ex-13' ? newId : e.id));
    const draft = buildWorkoutDraftSnapshot(context({ ...prefilled(), [newId]: done(3) }, planIds))!;
    expect(buildDraftExercisesPayload(draft).map((e) => e.exerciseId).slice(2, 4)).toEqual(['tpl-ex-13', newId]);
  });

  it('bez planu (szybki trening): kolejność draftu bez zmian', () => {
    const draft = buildWorkoutDraftSnapshot(context({ b: open(1), a: open(1) }, undefined))!;
    expect(Object.keys(draft.exerciseSets)).toEqual(['b', 'a']);
  });
});

describe('sekwencja: start z planu, zamiana (oba zakresy), wyjście, powrót z IDB, odhaczenie, zakończenie, sync', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetWorkoutDraftDbConnectionForTests();
  });

  it('historia zapisuje ćwiczenia w kolejności dnia, bez starych id, z nowymi nazwami', async () => {
    const planIds = () => plan.exercises.map((e) => e.id);
    let plan: TrainingDay = planDay;
    let state = emptyState(prefilled());
    let names: Record<string, string> = Object.fromEntries(plan.exercises.map((e) => [e.id, e.name]));
    let saved: ActiveWorkoutDraft | null = null;

    const snapshot = async (overrides: Partial<ActiveWorkoutDraft> = {}) => {
      const draft = buildWorkoutDraftSnapshot({
        userId: 'u1',
        sessionId: 's1',
        dayId: 'd1',
        date: '2026-09-28',
        previousDraft: saved,
        exerciseSets: state.exerciseSets,
        exerciseNotes: state.exerciseNotes,
        exerciseMetrics: state.exerciseMetrics,
        exerciseMetricGrants: state.exerciseMetricGrants,
        dayNotes: '',
        skippedExercises: state.skippedExercises,
        dayNames: names,
        dayName: plan.dayName,
        cloudMeta: null,
        planExerciseIds: planIds(),
        now: 1000,
      }, { exerciseNames: names, sessionSwaps: state.sessionSwaps, ...overrides })!;
      await workoutDraftDb.saveActiveDraft(draft);
      saved = draft;
    };

    // 1. Start z planu + pierwsze ćwiczenie odhaczone.
    state = { ...state, exerciseSets: { ...state.exerciseSets, 'tpl-ex-11': done(3) } };
    await snapshot();

    // 2. Zamiana "tylko dziś" na pozycji 3 (bez odhaczonych serii).
    const todayId = 'tpl-ex-13__swap-wioslowanie-hantlem';
    state = applySessionExerciseSwap(state, {
      fromId: 'tpl-ex-13', toId: todayId, fromName: 'Ćwiczenie 3', toName: 'Wiosłowanie hantlem',
      sets: '3 x 8-10', createSets: () => open(3, 0),
    });
    names = { ...names, [todayId]: 'Wiosłowanie hantlem' };
    await snapshot();

    // 3. Zamiana "Na stałe" na pozycji 5: najpierw sesja, potem plan.
    const planExercise = plan.exercises[4];
    const permanent = swapExerciseIdentity(planExercise, { name: 'Face pull', sets: '3 x 12' }, planIds());
    state = applySessionExerciseSwap(state, {
      fromId: planExercise.id, toId: permanent.id, fromName: planExercise.name, toName: 'Face pull',
      sets: '3 x 12', createSets: () => open(3, 0),
    });
    names = { ...names, [permanent.id]: 'Face pull' };
    await snapshot();
    plan = { ...plan, exercises: plan.exercises.map((e) => (e.id === planExercise.id ? permanent : e)) };

    // 4. Wyjście i powrót: stan Reacta ginie, jedyne źródło to IDB.
    __resetWorkoutDraftDbConnectionForTests();
    const hydrated = await workoutDraftDb.loadActiveDraft('u1');
    expect(hydrated).not.toBeNull();
    const view = buildDayFromDraft(plan, hydrated!);
    expect(view.exercises.map((e) => e.id)).toEqual([
      'tpl-ex-11', 'tpl-ex-12', todayId, 'tpl-ex-14', permanent.id, 'tpl-ex-16',
    ]);
    expect(view.exercises.map((e) => e.name)).toEqual([
      'Ćwiczenie 1', 'Ćwiczenie 2', 'Wiosłowanie hantlem', 'Ćwiczenie 4', 'Face pull', 'Ćwiczenie 6',
    ]);

    // 5. Odhaczenie serii na obu zamienionych kartach (stan z hydracji).
    saved = hydrated;
    state = {
      exerciseSets: { ...hydrated!.exerciseSets, [todayId]: done(3, 22), [permanent.id]: done(3, 15) },
      exerciseNotes: hydrated!.exerciseNotes,
      exerciseMetrics: hydrated!.exerciseMetrics,
      exerciseMetricGrants: hydrated!.exerciseMetricGrants ?? {},
      skippedExercises: hydrated!.skippedExercises,
      sessionSwaps: hydrated!.sessionSwaps ?? {},
    };
    names = hydrated!.exerciseNames ?? names;
    await snapshot();

    // 6. Zakończenie + final sync z draftu w IDB.
    await snapshot({ completedLocally: true, finalSyncPending: true, finalizedAt: 2000 });
    const saveWorkout = vi.fn(async () => ({ success: true, updatedAt: 3000, revision: 2 }));
    const deps = {
      loadDraft: (userId: string, sessionId: string) => workoutDraftDb.loadDraft(userId, sessionId),
      saveWorkout,
      getFromServer: vi.fn(async () => null),
      createSession: vi.fn(async () => ({ session: null, error: 'NOT_EXPECTED' })),
      markPromoted: vi.fn(async () => undefined),
      markSynced: vi.fn(async () => undefined),
      setCloudBaseline: vi.fn(async () => undefined),
      setPendingWrite: vi.fn(async () => undefined),
      markHealthPending: vi.fn(async () => undefined),
      clearDraftIfVersion: vi.fn(async () => true),
      queue: { remove: vi.fn(), upsertFromDraft: vi.fn() },
      isOnline: () => true,
      now: () => 5000,
    } as unknown as WorkoutSyncDeps;
    await syncWorkoutSession('u1', 's1', 'final', deps);

    expect(saveWorkout).toHaveBeenCalled();
    const exercises = (saveWorkout.mock.calls[0] as unknown[])[1] as Array<{ exerciseId: string; name?: string }>;
    expect(exercises.map((e) => e.exerciseId)).toEqual([
      'tpl-ex-11', 'tpl-ex-12', todayId, 'tpl-ex-14', permanent.id, 'tpl-ex-16',
    ]);
    expect(exercises[2].name).toBe('Wiosłowanie hantlem');
    expect(exercises[4].name).toBe('Face pull');

    // Oczekiwanie walidacji finalnej zbudowane z tego samego draftu: ta sama kolejność.
    const finalDraft = await workoutDraftDb.loadDraft('u1', 's1');
    expect(buildDraftFinalExpectation(finalDraft!).exercises.map((e) => e.exerciseId))
      .toEqual(exercises.map((e) => e.exerciseId));
  });
});

// 2026-09-29 (dług po F4): „Na stałe" na karcie, która jest już zamianą „tylko dziś",
// nie zmieniało planu: swapExercise szukał w planie id zamiany sesyjnej.
describe('planExerciseSwap: "Na stałe" na karcie zamiany "tylko dziś" zmienia plan na pozycji oryginału', () => {
  const planIds = () => planDay.exercises.map((e) => e.id);

  it('resolvePlanExerciseId: id planu, rekord sessionSwaps, łańcuch, sam prefiks', () => {
    expect(resolvePlanExerciseId(planIds(), 'tpl-ex-13', {})).toBe('tpl-ex-13');
    expect(resolvePlanExerciseId(planIds(), 'tpl-ex-13__swap-a', {
      'tpl-ex-13': { id: 'tpl-ex-13__swap-a', name: 'A', sets: '3 x 8' },
    })).toBe('tpl-ex-13');
    expect(resolvePlanExerciseId(planIds(), 'tpl-ex-13__swap-a__swap-b', {
      'tpl-ex-13': { id: 'tpl-ex-13__swap-a', name: 'A', sets: '3 x 8' },
      'tpl-ex-13__swap-a': { id: 'tpl-ex-13__swap-a__swap-b', name: 'B', sets: '3 x 8' },
    })).toBe('tpl-ex-13');
    expect(resolvePlanExerciseId(planIds(), 'tpl-ex-13__swap-a', {})).toBe('tpl-ex-13');
    expect(resolvePlanExerciseId(planIds(), 'adhoc-ex-plank', {})).toBeUndefined();
  });

  it('planExerciseSwap: zakres plan na karcie zamiany celuje w oryginał planu i id z swapExerciseIdentity', () => {
    const result = planExerciseSwap({
      scope: 'plan',
      cardId: 'tpl-ex-13__swap-a',
      pick: { name: 'Face pull' },
      currentSets: '3 x 12',
      planExercises: planDay.exercises,
      dayExerciseIds: ['tpl-ex-11', 'tpl-ex-12', 'tpl-ex-13__swap-a', 'tpl-ex-14', 'tpl-ex-15', 'tpl-ex-16'],
      sessionSwaps: { 'tpl-ex-13': { id: 'tpl-ex-13__swap-a', name: 'A', sets: '3 x 12' } },
    });
    expect(result.planExerciseId).toBe('tpl-ex-13');
    expect(result.swappedId).toBe(
      swapExerciseIdentity(planDay.exercises[2], { name: 'Face pull', sets: '3 x 12' }, planIds()).id,
    );
  });

  it('planExerciseSwap: "tylko dziś" bez celu w planie; "Na stałe" na karcie planu jak dotąd', () => {
    const today = planExerciseSwap({
      scope: 'today', cardId: 'tpl-ex-13', pick: { name: 'A' }, currentSets: '3 x 8',
      planExercises: planDay.exercises, dayExerciseIds: planIds(), sessionSwaps: {},
    });
    expect(today).toEqual({ swappedId: 'tpl-ex-13__swap-a' });
    const plan = planExerciseSwap({
      scope: 'plan', cardId: 'tpl-ex-13', pick: { name: 'A' }, currentSets: '3 x 8',
      planExercises: planDay.exercises, dayExerciseIds: planIds(), sessionSwaps: {},
    });
    expect(plan).toEqual({ swappedId: 'tpl-ex-13__swap-a', planExerciseId: 'tpl-ex-13' });
  });

  it('sekwencja: start, "tylko dziś" na poz. 3, "Na stałe" na tej samej karcie, plan zmieniony, powrót z IDB, odhaczenie, final sync', async () => {
    localStorage.clear();
    __resetWorkoutDraftDbConnectionForTests();
    let plan: TrainingDay = planDay;
    let state = emptyState(prefilled());
    let names: Record<string, string> = Object.fromEntries(plan.exercises.map((e) => [e.id, e.name]));
    let saved: ActiveWorkoutDraft | null = null;
    const snapshot = async (overrides: Partial<ActiveWorkoutDraft> = {}) => {
      const draft = buildWorkoutDraftSnapshot({
        userId: 'u1', sessionId: 's2', dayId: 'd1', date: '2026-09-29', previousDraft: saved,
        exerciseSets: state.exerciseSets, exerciseNotes: state.exerciseNotes,
        exerciseMetrics: state.exerciseMetrics, exerciseMetricGrants: state.exerciseMetricGrants,
        dayNotes: '', skippedExercises: state.skippedExercises, dayNames: names,
        cloudMeta: null, planExerciseIds: plan.exercises.map((e) => e.id), now: 1000,
      }, { exerciseNames: names, sessionSwaps: state.sessionSwaps, ...overrides })!;
      await workoutDraftDb.saveActiveDraft(draft);
      saved = draft;
    };
    const applySwap = (cardId: string, scope: 'today' | 'plan', pickName: string) => {
      const dayIds = buildDayFromDraft(plan, { dayId: 'd1', exerciseSets: state.exerciseSets, sessionSwaps: state.sessionSwaps })
        .exercises.map((e) => e.id);
      const target = planExerciseSwap({
        scope, cardId, pick: { name: pickName }, currentSets: '3 x 8-10',
        planExercises: plan.exercises, dayExerciseIds: dayIds, sessionSwaps: state.sessionSwaps,
      });
      state = applySessionExerciseSwap(state, {
        fromId: cardId, toId: target.swappedId, fromName: names[cardId] ?? cardId, toName: pickName,
        sets: '3 x 8-10', createSets: () => open(3, 0),
      });
      names = { ...names, [target.swappedId]: pickName };
      return target;
    };

    await snapshot();
    const todayTarget = applySwap('tpl-ex-13', 'today', 'Wiosłowanie hantlem');
    await snapshot();
    const permanent = applySwap(todayTarget.swappedId, 'plan', 'Face pull');
    expect(permanent.planExerciseId).toBe('tpl-ex-13');
    await snapshot();
    // Zapis planu (useTrainingPlan.swapExercise) na id oryginału.
    plan = {
      ...plan,
      exercises: plan.exercises.map((e) => (e.id === permanent.planExerciseId
        ? swapExerciseIdentity(e, { name: 'Face pull', sets: '3 x 8-10' }, plan.exercises.map((x) => x.id))
        : e)),
    };
    expect(plan.exercises[2].id).toBe(permanent.swappedId);
    expect(plan.exercises[2].name).toBe('Face pull');

    __resetWorkoutDraftDbConnectionForTests();
    // loadDraft po sessionId: fake-indexeddb jest współdzielony w pliku (draft s1 wyżej).
    const hydrated = await workoutDraftDb.loadDraft('u1', 's2');
    const view = buildDayFromDraft(plan, hydrated!);
    expect(view.exercises.map((e) => e.id)).toEqual(plan.exercises.map((e) => e.id));
    expect(view.exercises[2].name).toBe('Face pull');
    expect(Object.keys(hydrated!.exerciseSets)).not.toContain(todayTarget.swappedId);

    saved = hydrated;
    state = { ...state, exerciseSets: { ...hydrated!.exerciseSets, [permanent.swappedId]: done(3, 15) } };
    await snapshot({ completedLocally: true, finalSyncPending: true, finalizedAt: 2000 });
    const saveWorkout = vi.fn(async () => ({ success: true, updatedAt: 3000, revision: 2 }));
    await syncWorkoutSession('u1', 's2', 'final', {
      loadDraft: (userId: string, sessionId: string) => workoutDraftDb.loadDraft(userId, sessionId),
      saveWorkout,
      getFromServer: vi.fn(async () => null),
      createSession: vi.fn(async () => ({ session: null, error: 'NOT_EXPECTED' })),
      markPromoted: vi.fn(async () => undefined),
      markSynced: vi.fn(async () => undefined),
      setCloudBaseline: vi.fn(async () => undefined),
      setPendingWrite: vi.fn(async () => undefined),
      markHealthPending: vi.fn(async () => undefined),
      clearDraftIfVersion: vi.fn(async () => true),
      queue: { remove: vi.fn(), upsertFromDraft: vi.fn() },
      isOnline: () => true,
      now: () => 5000,
    } as unknown as WorkoutSyncDeps);
    const exercises = (saveWorkout.mock.calls[0] as unknown[])[1] as Array<{ exerciseId: string; name?: string }>;
    expect(exercises.map((e) => e.exerciseId)).toEqual(plan.exercises.map((e) => e.id));
    expect(exercises[2].name).toBe('Face pull');
  });
});
