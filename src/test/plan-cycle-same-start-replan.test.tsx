import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { TrainingDay } from '@/data/trainingPlan';

// H1 bug B (X31, incydent 2026-08-25): ponowny wybor planu z TA SAMA data startu
// (09-07). createActiveCycle uzywal deterministycznego id `cycle-{uid}-{startDate}`,
// ktore bylo juz zajete przez poprzedni (zamkniety) cykl 09-07 -> transakcja no-op
// -> "sukces" bez aktywnego cyklu -> archiveCurrentPlan zamknal ten sam cykl z
// endDate 08-25 < startDate 09-07 (durationWeeks 1). Wynik: plan active, ZERO
// aktywnych cykli, stan nie do naprawienia z apki.
// Testy SEKWENCJI na realnych hookach z falszywym Firestore (in-memory).

type DocData = Record<string, unknown>;
interface Ref { col: string; id: string }

const fake = vi.hoisted(() => {
  const store = new Map<string, DocData>();
  const key = (ref: Ref) => `${ref.col}/${ref.id}`;
  const listeners: Array<{ target: { col?: string; id?: string; collection?: string }; next: (snap: unknown) => void }> = [];
  const docSnap = (ref: Ref) => {
    const data = store.get(key(ref));
    return { id: ref.id, exists: () => data !== undefined, data: () => data };
  };
  const write = (ref: Ref, data: DocData, merge: boolean) => {
    const current = store.get(key(ref));
    store.set(key(ref), merge && current ? { ...current, ...data } : { ...data });
  };
  return { store, key, listeners, docSnap, write };
});

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => undefined) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  query: vi.fn((col: { collection: string }, ...constraints: unknown[]) => ({ collection: col.collection, constraints })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn(() => ({ type: 'orderBy' })),
  limit: vi.fn(() => ({ type: 'limit' })),
  deleteField: vi.fn(),
  getDoc: vi.fn(async (ref: Ref) => fake.docSnap(ref)),
  getDocs: vi.fn(async () => ({ docs: [], empty: true, forEach: () => undefined })),
  setDoc: vi.fn(async (ref: Ref, data: DocData, opts?: { merge?: boolean }) => fake.write(ref, data, opts?.merge === true)),
  updateDoc: vi.fn(async (ref: Ref, data: DocData) => fake.write(ref, data, true)),
  deleteDoc: vi.fn(async (ref: Ref) => { fake.store.delete(fake.key(ref)); }),
  writeBatch: vi.fn(() => ({ update: () => undefined, delete: () => undefined, commit: async () => undefined })),
  runTransaction: vi.fn(async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => fn({
    get: async (ref: Ref) => fake.docSnap(ref),
    set: (ref: Ref, data: DocData, opts?: { merge?: boolean }) => fake.write(ref, data, opts?.merge === true),
    update: (ref: Ref, data: DocData) => fake.write(ref, data, true),
  })),
  onSnapshot: vi.fn((target: { col?: string; id?: string; collection?: string }, ...rest: unknown[]) => {
    const next = (typeof rest[0] === 'function' ? rest[0] : rest[1]) as (snap: unknown) => void;
    const entry = { target, next };
    fake.listeners.push(entry);
    return () => {
      const index = fake.listeners.indexOf(entry);
      if (index >= 0) fake.listeners.splice(index, 1);
    };
  }),
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { startCycleWithPlan } from '@/lib/cycle-actions';

const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const UID = 'u1';
const START = '2026-09-07';
const BASE_ID = `cycle-${UID}-${START}`;

const makeDays = (focus: string, exercise: string): TrainingDay[] => [{
  id: `${START}-d1`,
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus,
  exercises: [{ id: `${START}-d1-ex-1`, name: exercise, sets: '3 x 5', instructions: [] }],
}];
const oldDays = makeDays('FBW stary', 'Przysiad');
const newDays = makeDays('FBW nowy', 'Martwy ciąg');

const cycleDoc = (days: TrainingDay[], overrides: DocData = {}): DocData => ({
  userId: UID, days, durationWeeks: 12, startDate: START, endDate: '', status: 'active',
  createdAt: `${START}T06:00:00.000Z`,
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  ...overrides,
});

const emitPlanSnapshot = () => {
  const data = fake.store.get(`training_plans/${UID}`) ?? null;
  fake.listeners
    .filter((entry) => entry.target.col === 'training_plans' && entry.target.id === UID)
    .forEach((entry) => entry.next({
      exists: () => data !== null,
      data: () => data ?? undefined,
      metadata: { fromCache: false, hasPendingWrites: false },
    }));
};

const emitCyclesSnapshot = () => {
  const docs = [...fake.store.entries()]
    .filter(([k]) => k.startsWith('plan_cycles/'))
    .map(([k, data]) => ({ id: k.slice('plan_cycles/'.length), data }))
    .sort((a, b) => String(b.data.startDate).localeCompare(String(a.data.startDate)));
  fake.listeners
    .filter((entry) => entry.target.collection === 'plan_cycles')
    .forEach((entry) => entry.next({
      forEach: (cb: (d: { id: string; data: () => DocData }) => void) => docs.forEach((d) => cb({ id: d.id, data: () => d.data })),
      metadata: { fromCache: false, hasPendingWrites: false },
    }));
};

const storeCycles = (): Array<DocData & { id: string }> => [...fake.store.entries()]
  .filter(([k]) => k.startsWith('plan_cycles/'))
  .map(([k, data]) => ({ ...data, id: k.slice('plan_cycles/'.length) }));

beforeEach(() => {
  fake.store.clear();
  fake.listeners.length = 0;
  // Dzis 2026-08-25 (wtorek); 09-07 = poniedzialek za 2 tygodnie (wazny start).
  vi.setSystemTime(new Date(2026, 7, 25, 10, 30));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('H1 bug B: createActiveCycle przy zajetym deterministycznym id', () => {
  it('id zajete przez cykl COMPLETED -> powstaje NOWY aktywny dokument, stary nietkniety', async () => {
    const completed = cycleDoc(oldDays, { status: 'completed', endDate: '2026-08-25', durationWeeks: 1 });
    fake.store.set(`plan_cycles/${BASE_ID}`, completed);
    const { result } = renderHook(() => usePlanCycles(UID));
    act(() => emitCyclesSnapshot());

    const id = await result.current.createActiveCycle(newDays, 12, START);

    expect(id).not.toBeNull();
    expect(id).not.toBe(BASE_ID);
    expect(id!.startsWith(BASE_ID)).toBe(true);
    expect(fake.store.get(`plan_cycles/${BASE_ID}`)).toEqual(completed);
    const created = fake.store.get(`plan_cycles/${id}`)!;
    expect(created.status).toBe('active');
    expect(created.endDate).toBe('');
    expect(created.durationWeeks).toBe(12);
    expect(created.days).toEqual(newDays);
    expect(storeCycles().filter((c) => c.status === 'active')).toHaveLength(1);
  });

  it('NIEZMIENNIK (retry po zgubionej odpowiedzi): id zajete przez ACTIVE ten sam plan -> reuse, zero duplikatu', async () => {
    fake.store.set(`plan_cycles/${BASE_ID}`, cycleDoc(newDays));
    const { result } = renderHook(() => usePlanCycles(UID));

    const id = await result.current.createActiveCycle(newDays, 12, START);

    expect(id).toBe(BASE_ID);
    expect(storeCycles()).toHaveLength(1);
  });

  it('id zajete przez ACTIVE z INNYM planem -> nowy dokument (stary czeka na archiwizacje)', async () => {
    fake.store.set(`plan_cycles/${BASE_ID}`, cycleDoc(oldDays));
    const { result } = renderHook(() => usePlanCycles(UID));

    const id = await result.current.createActiveCycle(newDays, 12, START);

    expect(id).not.toBe(BASE_ID);
    expect(fake.store.get(`plan_cycles/${BASE_ID}`)?.days).toEqual(oldDays);
    expect(fake.store.get(`plan_cycles/${id}`)?.days).toEqual(newDays);
  });

  it('NIEZMIENNIK (onboarding od zera): brak dokumentu -> deterministyczne id jak dotad', async () => {
    const { result } = renderHook(() => usePlanCycles(UID));

    const id = await result.current.createActiveCycle(newDays, 12, START);

    expect(id).toBe(BASE_ID);
    expect(fake.store.get(`plan_cycles/${BASE_ID}`)?.status).toBe('active');
  });
});

describe('H1 bug B: sekwencja replan z TA SAMA data startu (startCycleWithPlan na realnych hookach)', () => {
  const runReplan = async (
    plan: ReturnType<typeof useTrainingPlan>,
    cycles: ReturnType<typeof usePlanCycles>,
    planStatus: 'active' | 'ended',
  ) => {
    let result: { success: boolean; error?: string } | undefined;
    await act(async () => {
      result = await startCycleWithPlan(newDays, 12, {
        uid: UID,
        currentPlan: plan.plan,
        planStartDate: plan.planStartDate,
        planDurationWeeks: plan.planDurationWeeks,
        planStatus,
        workouts: [],
        startDate: START,
        startDateISO: START,
        archiveCurrentPlan: cycles.archiveCurrentPlan,
        savePlan: plan.savePlan,
        createActiveCycle: cycles.createActiveCycle,
        backfillHistoricalWorkouts: vi.fn(async () => undefined),
      });
    });
    return result!;
  };

  it('plan 09-07 active + cykl 09-07 active -> po replanie DOKLADNIE jeden aktywny cykl (nowy), stary completed bez endDate < startDate', async () => {
    fake.store.set(`training_plans/${UID}`, { days: oldDays, durationWeeks: 12, startDate: START, status: 'active', revision: 3 });
    fake.store.set(`plan_cycles/${BASE_ID}`, cycleDoc(oldDays));
    const plan = renderHook(() => useTrainingPlan(UID), { wrapper });
    const cycles = renderHook(() => usePlanCycles(UID));
    act(() => { emitPlanSnapshot(); emitCyclesSnapshot(); });

    const result = await runReplan(plan.result.current, cycles.result.current, 'active');

    expect(result.success).toBe(true);
    const active = storeCycles().filter((c) => c.status === 'active');
    expect(active).toHaveLength(1);
    expect(active[0].id).not.toBe(BASE_ID);
    expect(active[0].days).toEqual(newDays);
    expect(active[0].durationWeeks).toBe(12);
    // Stary cykl nigdy nie ruszyl: zamkniety, ale bez absurdalnego zakresu.
    const old = fake.store.get(`plan_cycles/${BASE_ID}`)!;
    expect(old.status).toBe('completed');
    expect(String(old.endDate) >= START).toBe(true);
    expect(old.endDate).toBe(START);
    expect(old.durationWeeks).toBe(1);
    // Plan: aktywny, ta sama data startu, nowe dni.
    const planDoc = fake.store.get(`training_plans/${UID}`)!;
    expect(planDoc.status).toBe('active');
    expect(planDoc.startDate).toBe(START);
    expect((planDoc.days as TrainingDay[]).map((d) => d.focus)).toEqual(['FBW nowy']);
  });

  it('stan konta usera (plan ended 09-07, cykl 09-07 completed) -> nowy plan 09-07 daje jeden aktywny cykl, stary nietkniety', async () => {
    fake.store.set(`training_plans/${UID}`, { days: oldDays, durationWeeks: 12, startDate: START, status: 'ended', revision: 5 });
    const completed = cycleDoc(oldDays, { status: 'completed', endDate: '2026-08-25', durationWeeks: 1 });
    fake.store.set(`plan_cycles/${BASE_ID}`, completed);
    const plan = renderHook(() => useTrainingPlan(UID), { wrapper });
    const cycles = renderHook(() => usePlanCycles(UID));
    act(() => { emitPlanSnapshot(); emitCyclesSnapshot(); });

    const result = await runReplan(plan.result.current, cycles.result.current, 'ended');

    expect(result.success).toBe(true);
    const active = storeCycles().filter((c) => c.status === 'active');
    expect(active).toHaveLength(1);
    expect(active[0].id).not.toBe(BASE_ID);
    expect(active[0].days).toEqual(newDays);
    expect(fake.store.get(`plan_cycles/${BASE_ID}`)).toEqual(completed);
    expect(fake.store.get(`training_plans/${UID}`)?.status).toBe('active');
  });

  it('NIEZMIENNIK (replan z INNA data startu): stary cykl archiwizowany z realnym endDate, nowy aktywny', async () => {
    const OLD_START = '2026-06-01';
    const oldStarted = makeDays('Stary', 'Przysiad').map((d) => ({ ...d, id: `${OLD_START}-d1` }));
    fake.store.set(`training_plans/${UID}`, { days: oldStarted, durationWeeks: 12, startDate: OLD_START, status: 'active', revision: 1 });
    fake.store.set(`plan_cycles/cycle-${UID}-${OLD_START}`, cycleDoc(oldStarted, { startDate: OLD_START }));
    const plan = renderHook(() => useTrainingPlan(UID), { wrapper });
    const cycles = renderHook(() => usePlanCycles(UID));
    act(() => { emitPlanSnapshot(); emitCyclesSnapshot(); });

    const result = await runReplan(plan.result.current, cycles.result.current, 'active');

    expect(result.success).toBe(true);
    const old = fake.store.get(`plan_cycles/cycle-${UID}-${OLD_START}`)!;
    expect(old.status).toBe('completed');
    expect(old.endDate).toBe('2026-08-25');
    expect(old.durationWeeks).toBe(12);
    const active = storeCycles().filter((c) => c.status === 'active');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(BASE_ID);
    expect(fake.store.get(`training_plans/${UID}`)?.startDate).toBe(START);
  });
});
