import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { slugifyExercise } from '@/lib/exercise-media';
import {
  exerciseNoteDocId,
  sanitizeExerciseNote,
  type ExerciseNote,
} from '@/lib/exercise-notes';

const EXERCISE_NOTES_COLLECTION = 'exercise_notes';
// Notatka per ćwiczenie, którego user realnie używa; limit chroni koszty czytań.
const EXERCISE_NOTES_LISTENER_LIMIT = 300;

const E2E_KEY = 'fittracker_e2e_exercise_notes';

// Klucz mapy = slug nazwy: "Przysiad" i " przysiad " to ta sama notatka.
const noteKey = (exerciseName: string): string => slugifyExercise(exerciseName);

// E2E: notatki z localStorage (Firestore w mock e2e jest zablokowany) — wzorzec useCustomExercises.
const readE2ENotes = (): Record<string, ExerciseNote> => {
  if (import.meta.env.VITE_E2E_MODE !== 'true') return {};
  try {
    const raw = window.localStorage.getItem(E2E_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ExerciseNote>) : {};
  } catch {
    return {};
  }
};

export const useExerciseNotes = (userId: string) => {
  const [notes, setNotes] = useState<Record<string, ExerciseNote>>(readE2ENotes);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setIsLoaded(true);
      return;
    }

    const q = query(
      collection(db, EXERCISE_NOTES_COLLECTION),
      where('userId', '==', userId),
      limit(EXERCISE_NOTES_LISTENER_LIMIT),
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data: Record<string, ExerciseNote> = {};
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          const exerciseName = String(raw.exerciseName ?? '');
          if (!exerciseName) return;
          data[noteKey(exerciseName)] = {
            userId: String(raw.userId ?? ''),
            exerciseName,
            note: String(raw.note ?? ''),
            ...(typeof raw.machineSettings === 'string' && raw.machineSettings
              ? { machineSettings: raw.machineSettings }
              : {}),
            updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
          };
        });
        setNotes(data);
        setIsLoaded(true);
      },
      (err) => {
        console.error('[useExerciseNotes] Error:', err);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const getPinnedNote = useCallback(
    (exerciseName: string): ExerciseNote | undefined => notes[noteKey(exerciseName)],
    [notes],
  );

  const deletePinnedNote = useCallback(async (exerciseName: string): Promise<void> => {
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setNotes((prev) => {
        const next = { ...prev };
        delete next[noteKey(exerciseName)];
        try { window.localStorage.setItem(E2E_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      return;
    }
    await deleteDoc(doc(db, EXERCISE_NOTES_COLLECTION, exerciseNoteDocId(userId, exerciseName)));
  }, [userId]);

  const savePinnedNote = useCallback(async (
    exerciseName: string,
    input: { note?: string; machineSettings?: string },
  ): Promise<void> => {
    const sanitized = sanitizeExerciseNote(input);
    // Pusta notatka bez ustawień maszyny = usunięcie (nie trzymamy pustych dokumentów).
    if (!sanitized.note && !sanitized.machineSettings) {
      await deletePinnedNote(exerciseName);
      return;
    }
    const record: ExerciseNote = {
      userId,
      exerciseName,
      ...sanitized,
      updatedAt: Date.now(),
    };

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setNotes((prev) => {
        const next = { ...prev, [noteKey(exerciseName)]: record };
        try { window.localStorage.setItem(E2E_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      return;
    }

    await setDoc(doc(db, EXERCISE_NOTES_COLLECTION, exerciseNoteDocId(userId, exerciseName)), record);
  }, [userId, deletePinnedNote]);

  return { getPinnedNote, savePinnedNote, deletePinnedNote, isLoaded };
};
