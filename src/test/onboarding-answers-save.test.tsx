// WP-O (X30): zakończenie onboardingu zapisuje trwały snapshot odpowiedzi na
// users/{uid}.onboardingAnswers (kontrakt v2) przez markOnboardingComplete,
// a mapa `onboarding` idzie dot-pathami (nie zastępuje przyszłych podpól).
// Niezmiennik: stary payload (onboardingCompleted, trainingProfile, accent)
// i redirect po zapisie bez zmian. Harness wg onboarding-accent.test.tsx.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ONBOARDING_ANSWERS_VERSION } from '@/lib/onboarding-answers';
import type { PlanWizardChoice } from '@/components/PlanWizard';
import type { PlanCycleChoice } from '@/types/cycles';

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ onConfirm }: { onConfirm: () => void }) => (
    <div data-testid="plan-preview"><button onClick={onConfirm}>PREVIEW-CONFIRM</button></div>
  ),
}));
const updateDoc = vi.hoisted(() => vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: { displayName: 'Grzegorz', photoURL: '', consents: { marketingGranted: false, marketingVersion: '1.0' } },
  }),
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
// Realny completeOnboardingPlan woła markOnboardingComplete(choice, days, planStartDate)
// z poniedziałkiem startu cyklu — atrapa odtwarza ten kontrakt.
const PLAN_START = '2026-08-31';
const completeOnboardingPlan = vi.hoisted(() => vi.fn(
  async (choice: PlanWizardChoice, deps: { markOnboardingComplete: (c: PlanWizardChoice, d: PlanWizardChoice['days'], s: string) => Promise<void> }) => {
    await deps.markOnboardingComplete(choice, choice.days, PLAN_START);
    return { success: true };
  },
));
vi.mock('@/lib/cycle-actions', () => ({ completeOnboardingPlan }));

import Onboarding from '@/pages/Onboarding';

const withProviders = (node: React.ReactNode) => (
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>{node}</UnitProvider>
    </LanguageProvider>
  </MemoryRouter>
);

const walkWizardToConfirm = async () => {
  fireEvent.click(screen.getByTestId('ob-personalization-next'));
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  fireEvent.click(screen.getByTestId('ob-legal-submit'));
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  // X34: 5A "Wybierz start planu" -> 6/6 "Podgląd planu".
  fireEvent.click(await screen.findByTestId('ob-match-next'));
  fireEvent.click(await screen.findByTestId('ob-start-preview'));
  await screen.findByTestId('plan-preview');
  fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
  await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
};

const lastUpdatePayload = () => updateDoc.mock.calls[updateDoc.mock.calls.length - 1][1];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('Onboarding: zapis onboardingAnswers przy markOnboardingComplete (WP-O)', () => {
  it('snapshot v2 z kompletem odpowiedzi (rekomendacja, domyślne wartości kreatora)', async () => {
    render(withProviders(<Onboarding />));
    fireEvent.click(screen.getByTestId('ob-custom-colors-toggle'));
    fireEvent.click(screen.getByTestId('ob-accent-indigo'));
    await walkWizardToConfirm();

    const choice = completeOnboardingPlan.mock.calls[0][0];
    const payload = lastUpdatePayload();
    expect(payload.onboardingAnswers).toEqual({
      version: ONBOARDING_ANSWERS_VERSION,
      completedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      name: 'Grzegorz',
      accentColor: 'indigo',
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 4,
      trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
      planSource: 'recommended',
      templateId: choice.templateId,
      recommendedTemplateId: choice.templateId,
      durationWeeks: choice.durationWeeks,
      startDate: PLAN_START,
      planName: choice.planName,
    });
  });

  // WP-6 (X33): te same odpowiedzi ida na cykl (deps.choice, entry onboarding).
  it('deps.choice dla cyklu = odpowiedzi kreatora z entry onboarding (WP-6)', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToConfirm();

    const [wizardChoice, deps] = completeOnboardingPlan.mock.calls[0] as unknown as [PlanWizardChoice, { choice?: PlanCycleChoice }];
    expect(deps.choice).toEqual({
      version: 1,
      chosenAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 4,
      trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
      planSource: 'recommended',
      templateId: wizardChoice.templateId,
      recommendedTemplateId: wizardChoice.templateId,
      planName: wizardChoice.planName,
      entry: 'onboarding',
    });
  });

  it('mapa onboarding idzie dot-pathami (nie zastępuje całej mapy)', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToConfirm();

    const payload = lastUpdatePayload();
    expect(payload).not.toHaveProperty('onboarding');
    expect(payload['onboarding.state']).toBe('completed');
    expect(payload['onboarding.version']).toBe(2);
    expect(payload['onboarding.termsAcceptedAt']).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  it('niezmiennik: stary payload i redirect bez zmian (cykl + plan + dashboard)', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToConfirm();

    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(lastUpdatePayload()).toMatchObject({
      onboardingCompleted: true,
      trainingProfile: { level: 'beginner', objective: 'build_muscle', daysPerWeek: 4 },
      'preferences.accentColor': '#c6ff00',
    });
    // Bez undefined w payloadzie (Firestore odrzuca updateDoc z undefined).
    expect(Object.values(lastUpdatePayload()).some((v) => v === undefined)).toBe(false);
    expect(completeOnboardingPlan.mock.calls[0][0].days.length).toBe(4);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/?welcome=1', { replace: true }));
  });
});
