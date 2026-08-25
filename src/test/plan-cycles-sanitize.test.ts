import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { WorkoutSession } from '@/types';

// Bug 15: fallbacki getDoc/getDocs omijały sanitizePlanCycleDoc — surowy dokument
// plan_cycles (np. legacy sprzed P0-guardu albo z importu backupu) trafiał do
// renderu (closeout NewPlan: TypeError na stats/days) albo do dopasowania
// backfillu. Listener sanityzuje każdy dokument i raportuje invalid-doc —
// fallbacki muszą zachowywać się identycznie.

const getDocMock = vi.hoisted(() => vi.fn());
const getDocsMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => undefined));
const runTransactionMock = vi.hoisted(() => vi.fn());
const reportClientErrorMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: reportClientErrorMock }));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  documentId: vi.fn(() => '__name__'),
  getDoc: getDocMock,
  getDocFromServer: vi.fn(),
  getDocs: getDocsMock,
  getDocsFromCache: vi.fn(),
  runTransaction: runTransactionMock,
  setDoc: vi.fn(),
  updateDoc: updateDocMock,
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn((n: number) => ({ increment: n })),
  query: vi.fn((col: unknown, ...constraints: unknown[]) => ({ col, constraints })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn(() => ({ type: 'orderBy' })),
  limit: vi.fn(() => ({ type: 'limit' })),
  startAfter: vi.fn(() => ({ type: 'startAfter' })),
  onSnapshot: vi.fn(() => () => undefined),
}));

import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useFirebaseWorkoutActions } from '@/hooks/useFirebaseWorkouts';

const brokenCycleData = {
  // Brak days (sanitizeTrainingPlanDays => null) — sanitizer odrzuca dokument.
  userId: 'u1',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  status: 'active',
};

const validCycleData = {
  userId: 'u1',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  status: 'completed',
  days: [],
};

beforeEach(() => {
  getDocMock.mockReset();
  getDocsMock.mockReset();
  updateDocMock.mockClear();
  reportClientErrorMock.mockClear();
});

describe('bug 15 — getCycleById fallback przez sanitizePlanCycleDoc', () => {
  it('uszkodzony dokument => null + telemetria invalid-doc (jak listener)', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: 'c-broken',
      data: () => brokenCycleData,
    });
    const { result } = renderHook(() => usePlanCycles('u1'));

    const cycle = await result.current.getCycleById('c-broken');

    expect(cycle).toBeNull();
    expect(reportClientErrorMock).toHaveBeenCalledWith('u1', {
      code: 'invalid-doc',
      phase: 'other',
      detail: 'plan_cycles/c-broken',
    });
  });

  it('poprawny dokument => zsanityzowany cykl z domyślnymi polami', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: 'c-valid',
      data: () => validCycleData,
    });
    const { result } = renderHook(() => usePlanCycles('u1'));

    const cycle = await result.current.getCycleById('c-valid');

    expect(cycle).not.toBeNull();
    expect(cycle!.id).toBe('c-valid');
    expect(cycle!.stats).toEqual({ totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 });
    expect(cycle!.days).toEqual([]);
    expect(reportClientErrorMock).not.toHaveBeenCalled();
  });
});

describe('bug 15 — backfillHistoricalWorkouts: fallback getDocs odfiltrowuje uszkodzone cykle', () => {
  it('workout bez cycleId dostaje id POPRAWNEGO cyklu, nie surowego śmiecia', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { id: 'c-broken', data: () => brokenCycleData },
        { id: 'c-valid', data: () => validCycleData },
      ],
    });
    const orphan: WorkoutSession = {
      id: 'w1',
      userId: 'u1',
      dayId: 'day-1',
      date: '2026-06-10',
      completed: true,
      dayName: 'Dzień A',
      dayFocus: 'Push',
      exercises: [{
        exerciseId: 'ex-1',
        name: 'Przysiad',
        sets: [{ reps: 5, weight: 100, completed: true }],
      }],
    };
    // Bug 43 (X30): backfill pisze w transakcji z precondycją rewizji — mock
    // odwzorowuje dokument o tej samej rewizji co snapshot klienta (0).
    const txUpdate = vi.fn();
    runTransactionMock.mockImplementation(async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async () => ({ exists: () => true, data: () => ({ ...orphan, revision: 0 }) }),
        update: txUpdate,
      }));
    const { result } = renderHook(() =>
      useFirebaseWorkoutActions('u1', { workouts: [orphan], measurements: [] }));

    const outcome = await result.current.backfillHistoricalWorkouts([]);

    expect(outcome.error).toBeUndefined();
    expect(outcome.updated).toBe(1);
    expect(updateDocMock).not.toHaveBeenCalled();
    expect(txUpdate).toHaveBeenCalledTimes(1);
    const [ref, update] = txUpdate.mock.calls[0] as [
      { col: string; id: string },
      { cycleId?: string },
    ];
    expect(ref).toEqual({ col: 'workouts', id: 'w1' });
    expect(update.cycleId).toBe('c-valid');
  });
});
