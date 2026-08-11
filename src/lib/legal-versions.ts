// Kanoniczne wersje dokumentów prawnych i oświadczeń zgód.
// MUSI być identyczne z functions/src/legal-versions.ts (pilnuje tego test
// parity src/test/legal-versions-parity.test.ts). Bump wersji = re-consent
// wszystkich userów przy następnym otwarciu aplikacji (ConsentGate).
export const LEGAL_VERSIONS = {
  terms: '2.0',
  privacy: '2.0',
  health: '1.0',
  marketing: '1.0',
} as const;

export const CONSENT_TYPES = ['terms', 'privacy_ack', 'health', 'marketing'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_ACTIONS = ['granted', 'withdrawn'] as const;
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

// Który wpis LEGAL_VERSIONS obowiązuje dla danego typu zgody.
export const CONSENT_DOC_VERSION: Record<ConsentType, string> = {
  terms: LEGAL_VERSIONS.terms,
  privacy_ack: LEGAL_VERSIONS.privacy,
  health: LEGAL_VERSIONS.health,
  marketing: LEGAL_VERSIONS.marketing,
};

// Mirror zgód w users/{uid}.consents utrzymywany przez Cloud Function
// recordConsent. Klient go tylko czyta (rules nie pozwalają na zapis pola).
export interface ConsentMirror {
  termsVersion?: string;
  privacyVersion?: string;
  healthGranted?: boolean;
  healthVersion?: string;
  marketingGranted?: boolean;
  marketingVersion?: string;
}

/** Czy komplet obowiązkowych zgód jest aktualny (terms, privacy_ack, health). */
export function hasCurrentRequiredConsents(mirror: ConsentMirror | undefined | null): boolean {
  if (!mirror) return false;
  return (
    mirror.termsVersion === LEGAL_VERSIONS.terms
    && mirror.privacyVersion === LEGAL_VERSIONS.privacy
    && mirror.healthGranted === true
    && mirror.healthVersion === LEGAL_VERSIONS.health
  );
}
