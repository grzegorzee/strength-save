// X33 WP-4 (sekcja 2 planu) + X34: glowny CTA ekranu 6/6 ("Zacznij budowac mase"
// dla build_muscle) zapisuje plan BEZ ekranu PlanPreview: kreator -> (krok
// marketingowy bez zmian) -> ten sam completeOnboardingPlan co po "Podglad planu
// -> Zatwierdz". Test SEKWENCJI od kroku 1: oba przebiegi daja IDENTYCZNY payload
// (wybor kreatora, deps.choice cyklu, updateDoc z onboardingAnswers), a sciezka
// z podgladem dziala 1:1. Harness wg onboarding-answers-save.test.tsx.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { PlanWizardChoice } from '@/components/PlanWizard';
import type { PlanCycleChoice } from '@/types/cycles';

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
const previewRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ onConfirm }: { onConfirm: () => void }) => {
    previewRenders.count += 1;
    return <div data-testid="plan-preview"><button onClick={onConfirm}>PREVIEW-CONFIRM</button></div>;
  },
}));
const updateDoc = vi.hoisted(() => vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
// Profil mutowalny per test: z odpowiedzia marketingowa (bez kroku) albo bez (krok wchodzi).
const profileFixture = vi.hoisted(() => ({
  current: { displayName: 'Grzegorz', photoURL: '', consents: { marketingGranted: false, marketingVersion: '1.0' } } as Record<string, unknown>,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: profileFixture.current }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ savePlan: vi.fn(async () => ({ success: true })) }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ createActiveCycle: vi.fn(async () => 'cycle-1') }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => {}) }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
const PLAN_START = '2026-08-31';
type Deps = { choice?: PlanCycleChoice; markOnboardingComplete: (c: PlanWizardChoice, d: PlanWizardChoice['days'], s: string) => Promise<void> };
const saveResult = vi.hoisted(() => ({ current: { success: true } as { success: boolean; error?: string } }));
const completeOnboardingPlan = vi.hoisted(() => vi.fn(async (choice: PlanWizardChoice, deps: Deps) => {
  if (!saveResult.current.success) return saveResult.current;
  await deps.markOnboardingComplete(choice, choice.days, PLAN_START);
  return saveResult.current;
}));
vi.mock('@/lib/cycle-actions', () => ({ completeOnboardingPlan }));

import Onboarding from '@/pages/Onboarding';

const withProviders = (node: React.ReactNode) => (
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>{node}</UnitProvider>
    </LanguageProvider>
  </MemoryRouter>
);

// Krok 1 (zgody) -> 2 -> 3 -> 4 -> 5A -> 6/6.
const walkToStep6 = async () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(await screen.findByTestId('ob-match-next'));
  await screen.findByTestId('ob-start-cta');
};
const startCta = () => screen.getByRole('button', { name: /Zacznij budować masę/ });

type Snapshot = { wizard: PlanWizardChoice; cycleChoice: Omit<PlanCycleChoice, 'chosenAt'> | undefined; update: Record<string, unknown> };
const stripTimestamps = (): Snapshot => {
  const [wizard, deps] = completeOnboardingPlan.mock.calls[0] as unknown as [PlanWizardChoice, Deps];
  const { chosenAt: _chosenAt, ...cycleChoice } = deps.choice ?? ({} as PlanCycleChoice);
  const update = { ...updateDoc.mock.calls[updateDoc.mock.calls.length - 1][1] };
  delete update['onboarding.termsAcceptedAt'];
  const answers = { ...(update.onboardingAnswers as Record<string, unknown>) };
  delete answers.completedAt;
  update.onboardingAnswers = answers;
  return { wizard, cycleChoice: deps.choice ? cycleChoice : undefined, update };
};

const runStartNow = async (): Promise<Snapshot> => {
  render(withProviders(<Onboarding />));
  await walkToStep6();
  fireEvent.click(startCta());
  await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/?welcome=1', { replace: true }));
  return stripTimestamps();
};

const runViaPreview = async (): Promise<Snapshot> => {
  render(withProviders(<Onboarding />));
  await walkToStep6();
  fireEvent.click(screen.getByTestId('ob-start-preview'));
  await screen.findByTestId('plan-preview');
  fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
  await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/?welcome=1', { replace: true }));
  return stripTimestamps();
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  previewRenders.count = 0;
  saveResult.current = { success: true };
  profileFixture.current = { displayName: 'Grzegorz', photoURL: '', consents: { marketingGranted: false, marketingVersion: '1.0' } };
});

describe('Onboarding: "Zaczynam ten plan" bez podgladu (X33 WP-4)', () => {
  it('SEKWENCJA: krok 1 -> 5A -> Zaczynam = zapis bez PlanPreview, cykl z entry onboarding, redirect na dashboard', async () => {
    const snap = await runStartNow();
    expect(previewRenders.count).toBe(0);
    expect(snap.cycleChoice?.entry).toBe('onboarding');
    expect(snap.cycleChoice?.planSource).toBe('recommended');
    expect(snap.wizard.days).toHaveLength(4);
    expect(snap.update.onboardingCompleted).toBe(true);
    expect((snap.update.onboardingAnswers as Record<string, unknown>).templateId).toBe(snap.wizard.templateId);
  });

  it('ROWNOSC PAYLOADU: "Zaczynam" i "Podglad -> Zatwierdz" zapisuja identycznie (wybor, choice cyklu, onboardingAnswers)', async () => {
    const direct = await runStartNow();
    cleanup();
    vi.clearAllMocks();
    previewRenders.count = 0;
    const viaPreview = await runViaPreview();

    expect(previewRenders.count).toBeGreaterThan(0);
    expect(direct.wizard).toEqual(viaPreview.wizard);
    expect(direct.cycleChoice).toEqual(viaPreview.cycleChoice);
    expect(direct.update).toEqual(viaPreview.update);
  });

  it('krok marketingowy nadal wchodzi PRZED zapisem; po odpowiedzi zapis bez podgladu', async () => {
    profileFixture.current = { displayName: 'Grzegorz', photoURL: '' };
    render(withProviders(<Onboarding />));
    await walkToStep6();
    fireEvent.click(startCta());

    await screen.findByTestId('marketing-accept');
    expect(completeOnboardingPlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('marketing-decline'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
    expect(previewRenders.count).toBe(0);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/?welcome=1', { replace: true }));
  });

  it('zasada 6: awaria zapisu przy "Zaczynam" = komunikat na ekranie 6/6 i ponowny klik dziala', async () => {
    saveResult.current = { success: false, error: 'boom' };
    render(withProviders(<Onboarding />));
    await walkToStep6();
    fireEvent.click(startCta());

    await screen.findByText('boom');
    expect(navigate).not.toHaveBeenCalled();
    expect(startCta()).toBeEnabled();

    saveResult.current = { success: true };
    fireEvent.click(startCta());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/?welcome=1', { replace: true }));
    expect(completeOnboardingPlan).toHaveBeenCalledTimes(2);
  });

  it('niezmiennik: sciezka z podgladem nadal dziala 1:1 (PlanPreview renderuje sie, Zatwierdz zapisuje)', async () => {
    const snap = await runViaPreview();
    expect(previewRenders.count).toBeGreaterThan(0);
    expect(snap.cycleChoice?.entry).toBe('onboarding');
  });
});
