import { describe, expect, it } from 'vitest';
import { summarizeSubscription } from '@/lib/subscription-summary';
import type { SubscriptionState } from '@/lib/user-profile';

const FROM = '2026-08-11T10:00:00.000Z';
const UNTIL = '2027-08-11T10:00:00.000Z';

const sub = (over: Partial<SubscriptionState>): SubscriptionState => ({
  tier: 'yearly',
  status: 'active',
  startedAt: FROM,
  expiresAt: UNTIL,
  willRenew: true,
  ...over,
});

describe('summarizeSubscription', () => {
  it('admin => pełny dostęp bez dat i bez wiersza zarządzania', () => {
    expect(summarizeSubscription({
      isAdmin: true, isPro: true, tier: 'comp', startedAt: null, expiresAt: null, subscription: null,
    })).toEqual({
      planKey: 'subscription.admin', detailKey: 'subscription.adminDesc',
      fromIso: null, untilIso: null, untilKind: null, hasStoreSubscription: false,
    });
  });

  it('comp => PRO przyznane bezterminowo, bez zarządzania w App Store', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: true, tier: 'comp', startedAt: null, expiresAt: null,
      subscription: sub({ tier: 'comp', expiresAt: null }),
    })).toMatchObject({ planKey: 'subscription.comp', detailKey: 'subscription.compDesc', hasStoreSubscription: false });
  });

  it('roczny odnawialny => zakres od-do z untilKind renews', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: true, tier: 'yearly', startedAt: FROM, expiresAt: UNTIL,
      subscription: sub({}),
    })).toEqual({
      planKey: 'subscription.plan.yearly', detailKey: null,
      fromIso: FROM, untilIso: UNTIL, untilKind: 'renews', hasStoreSubscription: true,
    });
  });

  it('miesięczny anulowany (willRenew=false) => wygasa, nie odnawia się', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: true, tier: 'monthly', startedAt: FROM, expiresAt: UNTIL,
      subscription: sub({ tier: 'monthly', willRenew: false }),
    })).toMatchObject({ planKey: 'subscription.plan.monthly', untilKind: 'expires' });
  });

  it('billing_issue => grace period do expiresAt', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: true, tier: 'monthly', startedAt: FROM, expiresAt: UNTIL,
      subscription: sub({ tier: 'monthly', status: 'billing_issue' }),
    })).toMatchObject({ untilKind: 'grace', hasStoreSubscription: true });
  });

  it('trial => koniec okresu próbnego', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: true, tier: 'trial', startedAt: FROM, expiresAt: UNTIL,
      subscription: sub({ tier: 'trial' }),
    })).toMatchObject({ planKey: 'subscription.plan.trial', untilKind: 'trialEnds', hasStoreSubscription: true });
  });

  it('stan tylko z RevenueCat (Firestore jeszcze bez dokumentu) => plan + renews', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: true, tier: 'monthly', startedAt: FROM, expiresAt: UNTIL, subscription: null,
    })).toMatchObject({ planKey: 'subscription.plan.monthly', untilKind: 'renews', hasStoreSubscription: true });
  });

  // Zasada #5: user bez PRO dalej ma czytelny stan, nic nie znika i nic nie wybucha.
  it('brak subskrypcji => planKey none, zero dat i zarządzania', () => {
    expect(summarizeSubscription({
      isAdmin: false, isPro: false, tier: 'none', startedAt: null, expiresAt: null, subscription: null,
    })).toEqual({
      planKey: 'subscription.none', detailKey: null,
      fromIso: null, untilIso: null, untilKind: null, hasStoreSubscription: false,
    });
  });
});
