// Plan I (2026-08-20): wybrany w onboardingu kolor aplikacji trafia do
// users/{uid}.preferences.accentColor przy markOnboardingComplete (mirror
// cross-device). Zapis ZAWSZE (też domyślna limonka) — czytany w momencie
// zapisu przez readStoredAccentId(). Harness wg onboarding-marketing-step.
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
const updateDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    // Marketing już odpowiedziany — krok marketingowy nie wchodzi w drogę.
    profile: { displayName: 'Grzegorz', consents: { marketingGranted: false, marketingVersion: '1.0' } },
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ savePlan: vi.fn(async () => ({ success: true })) }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ createActiveCycle: vi.fn(async () => ({ success: true })) }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => {}) }));
// Realny completeOnboardingPlan woła deps.markOnboardingComplete — mock robi
// to samo, żeby przetestować payload updateDoc budowany w Onboarding.tsx.
const completeOnboardingPlan = vi.hoisted(() => vi.fn(
  async (_choice: unknown, deps: { markOnboardingComplete: () => Promise<void> }) => {
    await deps.markOnboardingComplete();
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
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
  await screen.findByTestId('plan-preview');
  fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
  await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.accent;
});

describe('Onboarding: zapis koloru aplikacji do profilu (plan I)', () => {
  it('wybrany indigo ląduje w preferences.accentColor przy markOnboardingComplete', async () => {
    render(withProviders(<Onboarding />));
    fireEvent.click(screen.getByTestId('ob-accent-indigo'));
    await walkWizardToConfirm();
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      onboardingCompleted: true,
      'preferences.accentColor': 'indigo',
    }));
  });

  it('bieg bez dotknięcia kolorów zapisuje domyślną limonkę (zawsze jedno pole)', async () => {
    render(withProviders(<Onboarding />));
    await walkWizardToConfirm();
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      onboardingCompleted: true,
      'preferences.accentColor': 'lime',
    }));
  });
});
