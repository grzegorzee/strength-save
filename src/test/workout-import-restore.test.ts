// Pakiet X30 (bugi 14/44/43): import backupu JSON i naprawa historycznych
// treningów w useFirebaseWorkoutActions. Fixtury przez kanoniczne stany
// (zasada 11) — importowane cykle/plan mają kształt realnego eksportu
// (Settings.exportData dołącza obiekty z listenera, czyli wynik
// sanitizePlanCycleDoc Z POLEM id).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const batchSetMock = vi.hoisted(() => vi.fn());
const batchDeleteMock = vi.hoisted(() => vi.fn());
const batchCommitMock = vi.hoisted(() => vi.fn(async () => undefined));
const setDocMock = vi.hoisted(() => vi.fn(async () => undefined));
const getDocsMock = vi.hoisted(() => vi.fn(async () => ({ docs: [] as unknown[] })));
const updateDocMock = vi.hoisted(() => vi.fn(async () => undefined));
const runTransactionMock = vi.hoisted(() => vi.fn());
const restoreWorkoutV3Mock = vi.hoisted(() => vi.fn(async () => ({ status: 'restored', workoutId: 'w-v3' })));
const protectedCallMock = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ __collection: name })),
  doc: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
  documentId: vi.fn(),
  getDocs: getDocsMock,
  getDocsFromCache: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  setDoc: setDocMock,
  updateDoc: updateDocMock,
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(() => () => undefined),
  limit: vi.fn(),
  orderBy: vi.fn(),
  startAfter: vi.fn(),
  query: vi.fn((source: unknown, ...clauses: unknown[]) => ({ __query: source, clauses })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  runTransaction: runTransactionMock,
  writeBatch: vi.fn(() => ({ set: batchSetMock, delete: batchDeleteMock, commit: batchCommitMock })),
  increment: vi.fn((n: number) => ({ __increment: n })),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'canonical-user-1' } } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));
vi.mock('@/lib/workout-restore-v3', () => ({
  restoreWorkoutBackupV3Item: restoreWorkoutV3Mock,
}));
vi.mock('@/lib/protected-callable', () => ({ callProtectedFunction: protectedCallMock }));

import { useFirebaseWorkoutActions } from '@/hooks/useFirebaseWorkouts';
import { buildCanonicalState, CANONICAL_UID } from '@/test/canonical-states';
import type { WorkoutSession, BodyMeasurement } from '@/types';
import { buildImportedSessions } from '@/lib/workout-import/mapper';
import { parseWorkoutCsv } from '@/lib/workout-import/parser';
import { auth } from '@/lib/firebase';

type FirestoreRefToken = { __coll: string; __id: string };

const renderActions = (
  workouts: WorkoutSession[] = [],
  measurements: BodyMeasurement[] = [],
  healthEpoch?: number,
) => renderHook(() => useFirebaseWorkoutActions(
  CANONICAL_UID,
  { workouts, measurements },
  healthEpoch,
  healthEpoch ? { healthEpoch, healthGrantId: `grant-${healthEpoch}` } : null,
));

const planCycleSetCalls = (): Array<[FirestoreRefToken, Record<string, unknown>]> =>
  (batchSetMock.mock.calls as Array<[FirestoreRefToken, Record<string, unknown>]>)
    .filter(([ref]) => ref.__coll === 'plan_cycles');

beforeEach(() => {
  batchSetMock.mockClear();
  batchDeleteMock.mockClear();
  batchCommitMock.mockClear();
  setDocMock.mockClear();
  updateDocMock.mockClear();
  runTransactionMock.mockReset();
  protectedCallMock.mockReset();
  getDocsMock.mockReset().mockResolvedValue({ docs: [] });
  restoreWorkoutV3Mock.mockReset().mockResolvedValue({ status: 'restored', workoutId: 'w-v3' });
  Object.assign(auth, { currentUser: { uid: CANONICAL_UID } });
});

describe('importData — restore schema 3 bez embedded health', () => {
  it('wykonuje preflight i zapisuje workout przez chroniony callable, nie klientowy batch', async () => {
    const { result } = renderActions([], [], 7);
    const backup = JSON.stringify({
      schemaVersion: 3,
      exportedAt: '2026-08-28T10:00:00.000Z',
      workouts: [{
        id: 'w-v3', userId: 'old-owner', dayId: 'd1', date: '2026-08-28', completed: true,
        exercises: [{ exerciseId: 'lunge', sets: [{ reps: 10, weight: 0, completed: true }] }],
      }],
      workoutHealth: [{ workoutId: 'w-v3', metrics: [{ exerciseId: 'lunge', rpe: 7 }] }],
      measurements: [],
    });

    const outcome = await result.current.importData(backup);

    expect(outcome.success).toBe(true);
    expect(restoreWorkoutV3Mock).toHaveBeenCalledWith(
      expect.objectContaining({ workout: expect.objectContaining({ id: 'w-v3' }) }),
      { healthEpoch: 7, healthGrantId: 'grant-7' },
      expect.any(String),
      CANONICAL_UID,
    );
    const workoutSets = (batchSetMock.mock.calls as Array<[FirestoreRefToken]>)
      .filter(([ref]) => ref.__coll === 'workouts');
    expect(workoutSets).toHaveLength(0);
  });

  it('legacy backup też wydziela RPE do sidecara zamiast klientowego dokumentu workouts', async () => {
    const { result } = renderActions([], [], 7);

    const outcome = await result.current.importData(JSON.stringify({
      workouts: [{
        id: 'w-legacy', dayId: 'd1', date: '2026-08-28', completed: true,
        exercises: [{
          exerciseId: 'squat',
          sets: [{ reps: 5, weight: 100, completed: true }],
          rpe: 8,
        }],
      }],
    }));

    expect(outcome.success).toBe(true);
    expect(restoreWorkoutV3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        workout: expect.objectContaining({
          id: 'w-legacy',
          exercises: [expect.not.objectContaining({ rpe: expect.anything() })],
        }),
        health: { workoutId: 'w-legacy', metrics: [{ exerciseId: 'squat', rpe: 8 }] },
      }),
      { healthEpoch: 7, healthGrantId: 'grant-7' },
      expect.any(String),
      CANONICAL_UID,
    );
  });
});

describe('launch W6/W7: CSV imports use the protected restore contract', () => {
  const csv = (format: 'strong' | 'hevy', rpe = '8.5') => format === 'strong'
    ? `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE\n2026-09-06 10:00:00,Test,Bench Press,1,80,8,${rpe}`
    : `title,start_time,exercise_title,set_index,weight_kg,reps,rpe\nTest,2026-09-06 10:00:00,Bench Press,1,80,8,${rpe}`;
  const sessions = (format: 'strong' | 'hevy', rpe?: string) => buildImportedSessions(
    parseWorkoutCsv(csv(format, rpe)).workouts, new Map(), CANONICAL_UID, 'batch123',
  );

  it.each(['strong', 'hevy'] as const)('%s RPE is split into a sidecar with the captured health grant', async (format) => {
    const { result } = renderActions([], [], 7);
    const imported = sessions(format);
    const outcome = await result.current.importCsvSessions(imported);
    expect(outcome).toMatchObject({ success: true, written: 1 });
    expect(batchSetMock).not.toHaveBeenCalled();
    expect(restoreWorkoutV3Mock).toHaveBeenCalledWith({
      workout: expect.objectContaining({ exercises: [expect.not.objectContaining({ rpe: expect.anything() })] }),
      health: { workoutId: imported[0].id, metrics: [{ exerciseId: 'imported-ex-1', rpe: 8.5 }] },
    }, { healthEpoch: 7, healthGrantId: 'grant-7' }, expect.any(String), CANONICAL_UID);
  });

  it('health off rejects the whole file before writing even if the first workout has no RPE', async () => {
    const { result } = renderActions();
    const imported = [...sessions('strong', ''), { ...sessions('strong')[0], id: 'imported-second', dayId: 'imported-second' }];
    expect(await result.current.importCsvSessions(imported)).toMatchObject({ success: false, written: 0, error: 'import.healthConsentRequired' });
    expect(batchSetMock).not.toHaveBeenCalled();
    expect(restoreWorkoutV3Mock).not.toHaveBeenCalled();
  });

  it('base-only CSV works without a health grant', async () => {
    const { result } = renderActions();
    expect(await result.current.importCsvSessions(sessions('strong', ''))).toMatchObject({ success: true, written: 1 });
    expect(restoreWorkoutV3Mock).toHaveBeenCalledWith(expect.not.objectContaining({ health: expect.anything() }), null, expect.any(String), CANONICAL_UID);
  });

  it('a legacy import of the same file is preserved and not duplicated', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [{ id: 'imported-batch123-1', data: () => ({ userId: CANONICAL_UID, importBatchId: 'batch123' }) }] });
    const { result } = renderActions([], [], 7);
    expect(await result.current.importCsvSessions(sessions('strong'))).toMatchObject({ success: true, written: 1 });
    expect(restoreWorkoutV3Mock).not.toHaveBeenCalled();
    expect(batchSetMock).not.toHaveBeenCalled();
  });

  it('an input from another account is rejected before any writes', async () => {
    const { result } = renderActions([], [], 7);
    expect(await result.current.importCsvSessions([{ ...sessions('strong')[0], userId: 'another-account' }])).toMatchObject({ success: false, written: 0 });
    expect(restoreWorkoutV3Mock).not.toHaveBeenCalled();
    expect(batchSetMock).not.toHaveBeenCalled();
  });

  it.each(['CALLABLE_ACCOUNT_CHANGED', 'RESTORE_OWNER_CHANGED'])('localizes the account boundary failure %s', async (message) => {
    restoreWorkoutV3Mock.mockRejectedValueOnce(new Error(message));
    const { result } = renderActions();
    expect(await result.current.importCsvSessions(sessions('strong', ''))).toMatchObject({
      success: false, written: 0, error: 'import.accountChanged',
    });
  });

  it('stops after account change during an import and reports the already written count', async () => {
    const { result } = renderActions([], [], 7);
    const imported = [sessions('strong')[0], { ...sessions('strong')[0], id: 'imported-second', dayId: 'imported-second' }];
    restoreWorkoutV3Mock.mockImplementationOnce(async () => {
      Object.assign(auth, { currentUser: { uid: 'another-account' } });
      return { status: 'restored', workoutId: imported[0].id };
    });
    const outcome = await result.current.importCsvSessions(imported);
    expect(outcome).toMatchObject({ success: false, written: 1 });
    expect(restoreWorkoutV3Mock).toHaveBeenCalledOnce();
  });

  it('launch W9: Undo stops if the account changes while reading the batch', async () => {
    const { result } = renderActions();
    getDocsMock.mockImplementationOnce(async () => {
      Object.assign(auth, { currentUser: { uid: 'another-account' } });
      return { docs: [{ id: 'owned-workout', ref: {}, data: () => ({ userId: CANONICAL_UID }) }] };
    });
    expect(await result.current.deleteImportBatch('batch123')).toMatchObject({ success: false, deleted: 0 });
    expect(batchDeleteMock).not.toHaveBeenCalled();
  });

  it('launch W9: mock Undo deletes only the current account even when both imported the same file', async () => {
    vi.stubEnv('VITE_E2E_MODE', 'true');
    vi.stubEnv('VITE_USE_EMULATORS', 'false');
    try {
      const { result } = renderActions();
      localStorage.setItem('fittracker_e2e_workouts', JSON.stringify([
        { id: 'own', userId: CANONICAL_UID, importBatchId: 'batch123' },
        { id: 'other', userId: 'another-account', importBatchId: 'batch123' },
      ]));
      expect(await result.current.deleteImportBatch('batch123')).toEqual({ success: true, deleted: 1 });
      expect(JSON.parse(localStorage.getItem('fittracker_e2e_workouts')!)).toEqual([
        { id: 'other', userId: 'another-account', importBatchId: 'batch123' },
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('importData — granica zgody zdrowotnej pomiarów', () => {
  const backup = JSON.stringify({
    measurements: [{ id: 'm-import', date: '2026-08-20', weight: 80 }],
  });

  it('bieżąca epoka jest przypisana do importowanego pomiaru', async () => {
    const { result } = renderActions([], [], 4);

    const outcome = await result.current.importData(backup);

    expect(outcome.success).toBe(true);
    const measurementCall = (batchSetMock.mock.calls as Array<[FirestoreRefToken, Record<string, unknown>]>)
      .find(([ref]) => ref.__coll === 'measurements');
    expect(measurementCall?.[1]).toMatchObject({
      id: 'm-import',
      userId: CANONICAL_UID,
      healthEpoch: 4,
    });
  });

  it('bez aktywnej epoki nie rozpoczyna częściowego importu', async () => {
    const { result } = renderActions();

    const outcome = await result.current.importData(backup);

    expect(outcome).toEqual({ success: false, message: 'data.healthConsentRequired' });
    expect(batchSetMock).not.toHaveBeenCalled();
    expect(batchCommitMock).not.toHaveBeenCalled();
  });
});

// Bug 14 (X30): eksport niesie cykle z polem `id` (sanitizePlanCycleDoc), a
// validPlanCycleShape w rules NIE ma `id` na hasOnly — surowy {...cycle}
// dawał PERMISSION_DENIED na CAŁYM batchu plan_cycles przy każdym round-tripie.
describe('importData — planCycles przez sanitizer (bug 14)', () => {
  const RULES_PLAN_CYCLE_WHITELIST = [
    'userId', 'days', 'durationWeeks', 'startDate', 'endDate', 'status',
    'createdAt', 'stats', 'technical', 'hiddenFromInsights', 'choice',
  ];

  it('legalny eksport: zapis bez pola id, pola tylko z whitelisty rules, userId konta', async () => {
    const state = buildCanonicalState('active-plan');
    const exportedCycle = state.cycles[0];
    const { result } = renderActions();

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.importData(JSON.stringify({
        schemaVersion: 2,
        workouts: [],
        measurements: [],
        planCycles: [exportedCycle],
      }));
    });

    expect(outcome?.success).toBe(true);
    const cycleSets = planCycleSetCalls();
    expect(cycleSets).toHaveLength(1);
    const [ref, payload] = cycleSets[0];
    expect(ref.__id).toBe(exportedCycle.id);
    expect(payload).not.toHaveProperty('id');
    expect(payload.userId).toBe(CANONICAL_UID);
    Object.keys(payload).forEach((key) => expect(RULES_PLAN_CYCLE_WHITELIST).toContain(key));
    // Treść cykla przeżywa round-trip.
    expect(payload.startDate).toBe(exportedCycle.startDate);
    expect(payload.status).toBe('active');
    expect((payload.days as Array<{ id: string }>).map((d) => d.id))
      .toEqual(exportedCycle.days.map((d) => d.id));
  });

  it('śmieciowe pola spoza schematu są wycinane (hasOnly przejdzie)', async () => {
    const state = buildCanonicalState('active-plan');
    const doctored = { ...state.cycles[0], templateId: 'legacy-x', junk: 42 };
    const { result } = renderActions();

    await act(async () => {
      await result.current.importData(JSON.stringify({ planCycles: [doctored] }));
    });

    const [, payload] = planCycleSetCalls()[0];
    expect(payload).not.toHaveProperty('templateId');
    expect(payload).not.toHaveProperty('junk');
  });

  it('cykl nieprzechodzący sanitizera (brak startDate) jest pomijany, reszta importu idzie', async () => {
    const state = buildCanonicalState('active-plan');
    const { startDate: _dropped, ...broken } = state.cycles[0];
    const { result } = renderActions();

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.importData(JSON.stringify({
        workouts: [state.workouts[0]],
        planCycles: [broken],
      }));
    });

    expect(outcome?.success).toBe(true);
    expect(planCycleSetCalls()).toHaveLength(0);
    // Trening z backupu nadal zapisany przez atomowy callable restore; zły cykl
    // nie blokuje niezależnej, bezpiecznej ścieżki treningu.
    expect(restoreWorkoutV3Mock).toHaveBeenCalledTimes(1);
  });

  // WP-6 (X33): eksport -> import zachowuje odpowiedzi z kreatora na cyklu.
  it('round-trip eksport/import: choice przechodzi przez sanitizer 1:1, cykl bez choice bez pola', async () => {
    const state = buildCanonicalState('history-multi-cycle');
    const withChoice = state.cycles.find((cycle) => cycle.choice !== undefined)!;
    const withoutChoice = state.cycles.find((cycle) => cycle.choice === undefined)!;
    const { result } = renderActions();

    const exported = JSON.parse(await result.current.exportData({ planCycles: state.cycles })) as { planCycles: Array<{ id: string; choice?: unknown }> };
    expect(exported.planCycles.find((cycle) => cycle.id === withChoice.id)?.choice).toEqual(withChoice.choice);

    await act(async () => {
      await result.current.importData(JSON.stringify(exported));
    });

    const payloads = new Map(planCycleSetCalls().map(([ref, payload]) => [ref.__id, payload]));
    expect(payloads.size).toBe(2);
    expect(payloads.get(withChoice.id)?.choice).toEqual(withChoice.choice);
    expect(payloads.get(withoutChoice.id)).not.toHaveProperty('choice');
    payloads.forEach((payload) => Object.keys(payload).forEach((key) => expect(RULES_PLAN_CYCLE_WHITELIST).toContain(key)));
  });

  it('uszkodzony choice w backupie znika po cichu, cykl wchodzi', async () => {
    const state = buildCanonicalState('active-plan');
    const doctored = { ...state.cycles[0], choice: { version: 'one', entry: 'admin' } };
    const { result } = renderActions();

    await act(async () => {
      await result.current.importData(JSON.stringify({ planCycles: [doctored] }));
    });

    const [, payload] = planCycleSetCalls()[0];
    expect(payload).not.toHaveProperty('choice');
    expect(payload.startDate).toBe(state.cycles[0].startDate);
  });
});

// Bug 44 (X30): importData pisał training_plans.days prosto z pliku, omijając
// niezmiennik Z151 (dni planu wyrównane do id dni PIERWSZEGO aktywnego cyklu).
// Stary backup (era cyklu A / format day-N) przy żywym cyklu B rozjeżdżał parę
// plan/cykl aż do najbliższej ręcznej edycji planu.
describe('importData — training_plans.days wyrównane do aktywnego cyklu (bug 44)', () => {
  const planSetCall = () => {
    const calls = (setDocMock.mock.calls as unknown as Array<[FirestoreRefToken, Record<string, unknown>, { merge?: boolean }]>)
      .filter(([ref]) => ref.__coll === 'training_plans');
    expect(calls).toHaveLength(1);
    return calls[0];
  };

  it('backup z obcymi id dni (day-N) przy aktywnym cyklu: dni adoptują id cyklu', async () => {
    const state = buildCanonicalState('active-plan');
    const cycle = state.cycles[0];
    getDocsMock.mockResolvedValue({
      docs: [{ data: () => ({ days: cycle.days, startDate: cycle.startDate, status: 'active' }) }],
    });
    // Backup sprzed startu cyklu: te same dni, ale w formacie default day-N.
    const foreignDays = state.plan!.days.map((day, i) => ({ ...day, id: `day-${i + 1}` }));
    const { result } = renderActions();

    await act(async () => {
      await result.current.importData(JSON.stringify({
        trainingPlan: { days: foreignDays, durationWeeks: 8, startDate: cycle.startDate },
      }));
    });

    const [ref, payload, opts] = planSetCall();
    expect(ref.__id).toBe(CANONICAL_UID);
    expect(opts).toEqual({ merge: true });
    expect((payload.days as Array<{ id: string }>).map((d) => d.id))
      .toEqual(cycle.days.map((d) => d.id));
    // Treść dni z backupu zostaje (id adoptowane, reszta z pliku).
    expect((payload.days as Array<{ dayName: string }>).map((d) => d.dayName))
      .toEqual(foreignDays.map((d) => d.dayName));
    expect(payload.durationWeeks).toBe(8);
  });

  it('niezmiennik: bez aktywnego cyklu dni z backupu wchodzą bez zmian', async () => {
    const state = buildCanonicalState('active-plan');
    const foreignDays = state.plan!.days.map((day, i) => ({ ...day, id: `day-${i + 1}` }));
    const { result } = renderActions();

    await act(async () => {
      await result.current.importData(JSON.stringify({
        trainingPlan: { days: foreignDays, durationWeeks: 12 },
      }));
    });

    const [, payload] = planSetCall();
    expect((payload.days as Array<{ id: string }>).map((d) => d.id)).toEqual(['day-1', 'day-2']);
  });

  it('niezmiennik: dni nieprzechodzące sanitizera (legacy kształt) zapisują się jak dotąd', async () => {
    // Dzień bez dayName — sanitizeTrainingPlanDays zwraca null; zapis surowy
    // jak przed fixem (import starych/ręcznych plików nie może stracić danych).
    const legacyDays = [{ id: 'day-1', exercises: [] }];
    const { result } = renderActions();

    await act(async () => {
      await result.current.importData(JSON.stringify({
        trainingPlan: { days: legacyDays, durationWeeks: 12 },
      }));
    });

    const [, payload] = planSetCall();
    expect(payload.days).toEqual(legacyDays);
    // Bez sanityzowalnych dni nie ma też odpytywania o cykle.
    expect(getDocsMock).not.toHaveBeenCalled();
  });
});

// Bug 43 (X30): backfillHistoricalWorkouts robił goły updateDoc z pełną tablicą
// exercises ze snapshotu klienta — równoległy zapis tej samej sesji (drugie
// urządzenie edytuje stary trening w trakcie "Napraw"/archiwizacji planu)
// był cicho cofany do starej tablicy serii. Fix: callable v2 z precondycją
// rewizji w transakcji serwera; rozjazd = pomiń dokument.
describe('backfillHistoricalWorkouts — precondycja rewizji (bug 43)', () => {
  const setupTransaction = (currentDoc: Record<string, unknown> | null) => {
    const txUpdate = vi.fn();
    protectedCallMock.mockImplementation(async (_name: string, request: { expectedRevision: number }) => {
      if (currentDoc === null) throw new Error('WORKOUT_NOT_FOUND');
      if (request.expectedRevision !== currentDoc.revision) throw new Error('WORKOUT_CONFLICT');
      return { updatedAt: 123, revision: request.expectedRevision + 1, health: 'none' };
    });
    runTransactionMock.mockImplementation(async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async () => ({
          exists: () => currentDoc !== null,
          data: () => currentDoc,
        }),
        update: txUpdate,
      }));
    return txUpdate;
  };

  // Trening legacy: bezimienne ćwiczenia (cel naprawy), poza tym kanoniczny.
  const buildLegacyWorkout = () => {
    const state = buildCanonicalState('active-plan');
    const base = state.workouts[0];
    return {
      state,
      workout: {
        ...base,
        revision: 3,
        exercises: base.exercises.map(({ name: _name, ...rest }) => rest),
      } as WorkoutSession,
    };
  };

  it('rewizja zgodna ze snapshotem: naprawa dopisuje nazwy przez callable z precondycją', async () => {
    const { state, workout } = buildLegacyWorkout();
    const txUpdate = setupTransaction({ revision: 3 });
    const { result } = renderActions([workout]);

    let outcome: { updated: number; scanned: number } | undefined;
    await act(async () => {
      outcome = await result.current.backfillHistoricalWorkouts(state.cycles);
    });

    expect(outcome).toMatchObject({ updated: 1, scanned: 1 });
    expect(protectedCallMock).toHaveBeenCalledTimes(1);
    const [name, payload] = protectedCallMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('syncWorkoutV2');
    expect(payload.sessionId).toBe(workout.id);
    expect((payload.exercises as Array<{ name?: string }>)[0].name).toBe('Przysiad ze sztangą');
    expect(payload.expectedRevision).toBe(3);
    expect(payload.writeId).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty('healthEpoch');
    expect(txUpdate).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('rozjazd rewizji (równoległy zapis wygrał): dokument pominięty bez nadpisania', async () => {
    const { state, workout } = buildLegacyWorkout();
    const txUpdate = setupTransaction({ revision: 5 });
    const { result } = renderActions([workout]);

    let outcome: { updated: number; scanned: number } | undefined;
    await act(async () => {
      outcome = await result.current.backfillHistoricalWorkouts(state.cycles);
    });

    expect(outcome).toMatchObject({ updated: 0, scanned: 1 });
    expect(txUpdate).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('dokument usunięty między snapshotem a naprawą: pominięty', async () => {
    const { state, workout } = buildLegacyWorkout();
    const txUpdate = setupTransaction(null);
    const { result } = renderActions([workout]);

    let outcome: { updated: number } | undefined;
    await act(async () => {
      outcome = await result.current.backfillHistoricalWorkouts(state.cycles);
    });

    expect(outcome?.updated).toBe(0);
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('niezmiennik: kompletny trening (nazwy + dayName + cycleId) nie dotyka bazy', async () => {
    const state = buildCanonicalState('active-plan');
    const txUpdate = setupTransaction({ revision: 0 });
    const { result } = renderActions([state.workouts[0]]);

    let outcome: { updated: number; scanned: number } | undefined;
    await act(async () => {
      outcome = await result.current.backfillHistoricalWorkouts(state.cycles);
    });

    expect(outcome).toMatchObject({ updated: 0, scanned: 1 });
    expect(runTransactionMock).not.toHaveBeenCalled();
    expect(protectedCallMock).not.toHaveBeenCalled();
    expect(txUpdate).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
