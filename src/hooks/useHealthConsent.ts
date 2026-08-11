import { useCurrentUser } from '@/contexts/UserContext';
import { getConsentMirror } from '@/lib/consent-selection';

/**
 * Czy user ma aktywną zgodę na przetwarzanie danych zdrowotnych (art. 9 RODO).
 * Brak mirrora = true: ConsentGate/onboarding i tak nie wpuszczą usera bez
 * kompletu zgód, a domyślne false migotałoby blokadami przy ładowaniu profilu.
 * false wyłącznie po jawnym wycofaniu zgody w ustawieniach.
 */
export const useHealthConsent = (): boolean => {
  const { profile } = useCurrentUser();
  return getConsentMirror(profile)?.healthGranted !== false;
};
