// F-T3: klient wysyłki podsumowania treningu mailem (callable w functions).
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { TranslationKey } from '@/i18n';

// WP-I: opcjonalne imię odbiorcy — backend robi z niego powitanie w mailu.
export const sendWorkoutEmail = async (workoutId: string, to: string, lang: string, trainerName?: string): Promise<void> => {
  await httpsCallable(functions, 'emailWorkoutSummary')({ workoutId, to, lang, ...(trainerName ? { trainerName } : {}) });
};

// H-T1: zakres historii — ostatni tydzień (domyślnie) albo 30 ostatnich
// treningów. Żadnej opcji "wszystko" (200 naraz nie miało sensu).
export type HistoryEmailRange = 'week' | 'last30';

export const sendHistoryEmail = async (to: string, lang: string, range: HistoryEmailRange = 'week', trainerName?: string): Promise<void> => {
  await httpsCallable(functions, 'emailWorkoutHistory')({ to, lang, range, ...(trainerName ? { trainerName } : {}) });
};

/** Mapa błędów callable -> komunikat z wyjściem (reguła #6: user wie co kliknąć). */
export const emailErrorKey = (error: unknown): TranslationKey => {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('resource-exhausted')) return 'email.errQuota';
  if (code.includes('invalid-argument')) return 'email.errInvalid';
  if (code.includes('failed-precondition')) return 'email.errEmptyHistory';
  return 'email.errGeneric';
};
