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
const trackTelemetryEvent = vi.hoisted(() => vi.fn());
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent }));
// X29 WP-H: photoURL mutowalne per test (propozycje akcentu z avatara).
const mockProfile = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: mockProfile.current }),
}));
// X33 WP-8: Welcome liczy kandydatów dopiero po jawnym CTA. Analiza porządkuje
// kropki "Z Twojego zdjęcia", ale nie zapisuje wyboru bez tapnięcia swatcha.
const deriveAccentCandidatesFromAvatar = vi.hoisted(() => vi.fn(async (): Promise<string[]> => []));
vi.mock('@/lib/avatar-accent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/avatar-accent')>();
  return { ...actual, deriveAccentCandidatesFromAvatar };
});
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.accent;
  // Marketing już odpowiedziany — krok marketingowy nie wchodzi w drogę.
  // Bez photoURL (konta email/Apple zwykle go nie mają) — automat śpi.
  mockProfile.current = {
    displayName: 'Grzegorz',
    photoURL: '',
    consents: { marketingGranted: false, marketingVersion: '1.0' },
  };
});

describe('Onboarding: zapis koloru aplikacji do profilu (plan I)', () => {
  it('web/PWA wznawia zweryfikowany szkic dopiero przy aktualnym mirrorze zgód', async () => {
    mockProfile.current = {
      displayName: 'Grzegorz',
      photoURL: '',
      consents: {
        termsVersion: '2.0', privacyVersion: '2.1', healthGranted: true,
        healthVersion: '1.0', marketingGranted: false, marketingVersion: '1.0',
      },
    };
    localStorage.setItem('CapacitorStorage.strength-save:onboarding-draft:v1:u1', JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      phase: 'wizard',
      wizardStep: 4,
      level: 'advanced',
      objective: 'peak_strength',
      daysPerWeek: 3,
      trainingDays: ['tuesday', 'thursday', 'saturday'],
    }));

    render(withProviders(<Onboarding />));

    expect(await screen.findByText('Ile dni treningowych w tygodniu?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('consent-terms')).toBeNull();
    expect(trackTelemetryEvent).toHaveBeenCalledWith('u1', 'onboarding_resumed');
  });

  it('lokalny szkic nie omija obowiązkowych zgód, gdy mirror serwera jest niepełny', async () => {
    localStorage.setItem('CapacitorStorage.strength-save:onboarding-draft:v1:u1', JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      phase: 'wizard',
      wizardStep: 5,
      level: 'advanced',
      objective: 'peak_strength',
      daysPerWeek: 3,
      trainingDays: ['tuesday', 'thursday', 'saturday'],
    }));

    render(withProviders(<Onboarding />));

    expect(await screen.findByTestId('ob-personalization-next')).toBeInTheDocument();
    expect(screen.queryByTestId('consent-terms')).toBeNull();
    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    expect(await screen.findByTestId('consent-terms')).not.toBeChecked();
    expect(screen.getByTestId('consent-privacy')).not.toBeChecked();
    expect(screen.getByTestId('consent-health')).not.toBeChecked();
    expect(screen.queryByTestId('ob-match-next')).toBeNull();
  });

  it('zapisuje wybrany pojedynczy kolor i nie pokazuje palet', async () => {
    render(withProviders(<Onboarding />));
    expect(screen.queryByTestId('ob-custom-colors-toggle')).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(11);
    fireEvent.click(screen.getByTestId('ob-accent-indigo'));
    await walkWizardToConfirm();
    const calls = updateDoc.mock.calls as unknown as Array<[unknown, Record<string, unknown>]>;
    const onboardingPatch = calls.find(([, patch]) => patch.onboardingCompleted)?.[1];
    expect(onboardingPatch).toEqual(expect.objectContaining({
      onboardingCompleted: true,
      'preferences.accentColor': 'indigo',
    }));
    expect(onboardingPatch).not.toHaveProperty('preferences.paletteTheme');
    expect(trackTelemetryEvent).toHaveBeenCalledWith('u1', 'onboarding_completed');
  });
});

// Kontrakt 1.0: avatar jest tylko identyfikacją konta. Analiza zdjęcia pozostaje
// poza UI, dopóki nie ma bezpiecznego generatora pełnego motywu i testów urządzeń.
describe('Onboarding: avatar bez analizy kolorów w 1.0', () => {
  it('zaufane zdjęcie Google nie uruchamia ani nie oferuje analizy kolorów', async () => {
    mockProfile.current = { ...mockProfile.current, photoURL: 'https://lh3.googleusercontent.com/a.jpg' };
    deriveAccentCandidatesFromAvatar.mockResolvedValueOnce(['sky']);
    render(withProviders(<Onboarding />));
    expect(screen.queryByRole('button', { name: /Dopasuj kolory ze zdjęcia/i })).toBeNull();
    expect(screen.queryByTestId('ob-accent-from-photo')).toBeNull();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('radio')).toHaveLength(11);
  });

  it('brak photoURL: automat NIE odpala się', async () => {
    render(withProviders(<Onboarding />));
    await Promise.resolve();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('radio')).toHaveLength(11);
  });

  it('avatar spoza Google również nie pokazuje CTA analizy kolorów', async () => {
    mockProfile.current = {
      ...mockProfile.current,
      photoURL: 'https://firebasestorage.googleapis.com/v0/b/user-avatar.jpg',
    };
    render(withProviders(<Onboarding />));

    expect(screen.queryByRole('button', { name: /Dopasuj kolory ze zdjęcia/i })).toBeNull();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('radio')).toHaveLength(11);
  });
});
