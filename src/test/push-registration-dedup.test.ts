import { describe, expect, it } from 'vitest';
import {
  hashPushToken,
  shouldRegisterPushToken,
  readPushRegistrationState,
  markPushTokenConfirmed,
  clearPushRegistrationState,
} from '@/lib/push-registration-state';

// Z212: deduplikacja push registration. Backend wołamy tylko po zmianie
// tokenu/uid albo po 30 dniach; refresh z NOWYM tokenem rejestruje natychmiast
// (inny hash), logout usuwa stan poprzedniego uid.

const memoryStore = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-10T12:00:00Z');

describe('Z212 — dedup rejestracji push', () => {
  it('hash jest deterministyczny i nie przechowuje surowego tokenu', async () => {
    const a = await hashPushToken('fcm-token-abc');
    const b = await hashPushToken('fcm-token-abc');
    const c = await hashPushToken('fcm-token-xyz');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain('fcm-token');
  });

  it('brak stanu = rejestruj', () => {
    expect(shouldRegisterPushToken(null, 'h1', 'u1', NOW)).toBe(true);
  });

  it('ten sam token+uid potwierdzony wczoraj = skip', () => {
    const state = { tokenHash: 'h1', uid: 'u1', confirmedAt: NOW - DAY };
    expect(shouldRegisterPushToken(state, 'h1', 'u1', NOW)).toBe(false);
  });

  it('zmiana tokenu albo uid = natychmiastowa rejestracja', () => {
    const state = { tokenHash: 'h1', uid: 'u1', confirmedAt: NOW - DAY };
    expect(shouldRegisterPushToken(state, 'h2', 'u1', NOW)).toBe(true);
    expect(shouldRegisterPushToken(state, 'h1', 'u2', NOW)).toBe(true);
  });

  it('po 30 dniach rejestruje ponownie mimo braku zmian', () => {
    const fresh = { tokenHash: 'h1', uid: 'u1', confirmedAt: NOW - 29 * DAY };
    const stale = { tokenHash: 'h1', uid: 'u1', confirmedAt: NOW - 31 * DAY };
    expect(shouldRegisterPushToken(fresh, 'h1', 'u1', NOW)).toBe(false);
    expect(shouldRegisterPushToken(stale, 'h1', 'u1', NOW)).toBe(true);
  });

  it('round-trip stanu: zapis, odczyt, logout czyści', () => {
    const store = memoryStore();
    markPushTokenConfirmed('h1', 'u1', NOW, store);
    expect(readPushRegistrationState(store)).toEqual({ tokenHash: 'h1', uid: 'u1', confirmedAt: NOW });
    clearPushRegistrationState(store);
    expect(readPushRegistrationState(store)).toBeNull();
  });

  it('uszkodzony JSON w storage = null, nie wyjątek', () => {
    const store = memoryStore();
    store.setItem('strength-save:push-registration-v1', '{nope');
    expect(readPushRegistrationState(store)).toBeNull();
  });
});
