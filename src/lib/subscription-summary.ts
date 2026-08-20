import type { TranslationKey } from '@/i18n';
import type { SubscriptionState, SubscriptionTier } from '@/lib/user-profile';

export type UntilKind = 'renews' | 'expires' | 'grace' | 'trialEnds';

export interface SubscriptionSummary {
  /** Klucz i18n nazwy planu / stanu. */
  planKey: TranslationKey;
  /** Klucz i18n opisu bez dat (admin/comp); null gdy opis budują daty. */
  detailKey: TranslationKey | null;
  /** Początek bieżącego okresu ("aktywna od"). */
  fromIso: string | null;
  /** Koniec bieżącego okresu. */
  untilIso: string | null;
  /** Jak opisać untilIso: odnawia się / wygasa / grace / koniec triala. */
  untilKind: UntilKind | null;
  /** Aktywna subskrypcja sklepowa — pokaż "Zarządzaj subskrypcją" (App Store). */
  hasStoreSubscription: boolean;
}

/**
 * Chip PRO w nagłówku Profilu (spec 2026-08-11): każdy plan poza darmowym
 * (płatny/trial/comp/admin). Darmowy user nie dostaje chipa FREE.
 */
export const hasProPlan = (planKey: SubscriptionSummary['planKey']): boolean =>
  planKey !== 'subscription.none';

const EMPTY: Omit<SubscriptionSummary, 'planKey' | 'detailKey'> = {
  fromIso: null,
  untilIso: null,
  untilKind: null,
  hasStoreSubscription: false,
};

/**
 * Czysty stan → struktura pod SectionCard "Subskrypcja" w Profilu.
 * Wejście to scalone wartości z useSubscription (Firestore + fallback RevenueCat);
 * formatter nie dubluje logiki źródeł, tylko dobiera klucze i daty.
 */
export const summarizeSubscription = (input: {
  isAdmin: boolean;
  isPro: boolean;
  tier: SubscriptionTier;
  startedAt: string | null;
  expiresAt: string | null;
  subscription: SubscriptionState | null;
}): SubscriptionSummary => {
  if (input.isAdmin) {
    return { planKey: 'subscription.admin', detailKey: 'subscription.adminDesc', ...EMPTY };
  }
  if (!input.isPro) {
    return { planKey: 'subscription.none', detailKey: null, ...EMPTY };
  }
  if (input.tier === 'comp') {
    // 2026-08-20: grant z panelu może mieć datę końca — pokaż ją zamiast "Bezterminowo".
    if (input.expiresAt) {
      return {
        planKey: 'subscription.comp',
        detailKey: null,
        fromIso: null,
        untilIso: input.expiresAt,
        untilKind: 'expires',
        hasStoreSubscription: false,
      };
    }
    return { planKey: 'subscription.comp', detailKey: 'subscription.compDesc', ...EMPTY };
  }

  const untilKind: UntilKind = input.tier === 'trial'
    ? 'trialEnds'
    : input.subscription?.status === 'billing_issue'
      ? 'grace'
      : input.subscription?.willRenew === false
        ? 'expires'
        : 'renews';

  const planKeys: Partial<Record<SubscriptionTier, TranslationKey>> = {
    monthly: 'subscription.plan.monthly',
    yearly: 'subscription.plan.yearly',
    trial: 'subscription.plan.trial',
  };

  return {
    planKey: planKeys[input.tier] ?? 'subscription.none',
    detailKey: null,
    fromIso: input.startedAt,
    untilIso: input.expiresAt,
    untilKind: input.expiresAt ? untilKind : null,
    hasStoreSubscription: true,
  };
};
