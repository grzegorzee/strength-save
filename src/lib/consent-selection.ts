import type { TranslationKey } from '@/i18n';
import {
  hasCurrentRequiredConsents,
  type ConsentAction,
  type ConsentMirror,
  type ConsentType,
} from '@/lib/legal-versions';
import type { UserProfile } from '@/lib/user-profile';

// Czyste helpery zgód (pakiet prawny v2) — poza komponentami (react-refresh)
// i BEZ importów wartości z modułów firebase, żeby testy jsdom nie ciągnęły
// realnego initializeAuth (consents-api importuje stąd, nie odwrotnie).

// W KAŻDYM trybie e2e (mock i emulator) zgody są pomijane — seedowani userzy
// e2e nie mają mirrora zgód i każdy scenariusz utknąłby na ConsentGate.
export const isConsentBypassed = import.meta.env.VITE_E2E_MODE === 'true';

export interface ConsentSubmission {
  type: ConsentType;
  action: ConsentAction;
  /** Dokładna treść oświadczenia pokazana userowi (z i18n, w jego języku). */
  statementText: string;
}

export interface ConsentSelection {
  terms: boolean;
  privacy: boolean;
  health: boolean;
  marketing: boolean;
}

export const EMPTY_CONSENT_SELECTION: ConsentSelection = {
  terms: false,
  privacy: false,
  health: false,
  marketing: false,
};

export const hasRequiredConsents = (value: ConsentSelection): boolean =>
  value.terms && value.privacy;

/**
 * Buduje wpisy do recordConsent z DOKŁADNĄ treścią oświadczeń pokazanych
 * userowi (dowód rozliczalności). Musi odpowiadać tekstom renderowanym
 * w ConsentCheckboxes.
 */
export function buildConsentSubmissions(
  t: (key: TranslationKey) => string,
  value: ConsentSelection,
): ConsentSubmission[] {
  const entries: ConsentSubmission[] = [
    { type: 'terms', action: 'granted', statementText: `${t('consent.termsPrefix')} ${t('consent.termsLink')}.` },
    { type: 'privacy_ack', action: 'granted', statementText: `${t('consent.privacyPrefix')} ${t('consent.privacyLink')}.` },
    { type: 'health', action: value.health ? 'granted' : 'withdrawn', statementText: t('consent.health') },
  ];
  // Marketing: rejestrujemy tylko aktywną decyzję (zaznaczenie). Brak
  // zaznaczenia = brak zgody = brak wpisu (nie ma czego dowodzić).
  if (value.marketing) {
    entries.push({ type: 'marketing', action: 'granted', statementText: t('consent.marketing') });
  }
  return entries;
}

/**
 * Wpis z dedykowanego kroku marketingowego onboardingu (spec 2026-08-11).
 * Odmowa też trafia do logu (action=withdrawn) — dowód rozliczalności i pamięć
 * "user odpowiedział" (mirror.marketingVersion ustawiona w obu ścieżkach).
 */
export function buildMarketingStepSubmission(
  t: (key: TranslationKey) => string,
  granted: boolean,
): ConsentSubmission {
  return {
    type: 'marketing',
    action: granted ? 'granted' : 'withdrawn',
    statementText: t('consent.marketing'),
  };
}

export const getConsentMirror = (profile: UserProfile | null): ConsentMirror | undefined =>
  (profile as (UserProfile & { consents?: ConsentMirror }) | null)?.consents;

/**
 * Czy pokazać krok marketingowy onboardingu: tylko gdy user jeszcze nigdy nie
 * odpowiedział (mirror bez marketingVersion). E2E omija krok jak resztę zgód.
 */
export const shouldShowMarketingStep = (profile: UserProfile | null): boolean => {
  if (isConsentBypassed) return false;
  return getConsentMirror(profile)?.marketingVersion === undefined;
};

/** Czy pokazać bramkę re-consent (poza trybami e2e). */
export const needsConsentRefresh = (profile: UserProfile | null): boolean => {
  if (isConsentBypassed) return false;
  if (!profile) return false;
  return !hasCurrentRequiredConsents(getConsentMirror(profile));
};
