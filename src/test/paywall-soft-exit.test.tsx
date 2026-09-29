import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// B4 (2026-09-29, audyt R1): słaba sieć na końcu onboardingu. useHardPaywall
// po 1,5 s fail-open (hasWorkouts=true) daje tryb miękki, Onboarding robi
// navigate('/paywall', { replace: true }), więc historia ma indeks 0.
// Strzałka wstecz robiła navigate(-1) = nic; nav ukryta na /paywall, Wyloguj
// tylko w hard. Stan bez wyjścia (zasada 6). Fix: jak Layout.handleBack,
// przy idx 0 wyjście na dashboard.

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/registration-api', () => ({ deleteOwnAccount: vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: null, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, loading: false, refresh: vi.fn(async () => {}) }),
  isPaywallPlatform: () => true,
}));
// Fail-open useHardPaywall = 'off' (tryb miękki, ze strzałką wstecz).
vi.mock('@/hooks/useHardPaywall', () => ({ useHardPaywall: () => 'off' }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planDurationWeeks: 12 }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/exercise-media', () => ({ getPaywallHeroUrl: () => 'https://cdn.example/hero.webp' }));

import Paywall from '@/pages/Paywall';

const renderPaywall = () => render(
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
});

describe('B4: miękki paywall zawsze ma wyjście', () => {
  it('wejście z replace (historia idx 0): strzałka wstecz wychodzi na dashboard', () => {
    window.history.replaceState({ idx: 0 }, '');
    renderPaywall();
    fireEvent.click(screen.getByLabelText('Zamknij'));
    expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true });
    expect(navigateSpy).not.toHaveBeenCalledWith(-1);
  });

  it('NIEZMIENNIK: wejście z innego ekranu (idx > 0) nadal cofa o jeden krok', () => {
    window.history.replaceState({ idx: 3 }, '');
    renderPaywall();
    fireEvent.click(screen.getByLabelText('Zamknij'));
    expect(navigateSpy).toHaveBeenCalledWith(-1);
  });
});
