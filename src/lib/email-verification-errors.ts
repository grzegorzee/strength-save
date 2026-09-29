import type { TranslationKey } from '@/i18n';

// B3 (2026-09-29): bramka weryfikacji emaila pokazywała error.message z backendu,
// a backend pisze tylko po polsku ("Nieprawidłowy kod.", "Kod wygasł."), więc
// user EN widział polskie komunikaty. Kontraktem jest kod błędu callable
// (+ opcjonalne details.reason z nowszego backendu), tekst tłumaczy klient.
// Mapowanie po samym kodzie działa też ze starszym, już wdrożonym backendem.

export type EmailVerificationErrorReason =
  | 'code-missing'
  | 'code-not-found'
  | 'code-wrong-owner'
  | 'code-inactive'
  | 'code-expired'
  | 'too-many-attempts'
  | 'code-invalid'
  | 'resend-cooldown'
  | 'profile-missing';

const REASON_KEYS: Record<EmailVerificationErrorReason, TranslationKey | null> = {
  'code-missing': 'comp.emailGate.err.codeInvalid',
  'code-invalid': 'comp.emailGate.err.codeInvalid',
  'code-not-found': 'comp.emailGate.err.codeInactive',
  'code-inactive': 'comp.emailGate.err.codeInactive',
  'code-wrong-owner': 'comp.emailGate.err.codeInactive',
  'code-expired': 'comp.emailGate.err.codeExpired',
  'too-many-attempts': 'comp.emailGate.err.tooManyAttempts',
  'resend-cooldown': 'comp.emailGate.err.resendCooldown',
  // Brak profilu nie jest winą kodu: generyczny komunikat operacji.
  'profile-missing': null,
};

const readCode = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code.replace(/^functions\//, '') : '';
};

const readReason = (error: unknown): EmailVerificationErrorReason | null => {
  const details = (error as { details?: unknown } | null)?.details;
  const reason = details && typeof details === 'object' ? (details as { reason?: unknown }).reason : undefined;
  return typeof reason === 'string' && reason in REASON_KEYS ? reason as EmailVerificationErrorReason : null;
};

// Fallback dla backendu bez details.reason: kody są rozłączne w verifyEmailCode
// poza failed-precondition (kod nieaktywny vs brak profilu), więc ten kod bez
// reason dostaje komunikat generyczny zamiast zgadywania.
const CODE_KEYS: Record<string, TranslationKey> = {
  'invalid-argument': 'comp.emailGate.err.codeInvalid',
  'not-found': 'comp.emailGate.err.codeInactive',
  'permission-denied': 'comp.emailGate.err.codeInactive',
  'deadline-exceeded': 'comp.emailGate.err.codeExpired',
};

/** Komunikat błędu weryfikacji/wysyłki kodu w języku UI. Nigdy surowy tekst. */
export function mapEmailVerificationError(
  error: unknown,
  t: (key: TranslationKey) => string,
  operation: 'send' | 'verify',
  fallbackKey: TranslationKey,
): string {
  const reason = readReason(error);
  if (reason) {
    const key = REASON_KEYS[reason];
    return t(key ?? fallbackKey);
  }
  const code = readCode(error);
  if (code === 'resource-exhausted') {
    // Ten sam kod = cooldown wysyłki albo limit prób weryfikacji.
    return t(operation === 'send' ? 'comp.emailGate.err.resendCooldown' : 'comp.emailGate.err.tooManyAttempts');
  }
  if (operation === 'verify' && CODE_KEYS[code]) return t(CODE_KEYS[code]);
  // 'unavailable' z backendu = odrzucenie przez dostawcę maila (sendEmail),
  // nie brak sieci po stronie usera: zostaje ogólny komunikat operacji.
  return t(fallbackKey);
}
