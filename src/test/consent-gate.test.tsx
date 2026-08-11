import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

const recordConsents = vi.fn(async () => {});
vi.mock('@/lib/consents-api', () => ({
  recordConsents: (...args: unknown[]) => recordConsents(...args as []),
}));

import { ConsentGate } from '@/components/ConsentGate';
import { needsConsentRefresh } from '@/lib/consent-selection';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';
import type { UserProfile } from '@/lib/user-profile';

// Re-consent (pakiet prawny v2): bramka blokuje trasy, dopóki mirror
// users/{uid}.consents nie ma kompletu AKTUALNYCH zgód.

const profileWith = (consents?: Record<string, unknown>): UserProfile =>
  ({ uid: 'u1', email: 'a@b.c', consents } as unknown as UserProfile);

const currentConsents = {
  termsVersion: LEGAL_VERSIONS.terms,
  privacyVersion: LEGAL_VERSIONS.privacy,
  healthGranted: true,
  healthVersion: LEGAL_VERSIONS.health,
};

describe('needsConsentRefresh', () => {
  it('brak profilu = false (profil jeszcze się ładuje, bramka nie migocze)', () => {
    expect(needsConsentRefresh(null)).toBe(false);
  });

  it('profil bez mirrora zgód = true (istniejący user przed re-consent)', () => {
    expect(needsConsentRefresh(profileWith(undefined))).toBe(true);
  });

  it('komplet aktualnych zgód = false', () => {
    expect(needsConsentRefresh(profileWith(currentConsents))).toBe(false);
  });

  it('stara wersja regulaminu po bumpie = true', () => {
    expect(needsConsentRefresh(profileWith({ ...currentConsents, termsVersion: '1.0' }))).toBe(true);
  });

  it('wycofana zgoda zdrowotna = true (bez niej brak podstawy art. 9)', () => {
    expect(needsConsentRefresh(profileWith({ ...currentConsents, healthGranted: false }))).toBe(true);
  });
});

describe('ConsentGate', () => {
  beforeEach(() => {
    recordConsents.mockClear();
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  const renderGate = (profile: UserProfile) => render(
    <LanguageProvider>
      <ConsentGate profile={profile} />
    </LanguageProvider>,
  );

  it('przycisk zablokowany do zaznaczenia 3 obowiązkowych zgód, potem wysyła recordConsents', async () => {
    renderGate(profileWith(undefined));
    const submit = screen.getByTestId('consent-gate-submit');
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-terms'));
    fireEvent.click(screen.getByTestId('consent-privacy'));
    fireEvent.click(screen.getByTestId('consent-health'));
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() => expect(recordConsents).toHaveBeenCalledTimes(1));
  });

  it('checkbox marketingu ukryty, gdy zgoda marketingowa już wyrażona', () => {
    renderGate(profileWith({ marketingGranted: true }));
    expect(screen.queryByTestId('consent-marketing')).toBeNull();
    expect(screen.getByTestId('consent-terms')).toBeInTheDocument();
  });

  // Reguła #6: sukces zapisu bez zamknięcia bramki (snapshot nie dojechał) nie
  // może zostawić usera ze spinnerem bez wyjścia — po timeoucie przycisk wraca.
  it('po timeoucie oczekiwania na snapshot spinner znika i jest wyjście (retry)', async () => {
    vi.useFakeTimers();
    try {
      renderGate(profileWith(undefined));
      fireEvent.click(screen.getByTestId('consent-terms'));
      fireEvent.click(screen.getByTestId('consent-privacy'));
      fireEvent.click(screen.getByTestId('consent-health'));
      fireEvent.click(screen.getByTestId('consent-gate-submit'));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(recordConsents).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('consent-gate-submit')).toBeDisabled();
      await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
      expect(screen.getByTestId('consent-gate-error')).toBeInTheDocument();
      expect(screen.getByTestId('consent-gate-submit')).not.toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('błąd zapisu pokazuje komunikat i odblokowuje przycisk', async () => {
    recordConsents.mockRejectedValueOnce(new Error('offline'));
    renderGate(profileWith(undefined));
    fireEvent.click(screen.getByTestId('consent-terms'));
    fireEvent.click(screen.getByTestId('consent-privacy'));
    fireEvent.click(screen.getByTestId('consent-health'));
    fireEvent.click(screen.getByTestId('consent-gate-submit'));
    await waitFor(() => expect(screen.getByTestId('consent-gate-error')).toBeInTheDocument());
    expect(screen.getByTestId('consent-gate-submit')).not.toBeDisabled();
  });
});
