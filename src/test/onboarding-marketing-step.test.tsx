// Opcjonalna zgoda marketingowa żyje w istniejącym widoku zgód. Brak zaznaczenia
// nigdy nie blokuje planu, a zaznaczenie korzysta z tego samego zapisu co zgody
// wymagane. Stary komponent pełnoekranowy zostaje pokryty historycznie, ale nie
// może już pojawić się w runtime onboardingu.
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

const finishWizardToPreview = async () => {
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(await screen.findByTestId('ob-match-next'));
  fireEvent.click(await screen.findByTestId('ob-start-preview'));
  await screen.findByTestId('plan-preview');
};

const openInlineConsents = () => {
  fireEvent.click(screen.getByTestId('ob-personalization-next'));
  expect(screen.getByTestId('consent-marketing')).not.toBeChecked();
};

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

describe('Onboarding: opcjonalna zgoda marketingowa bez dodatkowego ekranu', () => {
  it('brak zaznaczenia nie blokuje zgód ani planu i nie zapisuje odmowy', async () => {
    render(withProviders(<Onboarding />));
    openInlineConsents();
    await acceptRequiredConsents();

    const [entries, , channel] = recordConsents.mock.calls[0];
    expect(entries).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'marketing' })]));
    expect(channel).toBeUndefined();

    await finishWizardToPreview();
    expect(screen.queryByTestId('marketing-accept')).toBeNull();
    expect(screen.queryByTestId('marketing-decline')).toBeNull();
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  });

  it('zaznaczenie zapisuje granted razem z wymaganymi zgodami i bez osobnego kanału', async () => {
    render(withProviders(<Onboarding />));
    openInlineConsents();
    fireEvent.click(screen.getByTestId('consent-marketing'));
    expect(screen.getByTestId('consent-marketing')).toBeChecked();
    await acceptRequiredConsents();

    const [entries, , channel] = recordConsents.mock.calls[0];
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'marketing', action: 'granted' }),
    ]));
    expect(channel).toBeUndefined();

    await finishWizardToPreview();
    expect(screen.queryByTestId('marketing-accept')).toBeNull();
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
  });

  it('po zapisaniu wymaganych zgód powrót w tej sesji nie pokazuje ich ponownie', async () => {
    render(withProviders(<Onboarding />));
    openInlineConsents();
    await acceptRequiredConsents();

    fireEvent.click(screen.getByLabelText('Wstecz'));
    await screen.findByTestId('ob-personalization-next');
    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    await screen.findByRole('button', { name: /Następny krok/ });
    expect(screen.queryByTestId('consent-marketing')).toBeNull();
    expect(recordConsents).toHaveBeenCalledTimes(1);
  });
});
