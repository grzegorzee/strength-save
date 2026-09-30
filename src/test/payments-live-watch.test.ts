import { describe, expect, it } from 'vitest';
import {
  MAX_RUNTIME_MS,
  WATCH_MAX_DOCS,
  assertRevenueCatRead,
  diffState,
  parseWatchArgs,
  summarizeRevenueCat,
  summarizeUser,
  worstCaseReads,
} from '../../scripts/payments-live-watch-helpers.mjs';

// Podgląd płatności na żywo (docs/PAYMENTS-SANDBOX-TEST.md): tylko odczyt, limit
// czasu i odczytów zgodny z zasadą 21. Bramki muszą odrzucać zły stan (zasada 15).

const RC = 'https://api.revenuecat.com/v2/projects/proj67cb081f';

describe('payments-live-watch: bramka RevenueCat tylko do odczytu', () => {
  it('przepuszcza GET klienta, jego subskrypcji, entitlementów i katalogu produktów', () => {
    for (const path of ['/customers/uid1', '/customers/uid1/subscriptions?limit=20&environment=sandbox', '/customers/uid1/active_entitlements?limit=20', '/products?limit=100']) {
      expect(() => assertRevenueCatRead('GET', `${RC}${path}`)).not.toThrow();
    }
  });

  it('odrzuca zapis, inne zasoby, inny projekt i inny host', () => {
    expect(() => assertRevenueCatRead('POST', `${RC}/customers/uid1`)).toThrow(/białej listy/);
    expect(() => assertRevenueCatRead('DELETE', `${RC}/customers/uid1`)).toThrow(/białej listy/);
    expect(() => assertRevenueCatRead('GET', `${RC}/customers/uid1/actions/grant_entitlement`)).toThrow(/białej listy/);
    expect(() => assertRevenueCatRead('GET', `${RC}/integrations/webhooks`)).toThrow(/białej listy/);
    expect(() => assertRevenueCatRead('GET', 'https://api.revenuecat.com/v2/projects/other/customers/uid1')).toThrow(/białej listy/);
    expect(() => assertRevenueCatRead('GET', 'https://evil.example/v2/projects/proj67cb081f/customers/uid1')).toThrow(/białej listy/);
  });
});

describe('payments-live-watch: limity', () => {
  it('30 minut co 10 s mieści się w budżecie odczytów zasady 21', () => {
    expect(MAX_RUNTIME_MS).toBe(30 * 60_000);
    expect(worstCaseReads()).toBeLessThanOrEqual(WATCH_MAX_DOCS);
    expect(WATCH_MAX_DOCS).toBeLessThanOrEqual(5000);
  });

  it('argumenty: cel wymagany, interwał min. 5 s, czas maks. 30 min', () => {
    expect(parseWatchArgs(['a@b.pl'])).toEqual({ target: 'a@b.pl', intervalMs: 10_000, minutes: 30 });
    expect(() => parseWatchArgs([])).toThrow(/Użycie/);
    expect(() => parseWatchArgs(['uid', '--interval', '1'])).toThrow(/5 s/);
    expect(() => parseWatchArgs(['uid', '--minutes', '31'])).toThrow(/30/);
    expect(() => parseWatchArgs(['uid', '--max-docs', '9999'])).toThrow(/nieznana/);
  });
});

describe('payments-live-watch: wykrywanie zmian', () => {
  it('EXPIRATION z webhooka daje czytelne zmiany tier/status/expiresAt', () => {
    const before = summarizeUser({ subscription: { tier: 'trial', status: 'active', expiresAt: '2026-10-01T12:20:10.000Z', store: 'APP_STORE', environment: 'SANDBOX', willRenew: true } });
    const after = summarizeUser({ subscription: { tier: 'none', status: 'expired', expiresAt: null, store: 'APP_STORE', environment: 'SANDBOX', willRenew: false } });
    expect(diffState(before, after).map(c => c.path)).toEqual([
      'subscription.tier', 'subscription.status', 'subscription.expiresAt', 'subscription.willRenew',
    ]);
    expect(diffState(after, after)).toEqual([]);
  });

  it('brak dokumentu i pojawienie się grantu comp są zmianą, nie wyjątkiem', () => {
    const none = summarizeUser(null);
    const comp = summarizeUser({ subscription: { tier: 'comp', status: 'active', expiresAt: null } });
    expect(diffState(none, comp)[0]).toMatchObject({ path: 'subscription', from: null });
  });

  it('stan RC mapuje produkt na identyfikator sklepu i daty ms na ISO', () => {
    const state = summarizeRevenueCat({
      customer: { id: 'uid1', last_seen_at: 1_790_770_815_787 },
      entitlements: [{ entitlement_id: 'entl', expires_at: 1_790_857_210_000 }],
      subscriptions: [{ product_id: 'proda62028ebff', store: 'app_store', environment: 'sandbox', status: 'trialing', gives_access: true, auto_renewal_status: 'will_renew', current_period_ends_at: 1_790_857_210_000 }],
      products: { proda62028ebff: 'strengthsave_pro_monthly' },
    });
    expect(state).toMatchObject({
      customerExists: true,
      activeEntitlements: [{ expiresAt: new Date(1_790_857_210_000).toISOString() }],
      subscriptions: [{ product: 'strengthsave_pro_monthly', status: 'trialing', autoRenewal: 'will_renew' }],
    });
  });
});
