import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  PalettePreferenceOutboxEntry,
  PalettePreferencePatch,
} from '@/lib/palette-preference-outbox';

/** Transakcja odrzuca zaległy wybór offline, jeśli inne urządzenie zapisało już
 * nowszą rewizję. Ten sam mutationId pozostaje idempotentny po retry. */
export const writePalettePreference = async (
  uid: string,
  patch: PalettePreferencePatch,
  entry: PalettePreferenceOutboxEntry,
): Promise<'synced' | 'stale'> => runTransaction(db, async (transaction) => {
  const ref = doc(db, 'users', uid);
  const snapshot = await transaction.get(ref);
  const preferences = snapshot.data()?.preferences as Record<string, unknown> | undefined;
  const cloudRevision = typeof preferences?.paletteRevision === 'number'
    && Number.isSafeInteger(preferences.paletteRevision)
    && preferences.paletteRevision >= 0
    ? preferences.paletteRevision
    : 0;
  if (preferences?.paletteMutationId === entry.clientMutationId) return 'synced';
  if (cloudRevision > entry.baseRevision) return 'stale';

  transaction.update(ref, {
    ...patch,
    'preferences.paletteRevision': cloudRevision + 1,
  });
  return 'synced';
});
