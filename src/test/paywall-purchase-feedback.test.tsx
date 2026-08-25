import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Bug 47 (X30): udany zakup bez aktywnego entitlementu 'pro' w CustomerInfo
// (realnie: desync konfiguracji RevenueCat w dashboardzie — produkt odpięty od
// entitlementu) kończył się martwą ciszą: zero toastu, zero nawigacji, tylko
// setBusy(false). Zasada 6: każdy stan musi mieć feedback. Kontrakt: gałąź else
// analogiczna do handleRestore — toast paywall.purchasePending + refresh();
// listener CustomerInfo i redirect przy isPro zostają siatką bezpieczeństwa.

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const toastSpy = vi.hoisted(() => vi.fn());
const refreshSpy = vi.hoisted(() => vi.fn(async () => {}));

// Wynik zakupu sterowany per test: pusty active = sukces bez entitlementu.
const purchaseFixture = vi.hoisted(() => ({
  active: {} as Record<string, { expirationDate: string | null }>,
}));
const purchaseSpy = vi.hoisted(() =>
  vi.fn(async () => ({ customerInfo: { entitlements: { active: purchaseFixture.active } } })),
);

const yearlyPkg = vi.hoisted(() => ({
  identifier: '$rc_annual',
  packageType: 'ANNUAL',
  product: { identifier: 'strengthsave_pro_yearly', priceString: '119,99 zł' },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    getOfferings: vi.fn(async () => ({ current: { availablePackages: [yearlyPkg] } })),
    purchasePackage: purchaseSpy,
    purchaseSubscriptionOption: vi.fn(),
  },
}));
vi.mock('@/lib/purchases', () => ({
  PRO_ENTITLEMENT: 'pro',
  resolvePurchaseOptions: async (pkgs: Array<typeof yearlyPkg>) =>
    pkgs.map((pkg) => ({ pkg, trial: { status: 'unknown', days: null }, subscriptionOption: null })),
  trialPresentation: () => ({ line: 'standard', cta: 'standard', renewal: 'standard' }),
  yearlyValueSummary: () => ({ savingsPercent: null, perMonth: null }),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: null, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, loading: false, refresh: refreshSpy }),
  isPaywallPlatform: () => true,
}));
vi.mock('@/hooks/useHardPaywall', () => ({ useHardPaywall: () => 'off' }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planDurationWeeks: 12 }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));
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

const clickBuy = async () => {
  const cta = await screen.findByRole('button', { name: 'Przejdź na PRO' });
  await waitFor(() => expect(cta).toBeEnabled());
  fireEvent.click(cta);
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  toastSpy.mockClear();
  refreshSpy.mockClear();
  purchaseSpy.mockClear();
  purchaseFixture.active = {};
});

describe('feedback po zakupie na paywallu (bug 47 / X30)', () => {
  it('sukces zakupu BEZ aktywnego entitlementu => toast "zakup przyjęty", bez fałszywej nawigacji', async () => {
    renderPaywall();
    await clickBuy();

    await waitFor(() => expect(purchaseSpy).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Zakup przyjęty. PRO aktywuje się za chwilę.' }),
      ),
    );
    expect(refreshSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('NIEZMIENNIK: zakup z aktywnym entitlementem nawiguję na dashboard bez toastu oczekiwania', async () => {
    purchaseFixture.active = { pro: { expirationDate: null } };
    renderPaywall();
    await clickBuy();

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/', { replace: true }));
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Zakup przyjęty. PRO aktywuje się za chwilę.' }),
    );
  });
});
