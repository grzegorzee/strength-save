import { describe, expect, it } from 'vitest';
import type { PurchasesPackage, SubscriptionOption } from '@revenuecat/purchases-capacitor';
import {
  resolvePurchaseOptions,
  trialPresentation,
} from '@/lib/purchases';

const iosPackage = (identifier: string, weeks: number): PurchasesPackage => ({
  identifier: `$rc_${identifier}`,
  packageType: identifier === 'yearly' ? 'ANNUAL' : 'MONTHLY',
  offeringIdentifier: 'default',
  presentedOfferingContext: {
    offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null,
  },
  webCheckoutUrl: null,
  product: {
    identifier: `strengthsave_pro_${identifier}`,
    price: 14.99,
    priceString: '14,99 zł',
    introPrice: {
      price: 0,
      priceString: '0 zł',
      cycles: 1,
      period: `P${weeks}W`,
      periodUnit: 'WEEK',
      periodNumberOfUnits: weeks,
    },
  },
} as PurchasesPackage);

const googleOption = (id: string, freeDays: number | null, isBasePlan = false): SubscriptionOption => ({
  id,
  storeProductId: 'strengthsave_pro_monthly:monthly',
  productId: 'strengthsave_pro_monthly',
  pricingPhases: [],
  tags: [],
  isBasePlan,
  billingPeriod: { unit: 'MONTH', value: 1, iso8601: 'P1M' },
  isPrepaid: false,
  fullPricePhase: null,
  freePhase: freeDays === null ? null : {
    billingPeriod: { unit: 'DAY', value: freeDays, iso8601: `P${freeDays}D` },
    recurrenceMode: 2,
    billingCycleCount: 1,
    price: { formatted: '0 zł', amountMicros: 0, currencyCode: 'PLN' },
    offerPaymentMode: 'FREE_TRIAL',
  },
  introPhase: null,
  presentedOfferingIdentifier: 'default',
  presentedOfferingContext: null,
  installmentsInfo: null,
} as SubscriptionOption);

describe('Z208 — eligibility-aware paywall contract', () => {
  it('shows the iOS trial only for explicit eligible status', async () => {
    const pkg = iosPackage('yearly', 2);
    const [eligible] = await resolvePurchaseOptions([pkg], 'ios', async () => ({
      [pkg.product.identifier]: { status: 2 },
    }));
    const [ineligible] = await resolvePurchaseOptions([pkg], 'ios', async () => ({
      [pkg.product.identifier]: { status: 1 },
    }));
    const [unknown] = await resolvePurchaseOptions([pkg], 'ios', async () => {
      throw new Error('offline');
    });

    expect(eligible.trial).toEqual({ status: 'eligible', days: 14 });
    expect(trialPresentation(eligible.trial)).toEqual({ line: 'trial', cta: 'trial', renewal: 'trial' });
    expect(ineligible.trial).toEqual({ status: 'ineligible', days: null });
    expect(unknown.trial).toEqual({ status: 'unknown', days: null });
    expect(trialPresentation(ineligible.trial)).toEqual({ line: 'standard', cta: 'standard', renewal: 'standard' });
    expect(trialPresentation(unknown.trial)).toEqual({ line: 'standard', cta: 'standard', renewal: 'standard' });
  });

  it('uses an actually returned Google Play free option and purchases no inferred trial', async () => {
    const free = googleOption('monthly:trial-7d', 7);
    const base = googleOption('monthly', null, true);
    const pkg = {
      ...iosPackage('monthly', 1),
      product: {
        ...iosPackage('monthly', 1).product,
        introPrice: null,
        subscriptionOptions: [free, base],
        defaultOption: base,
      },
    } as PurchasesPackage;

    const [eligible] = await resolvePurchaseOptions([pkg], 'android');
    expect(eligible.trial).toEqual({ status: 'eligible', days: 7 });
    expect(eligible.subscriptionOption).toBe(free);

    const [ineligible] = await resolvePurchaseOptions([{
      ...pkg,
      product: { ...pkg.product, subscriptionOptions: [base], defaultOption: base },
    }], 'android');
    expect(ineligible.trial).toEqual({ status: 'ineligible', days: null });
    expect(ineligible.subscriptionOption).toBe(base);

    const [unknown] = await resolvePurchaseOptions([{
      ...pkg,
      product: { ...pkg.product, subscriptionOptions: null, defaultOption: null },
    }], 'android');
    expect(unknown.trial).toEqual({ status: 'unknown', days: null });
    expect(unknown.subscriptionOption).toBeNull();
  });
});
