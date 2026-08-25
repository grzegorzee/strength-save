// X33 WP-4 (sekcja 2 planu): replan /new-plan od kroku 2 (profil {fat_loss,
// intermediate, 3}) -> 5A z dwoma kartami 3-dniowymi -> "Zaczynam ten plan" =
// startCycleWithPlan od razu (choice entry 'replan'), bez fazy preview, redirect
// jak dotad. Rownosc payloadu z sciezka "Podglad -> Zatwierdz".
// Harness wg newplan-profile-hint.test.tsx (kreator prawdziwy, podglad atrapa).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycleChoice } from '@/types/cycles';

const profileDoc = vi.hoisted(() => ({ current: { trainingProfile: { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 } } }));
const updateDoc = vi.hoisted(() => vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(async () => {}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => new Promise((resolve) => {
    setTimeout(() => resolve({ exists: () => true, data: () => profileDoc.current }), 0);
  })),
  updateDoc,
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planName: '', planDurationWeeks: 12, planStartDate: null, savePlan: vi.fn() }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], backfillHistoricalWorkouts: vi.fn() }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ archiveCurrentPlan: vi.fn(), createActiveCycle: vi.fn(), getCycleById: vi.fn() }),
}));
type Deps = { startDate: string; startDateISO: string; planName?: string; choice?: PlanCycleChoice };
const saveResult = vi.hoisted(() => ({ current: { success: true } as { success: boolean; error?: string } }));
const startCycleWithPlan = vi.hoisted(() => vi.fn(async (_days: TrainingDay[], _weeks: number, _deps: Deps) => saveResult.current));
vi.mock('@/lib/cycle-actions', () => ({ startCycleWithPlan }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
const previewRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ days, onConfirm }: { days: TrainingDay[]; onConfirm: () => void }) => {
    previewRenders.count += 1;
    return <button onClick={onConfirm}>PREVIEW-CONFIRM:{days.length}</button>;
  },
}));

import NewPlan from '@/pages/NewPlan';

const renderNewPlan = () => render(
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider><NewPlan /></UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const cards = () => screen.getAllByTestId(/^plan-choice-(recommended|second)$/);
const cardName = (card: HTMLElement) => within(card).getByTestId('plan-choice-name').textContent ?? '';
const templateByName = (name: string) => planTemplates.find((t) => localizePlanName(t.id, t.name, 'pl') === name)!;

// Krok 2 (profil zaznaczony) -> 3 -> 4 -> 5A.
const walkToStep5 = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByRole('button', { name: /Zaczynam ten plan/ });
};

type Snapshot = { days: TrainingDay[]; weeks: number; deps: Omit<Deps, 'choice'> & { choice?: Omit<PlanCycleChoice, 'chosenAt'> }; profile: Record<string, unknown> };
const snapshot = (): Snapshot => {
  const [days, weeks, deps] = startCycleWithPlan.mock.calls[0];
  const { chosenAt: _chosenAt, ...choice } = deps.choice ?? ({} as PlanCycleChoice);
  return {
    days, weeks,
    deps: { startDate: deps.startDate, startDateISO: deps.startDateISO, planName: deps.planName, choice: deps.choice ? choice : undefined },
    profile: updateDoc.mock.calls[0][1],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  previewRenders.count = 0;
  saveResult.current = { success: true };
});

describe('NewPlan: replan przez "Zaczynam ten plan" (X33 WP-4)', () => {
  it('SEKWENCJA: krok 2 -> 5A (dwie rozne karty 3-dniowe) -> Zaczynam = startCycleWithPlan z choice entry replan, bez podgladu, redirect', async () => {
    renderNewPlan();
    await walkToStep5();

    const list = cards();
    expect(list).toHaveLength(2);
    const names = list.map(cardName);
    expect(new Set(names).size).toBe(2);
    for (const name of names) expect(templateByName(name).daysPerWeek).toBe(3);
    expect(screen.getByTestId('ob-precision-answers').textContent).toBe('3 dni w tygodniu · Redukcja · Średnio zaawansowany');

    fireEvent.click(screen.getByRole('button', { name: /Zaczynam ten plan/ }));
    await waitFor(() => expect(startCycleWithPlan).toHaveBeenCalledTimes(1));
    expect(previewRenders.count).toBe(0);
    const snap = snapshot();
    expect(snap.days).toHaveLength(3);
    expect(snap.deps.choice).toMatchObject({
      version: 1, entry: 'replan', level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3,
      trainingDays: ['monday', 'wednesday', 'friday'], planSource: 'recommended',
      templateId: templateByName(names[0]).id, recommendedTemplateId: templateByName(names[0]).id,
    });
    expect(snap.deps.startDateISO).toBe(snap.deps.startDate);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(snap.profile).toEqual({ trainingProfile: { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 } });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('ROWNOSC PAYLOADU: "Zaczynam" i "Podglad -> Zatwierdz" wolaja startCycleWithPlan identycznie', async () => {
    renderNewPlan();
    await walkToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Zaczynam ten plan/ }));
    await waitFor(() => expect(startCycleWithPlan).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    const direct = snapshot();

    cleanup();
    vi.clearAllMocks();
    previewRenders.count = 0;
    renderNewPlan();
    await walkToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
    fireEvent.click(await screen.findByText('PREVIEW-CONFIRM:3'));
    await waitFor(() => expect(startCycleWithPlan).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    const viaPreview = snapshot();

    expect(previewRenders.count).toBeGreaterThan(0);
    expect(direct).toEqual(viaPreview);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('zasada 6: awaria zapisu przy "Zaczynam" = komunikat w kreatorze (NewPlan przekazuje error), bez redirectu', async () => {
    saveResult.current = { success: false, error: 'boom' };
    renderNewPlan();
    await walkToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Zaczynam ten plan/ }));

    await screen.findByText('boom');
    expect(navigate).not.toHaveBeenCalled();
    expect(previewRenders.count).toBe(0);
    expect(screen.getByRole('button', { name: /Zaczynam ten plan/ })).toBeEnabled();
  });
});
