import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppTourOutcome, CloudAppTourState } from '@/lib/first-workout-tour';

// Przewodnik nowego konta: koniec (done/skipped) mirrorowany w
// users/{uid}.preferences.appTour (reguły: `preferences` to dozwolona mapa).
// Wzorzec persistWarmupPrompt: lokalny stan NAJPIERW (wywołujący), chmura
// w tle; brak sieci = false, wywołujący trzyma pendingSync i ponawia.
export const persistAppTourOutcome = async (uid: string, outcome: AppTourOutcome): Promise<boolean> => {
  if (!uid) return false;
  const value: CloudAppTourState = { status: outcome, at: new Date().toISOString() };
  try {
    await updateDoc(doc(db, 'users', uid), { 'preferences.appTour': value });
    return true;
  } catch {
    return false;
  }
};
