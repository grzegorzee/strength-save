import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

const authoritativeMirror = {
  termsVersion: '2.0',
  privacyVersion: '2.1',
  healthGranted: true,
  healthVersion: '1.1',
};

const recordConsents = vi.fn(async () => authoritativeMirror);
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

  // Bug 1 (X30): świadome wycofanie zgody zdrowotnej (healthGranted=false przy
  // AKTUALNEJ healthVersion) to pełnoprawna decyzja usera — bramka NIE wstaje.
  // Ograniczenia (pomiary, RPE, ból) realizuje useHealthConsent w
  // WorkoutDay/Measurements, zgodnie z DECYZJE.md 2026-08-11 i treścią dialogu
  // wycofania ("Konto i dziennik treningowy zostają").
  it('świadomie wycofana zgoda zdrowotna (aktualna wersja) = false, bez pętli bramki', () => {
    expect(needsConsentRefresh(profileWith({ ...currentConsents, healthGranted: false }))).toBe(false);
  });

  it('brak decyzji zdrowotnej nie blokuje trybu podstawowego', () => {
    expect(needsConsentRefresh(profileWith({
      ...currentConsents,
      healthGranted: undefined,
      healthVersion: undefined,
    }))).toBe(false);
  });

  it('stara decyzja zdrowotna nie blokuje trybu podstawowego', () => {
    expect(needsConsentRefresh(profileWith({
      ...currentConsents,
      healthGranted: false,
      healthVersion: '0.9',
    }))).toBe(false);
  });
});

describe('ConsentGate', () => {
  beforeEach(() => {
    recordConsents.mockReset();
    recordConsents.mockResolvedValue(authoritativeMirror);
    onLogout.mockClear();
    onConfirmed.mockClear();
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  const onLogout = vi.fn(async () => {});
  const onConfirmed = vi.fn();

  const renderGate = (profile: UserProfile) => render(
    <LanguageProvider>
      <ConsentGate profile={profile} onLogout={onLogout} onConfirmed={onConfirmed} />
    </LanguageProvider>,
  );

  it('wymaga tylko regulaminu i privacy; brak health zapisuje decyzję withdrawn', async () => {
    renderGate(profileWith(undefined));
    const submit = screen.getByTestId('consent-gate-submit');
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-terms'));
    fireEvent.click(screen.getByTestId('consent-privacy'));
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() => expect(recordConsents).toHaveBeenCalledTimes(1));
    const submitted = (recordConsents.mock.calls as unknown[][])[0]?.[0];
    expect(submitted).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'health', action: 'withdrawn' }),
    ]));
  });

  // Root cause buildu 129: batch na serwerze kończył się sukcesem, ale gate
  // czekał wyłącznie na kolejny onSnapshot. Gdy listener pozostał na starszym
  // cache'u, po 12 s UI pokazywało fałszywy błąd mimo zapisanych zgód.
  it('po autorytatywnym mirrorze z callable natychmiast potwierdza zapis bez czekania na snapshot', async () => {
    vi.useFakeTimers();
    try {
      renderGate(profileWith(undefined));
      fireEvent.click(screen.getByTestId('consent-terms'));
      fireEvent.click(screen.getByTestId('consent-privacy'));
      fireEvent.click(screen.getByTestId('consent-health'));
      fireEvent.click(screen.getByTestId('consent-gate-submit'));

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      expect(onConfirmed).toHaveBeenCalledExactlyOnceWith(authoritativeMirror);
      expect(screen.queryByTestId('consent-gate-error')).toBeNull();

      // Nieruchomy prop symuluje brak świeżego onSnapshot. Dawny timeout nie
      // może po sukcesie zamienić potwierdzonego zapisu w błąd.
      await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
      expect(screen.queryByTestId('consent-gate-error')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('checkbox marketingu ukryty, gdy zgoda marketingowa już wyrażona', () => {
    renderGate(profileWith({ marketingGranted: true }));
    expect(screen.queryByTestId('consent-marketing')).toBeNull();
    expect(screen.getByTestId('consent-terms')).toBeInTheDocument();
  });

  // Bug 32 (X30): bramka renderowana ZAMIAST HashRouter była jedynym ekranem
  // bez wyjścia — zero logoutu (obce konto na współdzielonym urządzeniu =
  // pułapka). Symetria z EmailVerificationGate: przycisk Wyloguj obok CTA.
  it('ma wyjście Wyloguj niezależne od zaznaczenia zgód (zasada 6)', () => {
    renderGate(profileWith(undefined));
    const logout = screen.getByTestId('consent-gate-logout');
    expect(logout).not.toBeDisabled();
    fireEvent.click(logout);
    expect(onLogout).toHaveBeenCalledTimes(1);
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
    expect(onConfirmed).not.toHaveBeenCalled();

    // Błąd ma nadal ścieżkę wyjścia: ponowienie wysyła jeszcze raz i dopiero
    // zweryfikowany response może zamknąć bramkę.
    fireEvent.click(screen.getByTestId('consent-gate-submit'));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledExactlyOnceWith(authoritativeMirror));
    expect(recordConsents).toHaveBeenCalledTimes(2);
  });
});
