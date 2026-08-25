// Pakiet X30 (bugi 14/44/43): import backupu JSON i naprawa historycznych
// treningów w useFirebaseWorkoutActions. Fixtury przez kanoniczne stany
// (zasada 11) — importowane cykle/plan mają kształt realnego eksportu
// (Settings.exportData dołącza obiekty z listenera, czyli wynik
// sanitizePlanCycleDoc Z POLEM id).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const batchSetMock = vi.hoisted(() => vi.fn());
const batchCommitMock = vi.hoisted(() => vi.fn(async () => undefined));
const setDocMock = vi.hoisted(() => vi.fn(async () => undefined));
const getDocsMock = vi.hoisted(() => vi.fn(async () => ({ docs: [] as unknown[] })));
const updateDocMock = vi.hoisted(() => vi.fn(async () => undefined));
const runTransactionMock = vi.hoisted(() => vi.fn());

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
  writeBatch: vi.fn(() => ({ set: batchSetMock, commit: batchCommitMock })),
  increment: vi.fn((n: number) => ({ __increment: n })),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));

import { useFirebaseWorkoutActions } from '@/hooks/useFirebaseWorkouts';
import { buildCanonicalState, CANONICAL_UID } from '@/test/canonical-states';
import type { WorkoutSession, BodyMeasurement } from '@/types';

type FirestoreRefToken = { __coll: string; __id: string };

const renderActions = (workouts: WorkoutSession[] = [], measurements: BodyMeasurement[] = []) =>
  renderHook(() => useFirebaseWorkoutActions(CANONICAL_UID, { workouts, measurements }));

const planCycleSetCalls = (): Array<[FirestoreRefToken, Record<string, unknown>]> =>
  (batchSetMock.mock.calls as Array<[FirestoreRefToken, Record<string, unknown>]>)
    .filter(([ref]) => ref.__coll === 'plan_cycles');

beforeEach(() => {
  batchSetMock.mockClear();
  batchCommitMock.mockClear();
  setDocMock.mockClear();
  updateDocMock.mockClear();
  runTransactionMock.mockReset();
  getDocsMock.mockReset().mockResolvedValue({ docs: [] });
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
    // Trening z backupu nadal zapisany (batch nie jest blokowany przez zły cykl).
    const workoutSets = (batchSetMock.mock.calls as Array<[FirestoreRefToken]>)
      .filter(([ref]) => ref.__coll === 'workouts');
    expect(workoutSets).toHaveLength(1);
  });

  // WP-6 (X33): eksport -> import zachowuje odpowiedzi z kreatora na cyklu.
  it('round-trip eksport/import: choice przechodzi przez sanitizer 1:1, cykl bez choice bez pola', async () => {
    const state = buildCanonicalState('history-multi-cycle');
    const withChoice = state.cycles.find((cycle) => cycle.choice !== undefined)!;
    const withoutChoice = state.cycles.find((cycle) => cycle.choice === undefined)!;
    const { result } = renderActions();

    const exported = JSON.parse(result.current.exportData({ planCycles: state.cycles })) as { planCycles: Array<{ id: string; choice?: unknown }> };
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
// był cicho cofany do starej tablicy serii. Fix: transakcja z precondycją
// rewizji, rozjazd = pomiń dokument.
describe('backfillHistoricalWorkouts — precondycja rewizji (bug 43)', () => {
  type TxUpdatePayload = Record<string, unknown>;

  const setupTransaction = (currentDoc: Record<string, unknown> | null) => {
    const txUpdate = vi.fn();
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

  it('rewizja zgodna ze snapshotem: naprawa dopisuje nazwy i podbija rewizję w transakcji', async () => {
    const { state, workout } = buildLegacyWorkout();
    const txUpdate = setupTransaction({ revision: 3 });
    const { result } = renderActions([workout]);

    let outcome: { updated: number; scanned: number } | undefined;
    await act(async () => {
      outcome = await result.current.backfillHistoricalWorkouts(state.cycles);
    });

    expect(outcome).toMatchObject({ updated: 1, scanned: 1 });
    expect(txUpdate).toHaveBeenCalledTimes(1);
    const [ref, payload] = txUpdate.mock.calls[0] as [FirestoreRefToken, TxUpdatePayload];
    expect(ref.__id).toBe(workout.id);
    expect((payload.exercises as Array<{ name?: string }>)[0].name).toBe('Przysiad ze sztangą');
    expect(payload.revision).toBe(4);
    // Naprawa nie idzie już gołym updateDoc poza transakcją.
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
    expect(txUpdate).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
