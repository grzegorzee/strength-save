import { describe, it, expect } from 'vitest';
import { resolvePaywallGuard, type PaywallGuardInput } from '@/lib/paywall-guard';

const base: PaywallGuardInput = {
  platformEligible: true,
  subscriptionLoading: false,
  isPro: false,
  hasCompletedWorkouts: false,
};

describe('resolvePaywallGuard', () => {
  it('świeży user na iOS bez PRO i bez treningów → enforced (redirect na paywall)', () => {
    expect(resolvePaywallGuard(base)).toBe('enforced');
  });

  it('user z ukończonymi treningami i wygasłym dostępem → off (read-only zostaje)', () => {
    expect(resolvePaywallGuard({ ...base, hasCompletedWorkouts: true })).toBe('off');
  });

  it('admin/comp (isPro) → off, nawet bez treningów', () => {
    expect(resolvePaywallGuard({ ...base, isPro: true })).toBe('off');
  });

  it('web (platforma nieobjęta) → off niezależnie od reszty', () => {
    expect(resolvePaywallGuard({ ...base, platformEligible: false })).toBe('off');
    expect(resolvePaywallGuard({
      platformEligible: false,
      subscriptionLoading: true,
      isPro: false,
      hasCompletedWorkouts: null,
    })).toBe('off');
  });

  it('stan subskrypcji w trakcie ładowania → pending (nie pokazuj apki ani paywalla)', () => {
    expect(resolvePaywallGuard({ ...base, subscriptionLoading: true })).toBe('pending');
  });

  it('treningi jeszcze niesprawdzone (null) → pending', () => {
    expect(resolvePaywallGuard({ ...base, hasCompletedWorkouts: null })).toBe('pending');
  });

  it('PRO ma pierwszeństwo przed sprawdzaniem treningów', () => {
    expect(resolvePaywallGuard({ ...base, isPro: true, hasCompletedWorkouts: null })).toBe('off');
  });

  it('PRO potwierdzone zwalnia guard nawet gdy reszta źródeł jeszcze się ładuje', () => {
    expect(resolvePaywallGuard({ ...base, isPro: true, subscriptionLoading: true })).toBe('off');
  });
});
