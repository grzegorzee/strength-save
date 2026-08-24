import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// WP-K (X29): audyt wyjść z paywalla dla świeżego usera (hard mode po
// onboardingu). Kontrakt: KAŻDE wyjście na dashboard po hard paywallu niesie
// /?welcome=1 (wasHard.current), żeby Dashboard pokazał confetti + popup
// pomiarów startowych. Test pinuje efekt isPro (wspólne domknięcie wszystkich
// ścieżek sukcesu: zakup, restore, comp) oraz niezmienniki: zwykły user PRO
// bez hard trafia na gołe '/', a hard user bez PRO nie ma strzałki wstecz
// (navigate(-1) nieosiągalny, jedyna ucieczka = Wyloguj).

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const fixture = vi.hoisted(() => ({
  isPro: false,
  hardStatus: 'enforced' as 'enforced' | 'off' | 'pending',
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: null, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: fixture.isPro, loading: false, refresh: vi.fn(async () => {}) }),
  isPaywallPlatform: () => true,
}));
vi.mock('@/hooks/useHardPaywall', () => ({
  useHardPaywall: () => fixture.hardStatus,
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: [
      { id: 'day-1', dayName: 'Dzień A', weekday: 'monday', focus: 'Push', exercises: [] },
    ],
    planDurationWeeks: 12,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/exercise-media', () => ({ getPaywallHeroUrl: () => 'https://cdn.example/hero.webp' }));

import Paywall from '@/pages/Paywall';

const renderPaywall = () =>
  render(
    <MemoryRouter initialEntries={['/paywall']}>
      <LanguageProvider>
        <Paywall onLogout={vi.fn(async () => {})} />
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  fixture.isPro = false;
  fixture.hardStatus = 'enforced';
});

describe('wyjścia z paywalla a /?welcome=1 (WP-K)', () => {
  it('SEKWENCJA hard → PRO: wyjście na dashboard niesie /?welcome=1', async () => {
    const view = renderPaywall();
    // Świeży user w hard mode widzi teaser planu, zero nawigacji.
    expect(screen.getByText('Twój plan jest gotowy')).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();

    // Zakup/restore/comp: entitlement aktywny → guard puszcza (off), isPro true.
    fixture.isPro = true;
    fixture.hardStatus = 'off';
    view.rerender(
      <MemoryRouter initialEntries={['/paywall']}>
        <LanguageProvider>
          <Paywall onLogout={vi.fn(async () => {})} />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith('/?welcome=1', { replace: true }),
    );
  });

  it('NIEZMIENNIK: user PRO bez hard trafia na gołe "/", bez confetti', async () => {
    fixture.isPro = true;
    fixture.hardStatus = 'off';
    renderPaywall();
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true }));
    expect(navigateSpy).not.toHaveBeenCalledWith('/?welcome=1', { replace: true });
  });

  it('NIEZMIENNIK: hard bez PRO nie ma strzałki wstecz (navigate(-1) nieosiągalny)', async () => {
    renderPaywall();
    // Krok 1: teaser bez strzałki, jedyna ucieczka to Wyloguj.
    expect(screen.queryByRole('button', { name: 'Zamknij' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument();
    // Krok 2: cennik po odrzuceniu teasera — nadal bez strzałki wstecz.
    fireEvent.click(screen.getByRole('button', { name: 'Odblokuj pełny plan' }));
    await waitFor(() => expect(screen.queryByText('Twój plan jest gotowy')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Zamknij' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
