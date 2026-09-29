// Release e2e 2026-09-29 (decyzja właściciela): przy „Zakończ trening”
// auto-odhaczenie (X37 WP-D) zalicza TYLKO serie, których wartości wpisał lub
// zmienił user. Seria z samym prefillem apki (historia, cel progresji, rampa)
// zostaje niezaliczona. Flaga `prefilled` żyje w szkicu (IDB), nigdy w zapisie
// do chmury. Legacy szkic bez flagi = zachowanie dotychczasowe.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetData } from '@/types';
import { createPrefilledSets, sanitizeSets, withoutPrefilledFlag } from '@/lib/exercise-utils';
import { autoCompleteFilledSets } from '@/lib/workout-day-view';
import { mergeWatchSetEvent } from '@/lib/watch-set-conflict';
import { clampSet } from '@/lib/workout-sanitizers';
import { buildWorkoutDraftSnapshot } from '@/lib/workout-draft-snapshot';
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

const weightReps = () => 'weight_reps' as const;
const history: SetData[] = [
  { reps: 8, weight: 40, completed: true },
  { reps: 8, weight: 40, completed: true },
];

describe('createPrefilledSets: prefill apki jest oznaczony', () => {
  it('serie z wartościami z historii/celu mają prefilled=true, puste serie bez flagi', () => {
    const sets = createPrefilledSets(3, history, false, { weight: 34, reps: null });
    expect(sets).toEqual([
      { reps: 8, weight: 34, completed: false, prefilled: true },
      { reps: 8, weight: 34, completed: false, prefilled: true },
      { reps: 8, weight: 34, completed: false, prefilled: true },
    ]);
    expect(createPrefilledSets(2, undefined)).toEqual([
      { reps: 0, weight: 0, completed: false },
      { reps: 0, weight: 0, completed: false },
    ]);
  });

  it('stan karty (sanitizeSets) zachowuje flagę: edycja jednej serii nie zdejmuje jej z pozostałych', () => {
    const card = sanitizeSets(createPrefilledSets(3, history), 3);
    expect(card.map((s) => s.prefilled)).toEqual([true, true, true]);
    const afterEdit = card.map((set, i) => (i === 1 ? withoutPrefilledFlag({ ...set, reps: 9 }) : set));
    expect(afterEdit.map((s) => s.prefilled === true)).toEqual([true, false, true]);
  });

  it('edycja usera zdejmuje flagę (wartości są już jego)', () => {
    const [set] = createPrefilledSets(1, history);
    expect(withoutPrefilledFlag({ ...set, reps: 10 })).toEqual({ reps: 10, weight: 40, completed: false });
    const legacy: SetData = { reps: 5, weight: 50, completed: false };
    expect(withoutPrefilledFlag(legacy)).toBe(legacy);
  });
});

describe('autoCompleteFilledSets: tylko wartości wpisane przez usera', () => {
  it('prefill nietknięty → niezaliczony i policzony jako pominięty; zmieniony → zaliczony', () => {
    const result = autoCompleteFilledSets({
      a: [
        { reps: 8, weight: 40, completed: true },
        { reps: 8, weight: 40, completed: false },
        { reps: 8, weight: 40, completed: false, prefilled: true },
      ],
    }, weightReps);
    expect(result.exerciseSets.a.map((s) => s.completed)).toEqual([true, true, false]);
    expect(result.autoCompleted).toBe(1);
    expect(result.skippedPrefilled).toBe(1);
    // Nietknięta seria nie znika: zostaje w stanie jako niezaliczona.
    expect(result.exerciseSets.a).toHaveLength(3);
    expect(result.exerciseSets.a[2]).toEqual({ reps: 8, weight: 40, completed: false, prefilled: true });
  });

  it('legacy szkic bez flagi (sesja w toku sprzed aktualizacji): jak dotąd, zaliczone', () => {
    const result = autoCompleteFilledSets({ a: [{ reps: 8, weight: 40, completed: false }] }, weightReps);
    expect(result.autoCompleted).toBe(1);
    expect(result.skippedPrefilled).toBe(0);
  });

  it('rozgrzewka i puste serie z flagą nie są liczone jako pominięte wyniki', () => {
    const result = autoCompleteFilledSets({
      a: [
        { reps: 5, weight: 20, completed: false, isWarmup: true, prefilled: true },
        { reps: 0, weight: 0, completed: false, prefilled: true },
      ],
    }, weightReps);
    expect(result.autoCompleted).toBe(0);
    expect(result.skippedPrefilled).toBe(0);
  });
});

describe('Apple Watch: seria zmieniona na zegarku nie jest już prefillem', () => {
  it('mergeWatchSetEvent zdejmuje flagę', () => {
    const current: SetData[] = [{ reps: 8, weight: 40, completed: false, prefilled: true }];
    const merged = mergeWatchSetEvent(current, {
      type: 'setLogged', exerciseId: 'a', setIndex: 0, reps: 10, weight: 42.5, completed: false, at: 5000, eventId: 'w-1',
    } as Parameters<typeof mergeWatchSetEvent>[1]);
    expect(merged.applied).toBe(true);
    expect(merged.sets[0]).not.toHaveProperty('prefilled');
  });
});

describe('flaga nie wychodzi do chmury', () => {
  it('clampSet (zapis/final sync) usuwa prefilled', () => {
    expect(clampSet({ reps: 8, weight: 40, completed: false, prefilled: true })).not.toHaveProperty('prefilled');
  });
});

describe('sekwencja: prefill → wyjście → powrót z IDB → edycja jednej serii → Zakończ → final sync', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetWorkoutDraftDbConnectionForTests();
  });

  it('flaga przeżywa IDB; zaliczona tylko seria zmieniona przez usera; payload bez flagi', async () => {
    const snapshot = (exerciseSets: Record<string, SetData[]>, previousDraft: ActiveWorkoutDraft | null, overrides: Partial<ActiveWorkoutDraft> = {}) =>
      buildWorkoutDraftSnapshot({
        userId: 'u1', sessionId: 's1', dayId: 'd1', date: '2026-10-06', previousDraft,
        exerciseSets, exerciseNotes: {}, exerciseMetrics: {}, dayNotes: '', skippedExercises: [],
        dayNames: {}, cloudMeta: null, now: 1000,
      }, { exerciseNames: { a: 'Wyciskanie' }, ...overrides })!;

    // 1. Start: prefill z celu (rampa 34 kg), odhaczona pierwsza seria.
    const start = createPrefilledSets(3, history, false, { weight: 34, reps: null });
    start[0] = { ...withoutPrefilledFlag(start[0]), completed: true };
    let draft = snapshot({ a: start }, null);
    await workoutDraftDb.saveActiveDraft(draft);

    // 2. Wyjście i powrót: jedynym źródłem jest IDB, flaga zostaje.
    __resetWorkoutDraftDbConnectionForTests();
    const hydrated = (await workoutDraftDb.loadActiveDraft('u1'))!;
    expect(hydrated.exerciseSets.a.map((s) => s.prefilled === true)).toEqual([false, true, true]);

    // 3. User zmienia wartość w serii 2 (bez odhaczenia), seria 3 nietknięta.
    const edited = hydrated.exerciseSets.a.map((set, index) => (index === 1 ? withoutPrefilledFlag({ ...set, reps: 7 }) : set));

    // 4. Zakończ: auto-odhaczenie tylko serii 2.
    const finished = autoCompleteFilledSets({ a: edited }, weightReps);
    expect(finished.autoCompleted).toBe(1);
    expect(finished.skippedPrefilled).toBe(1);
    draft = snapshot(finished.exerciseSets, hydrated, { completedLocally: true, finalSyncPending: true, finalizedAt: 2000 });
    await workoutDraftDb.saveActiveDraft(draft);

    // 5. Payload chmury: bez flagi, seria z samym prefillem niezaliczona.
    const payload = buildDraftExercisesPayload(draft);
    expect(JSON.stringify(payload)).not.toContain('prefilled');
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
    const exercises = (saveWorkout.mock.calls[0] as unknown[])[1] as Array<{ sets: SetData[] }>;
    expect(JSON.stringify(exercises)).not.toContain('prefilled');
    expect(exercises[0].sets.map((s) => [s.weight, s.reps, s.completed])).toEqual([
      [34, 8, true], [34, 7, true], [34, 8, false],
    ]);
  });
});
