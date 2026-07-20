import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';

// Usuwanie treningu z UI (Historia). Standalone, żeby strona historii nie musiała
// montować pełnej subskrypcji useFirebaseWorkouts tylko po jedną akcję.
//
// Kasujemy KOMPLET śladów sesji: dokument w chmurze, lokalny szkic i wpis w kolejce
// syncu. Bez tego szkic zostawał i przy następnym wejściu odtwarzał usunięty trening.

const WORKOUTS_COLLECTION = 'workouts';

const isMockE2E = () =>
  import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true';

export const deleteWorkoutEverywhere = async (
  userId: string,
  workoutId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (isMockE2E()) {
      const raw = window.localStorage.getItem('fittracker_e2e_workouts');
      const existing = raw ? JSON.parse(raw) as Array<{ id: string }> : [];
      window.localStorage.setItem(
        'fittracker_e2e_workouts',
        JSON.stringify(existing.filter((w) => w.id !== workoutId)),
      );
    } else {
      await deleteDoc(doc(db, WORKOUTS_COLLECTION, workoutId));
    }

    // Ślady lokalne kasujemy zawsze — nawet gdy dokumentu w chmurze już nie było.
    try {
      await workoutDraftDb.clearActiveDraft(userId, workoutId);
    } catch { /* brak szkicu = nie ma czego czyścić */ }
    try {
      workoutSyncQueue.remove(userId, workoutId);
    } catch { /* kolejka pusta */ }

    return { success: true };
  } catch (err) {
    console.error('[deleteWorkoutEverywhere] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
