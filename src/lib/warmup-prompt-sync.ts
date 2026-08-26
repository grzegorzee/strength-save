import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setWarmupPromptEnabled } from '@/lib/warmup-prompt';

// X37 WP-B: zapis preferencji rozgrzewki: cache NAJPIERW (offline wystarcza),
// potem mirror w preferences.warmupPrompt (wzorzec persistRestSettings).
// Brak sieci = cichy fail, cache i tak decyduje o arkuszu przy starcie.
export const persistWarmupPrompt = async (uid: string | null | undefined, enabled: boolean): Promise<void> => {
  setWarmupPromptEnabled(enabled);
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), { 'preferences.warmupPrompt': enabled });
  } catch {
    // offline / brak uprawnień: cache zostaje, następna zmiana dosynchronizuje
  }
};
