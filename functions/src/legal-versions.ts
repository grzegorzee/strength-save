// Kanoniczne wersje dokumentów prawnych i oświadczeń zgód.
// MUSI być identyczne z src/lib/legal-versions.ts (pilnuje tego test parity
// src/test/legal-versions-parity.test.ts). Bump wersji = re-consent wszystkich
// userów przy następnym otwarciu aplikacji.
export const LEGAL_VERSIONS = {
  terms: "2.0",
  privacy: "2.1",
  health: "1.1",
  marketing: "1.0",
} as const;

export const CONSENT_TYPES = ["terms", "privacy_ack", "health", "marketing"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_ACTIONS = ["granted", "withdrawn"] as const;
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

// Który wpis LEGAL_VERSIONS obowiązuje dla danego typu zgody.
export const CONSENT_DOC_VERSION: Record<ConsentType, string> = {
  terms: LEGAL_VERSIONS.terms,
  privacy_ack: LEGAL_VERSIONS.privacy,
  health: LEGAL_VERSIONS.health,
  marketing: LEGAL_VERSIONS.marketing,
};
