import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { WorkoutSession } from '@/types';

// Bug 16: scalanie/kasowanie cykli remapowało tylko sesje z PRZEKAZANEGO okna
// (limit listenera 500). Sesje starsze niż okno zostawały z cycleId na skasowany
// cykl => sekcja "Poza cyklami" na stałe, staty scalonego cyklu zaniżone.
// Fix: lista sesji do remapu + staty primary z serwerowych zapytań, nie z okna.

interface FakeDoc { id: string; data: () => Record<string, unknown> }
interface FakeQuery { col?: { collection?: string }; constraints?: Array<{ type?: string; field?: string }> }

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(async (..._args: unknown[]) => undefined),
  updateDoc: vi.fn(async (..._args: unknown[]) => undefined),
  deleteDoc: vi.fn(async (..._args: unknown[]) => undefined),
  // H1 (X31): listener cykli woła onSnapshot(q, { includeMetadataChanges }, next, err).
  onSnapshot: vi.fn(
    (_q: unknown, _opts: unknown, _next: (snap: { forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) => void }) => void) =>
      () => undefined,
  ),
  batchUpdates: [] as Array<[{ col: string; id: string }, Record<string, unknown>]>,
  batchDeletes: [] as Array<{ col: string; id: string }>,
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => undefined) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  documentId: vi.fn(() => '__name__'),
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  getDocsFromCache: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
  writeBatch: vi.fn(() => ({
    update: (ref: { col: string; id: string }, data: Record<string, unknown>) => {
      mocks.batchUpdates.push([ref, data]);
    },
    delete: (ref: { col: string; id: string }) => {
      mocks.batchDeletes.push(ref);
    },
    commit: vi.fn(async () => undefined),
  })),
  query: vi.fn((col: unknown, ...constraints: unknown[]) => ({ col, constraints })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn(() => ({ type: 'orderBy' })),
  limit: vi.fn((n: number) => ({ type: 'limit', n })),
  startAfter: vi.fn(() => ({ type: 'startAfter' })),
  onSnapshot: mocks.onSnapshot,
}));

import { usePlanCycles } from '@/hooks/usePlanCycles';

// Dwa zakończone cykle-kontynuacje tego samego szablonu (shouldMergeContinuousCycles:
// przerwa <= 14 dni, identyczny planTemplateHash). Kształt jak dokument produkcyjny.
const days = [{
  id: 'day-a',
  dayName: 'Dzień A',
  weekday: 'monday',
  focus: 'Push',
  exercises: [{ id: 'day-a-ex-1', name: 'Przysiad ze sztangą', sets: '3 x 5', instructions: [] }],
}];

const rawCycle = (startDate: string, endDate: string): Record<string, unknown> => ({
  userId: 'u1',
  days,
  durationWeeks: 4,
  startDate,
  endDate,
  status: 'completed',
  createdAt: `${startDate}T06:00:00.000Z`,
  stats: { totalWorkouts: 1, totalTonnage: 500, prs: [], completionRate: 50 },
});

const rawC1 = rawCycle('2026-01-05', '2026-02-01');
const rawC2 = rawCycle('2026-02-03', '2026-03-01');

const rawWorkoutDoc = (id: string, date: string): FakeDoc => ({
  id,
  data: () => ({
    userId: 'u1',
    dayId: 'day-a',
    date,
    cycleId: 'c2',
    completed: true,
    exercises: [{
      exerciseId: 'day-a-ex-1',
      name: 'Przysiad ze sztangą',
      sets: [{ reps: 5, weight: 100, completed: true }],
    }],
  }),
});

// Okno przekazane z Settings zawiera TYLKO nowszą sesję; starsza (w-old) jest
// poza limitem 500 i istnieje wyłącznie na serwerze.
const windowWorkout: WorkoutSession = {
  id: 'w-new',
  userId: 'u1',
  dayId: 'day-a',
  date: '2026-02-20',
  cycleId: 'c2',
  completed: true,
  exercises: [{
    exerciseId: 'day-a-ex-1',
    name: 'Przysiad ze sztangą',
    sets: [{ reps: 5, weight: 100, completed: true }],
  }],
};

const cyclesSnapshot = {
  forEach: (cb: (d: FakeDoc) => void) => {
    cb({ id: 'c1', data: () => rawC1 });
    cb({ id: 'c2', data: () => rawC2 });
  },
  // H1 (X31): listener czyta metadata.fromCache (snapshot z serwera).
  metadata: { fromCache: false, hasPendingWrites: false },
};

const routeGetDocs = () => {
  mocks.getDocs.mockImplementation(async (q: FakeQuery) => {
    const colName = q?.col?.collection;
    if (colName === 'plan_cycle_operations') return { docs: [], empty: true };
    if (colName === 'workouts') {
      const wheres = (q.constraints ?? []).filter((c) => c?.type === 'where');
      if (wheres.some((c) => c.field === 'cycleId')) {
        // Serwerowe zapytanie po cycleId: OBIE sesje (także spoza okna).
        return { docs: [rawWorkoutDoc('w-old', '2026-02-05'), rawWorkoutDoc('w-new', '2026-02-20')] };
      }
      // fetchWorkoutRange (zakres dat scalonego cyklu).
      return { docs: [rawWorkoutDoc('w-new', '2026-02-20'), rawWorkoutDoc('w-old', '2026-02-05')] };
    }
    throw new Error(`Nieoczekiwane getDocs: ${JSON.stringify(q)}`);
  });
};

beforeEach(() => {
  mocks.getDoc.mockReset();
  mocks.getDocs.mockReset();
  mocks.setDoc.mockClear();
  mocks.updateDoc.mockClear();
  mocks.deleteDoc.mockClear();
  mocks.batchUpdates.length = 0;
  mocks.batchDeletes.length = 0;
  mocks.onSnapshot.mockImplementation((_q: unknown, _opts: unknown, next: (snap: typeof cyclesSnapshot) => void) => {
    next(cyclesSnapshot);
    return () => undefined;
  });
  routeGetDocs();
  mocks.getDoc.mockResolvedValue({ exists: () => true, id: 'c1', data: () => rawC1 });
});

describe('bug 16 — mergeContinuousCycles poza oknem 500', () => {
  it('remapuje TAKŻE sesje spoza przekazanego okna i liczy staty z pełnego zakresu', async () => {
    const { result } = renderHook(() => usePlanCycles('u1'));

    const removed = await result.current.mergeContinuousCycles([windowWorkout]);

    expect(removed).toBe(1);

    // Operacja obejmuje obie sesje (serwer), nie tylko okno.
    const operation = mocks.setDoc.mock.calls[0][1] as { workoutIds: string[] };
    expect([...operation.workoutIds].sort()).toEqual(['w-new', 'w-old']);

    // Obie sesje przemapowane na primary.
    const remaps = mocks.batchUpdates.filter(([, data]) => data.cycleId === 'c1');
    expect(remaps.map(([ref]) => ref.id).sort()).toEqual(['w-new', 'w-old']);

    // Staty primary z pełnego zakresu: 2 sesje, 1000 kg (nie 1 sesja z okna).
    const primaryUpdate = mocks.updateDoc.mock.calls.find(
      ([ref]) => (ref as { col: string; id: string }).col === 'plan_cycles'
        && (ref as { col: string; id: string }).id === 'c1',
    );
    expect(primaryUpdate).toBeDefined();
    const payload = primaryUpdate![1] as { endDate: string; stats: { totalWorkouts: number; totalTonnage: number } };
    expect(payload.endDate).toBe('2026-03-01');
    expect(payload.stats.totalWorkouts).toBe(2);
    expect(payload.stats.totalTonnage).toBe(1000);

    // Cykl rest skasowany, operacja domknięta.
    expect(mocks.batchDeletes).toEqual([{ col: 'plan_cycles', id: 'c2' }]);
    expect(mocks.deleteDoc).toHaveBeenCalledWith({ col: 'plan_cycle_operations', id: 'merge-c1' });
  });

  it('NIEZMIENNIK starego przepływu: okno pokrywające całość scala jak dotąd', async () => {
    const windowOld: WorkoutSession = { ...windowWorkout, id: 'w-old', date: '2026-02-05' };
    const { result } = renderHook(() => usePlanCycles('u1'));

    const removed = await result.current.mergeContinuousCycles([windowWorkout, windowOld]);

    expect(removed).toBe(1);
    const remaps = mocks.batchUpdates.filter(([, data]) => data.cycleId === 'c1');
    expect(remaps.map(([ref]) => ref.id).sort()).toEqual(['w-new', 'w-old']);
    expect(mocks.batchDeletes).toEqual([{ col: 'plan_cycles', id: 'c2' }]);
  });
});

describe('bug 16 — deleteCycle poza oknem 500', () => {
  it('odtagowuje z serwera wszystkie sesje cyklu, nie tylko z okna', async () => {
    const { result } = renderHook(() => usePlanCycles('u1'));

    const ok = await result.current.deleteCycle('c2', [windowWorkout]);

    expect(ok).toBe(true);
    const untags = mocks.batchUpdates.filter(([, data]) => data.cycleId === null);
    expect(untags.map(([ref]) => ref.id).sort()).toEqual(['w-new', 'w-old']);
    expect(mocks.deleteDoc).toHaveBeenCalledWith({ col: 'plan_cycles', id: 'c2' });
  });
});
