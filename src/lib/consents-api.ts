import { httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { functions } from '@/lib/firebase';
import { CONSENT_DOC_VERSION } from '@/lib/legal-versions';
import { isConsentBypassed, type ConsentSubmission } from '@/lib/consent-selection';

// Zapis zgód przez Cloud Function recordConsent: IP i timestamp muszą pochodzić
// z serwera (rozliczalność art. 7 ust. 1 RODO), więc klient NIE pisze do
// kolekcji consents bezpośrednio (rules blokują).

export async function recordConsents(
  entries: ConsentSubmission[],
  lang: 'pl' | 'en',
  /** Dedykowany kanał logu (np. ekran marketingowy onboardingu) zamiast platformy. */
  channelOverride?: 'onboarding-marketing-step',
): Promise<void> {
  if (entries.length === 0) return;
  if (isConsentBypassed) return;

  const platform = Capacitor.getPlatform();
  const channel = channelOverride ?? (platform === 'ios' || platform === 'android' ? platform : 'web');
  const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown';

  const call = httpsCallable(functions, 'recordConsent');
  await call({
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
}
