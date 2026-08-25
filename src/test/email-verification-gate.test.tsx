import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Bug 9 (X30): po udanym verifyEmailCode bramka zamyka się dopiero snapshotem
// users/{uid} (status active). Przy słabym zasięgu snapshot się spóźnia, a
// bramka pozwalała na retry kończący się sprzecznym "Kod nie jest już aktywny"
// obok toastu o sukcesie. Wzorzec ConsentGate: stan oczekiwania z timeoutem
// (zasada 6) + obsługa alreadyVerified z backendu (bez fałszywego "wysłano"
// i 60 s cooldownu, gdy nic nie poszło).

const mocks = vi.hoisted(() => ({
  requestEmailVerificationCode: vi.fn(async (): Promise<{ sent: boolean; alreadyVerified?: boolean }> => ({ sent: true })),
  verifyEmailCode: vi.fn(async () => ({ verified: true })),
  trackTelemetryEvent: vi.fn(),
}));

vi.mock('@/lib/registration-api', () => ({
  requestEmailVerificationCode: mocks.requestEmailVerificationCode,
  verifyEmailCode: mocks.verifyEmailCode,
}));

vi.mock('@/lib/app-telemetry', () => ({
  trackTelemetryEvent: mocks.trackTelemetryEvent,
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));

import { EmailVerificationGate } from '@/components/EmailVerificationGate';

const onLogout = vi.fn(async () => {});

const renderGate = () => render(
  <LanguageProvider>
    <EmailVerificationGate email="user@gmail.com" onLogout={onLogout} />
  </LanguageProvider>,
);

const typeCode = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('Kod 6-cyfrowy'), { target: { value } });
};

const verifyButton = () => screen.getByText('Potwierdź kod').closest('button') as HTMLButtonElement;

describe('EmailVerificationGate', () => {
  beforeEach(() => {
    mocks.requestEmailVerificationCode.mockClear();
    mocks.requestEmailVerificationCode.mockResolvedValue({ sent: true });
    mocks.verifyEmailCode.mockReset();
    mocks.verifyEmailCode.mockResolvedValue({ verified: true });
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('po udanym kodzie wchodzi w stan oczekiwania: przycisk zablokowany, bez czerwonego alertu', async () => {
    renderGate();
    typeCode('123456');
    fireEvent.click(verifyButton());

    await waitFor(() => expect(screen.getByTestId('email-gate-awaiting')).toBeInTheDocument());
    expect(screen.getByText('Email potwierdzony. Odświeżamy Twój profil, to potrwa chwilę.')).toBeInTheDocument();
    expect(verifyButton()).toBeDisabled();
    expect(document.querySelector('[data-testid="email-gate-refresh"]')).toBeNull();
  });

  it('po timeoucie oczekiwania pokazuje komunikat i wyjście Odśwież (zasada 6)', async () => {
    vi.useFakeTimers();
    try {
      renderGate();
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      typeCode('123456');
      fireEvent.click(verifyButton());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(screen.getByTestId('email-gate-awaiting')).toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(13_000); });
      expect(screen.getByText(/nie dostała jeszcze potwierdzenia/)).toBeInTheDocument();
      expect(screen.getByTestId('email-gate-refresh')).toBeInTheDocument();
      expect(verifyButton()).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('niezmiennik: błąd weryfikacji PRZED sukcesem nadal pokazuje destruktywny alert', async () => {
    mocks.verifyEmailCode.mockRejectedValueOnce(new Error('Nieprawidłowy kod.'));
    renderGate();
    typeCode('654321');
    fireEvent.click(verifyButton());

    await waitFor(() => expect(screen.getByText('Nieprawidłowy kod.')).toBeInTheDocument());
    expect(document.querySelector('[data-testid="email-gate-awaiting"]')).toBeNull();
    expect(verifyButton()).not.toBeDisabled();
  });

  it('alreadyVerified przy starcie: bez fałszywego cooldownu, komunikat o zweryfikowanym koncie', async () => {
    mocks.requestEmailVerificationCode.mockResolvedValue({ sent: true, alreadyVerified: true });
    renderGate();

    await waitFor(() => expect(screen.getByTestId('email-gate-awaiting')).toBeInTheDocument());
    expect(screen.getByText('To konto jest już zweryfikowane. Czekamy na odświeżenie profilu.')).toBeInTheDocument();
    // Bez cooldownu: przycisk nie odlicza (jest zablokowany stanem oczekiwania).
    expect(screen.queryByText(/Wyślij ponownie \(\d+s\)/)).toBeNull();
    expect(verifyButton()).toBeDisabled();
  });

  it('alreadyVerified przy ponownym wysłaniu: bez toastu "wysłano" i bez cooldownu', async () => {
    vi.useFakeTimers();
    try {
      renderGate();
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      // Cooldown z auto-wysyłki przy montażu musi minąć.
      await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
      const resend = screen.getByText('Wyślij ponownie').closest('button') as HTMLButtonElement;
      expect(resend).not.toBeDisabled();

      mocks.requestEmailVerificationCode.mockResolvedValue({ sent: true, alreadyVerified: true });
      fireEvent.click(resend);
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      expect(screen.getByTestId('email-gate-awaiting')).toBeInTheDocument();
      expect(screen.getByText('To konto jest już zweryfikowane. Czekamy na odświeżenie profilu.')).toBeInTheDocument();
      expect(screen.queryByText(/Wyślij ponownie \(\d+s\)/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
