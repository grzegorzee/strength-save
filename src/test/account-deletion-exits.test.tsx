import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// B1 (2026-09-29, audyt R1, Apple 5.1.1(v)): usunięcie konta było dostępne
// tylko w Profilu, a PaywallRouteGuard przekierowuje /profile na /paywall.
// Świeży user bez zakupu (hard paywall), user przed weryfikacją emaila i user
// przed nowymi zgodami nie mógł usunąć konta. Każde z tych miejsc dostaje ten
// sam dialog usuwania (word gate USUŃ/DELETE) co Profil.

const mocks = vi.hoisted(() => ({
  deleteOwnAccount: vi.fn(async () => ({ success: true })),
  requestEmailVerificationCode: vi.fn(async () => ({ sent: true })),
  verifyEmailCode: vi.fn(async () => ({ verified: true })),
  toast: vi.fn(),
}));

vi.mock('@/lib/registration-api', () => ({
  deleteOwnAccount: mocks.deleteOwnAccount,
  requestEmailVerificationCode: mocks.requestEmailVerificationCode,
  verifyEmailCode: mocks.verifyEmailCode,
}));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => ({})) }));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: null, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, loading: false, refresh: vi.fn(async () => {}) }),
  isPaywallPlatform: () => true,
}));
vi.mock('@/hooks/useHardPaywall', () => ({ useHardPaywall: () => 'enforced' }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: [{ id: 'day-1', dayName: 'Dzień A', weekday: 'monday', focus: 'Push', exercises: [] }],
    planDurationWeeks: 12,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/exercise-media', () => ({ getPaywallHeroUrl: () => 'https://cdn.example/hero.webp' }));

import Paywall from '@/pages/Paywall';
import { EmailVerificationGate } from '@/components/EmailVerificationGate';
import { ConsentGate } from '@/components/ConsentGate';

const onLogout = vi.fn(async () => {});
const onAccountDeleted = vi.fn(async () => {});

const wrap = (node: React.ReactNode) => render(
  <MemoryRouter initialEntries={['/paywall']}>
    <LanguageProvider>{node}</LanguageProvider>
  </MemoryRouter>,
);

// Pełna ścieżka dialogu: link → word gate → potwierdzenie → callable → wylogowanie po usunięciu.
const deleteThroughDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Usuń konto i wszystkie dane' }));
  const confirm = (await screen.findByText('Usuń trwale')).closest('button') as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Wpisz USUŃ, aby potwierdzić/), { target: { value: 'usuń' } });
  expect(confirm.disabled).toBe(false);
  fireEvent.click(confirm);
  await waitFor(() => expect(mocks.deleteOwnAccount).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onAccountDeleted).toHaveBeenCalledTimes(1));
  expect(onLogout).not.toHaveBeenCalled();
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  mocks.deleteOwnAccount.mockClear();
  mocks.deleteOwnAccount.mockResolvedValue({ success: true });
  mocks.toast.mockClear();
  onLogout.mockClear();
  onAccountDeleted.mockClear();
});

describe('B1: usunięcie konta bez zakupu', () => {
  it('hard paywall, teaser: link "Usuń konto" prowadzi przez word gate do usunięcia', async () => {
    wrap(<Paywall onLogout={onLogout} onAccountDeleted={onAccountDeleted} />);
    expect(screen.getByText('Twój plan jest gotowy')).toBeInTheDocument();
    await deleteThroughDialog();
  });

  it('hard paywall, cennik: link "Usuń konto" obok Wyloguj', async () => {
    wrap(<Paywall onLogout={onLogout} onAccountDeleted={onAccountDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: /Odblokuj pełny plan/ }));
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument();
    await deleteThroughDialog();
  });

  it('anulowanie dialogu nic nie usuwa', async () => {
    wrap(<Paywall onLogout={onLogout} onAccountDeleted={onAccountDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń konto i wszystkie dane' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Anuluj' }));
    expect(mocks.deleteOwnAccount).not.toHaveBeenCalled();
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });

  it('błąd usuwania: toast, dialog zostaje, bez wylogowania (zasada 6: można ponowić)', async () => {
    mocks.deleteOwnAccount.mockRejectedValueOnce(new Error('offline'));
    wrap(<Paywall onLogout={onLogout} onAccountDeleted={onAccountDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń konto i wszystkie dane' }));
    fireEvent.change(await screen.findByLabelText(/Wpisz USUŃ, aby potwierdzić/), { target: { value: 'USUŃ' } });
    fireEvent.click(screen.getByText('Usuń trwale').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(onAccountDeleted).not.toHaveBeenCalled();
    expect((screen.getByText('Usuń trwale').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('bramka weryfikacji emaila ma ścieżkę usunięcia konta', async () => {
    wrap(<EmailVerificationGate email="user@gmail.com" onLogout={onLogout} onAccountDeleted={onAccountDeleted} />);
    await deleteThroughDialog();
  });

  it('bramka nowych zgód ma ścieżkę usunięcia konta', async () => {
    wrap(<ConsentGate profile={null} onConfirmed={vi.fn()} onLogout={onLogout} onAccountDeleted={onAccountDeleted} />);
    await deleteThroughDialog();
  });

  it('bez onAccountDeleted dialog po usunięciu domyka sesję przez onLogout', async () => {
    wrap(<ConsentGate profile={null} onConfirmed={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń konto i wszystkie dane' }));
    fireEvent.change(await screen.findByLabelText(/Wpisz USUŃ, aby potwierdzić/), { target: { value: 'USUŃ' } });
    fireEvent.click(screen.getByText('Usuń trwale').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });
});
