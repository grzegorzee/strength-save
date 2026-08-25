import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';

// WP-6 (X33): odpowiedzi z kreatora zapisane NA cyklu. Test SEKWENCJI na realnych
// hookach z falszywym Firestore (in-memory), nie pojedynczego ekranu:
// (a) onboarding (completeOnboardingPlan, entry onboarding) -> koniec planu
//     (endPlan) -> replan (startCycleWithPlan, entry replan) => DWA dokumenty
//     plan_cycles, kazdy z WLASNYM choice (rozne chosenAt/entry),
//     users.onboardingAnswers nietkniete, training_plans = drugi plan;
// (c) replan z TA SAMA data startu (X31) nadal daje dokladnie jeden aktywny
//     cykl, nowy ma choice, stary (zamkniety) zachowuje swoje.
// Harness wg plan-cycle-same-start-replan.test.tsx.

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

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { completeOnboardingPlan, endPlan, startCycleWithPlan } from '@/lib/cycle-actions';
import { buildOnboardingAnswers } from '@/lib/onboarding-answers';
import { buildPlanCycleChoice } from '@/lib/plan-cycle-choice';
import type { PlanCycleChoice } from '@/types/cycles';

const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const UID = 'u1';
const FIRST_START = '2026-08-31';
const SECOND_START = '2026-10-12';

const makeDays = (focus: string, exercise: string, weekdays: Array<TrainingDay['weekday']>): TrainingDay[] =>
  weekdays.map((weekday, index) => ({
    id: `draft-d${index + 1}`,
    dayName: `Dzień ${index + 1}`,
    weekday,
    focus,
    exercises: [{ id: `draft-d${index + 1}-ex-1`, name: exercise, sets: '3 x 5', instructions: [] }],
  }));

// Odpowiedzi z kreatora: pierwszy onboarding (3 dni, masa) i replan (2 dni, redukcja).
const wizardFirst = {
  days: makeDays('FBW masa', 'Przysiad', ['monday', 'wednesday', 'friday']),
  durationWeeks: 4,
  startDate: FIRST_START,
  level: 'beginner' as const,
  objective: 'build_muscle' as const,
  daysPerWeek: 3,
  trainingDays: ['monday', 'wednesday', 'friday'] as Weekday[],
  planSource: 'recommended' as const,
  templateId: 'tpl-fullbody-3',
  recommendedTemplateId: 'tpl-fullbody-3',
  planName: 'Plan startowy',
};
const wizardSecond = {
  days: makeDays('Góra/dół redukcja', 'Martwy ciąg', ['tuesday', 'thursday']),
  durationWeeks: 8,
  startDate: SECOND_START,
  level: 'intermediate' as const,
  objective: 'fat_loss' as const,
  daysPerWeek: 2,
  trainingDays: ['tuesday', 'thursday'] as Weekday[],
  planSource: 'browsed' as const,
  templateId: 'tpl-upper-lower-2',
  recommendedTemplateId: 'tpl-fullbody-2',
  planName: 'Plan drugi',
};

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

const syncSnapshots = () => act(() => { emitPlanSnapshot(); emitCyclesSnapshot(); });

const storeCycles = (): Array<DocData & { id: string }> => [...fake.store.entries()]
  .filter(([k]) => k.startsWith('plan_cycles/'))
  .map(([k, data]) => ({ ...data, id: k.slice('plan_cycles/'.length) }));

const renderHooks = () => ({
  plan: renderHook(() => useTrainingPlan(UID), { wrapper }),
  cycles: renderHook(() => usePlanCycles(UID)),
});

beforeEach(() => {
  fake.store.clear();
  fake.listeners.length = 0;
  vi.setSystemTime(new Date(2026, 7, 25, 10, 30));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WP-6 (X33): sekwencja onboarding -> koniec planu -> replan (realne hooki, fake Firestore)', () => {
  it('dwa cykle, kazdy z WLASNYM choice; onboardingAnswers nietkniete; training_plans = drugi plan', async () => {
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false });
    const { plan, cycles } = renderHooks();
    syncSnapshots();
    expect(plan.result.current.isLoaded).toBe(true);

    // 1) Onboarding: te same odpowiedzi ida na users.onboardingAnswers (X30)
    //    i NA pierwszy cykl (WP-6, entry onboarding).
    const firstChoice = buildPlanCycleChoice(wizardFirst, 'onboarding');
    let answersWritten: unknown;
    let onboarding: Awaited<ReturnType<typeof completeOnboardingPlan>> | undefined;
    await act(async () => {
      onboarding = await completeOnboardingPlan(wizardFirst, {
        savePlan: plan.result.current.savePlan,
        createActiveCycle: cycles.result.current.createActiveCycle,
        choice: firstChoice,
        markOnboardingComplete: async (confirmed, _days, planStartDate) => {
          answersWritten = buildOnboardingAnswers(wizardFirst, { accentColor: 'lime', startDate: planStartDate });
          await updateDoc(doc(db, 'users', UID), {
            onboardingCompleted: true,
            trainingProfile: { level: confirmed.level, objective: confirmed.objective, daysPerWeek: confirmed.daysPerWeek },
            onboardingAnswers: answersWritten,
          });
        },
      });
    });
    expect(onboarding?.success).toBe(true);
    syncSnapshots();

    const firstCycleId = `cycle-${UID}-${FIRST_START}`;
    expect(fake.store.get(`plan_cycles/${firstCycleId}`)?.choice).toEqual(firstChoice);
    expect(fake.store.get(`users/${UID}`)?.onboardingAnswers).toEqual(answersWritten);
    expect(plan.result.current.planStartDate).toBe(FIRST_START);
    expect(cycles.result.current.getActiveCycle()?.choice).toEqual(firstChoice);

    // 2) Plan sie skonczyl (4 tygodnie), user konczy plan przyciskiem.
    vi.setSystemTime(new Date(2026, 9, 6, 12, 0));
    let ended: Awaited<ReturnType<typeof endPlan>> | undefined;
    await act(async () => {
      ended = await endPlan({ chooseNew: true }, {
        uid: UID,
        currentPlan: plan.result.current.plan,
        planStartDate: plan.result.current.planStartDate,
        planDurationWeeks: plan.result.current.planDurationWeeks,
        workouts: [],
        archiveCurrentPlan: cycles.result.current.archiveCurrentPlan,
        backfillHistoricalWorkouts: vi.fn(async () => undefined),
        setPlanStatus: plan.result.current.setPlanStatus,
      });
    });
    expect(ended?.success).toBe(true);
    expect(ended?.archivedCycleId).toBe(firstCycleId);
    syncSnapshots();
    // Archiwizacja (updateDoc) nie rusza choice zamknietego cyklu.
    expect(fake.store.get(`plan_cycles/${firstCycleId}`)).toMatchObject({ status: 'completed', choice: firstChoice });
    expect(plan.result.current.planStatus).toBe('ended');

    // 3) Drugi kreator od kroku 2 -> NOWY cykl z WLASNYM choice (entry replan).
    vi.setSystemTime(new Date(2026, 9, 6, 12, 45));
    const secondChoice = buildPlanCycleChoice(wizardSecond, 'replan');
    let replan: { success: boolean; error?: string } | undefined;
    await act(async () => {
      replan = await startCycleWithPlan(wizardSecond.days, wizardSecond.durationWeeks, {
        uid: UID,
        currentPlan: plan.result.current.plan,
        planStartDate: plan.result.current.planStartDate,
        planDurationWeeks: plan.result.current.planDurationWeeks,
        planStatus: plan.result.current.planStatus === 'ended' ? 'ended' : 'active',
        workouts: [],
        startDate: wizardSecond.startDate,
        startDateISO: wizardSecond.startDate,
        planName: wizardSecond.planName,
        choice: secondChoice,
        archiveCurrentPlan: cycles.result.current.archiveCurrentPlan,
        savePlan: plan.result.current.savePlan,
        createActiveCycle: cycles.result.current.createActiveCycle,
        backfillHistoricalWorkouts: vi.fn(async () => undefined),
      });
    });
    expect(replan?.success).toBe(true);
    syncSnapshots();

    // DWA dokumenty, kazdy z wlasnym choice.
    const all = storeCycles();
    expect(all).toHaveLength(2);
    const first = all.find((c) => c.id === firstCycleId)!;
    const second = all.find((c) => c.id === `cycle-${UID}-${SECOND_START}`)!;
    expect(first.status).toBe('completed');
    expect(second.status).toBe('active');
    expect(first.choice).toEqual(firstChoice);
    expect(second.choice).toEqual(secondChoice);
    const firstSaved = first.choice as PlanCycleChoice;
    const secondSaved = second.choice as PlanCycleChoice;
    expect(firstSaved.entry).toBe('onboarding');
    expect(secondSaved.entry).toBe('replan');
    expect(firstSaved.chosenAt).not.toBe(secondSaved.chosenAt);
    expect(firstSaved.chosenAt < secondSaved.chosenAt).toBe(true);
    expect(secondSaved).toMatchObject({ level: 'intermediate', objective: 'fat_loss', daysPerWeek: 2, planSource: 'browsed', templateId: 'tpl-upper-lower-2', recommendedTemplateId: 'tpl-fullbody-2', planName: 'Plan drugi' });
    expect(storeCycles().filter((c) => c.status === 'active')).toHaveLength(1);

    // users.onboardingAnswers = snapshot PIERWSZEGO onboardingu, nietkniety.
    expect(fake.store.get(`users/${UID}`)?.onboardingAnswers).toEqual(answersWritten);

    // training_plans = drugi plan.
    const planDoc = fake.store.get(`training_plans/${UID}`)!;
    expect(planDoc.status).toBe('active');
    expect(planDoc.startDate).toBe(SECOND_START);
    expect(planDoc.name).toBe('Plan drugi');
    expect((planDoc.days as TrainingDay[]).map((d) => d.focus)).toEqual(['Góra/dół redukcja', 'Góra/dół redukcja']);
    expect(plan.result.current.planStartDate).toBe(SECOND_START);
    expect(cycles.result.current.getActiveCycle()?.choice).toEqual(secondChoice);
  });

  it('(c) replan z TA SAMA data startu (X31): dokladnie jeden aktywny cykl, nowy ma choice, stary zachowuje swoje', async () => {
    const START = '2026-09-07';
    const oldDays = makeDays('Stary', 'Przysiad', ['monday']).map((d) => ({ ...d, id: `${START}-d1` }));
    const oldChoice = buildPlanCycleChoice(
      { level: 'beginner', objective: 'build_muscle', daysPerWeek: 1, trainingDays: ['monday'], planSource: 'custom' },
      'onboarding',
      new Date('2026-08-20T09:00:00.000Z'),
    );
    fake.store.set(`training_plans/${UID}`, { days: oldDays, durationWeeks: 12, startDate: START, status: 'active', revision: 3 });
    fake.store.set(`plan_cycles/cycle-${UID}-${START}`, {
      userId: UID, days: oldDays, durationWeeks: 12, startDate: START, endDate: '', status: 'active',
      createdAt: '2026-08-20T09:00:00.000Z',
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
      choice: oldChoice,
    });
    const { plan, cycles } = renderHooks();
    syncSnapshots();

    const newChoice = buildPlanCycleChoice({ ...wizardSecond, trainingDays: ['monday'] }, 'replan');
    const newDays = makeDays('Nowy', 'Martwy ciąg', ['monday']);
    let replan: { success: boolean; error?: string } | undefined;
    await act(async () => {
      replan = await startCycleWithPlan(newDays, 12, {
        uid: UID,
        currentPlan: plan.result.current.plan,
        planStartDate: plan.result.current.planStartDate,
        planDurationWeeks: plan.result.current.planDurationWeeks,
        planStatus: 'active',
        workouts: [],
        startDate: START,
        startDateISO: START,
        choice: newChoice,
        archiveCurrentPlan: cycles.result.current.archiveCurrentPlan,
        savePlan: plan.result.current.savePlan,
        createActiveCycle: cycles.result.current.createActiveCycle,
        backfillHistoricalWorkouts: vi.fn(async () => undefined),
      });
    });
    expect(replan?.success).toBe(true);

    const active = storeCycles().filter((c) => c.status === 'active');
    expect(active).toHaveLength(1);
    expect(active[0].id).not.toBe(`cycle-${UID}-${START}`);
    expect(active[0].choice).toEqual(newChoice);
    const old = fake.store.get(`plan_cycles/cycle-${UID}-${START}`)!;
    expect(old.status).toBe('completed');
    expect(old.choice).toEqual(oldChoice);
    expect(storeCycles()).toHaveLength(2);
  });
});
