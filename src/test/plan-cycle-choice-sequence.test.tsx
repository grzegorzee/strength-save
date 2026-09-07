import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    return { id: ref.id, ref, exists: () => data !== undefined, data: () => data };
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
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  query: vi.fn((col: { collection: string }, ...constraints: unknown[]) => ({ collection: col.collection, constraints })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn(() => ({ type: 'orderBy' })),
  limit: vi.fn(() => ({ type: 'limit' })),
  deleteField: vi.fn(),
  getDoc: vi.fn(async (ref: Ref) => fake.docSnap(ref)),
  getDocs: vi.fn(async (target: { collection: string; constraints?: Array<{ type: string; field?: string; value?: unknown }> }) => {
    const docs = [...fake.store.entries()]
      .filter(([key, data]) => key.startsWith(`${target.collection}/`)
        && (target.constraints ?? []).every(constraint => constraint.type !== 'where' || data[constraint.field!] === constraint.value))
      .map(([key]) => fake.docSnap({ col: target.collection, id: key.slice(target.collection.length + 1) }));
    return { docs, empty: docs.length === 0, forEach: (callback: (doc: typeof docs[number]) => void) => docs.forEach(callback) };
  }),
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

import { doc, updateDoc, runTransaction, type Transaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { completeOnboardingPlan, endPlan, startCycleWithPlan } from '@/lib/cycle-actions';
import { buildOnboardingAnswers } from '@/lib/onboarding-answers';
import { buildPlanCycleChoice } from '@/lib/plan-cycle-choice';
import type { PlanCycleChoice } from '@/types/cycles';
import { UnitProvider } from '@/contexts/UnitContext';
import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import { planTemplates } from '@/data/planTemplates';
import { readOnboardingDraft, writeOnboardingDraft, type OnboardingDraftInput } from '@/lib/onboarding-draft';

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
  it('transaction retry follows a concurrently committed pointer even when its earlier active query was empty', async () => {
    const oldId = `cycle-${UID}-${FIRST_START}`;
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false });
    const originalTransaction = vi.mocked(runTransaction).getMockImplementation()!;
    vi.mocked(runTransaction).mockImplementationOnce(async (database, callback) => {
      // Simulate the SDK discarding an optimistic attempt after the shared
      // profile changed. Its writes must not commit; the callback is retried.
      await callback({ get: async (ref: Ref) => fake.docSnap(ref), set: () => undefined } as unknown as Transaction);
      fake.store.set(`plan_cycles/${oldId}`, {
        userId: UID, status: 'active', days: wizardFirst.days, durationWeeks: wizardFirst.durationWeeks,
        startDate: FIRST_START, choice: buildPlanCycleChoice(wizardFirst, 'onboarding'),
      });
      fake.write({ col: 'users', id: UID }, { onboarding: { pendingCycleId: oldId, keptByConcurrentWrite: true } }, true);
      return originalTransaction(database, callback);
    });
    const cycles = renderHook(() => usePlanCycles(UID));
    const id = await cycles.result.current.createActiveCycle(wizardSecond.days, wizardSecond.durationWeeks, SECOND_START, {
      choice: buildPlanCycleChoice(wizardSecond, 'onboarding'),
    });
    expect(id).toBe(oldId);
    expect(storeCycles().filter(cycle => cycle.status === 'active')).toHaveLength(1);
    expect(fake.store.get(`users/${UID}`)?.onboarding).toEqual({ pendingCycleId: oldId, keptByConcurrentWrite: true });
  });

  it('adopts the owner legacy pending cycle across dates and preserves profile answers', async () => {
    const oldId = `cycle-${UID}-${FIRST_START}`;
    const onboarding = { state: 'pending', version: 2, futureAnswer: 'keep' };
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false, onboarding, onboardingAnswers: { saved: 'keep' } });
    fake.store.set(`plan_cycles/${oldId}`, {
      userId: UID, days: wizardFirst.days, durationWeeks: wizardFirst.durationWeeks,
      startDate: FIRST_START, endDate: '', status: 'active',
      choice: buildPlanCycleChoice(wizardFirst, 'onboarding'),
    });
    const cycles = renderHook(() => usePlanCycles(UID));
    const id = await cycles.result.current.createActiveCycle(wizardSecond.days, wizardSecond.durationWeeks, SECOND_START, {
      choice: buildPlanCycleChoice(wizardSecond, 'onboarding'),
    });
    expect(id).toBe(oldId);
    expect(storeCycles().filter(cycle => cycle.status === 'active')).toHaveLength(1);
    expect(fake.store.get(`users/${UID}`)).toMatchObject({
      onboarding: { ...onboarding, pendingCycleId: oldId }, onboardingAnswers: { saved: 'keep' },
    });
    expect(fake.store.get(`plan_cycles/${oldId}`)).toMatchObject({ days: wizardSecond.days, startDate: SECOND_START });
  });

  it.each(['bad/path', 'foreign-cycle', 'completed-cycle'])('does not mutate an invalid pending pointer %s', async pointer => {
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false, onboarding: { pendingCycleId: pointer, preserved: true } });
    const pointed = { userId: pointer === 'foreign-cycle' ? 'other-owner' : UID,
      days: wizardFirst.days, status: pointer === 'completed-cycle' ? 'completed' : 'active',
      startDate: FIRST_START, durationWeeks: wizardFirst.durationWeeks,
      choice: buildPlanCycleChoice(wizardFirst, 'onboarding'),
    };
    if (pointer !== 'bad/path') fake.store.set(`plan_cycles/${pointer}`, pointed);
    const cycles = renderHook(() => usePlanCycles(UID));
    const id = await cycles.result.current.createActiveCycle(wizardSecond.days, wizardSecond.durationWeeks, SECOND_START, {
      choice: buildPlanCycleChoice(wizardSecond, 'onboarding'),
    });
    expect(id).toBe(`cycle-${UID}-${SECOND_START}`);
    expect(fake.store.get(`users/${UID}`)?.onboarding).toEqual({ pendingCycleId: id, preserved: true });
    if (pointer !== 'bad/path') expect(fake.store.get(`plan_cycles/${pointer}`)).toEqual(pointed);
  });

  it.each([undefined, 'replan'])('does not adopt an unrelated active legacy cycle (%s) as pending onboarding', async entry => {
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false });
    const existing = { userId: UID, days: wizardFirst.days, status: 'active', startDate: FIRST_START,
      ...(entry ? { choice: buildPlanCycleChoice(wizardFirst, 'replan') } : {}),
    };
    fake.store.set('plan_cycles/legacy-active', existing);
    const cycles = renderHook(() => usePlanCycles(UID));
    const savePlan = vi.fn();
    const result = await completeOnboardingPlan(wizardSecond, {
      createActiveCycle: cycles.result.current.createActiveCycle,
      choice: buildPlanCycleChoice(wizardSecond, 'onboarding'),
      savePlan, markOnboardingComplete: vi.fn(), lang: 'pl',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('contact@strengthsave.app');
    expect(result.error).toContain('zmienić konto');
    expect(savePlan).not.toHaveBeenCalled();
    expect(storeCycles()).toEqual([{ id: 'legacy-active', ...existing }]);
    expect(fake.store.get(`users/${UID}`)).not.toHaveProperty('onboarding');
  });

  it('a completed profile rejects a stale onboarding retry while a normal replan still creates its own cycle', async () => {
    const oldId = `cycle-${UID}-${FIRST_START}`;
    const profile = { uid: UID, onboardingCompleted: true, onboarding: { state: 'completed', pendingCycleId: oldId } };
    fake.store.set(`users/${UID}`, profile);
    const completed = { userId: UID, days: wizardFirst.days, status: 'completed', startDate: FIRST_START,
      choice: buildPlanCycleChoice(wizardFirst, 'onboarding'),
    };
    fake.store.set(`plan_cycles/${oldId}`, completed);
    const cycles = renderHook(() => usePlanCycles(UID));
    expect(await cycles.result.current.createActiveCycle(wizardSecond.days, wizardSecond.durationWeeks, SECOND_START, {
      choice: buildPlanCycleChoice(wizardSecond, 'onboarding'),
    })).toBeNull();
    const replan = await cycles.result.current.createActiveCycle(wizardSecond.days, wizardSecond.durationWeeks, SECOND_START, {
      choice: buildPlanCycleChoice(wizardSecond, 'replan'),
    });
    expect(replan).toBe(`cycle-${UID}-${SECOND_START}`);
    expect(fake.store.get(`users/${UID}`)).toEqual(profile);
    expect(fake.store.get(`plan_cycles/${oldId}`)).toEqual(completed);
  });

  it('lost plan ACK → cold restart across Sunday/Monday cannot leave two active onboarding cycles', async () => {
    vi.setSystemTime(new Date(2026, 8, 6, 12));
    localStorage.clear();
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false });
    const template = planTemplates.find(candidate => candidate.daysPerWeek === 4)!;
    await writeOnboardingDraft(UID, {
      phase: 'wizard', wizardStep: 6, level: 'beginner', objective: 'build_muscle',
      daysPerWeek: 4, trainingDays: ['monday', 'tuesday', 'thursday', 'sunday'],
      templateId: template.id, planSource: 'browsed', durationWeeks: 12,
      firstWorkoutDate: '2026-09-06',
    });
    let hooks = renderHooks();
    syncSnapshots();
    let loseNextAck = true;
    const choices: PlanWizardChoice[] = [];
    let operation: ReturnType<typeof completeOnboardingPlan> | undefined;
    let draftWrites = Promise.resolve<unknown>(undefined);
    const persistDraft = (next: OnboardingDraftInput) => {
      draftWrites = draftWrites.then(() => writeOnboardingDraft(UID, next));
    };
    const confirm = (choice: PlanWizardChoice) => {
      choices.push(choice);
      operation = completeOnboardingPlan(choice, {
        createActiveCycle: hooks.cycles.result.current.createActiveCycle,
        choice: buildPlanCycleChoice(choice, 'onboarding'),
        savePlan: async (...args) => {
          const saved = await hooks.plan.result.current.savePlan(...args);
          if (saved.success && loseNextAck) {
            loseNextAck = false;
            return { success: false, error: 'response lost after commit' };
          }
          return saved;
        },
        markOnboardingComplete: async () => {
          fake.write({ col: 'users', id: UID }, { onboardingCompleted: true }, true);
        },
      });
    };
    const mountWizard = async () => {
      const draft = await readOnboardingDraft(UID);
      return render(<MemoryRouter><LanguageProvider><UnitProvider>
        <PlanWizard showWelcome legalConsent legalConsentAlreadyRecorded initialDraft={draft}
          onDraftChange={persistDraft} onConfirm={confirm} confirmLabelKey="newplan.toReview" />
      </UnitProvider></LanguageProvider></MemoryRouter>);
    };
    const firstView = await mountWizard();
    await act(async () => {
      fireEvent.click(screen.getByTestId('ob-start-cta'));
      expect((await operation)?.success).toBe(false);
      await draftWrites;
    });
    expect(choices[0].startDate).toBe('2026-08-31');
    expect(fake.store.get(`training_plans/${UID}`)?.startDate).toBe('2026-08-31');
    // A committed plan does not mark onboarding complete when its ACK is lost.
    expect(fake.store.get(`users/${UID}`)?.onboardingCompleted).toBe(false);
    expect(storeCycles().filter(cycle => cycle.status === 'active')).toHaveLength(1);
    const firstCycleId = storeCycles().find(cycle => cycle.status === 'active')!.id;
    firstView.unmount();
    hooks.plan.unmount();
    hooks.cycles.unmount();

    vi.setSystemTime(new Date(2026, 8, 7, 12));
    hooks = renderHooks();
    syncSnapshots();
    // The profile still selects the onboarding route, even with the saved plan
    // and active cycle loaded. Only persisted wizard input survives the restart.
    expect(hooks.plan.result.current.planStartDate).toBe('2026-08-31');
    await mountWizard();
    await act(async () => {
      fireEvent.click(screen.getByTestId('ob-start-cta'));
      expect((await operation)?.success).toBe(true);
      await draftWrites;
    });
    expect(choices[1].startDate).toBe('2026-09-07');
    expect(fake.store.get(`users/${UID}`)?.onboardingCompleted).toBe(true);
    expect(storeCycles().filter(cycle => cycle.status === 'active')).toHaveLength(1);
    expect(storeCycles().find(cycle => cycle.status === 'active')!.id).toBe(firstCycleId);
    expect(fake.store.get(`users/${UID}`)?.onboarding).toMatchObject({ pendingCycleId: firstCycleId });
    expect(storeCycles().find(cycle => cycle.status === 'active')).toMatchObject({
      startDate: choices[1].startDate,
      choice: buildPlanCycleChoice(choices[1], 'onboarding'),
    });
  });

  it('błąd planu → restart → inny wybór tej samej daty kończy z jednym spójnym cyklem', async () => {
    fake.store.set(`users/${UID}`, { uid: UID, onboardingCompleted: false });
    const { plan, cycles } = renderHooks();
    syncSnapshots();
    let failPlanWrite = true;
    const savePlan = vi.fn(async (...args: Parameters<typeof plan.result.current.savePlan>) => {
      if (failPlanWrite) return { success: false, error: 'offline' };
      return plan.result.current.savePlan(...args);
    });
    const markOnboardingComplete = vi.fn(async () => undefined);

    const first = await completeOnboardingPlan(wizardFirst, {
      savePlan,
      createActiveCycle: cycles.result.current.createActiveCycle,
      choice: buildPlanCycleChoice(wizardFirst, 'onboarding'),
      markOnboardingComplete,
    });
    expect(first.success).toBe(false);
    expect(markOnboardingComplete).not.toHaveBeenCalled();
    expect(storeCycles().filter((cycle) => cycle.status === 'active')).toHaveLength(1);
    expect(fake.store.has(`training_plans/${UID}`)).toBe(false);

    // Symulacja wznowienia procesu z trwałego szkicu po restarcie WebView:
    // użytkownik cofa się i świadomie wybiera inny plan z tą samą datą startu.
    failPlanWrite = false;
    const changedChoice = { ...wizardSecond, startDate: FIRST_START };
    const retried = await completeOnboardingPlan(changedChoice, {
      savePlan,
      createActiveCycle: cycles.result.current.createActiveCycle,
      choice: buildPlanCycleChoice(changedChoice, 'onboarding'),
      markOnboardingComplete,
    });

    expect(retried.success).toBe(true);
    const active = storeCycles().filter((cycle) => cycle.status === 'active');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(`cycle-${UID}-${FIRST_START}`);
    expect((active[0].days as TrainingDay[]).map((day) => day.focus)).toEqual([
      'Góra/dół redukcja',
      'Góra/dół redukcja',
    ]);
    const savedPlan = fake.store.get(`training_plans/${UID}`)!;
    expect((savedPlan.days as TrainingDay[]).map((day) => day.focus)).toEqual([
      'Góra/dół redukcja',
      'Góra/dół redukcja',
    ]);
    expect(markOnboardingComplete).toHaveBeenCalledTimes(1);
  });

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
