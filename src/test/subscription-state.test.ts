import { describe, expect, it } from 'vitest';
import { isSubscriptionActive, mapSubscription } from '@/lib/user-profile';

const NOW = new Date('2026-06-11T12:00:00Z').getTime();
const FUTURE = '2026-07-11T12:00:00Z';
const PAST = '2026-05-11T12:00:00Z';

describe('mapSubscription', () => {
  it('zwraca null gdy brak pola', () => {
    expect(mapSubscription(undefined)).toBeNull();
  });

  it('normalizuje nieznane wartości do none', () => {
    const sub = mapSubscription({ tier: 'platinum', status: 'weird' });
    expect(sub).toEqual({ tier: 'none', status: 'none', expiresAt: null });
  });

  it('zachowuje poprawne pola', () => {
    const sub = mapSubscription({
      tier: 'yearly', status: 'active', expiresAt: FUTURE,
      productId: 'strengthsave_pro_yearly', willRenew: true, updatedAt: PAST,
    });
    expect(sub).toEqual({
      tier: 'yearly', status: 'active', expiresAt: FUTURE,
      productId: 'strengthsave_pro_yearly', willRenew: true, updatedAt: PAST,
    });
  });
});

describe('isSubscriptionActive', () => {
  it('null => brak dostępu', () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false);
  });

  it('comp active => dostęp bezterminowy (bez expiresAt)', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'comp', status: 'active' }), NOW)).toBe(true);
  });

  it('comp expired => brak dostępu', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'comp', status: 'expired' }), NOW)).toBe(false);
  });

  it('active z przyszłym expiresAt => dostęp', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'monthly', status: 'active', expiresAt: FUTURE }), NOW)).toBe(true);
  });

  it('active z przeszłym expiresAt => brak (np. webhook EXPIRATION nie dotarł)', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'monthly', status: 'active', expiresAt: PAST }), NOW)).toBe(false);
  });

  it('billing_issue w grace period (przyszłe expiresAt) => dostęp zostaje', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'yearly', status: 'billing_issue', expiresAt: FUTURE }), NOW)).toBe(true);
  });

  it('expired/cancelled => brak dostępu mimo przyszłego expiresAt', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'yearly', status: 'expired', expiresAt: FUTURE }), NOW)).toBe(false);
    expect(isSubscriptionActive(mapSubscription({ tier: 'yearly', status: 'cancelled', expiresAt: FUTURE }), NOW)).toBe(false);
  });

  it('active bez expiresAt (nie-comp) => brak dostępu (dane niekompletne)', () => {
    expect(isSubscriptionActive(mapSubscription({ tier: 'monthly', status: 'active' }), NOW)).toBe(false);
  });
});
