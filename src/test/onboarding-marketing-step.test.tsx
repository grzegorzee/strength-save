// Zgoda marketingowa ma osobny krok PO wyborze planu (spec 2026-08-11, przywrócone
// 2026-10-05 na prośbę właściciela). Ekran prawny ma tylko 3 checkboxy (regulamin,
// prywatność, zdrowie). Krok marketingowy zapisuje granted albo withdrawn kanałem
// onboarding-marketing-step i nigdy nie blokuje startu planu.
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
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Grzegorz' }, mergeConfirmedConsentMirror: vi.fn() }),
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

const acceptRequiredConsents = async () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  expect(screen.getByTestId('ob-legal-submit')).toBeEnabled();
  fireEvent.click(screen.getByTestId('ob-legal-submit'));
  await screen.findByRole('button', { name: /Następny krok/ });
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

const reachLegalScreen = () => {
  fireEvent.click(screen.getByTestId('ob-personalization-next'));
};

const finishWizardToStep6 = async () => {
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(await screen.findByTestId('ob-match-next'));
  await screen.findByTestId('ob-start-preview');
};

const marketingCalls = () => recordConsents.mock.calls.filter(([, , channel]) => channel === 'onboarding-marketing-step');

describe('Onboarding: osobny krok zgody marketingowej po wyborze planu', () => {
  it('ekran prawny ma tylko 3 checkboxy i nie zapisuje marketingu', async () => {
    render(withProviders(<Onboarding />));
    reachLegalScreen();
    expect(screen.queryByTestId('consent-marketing')).toBeNull();
    await acceptRequiredConsents();

    const [entries, , channel] = recordConsents.mock.calls[0];
    expect(entries).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'marketing' })]));
    expect(channel).toBeUndefined();
  });

  it('SEKWENCJA: Podgląd planu -> krok marketingowy -> zgoda (granted) -> podgląd -> zapis planu', async () => {
    render(withProviders(<Onboarding />));
    reachLegalScreen();
    await acceptRequiredConsents();
    await finishWizardToStep6();
    fireEvent.click(screen.getByTestId('ob-start-preview'));

    fireEvent.click(await screen.findByTestId('marketing-accept'));
    await screen.findByTestId('plan-preview');
    expect(marketingCalls()).toHaveLength(1);
    expect(marketingCalls()[0][0]).toEqual([expect.objectContaining({ type: 'marketing', action: 'granted' })]);

    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  });

  it('odmowa zapisuje withdrawn tym samym kanałem i prowadzi dalej', async () => {
    render(withProviders(<Onboarding />));
    reachLegalScreen();
    await acceptRequiredConsents();
    await finishWizardToStep6();
    fireEvent.click(screen.getByTestId('ob-start-preview'));

    fireEvent.click(await screen.findByTestId('marketing-decline'));
    await screen.findByTestId('plan-preview');
    expect(marketingCalls()[0][0]).toEqual([expect.objectContaining({ type: 'marketing', action: 'withdrawn' })]);
  });

  it('zasada 6: awaria zapisu zgody = komunikat i retry; odmowa mimo awarii nie blokuje planu', async () => {
    render(withProviders(<Onboarding />));
    reachLegalScreen();
    await acceptRequiredConsents();
    await finishWizardToStep6();
    fireEvent.click(screen.getByTestId('ob-start-preview'));

    recordConsents.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(await screen.findByTestId('marketing-accept'));
    await screen.findByTestId('marketing-consent-error');
    expect(screen.queryByTestId('plan-preview')).toBeNull();

    recordConsents.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByTestId('marketing-decline'));
    await screen.findByTestId('plan-preview');
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  });

  it('wstecz z kroku marketingowego wraca na 6/6 bez zapisu; po odpowiedzi krok nie wraca', async () => {
    render(withProviders(<Onboarding />));
    reachLegalScreen();
    await acceptRequiredConsents();
    await finishWizardToStep6();
    fireEvent.click(screen.getByTestId('ob-start-preview'));

    await screen.findByTestId('marketing-screen');
    fireEvent.click(screen.getByLabelText('Wstecz'));
    await screen.findByTestId('ob-start-preview');
    expect(marketingCalls()).toHaveLength(0);

    fireEvent.click(screen.getByTestId('ob-start-preview'));
    fireEvent.click(await screen.findByTestId('marketing-decline'));
    await screen.findByTestId('plan-preview');
    expect(marketingCalls()).toHaveLength(1);
  });

  it('po zapisaniu wymaganych zgód powrót w tej sesji nie pokazuje ich ponownie', async () => {
    render(withProviders(<Onboarding />));
    reachLegalScreen();
    await acceptRequiredConsents();

    fireEvent.click(screen.getByLabelText('Wstecz'));
    await screen.findByTestId('ob-personalization-next');
    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    await screen.findByRole('button', { name: /Następny krok/ });
    expect(screen.queryByTestId('consent-terms')).toBeNull();
    expect(recordConsents).toHaveBeenCalledTimes(1);
  });
});
