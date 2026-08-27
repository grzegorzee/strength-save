import { describe, expect, it } from 'vitest';
import { LEGAL_VERSIONS as CLIENT_VERSIONS, CONSENT_DOC_VERSION as CLIENT_DOC_VERSION, CONSENT_TYPES as CLIENT_TYPES } from '@/lib/legal-versions';
import { LEGAL_VERSIONS as SERVER_VERSIONS, CONSENT_DOC_VERSION as SERVER_DOC_VERSION, CONSENT_TYPES as SERVER_TYPES } from '../../functions/src/legal-versions';

// Klient wysyła docVersion, funkcja recordConsent waliduje przeciw własnej
// mapie. Rozjazd wersji = każdy zapis zgody odrzucony (onboarding staje).
describe('legal-versions parity (src vs functions)', () => {
  it('wymaga publicznej polityki prywatności 2.1', () => {
    expect(CLIENT_VERSIONS.privacy).toBe('2.1');
    expect(SERVER_VERSIONS.privacy).toBe('2.1');
  });

  it('LEGAL_VERSIONS identyczne po obu stronach', () => {
    expect(CLIENT_VERSIONS).toEqual(SERVER_VERSIONS);
  });

  it('CONSENT_DOC_VERSION identyczne po obu stronach', () => {
    expect(CLIENT_DOC_VERSION).toEqual(SERVER_DOC_VERSION);
  });

  it('typy zgód identyczne po obu stronach', () => {
    expect([...CLIENT_TYPES]).toEqual([...SERVER_TYPES]);
  });
});
