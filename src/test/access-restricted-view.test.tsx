import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AccessRestrictedView } from '@/components/AuthenticatedApp';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

const retry = vi.fn(async () => undefined);
const logout = vi.fn(async () => undefined);

const renderView = (input: {
  blockReason: 'app-verification-required' | 'registration-closed';
  syncPending?: boolean;
}) => render(
  <LanguageProvider>
    <AccessRestrictedView
      email="new@example.com"
      accessEnabled={false}
      blockReason={input.blockReason}
      syncPending={input.syncPending ?? false}
      onRetry={retry}
      onLogout={logout}
    />
  </LanguageProvider>,
);

describe('AccessRestrictedView registration recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    retry.mockClear();
    logout.mockClear();
  });

  it('brak atestacji ma własny komunikat i retry bez reloadu', () => {
    renderView({ blockReason: 'app-verification-required' });

    expect(screen.getByRole('heading', { name: 'Nie udało się zweryfikować aplikacji' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it('zamknięta rejestracja nie udaje błędu App Check', () => {
    renderView({ blockReason: 'registration-closed' });

    expect(screen.getByRole('heading', { name: 'Rejestracja jest teraz zamknięta' })).toBeInTheDocument();
    expect(screen.queryByText('Nie udało się zweryfikować aplikacji')).toBeNull();
  });

  it('pending blokuje kolejne kliknięcie retry', () => {
    renderView({ blockReason: 'app-verification-required', syncPending: true });

    const button = screen.getByRole('button', { name: 'Sprawdzam…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });
});
