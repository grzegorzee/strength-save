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
    'createdAt', 'stats', 'technical', 'hiddenFromInsights',
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
});
