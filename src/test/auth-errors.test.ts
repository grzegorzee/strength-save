import { describe, expect, it } from 'vitest';
import { isAuthCancellation, mapAuthErrorMessage } from '@/lib/auth-errors';
import type { TranslationKey } from '@/i18n';

// Bug 10 (X30): social login pokazywał surowe angielskie komunikaty Firebase
// i natywnych pluginów w czerwonym Alercie — także przy zwykłym odpuszczeniu
// sheetu Apple/Google. Mapper: anulowanie = cichy powrót (null), znane kody =
// dedykowane klucze i18n, reszta = generyczny auth.err.login.

const t = (key: TranslationKey) => `t:${key}`;
const firebaseError = (code: string, message = 'Firebase: Error (xyz).') =>
  Object.assign(new Error(message), { code });

describe('isAuthCancellation', () => {
  it('kody anulowania Firebase Auth = cichy powrót', () => {
    expect(isAuthCancellation(firebaseError('auth/popup-closed-by-user'))).toBe(true);
    expect(isAuthCancellation(firebaseError('auth/cancelled-popup-request'))).toBe(true);
    expect(isAuthCancellation(firebaseError('auth/user-cancelled'))).toBe(true);
  });

  it('odpuszczenie natywnego sheetu Google (surowe localizedDescription) = anulowanie', () => {
    expect(isAuthCancellation(new Error('The user canceled the sign-in flow.'))).toBe(true);
  });

  it('odpuszczenie natywnego sheetu Apple (ASAuthorizationError 1001) = anulowanie', () => {
    expect(isAuthCancellation(new Error(
      'The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)',
    ))).toBe(true);
  });

  it('kod auth/* spoza listy anulowań NIE jest cichy, nawet gdy message zawiera "cancel"', () => {
    expect(isAuthCancellation(firebaseError('auth/network-request-failed', 'request cancelled by proxy'))).toBe(false);
  });
});

describe('mapAuthErrorMessage', () => {
  it('anulowanie zwraca null (bez Alertu)', () => {
    expect(mapAuthErrorMessage(firebaseError('auth/popup-closed-by-user'), t)).toBeNull();
  });

  it('kolizja kont dostaje dedykowany komunikat', () => {
    expect(mapAuthErrorMessage(firebaseError('auth/account-exists-with-different-credential'), t))
      .toBe('t:auth.err.accountExists');
  });

  it('brak sieci i zablokowany popup mają własne klucze', () => {
    expect(mapAuthErrorMessage(firebaseError('auth/network-request-failed'), t)).toBe('t:auth.err.network');
    expect(mapAuthErrorMessage(firebaseError('auth/popup-blocked'), t)).toBe('t:auth.err.popupBlocked');
  });

  it('nieznany błąd = generyczny auth.err.login zamiast surowego angielskiego tekstu', () => {
    expect(mapAuthErrorMessage(firebaseError('auth/internal-error'), t)).toBe('t:auth.err.login');
    expect(mapAuthErrorMessage(new Error('Some raw plugin failure'), t)).toBe('t:auth.err.login');
    expect(mapAuthErrorMessage(undefined, t)).toBe('t:auth.err.login');
  });
});
