import { useCurrentUser } from '@/contexts/UserContext';
import { getConsentMirror } from '@/lib/consent-selection';
import { getActiveHealthGrant, hasActiveHealthConsent, type ActiveHealthGrant } from '@/lib/legal-versions';

export { hasActiveHealthConsent } from '@/lib/legal-versions';

/**
 * Czy user ma aktywną zgodę na przetwarzanie danych zdrowotnych (art. 9 RODO).
 * Fail-closed: brak, odmowa albo nieaktualna wersja nie blokują dziennika, ale
 * wyłączają funkcje zdrowotne do czasu dobrowolnego opt-inu.
 */
export const useHealthConsent = (): boolean => {
  const { profile } = useCurrentUser();
  return hasActiveHealthConsent(getConsentMirror(profile));
};

/** Bieżąca generacja zapisu health; null oznacza tryb podstawowy bez zapisów zdrowotnych. */
export const useActiveHealthGrant = (): ActiveHealthGrant | null => {
  const { profile } = useCurrentUser();
  return getActiveHealthGrant(getConsentMirror(profile));
};
