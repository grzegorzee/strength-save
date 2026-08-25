import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { TrainingDay } from '@/data/trainingPlan';

// H1 (X31, incydent 2026-08-24 na realnym koncie): auto-end planu odpalil na
// ZBUFOROWANYM snapshocie (persistentLocalCache) starego planu 06-01 i wpisal
// status 'ended' do dokumentu, ktory na serwerze byl juz nowym planem 09-07.
// Test SEKWENCJI (nie pojedynczego ekranu): replan na przyszly poniedzialek ->
// stary cykl wygasa -> klient ze starym cache -> snapshot z cache -> snapshot
// z serwera. Niezmienniki: (1) automatyczna mutacja nie rusza na danych z cache,
// (2) 'ended' zapisuje sie TYLKO gdy dokument planu wciaz ma startDate konczonego
// planu, (3) zwykly koniec planu online z aktualnym dokumentem dziala jak dotad.

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
import { endPlan, shouldAutoEndPlan } from '@/lib/cycle-actions';

const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const UID = 'u1';
const OLD_START = '2026-06-01';
const NEW_START = '2026-09-07';

const makeDays = (start: string, focus: string): TrainingDay[] => [{
  id: `${start}-d1`,
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus,
  exercises: [{ id: `${start}-d1-ex-1`, name: 'Przysiad', sets: '3 x 5', instructions: [] }],
}];
const oldDays = makeDays(OLD_START, 'Stary plan');
const newDays = makeDays(NEW_START, 'FBW');

const planDoc = (startDate: string, days: TrainingDay[]): DocData => ({
  days, durationWeeks: 12, startDate, status: 'active', revision: 3, name: 'Plan',
});
const activeCycleDoc = (startDate: string, days: TrainingDay[]): DocData => ({
  userId: UID, days, durationWeeks: 12, startDate, endDate: '', status: 'active',
  createdAt: `${startDate}T06:00:00.000Z`,
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
});

const emitPlanSnapshot = (data: DocData | null, fromCache: boolean) => {
  fake.listeners
    .filter((entry) => entry.target.col === 'training_plans' && entry.target.id === UID)
    .forEach((entry) => entry.next({
      exists: () => data !== null,
      data: () => data ?? undefined,
      metadata: { fromCache, hasPendingWrites: false },
    }));
};

const emitCyclesSnapshot = (docs: Array<{ id: string; data: DocData }>, fromCache: boolean) => {
  // Listener produkcyjny: orderBy startDate desc.
  const sorted = [...docs].sort((a, b) => String(b.data.startDate).localeCompare(String(a.data.startDate)));
  fake.listeners
    .filter((entry) => entry.target.collection === 'plan_cycles')
    .forEach((entry) => entry.next({
      forEach: (cb: (d: { id: string; data: () => DocData }) => void) => sorted.forEach((d) => cb({ id: d.id, data: () => d.data })),
      metadata: { fromCache, hasPendingWrites: false },
    }));
};

const storeCycles = () => [...fake.store.entries()]
  .filter(([k]) => k.startsWith('plan_cycles/'))
  .map(([k, data]) => ({ id: k.slice('plan_cycles/'.length), data }));

const renderHooks = () => {
  const plan = renderHook(() => useTrainingPlan(UID), { wrapper });
  const cycles = renderHook(() => usePlanCycles(UID));
  return { plan, cycles };
};

const gate = (plan: ReturnType<typeof useTrainingPlan>, cycles: ReturnType<typeof usePlanCycles>) => shouldAutoEndPlan({
  planLoaded: plan.isLoaded,
  cyclesLoaded: cycles.isLoaded,
  planFromServer: plan.hasServerSnapshot,
  cyclesFromServer: cycles.hasServerSnapshot,
  planStatus: plan.planStatus,
  isPlanExpired: plan.isPlanExpired,
  hasActiveCycle: cycles.getActiveCycle() !== null,
  hasBlockingDraft: false,
});

beforeEach(() => {
  fake.store.clear();
  fake.listeners.length = 0;
  // 2026-08-24: plan 06-01 x 12 tyg. wygasl (tydzien 13), plan 09-07 jeszcze nie ruszyl.
  vi.setSystemTime(new Date(2026, 7, 24, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('H1: cykl zycia planu na stale cache (sekwencja replan -> wygasniecie -> stary klient)', () => {
  // Stan SERWERA po replanie z 08-21 (jak na koncie usera): plan 09-07 aktywny,
  // cykl 09-07 aktywny, stary cykl otL65 (06-01) wciaz aktywny.
  const seedServerAfterReplan = () => {
    fake.store.set(`training_plans/${UID}`, planDoc(NEW_START, newDays));
    fake.store.set(`plan_cycles/cycle-${UID}-${NEW_START}`, activeCycleDoc(NEW_START, newDays));
    fake.store.set('plan_cycles/otL65', activeCycleDoc(OLD_START, oldDays));
  };

  it('snapshot z cache (stary plan 06-01) NIE spelnia bramki auto-endu; po serwerze plan 09-07 nie jest wygasly', () => {
    seedServerAfterReplan();
    const { plan, cycles } = renderHooks();

    // Klient nieotwierany od przed replanem: IndexedDB ma stary dokument.
    act(() => {
      emitPlanSnapshot(planDoc(OLD_START, oldDays), true);
      emitCyclesSnapshot([{ id: 'otL65', data: activeCycleDoc(OLD_START, oldDays) }], true);
    });

    expect(plan.result.current.isLoaded).toBe(true);
    expect(plan.result.current.planStartDate).toBe(OLD_START);
    expect(plan.result.current.isPlanExpired).toBe(true);
    expect(cycles.result.current.getActiveCycle()?.id).toBe('otL65');
    // Dane z cache: flaga serwera false => auto-end NIE rusza.
    expect(plan.result.current.hasServerSnapshot).toBe(false);
    expect(cycles.result.current.hasServerSnapshot).toBe(false);
    expect(gate(plan.result.current, cycles.result.current)).toBe(false);

    // Dochodza dane z serwera: plan 09-07 (start w przyszlosci, tydzien 0).
    act(() => {
      emitPlanSnapshot(fake.store.get(`training_plans/${UID}`)!, false);
      emitCyclesSnapshot(storeCycles(), false);
    });

    expect(plan.result.current.hasServerSnapshot).toBe(true);
    expect(cycles.result.current.hasServerSnapshot).toBe(true);
    expect(plan.result.current.planStartDate).toBe(NEW_START);
    expect(plan.result.current.isPlanExpired).toBe(false);
    expect(gate(plan.result.current, cycles.result.current)).toBe(false);
    expect(fake.store.get(`training_plans/${UID}`)?.status).toBe('active');
    expect(fake.store.get(`plan_cycles/cycle-${UID}-${NEW_START}`)?.status).toBe('active');
  });

  it('endPlan dla 06-01 przy dokumencie 09-07 na serwerze: status NIE zmieniony, event NIE wyemitowany, nowy cykl nietkniety', async () => {
    seedServerAfterReplan();
    const { plan, cycles } = renderHooks();
    act(() => {
      emitPlanSnapshot(fake.store.get(`training_plans/${UID}`)!, false);
      emitCyclesSnapshot(storeCycles(), false);
    });
    const emitPlanEvent = vi.fn();

    // Symulacja biegu, ktory wystartowal na stale danych (planStartDate 06-01).
    let result: Awaited<ReturnType<typeof endPlan>> | undefined;
    await act(async () => {
      result = await endPlan({ chooseNew: false }, {
        uid: UID,
        currentPlan: oldDays,
        planStartDate: OLD_START,
        planDurationWeeks: 12,
        workouts: [],
        archiveCurrentPlan: cycles.result.current.archiveCurrentPlan,
        backfillHistoricalWorkouts: vi.fn(async () => undefined),
        setPlanStatus: plan.result.current.setPlanStatus,
        emitPlanEvent,
      });
    });

    expect(result?.success).toBe(false);
    expect(result?.reason).toBe('stale');
    expect(emitPlanEvent).not.toHaveBeenCalled();
    const planAfter = fake.store.get(`training_plans/${UID}`)!;
    expect(planAfter.status).toBe('active');
    expect(planAfter.startDate).toBe(NEW_START);
    // Lokalny stan tez nie udaje 'ended' (PlanNextStepCard nie ma prawa
    // wyemitowac drugiego eventu 'ended' dla 09-07, jak w incydencie).
    expect(plan.result.current.planStatus).toBe('active');
    // Archiwizacja starego cyklu 06-01 byla poprawna; cykl 09-07 zostaje aktywny.
    expect(fake.store.get('plan_cycles/otL65')?.status).toBe('completed');
    expect(fake.store.get(`plan_cycles/cycle-${UID}-${NEW_START}`)?.status).toBe('active');
  });

  it('NIEZMIENNIK: koniec planu online z aktualnym dokumentem dziala jak dotad (status ended + event)', async () => {
    fake.store.set(`training_plans/${UID}`, planDoc(OLD_START, oldDays));
    fake.store.set('plan_cycles/otL65', activeCycleDoc(OLD_START, oldDays));
    const { plan, cycles } = renderHooks();
    act(() => {
      emitPlanSnapshot(fake.store.get(`training_plans/${UID}`)!, false);
      emitCyclesSnapshot(storeCycles(), false);
    });
    expect(gate(plan.result.current, cycles.result.current)).toBe(true);
    const emitPlanEvent = vi.fn();

    let result: Awaited<ReturnType<typeof endPlan>> | undefined;
    await act(async () => {
      result = await endPlan({ chooseNew: false }, {
        uid: UID,
        currentPlan: oldDays,
        planStartDate: OLD_START,
        planDurationWeeks: 12,
        workouts: [],
        archiveCurrentPlan: cycles.result.current.archiveCurrentPlan,
        backfillHistoricalWorkouts: vi.fn(async () => undefined),
        setPlanStatus: plan.result.current.setPlanStatus,
        emitPlanEvent,
      });
    });

    expect(result?.success).toBe(true);
    expect(result?.archivedCycleId).toBe('otL65');
    expect(fake.store.get(`training_plans/${UID}`)?.status).toBe('ended');
    expect(fake.store.get('plan_cycles/otL65')?.status).toBe('completed');
    expect(plan.result.current.planStatus).toBe('ended');
    expect(emitPlanEvent).toHaveBeenCalledWith('ended', { days: 1, weeks: 12, startDate: OLD_START });
  });

  it('NIEZMIENNIK: plan juz zakonczony (status ended na serwerze) nie dostaje drugiego zapisu ani eventu', async () => {
    fake.store.set(`training_plans/${UID}`, { ...planDoc(OLD_START, oldDays), status: 'ended' });
    fake.store.set('plan_cycles/otL65', { ...activeCycleDoc(OLD_START, oldDays), status: 'completed', endDate: '2026-08-23' });
    const { plan, cycles } = renderHooks();
    act(() => {
      emitPlanSnapshot(fake.store.get(`training_plans/${UID}`)!, false);
      emitCyclesSnapshot(storeCycles(), false);
    });
    expect(plan.result.current.planStatus).toBe('ended');
    expect(gate(plan.result.current, cycles.result.current)).toBe(false);

    let outcome: { success: boolean; reason?: 'stale' } | undefined;
    await act(async () => {
      outcome = await plan.result.current.setPlanStatus('ended', { expectedStartDate: OLD_START });
    });
    expect(outcome).toEqual({ success: false, reason: 'stale' });
  });
});
