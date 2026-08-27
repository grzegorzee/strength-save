import { Capacitor } from '@capacitor/core';
import { CONSENT_DOC_VERSION } from '@/lib/legal-versions';
import { isConsentBypassed, type ConsentSubmission } from '@/lib/consent-selection';
import { callProtectedFunction } from '@/lib/protected-callable';
import type { ConsentMirror } from '@/lib/legal-versions';

// Zapis zgód przez Cloud Function recordConsent: IP i timestamp muszą pochodzić
// z serwera (rozliczalność art. 7 ust. 1 RODO), więc klient NIE pisze do
// kolekcji consents bezpośrednio (rules blokują). Wywołanie idzie chronioną
// ścieżką (bug 34): 10 s timeout na webie, atestacja best-effort na natywie —
// jak syncUserProfile, bo zapis zgód tak samo blokuje flow pierwszego
// uruchomienia.

export async function recordConsents(
  entries: ConsentSubmission[],
  lang: 'pl' | 'en',
  /** Dedykowany kanał logu (np. ekran marketingowy onboardingu) zamiast platformy. */
  channelOverride?: 'onboarding-marketing-step',
): Promise<ConsentMirror> {
  if (entries.length === 0) return {};
  if (isConsentBypassed) return {};

  const platform = Capacitor.getPlatform();
  const channel = channelOverride ?? (platform === 'ios' || platform === 'android' ? platform : 'web');
  const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown';

  const response = await callProtectedFunction('recordConsent', {
    entries: entries.map((entry) => ({
      type: entry.type,
      action: entry.action,
      docVersion: CONSENT_DOC_VERSION[entry.type],
      lang,
      statementText: entry.statementText,
    })),
    channel,
    appVersion,
  });

  return parseConfirmedConsentMirror(response, entries);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Walidacja fail-closed: sukces transportu bez zgodnego mirrora nie otwiera bramki. */
export function parseConfirmedConsentMirror(
  response: unknown,
  entries: ConsentSubmission[],
): ConsentMirror {
  if (!isRecord(response) || response.ok !== true || response.recorded !== entries.length || !isRecord(response.mirror)) {
    throw new Error('Invalid consent confirmation response');
  }

  const raw = response.mirror;
  const mirror: ConsentMirror = {};
  const readVersion = (key: keyof ConsentMirror): string => {
    const value = raw[key];
    if (typeof value !== 'string' || value.length === 0) throw new Error('Invalid consent confirmation mirror');
    return value;
  };
  const readGranted = (key: keyof ConsentMirror): boolean => {
    const value = raw[key];
    if (typeof value !== 'boolean') throw new Error('Invalid consent confirmation mirror');
    return value;
  };

  for (const entry of entries) {
    const expectedVersion = CONSENT_DOC_VERSION[entry.type];
    switch (entry.type) {
      case 'terms':
        mirror.termsVersion = readVersion('termsVersion');
        if (mirror.termsVersion !== expectedVersion) throw new Error('Stale consent confirmation mirror');
        break;
      case 'privacy_ack':
        mirror.privacyVersion = readVersion('privacyVersion');
        if (mirror.privacyVersion !== expectedVersion) throw new Error('Stale consent confirmation mirror');
        break;
      case 'health':
        mirror.healthGranted = readGranted('healthGranted');
        mirror.healthVersion = readVersion('healthVersion');
        if (mirror.healthVersion !== expectedVersion || mirror.healthGranted !== (entry.action === 'granted')) {
          throw new Error('Mismatched consent confirmation mirror');
        }
        break;
      case 'marketing':
        mirror.marketingGranted = readGranted('marketingGranted');
        mirror.marketingVersion = readVersion('marketingVersion');
        if (mirror.marketingVersion !== expectedVersion || mirror.marketingGranted !== (entry.action === 'granted')) {
          throw new Error('Mismatched consent confirmation mirror');
        }
        break;
    }
  }
  return mirror;
}
