import type { TranslationKey } from '@/i18n';

// Bug 10 (X30): social login pokazywał surowe angielskie komunikaty Firebase
// i natywnych pluginów (reject(error.localizedDescription) w
// @capacitor-firebase/authentication) w czerwonym Alercie — także przy
// zwykłym odpuszczeniu sheetu Apple/Google. Mapper: anulowanie = cichy powrót
// (null, bez Alertu), znane kody = dedykowane klucze i18n, reszta =
// generyczny auth.err.login zamiast surowego tekstu.

const CANCELLED_AUTH_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

// Natywne sheety odrzucają anulowanie surowym komunikatem systemowym:
// GIDSignIn "The user canceled the sign-in flow", ASAuthorizationError 1001
// (Apple), Android GoogleSignIn status 12501 (SIGN_IN_CANCELLED).
const CANCELLED_MESSAGE_PATTERN = /cancel|anulowa|\b1001\b|\b12501\b/i;

const readCode = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : '';
};

const readMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : '';
};

/** true = user sam przerwał logowanie; żaden Alert, cichy powrót do ekranu. */
export const isAuthCancellation = (error: unknown): boolean => {
  const code = readCode(error);
  // Kod auth/* jest autorytatywny — heurystyka po message tylko dla odrzuceń
  // pluginów bez sensownego kodu.
  if (code.startsWith('auth/')) return CANCELLED_AUTH_CODES.has(code);
  return CANCELLED_MESSAGE_PATTERN.test(`${code} ${readMessage(error)}`);
};

/**
 * Komunikat błędu logowania dla usera albo null (anulowanie = cichy powrót).
 * B2 (2026-09-29): ta sama mapa obsługuje logowanie i rejestrację emailem
 * (wcześniej surowe "Firebase: Error (auth/...)"); `fallbackKey` pozwala
 * rejestracji mieć własny generyczny komunikat.
 */
export function mapAuthErrorMessage(
  error: unknown,
  t: (key: TranslationKey) => string,
  fallbackKey: TranslationKey = 'auth.err.login',
): string | null {
  if (isAuthCancellation(error)) return null;
  switch (readCode(error)) {
    case 'auth/account-exists-with-different-credential':
      return t('auth.err.accountExists');
    case 'auth/network-request-failed':
      return t('auth.err.network');
    case 'auth/popup-blocked':
      return t('auth.err.popupBlocked');
    case 'auth/email-already-in-use':
      return t('auth.err.emailInUse');
    case 'auth/weak-password':
      return t('auth.err.weakPassword');
    case 'auth/invalid-email':
      return t('auth.err.invalidEmail');
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('auth.err.invalidCredentials');
    case 'auth/too-many-requests':
      return t('auth.err.tooManyRequests');
    case 'auth/user-disabled':
      return t('auth.err.userDisabled');
    default:
      return t(fallbackKey);
  }
}
