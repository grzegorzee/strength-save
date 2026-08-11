// Krok 8 (spec 2026-08-11): dedykowany krok marketingowy onboardingu.
// Zero dark patterns, odmowa też do logu, wstecz bez zapisu, awaria zapisu
// nie wywraca flow, onboarding kończy się w OBU ścieżkach.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ onConfirm }: { onConfirm: () => void }) => (
    <div data-testid="plan-preview"><button onClick={onConfirm}>PREVIEW-CONFIRM</button></div>
  ),
}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc: vi.fn(async () => {}) }));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Grzegorz' } }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ savePlan: vi.fn(async () => ({ success: true })) }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ createActiveCycle: vi.fn(async () => ({ success: true })) }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
const recordConsents = vi.hoisted(() => vi.fn(async (
  _entries: unknown[],
  _lang: string,
  _channel?: string,
) => {}));
vi.mock('@/lib/consents-api', () => ({ recordConsents }));
const completeOnboardingPlan = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock('@/lib/cycle-actions', () => ({ completeOnboardingPlan }));

import Onboarding from '@/pages/Onboarding';
import { OnboardingMarketingStep } from '@/components/OnboardingMarketingStep';
import { buildMarketingStepSubmission, shouldShowMarketingStep } from '@/lib/consent-selection';
import type { UserProfile } from '@/lib/user-profile';

const withProviders = (node: React.ReactNode) => (
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>{node}</UnitProvider>
    </LanguageProvider>
  </MemoryRouter>
);

// Przejście realnego wizarda do końca (wzorzec plan-wizard-welcome.test).
const walkWizardToMarketing = async () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
  await screen.findByTestId('marketing-accept');
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('helpery kroku marketingowego', () => {
  const t = (key: string) => key;

  it('buildMarketingStepSubmission: granted i ODMOWA (withdrawn) z tym samym oświadczeniem', () => {
    expect(buildMarketingStepSubmission(t as never, true))
      .toEqual({ type: 'marketing', action: 'granted', statementText: 'consent.marketing' });
    expect(buildMarketingStepSubmission(t as never, false))
      .toEqual({ type: 'marketing', action: 'withdrawn', statementText: 'consent.marketing' });
  });

  it('shouldShowMarketingStep: tylko gdy user nigdy nie odpowiedział', () => {
    expect(shouldShowMarketingStep({} as UserProfile)).toBe(true);
    expect(shouldShowMarketingStep({ consents: { marketingGranted: true, marketingVersion: '1.0' } } as unknown as UserProfile)).toBe(false);
    // Odmowa też jest odpowiedzią — krok nie wraca.
    expect(shouldShowMarketingStep({ consents: { marketingGranted: false, marketingVersion: '1.0' } } as unknown as UserProfile)).toBe(false);
  });
});

describe('OnboardingMarketingStep (komponent)', () => {
  it('obie opcje widoczne od razu, mock powiadomienia i treść oświadczenia na ekranie', () => {
    render(withProviders(
      <OnboardingMarketingStep onAccept={() => {}} onDecline={() => {}} onBack={() => {}} />,
    ));
    expect(screen.getByTestId('marketing-accept')).toBeEnabled();
    expect(screen.getByTestId('marketing-decline')).toBeEnabled();
    expect(screen.getByTestId('marketing-mock-notification')).toBeInTheDocument();
    expect(screen.getByText(/Chcę otrzymywać e-maile/)).toBeInTheDocument();
    // Zero pre-selekcji: na ekranie nie ma żadnego checkboxa.
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
  });

  it('zapis w toku blokuje oba przyciski; błąd pokazuje komunikat i zostawia retry', () => {
    const { rerender } = render(withProviders(
      <OnboardingMarketingStep onAccept={() => {}} onDecline={() => {}} onBack={() => {}} isSaving />,
    ));
    expect(screen.getByTestId('marketing-accept')).toBeDisabled();
    expect(screen.getByTestId('marketing-decline')).toBeDisabled();
    rerender(withProviders(
      <OnboardingMarketingStep onAccept={() => {}} onDecline={() => {}} onBack={() => {}} error />,
    ));
    expect(screen.getByTestId('marketing-consent-error')).toBeInTheDocument();
    expect(screen.getByTestId('marketing-accept')).toBeEnabled();
  });
});

describe('Onboarding: flow kroku marketingowego', () => {
  it('[Jasne, wchodzę!] zapisuje granted kanałem onboarding-marketing-step i kończy onboarding', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToMarketing();

    fireEvent.click(screen.getByTestId('marketing-accept'));
    await screen.findByTestId('plan-preview');
    const marketingCall = recordConsents.mock.calls.find(([, , channel]) => channel === 'onboarding-marketing-step');
    expect(marketingCall?.[0]).toEqual([expect.objectContaining({ type: 'marketing', action: 'granted' })]);

    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  });

  it('[Nie, dzięki] zapisuje ODMOWĘ (withdrawn) do logu i też kończy onboarding', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToMarketing();

    fireEvent.click(screen.getByTestId('marketing-decline'));
    await screen.findByTestId('plan-preview');
    const marketingCall = recordConsents.mock.calls.find(([, , channel]) => channel === 'onboarding-marketing-step');
    expect(marketingCall?.[0]).toEqual([expect.objectContaining({ type: 'marketing', action: 'withdrawn' })]);

    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  });

  it('wstecz z kroku: powrót do wizarda BEZ zapisu, wybór nadal wymagany w przód', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToMarketing();

    fireEvent.click(screen.getByLabelText('Wstecz'));
    await screen.findByRole('button', { name: /Podgląd planu/ });
    expect(recordConsents.mock.calls.filter(([, , channel]) => channel === 'onboarding-marketing-step')).toEqual([]);

    // Przejście w przód znowu pokazuje krok — odpowiedź nie została zapisana.
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
    await screen.findByTestId('marketing-accept');
  });

  it('awaria zapisu: komunikat + retry, onboarding się nie wywraca', async () => {
    recordConsents.mockImplementation(async (_entries, _lang, channel) => {
      if (channel === 'onboarding-marketing-step' && recordConsents.mock.calls.filter(([, , c]) => c === 'onboarding-marketing-step').length <= 1) {
        throw new Error('offline');
      }
    });
    render(withProviders(<Onboarding />));
    await walkWizardToMarketing();

    fireEvent.click(screen.getByTestId('marketing-accept'));
    await screen.findByTestId('marketing-consent-error');
    expect(screen.queryByTestId('plan-preview')).toBeNull();

    // Retry tym samym przyciskiem przechodzi dalej.
    fireEvent.click(screen.getByTestId('marketing-accept'));
    await screen.findByTestId('plan-preview');
  });
});
