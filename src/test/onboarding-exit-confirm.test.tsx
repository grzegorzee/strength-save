// B7 (2026-09-29, audyt R1): strzałka wstecz / Android back na kroku 1
// onboardingu wylogowywała od razu, bez potwierdzenia (onExitBack = onLogout).
// Fix: dialog "Wyjść z konfiguracji?" z Wyloguj / Anuluj oraz ścieżką
// usunięcia konta (B1, Apple 5.1.1(v): świeży user nie ma dostępu do Profilu).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ANDROID_BACK_EVENT } from '@/components/AndroidBackHandler';

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({ PlanPreview: () => null }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc: vi.fn(async () => {}) }));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Grzegorz', photoURL: '' }, mergeConfirmedConsentMirror: vi.fn() }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({ useTrainingPlan: () => ({ savePlan: vi.fn() }) }));
vi.mock('@/hooks/usePlanCycles', () => ({ usePlanCycles: () => ({ createActiveCycle: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => {}) }));
vi.mock('@/lib/cycle-actions', () => ({ completeOnboardingPlan: vi.fn() }));
const deleteOwnAccount = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock('@/lib/registration-api', () => ({ deleteOwnAccount }));

import Onboarding from '@/pages/Onboarding';

const onExitBack = vi.fn(async () => {});
const onAccountDeleted = vi.fn(async () => {});

const renderOnboarding = () => render(
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>
        <Onboarding onExitBack={onExitBack} onAccountDeleted={onAccountDeleted} />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  onExitBack.mockClear();
  onAccountDeleted.mockClear();
  deleteOwnAccount.mockClear();
});

describe('B7: wyjście z kroku 1 onboardingu wymaga potwierdzenia', () => {
  it('strzałka wstecz NIE wylogowuje od razu; Anuluj zostawia w kreatorze', async () => {
    renderOnboarding();
    fireEvent.click(await screen.findByRole('button', { name: 'Wstecz' }));
    expect(onExitBack).not.toHaveBeenCalled();
    expect(await screen.findByText('Wyjść z konfiguracji?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    await waitFor(() => expect(screen.queryByText('Wyjść z konfiguracji?')).toBeNull());
    expect(onExitBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('plan-wizard-root')).toBeInTheDocument();
  });

  it('potwierdzone Wyloguj woła onExitBack', async () => {
    renderOnboarding();
    fireEvent.click(await screen.findByRole('button', { name: 'Wstecz' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Wyloguj' }));
    await waitFor(() => expect(onExitBack).toHaveBeenCalledTimes(1));
  });

  it('Android back na kroku 1 też pyta, zamiast wylogować', async () => {
    renderOnboarding();
    await screen.findByTestId('plan-wizard-root');
    act(() => { window.dispatchEvent(new Event(ANDROID_BACK_EVENT, { cancelable: true })); });
    expect(await screen.findByText('Wyjść z konfiguracji?')).toBeInTheDocument();
    expect(onExitBack).not.toHaveBeenCalled();
  });

  it('B1: z dialogu wyjścia da się usunąć konto (word gate)', async () => {
    renderOnboarding();
    fireEvent.click(await screen.findByRole('button', { name: 'Wstecz' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Usuń konto i wszystkie dane' }));
    fireEvent.change(await screen.findByLabelText(/Wpisz USUŃ, aby potwierdzić/), { target: { value: 'USUŃ' } });
    fireEvent.click(screen.getByText('Usuń trwale').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(deleteOwnAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onAccountDeleted).toHaveBeenCalledTimes(1));
    expect(onExitBack).not.toHaveBeenCalled();
  });
});
