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
import {
  sanitizeWorkoutDayNote,
  workoutDayNoteDocId,
  type WorkoutDayNote,
} from '@/lib/workout-day-notes';

const WORKOUT_DAY_NOTES_COLLECTION = 'workout_day_notes';
// Notatka per dzień treningu; limit chroni koszty czytań (wzorzec useExerciseNotes).
const WORKOUT_DAY_NOTES_LISTENER_LIMIT = 100;

const E2E_KEY = 'fittracker_e2e_workout_day_notes';

// E2E: notatki z localStorage (Firestore w mock e2e jest zablokowany) — wzorzec useExerciseNotes.
const readE2ENotes = (): Record<string, WorkoutDayNote> => {
  if (import.meta.env.VITE_E2E_MODE !== 'true') return {};
  try {
    const raw = window.localStorage.getItem(E2E_KEY);
    return raw ? (JSON.parse(raw) as Record<string, WorkoutDayNote>) : {};
  } catch {
    return {};
  }
};

export const useWorkoutDayNotes = (userId: string) => {
  const [notes, setNotes] = useState<Record<string, WorkoutDayNote>>(readE2ENotes);
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
      collection(db, WORKOUT_DAY_NOTES_COLLECTION),
      where('userId', '==', userId),
      limit(WORKOUT_DAY_NOTES_LISTENER_LIMIT),
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data: Record<string, WorkoutDayNote> = {};
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          const date = String(raw.date ?? '');
          if (!date) return;
          data[date] = {
            userId: String(raw.userId ?? ''),
            date,
            note: String(raw.note ?? ''),
            updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
          };
        });
        setNotes(data);
        setIsLoaded(true);
      },
      (err) => {
        console.error('[useWorkoutDayNotes] Error:', err);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const getDayNote = useCallback(
    (dateISO: string): WorkoutDayNote | undefined => notes[dateISO],
    [notes],
  );

  const deleteDayNote = useCallback(async (dateISO: string): Promise<void> => {
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setNotes((prev) => {
        const next = { ...prev };
        delete next[dateISO];
        try { window.localStorage.setItem(E2E_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      return;
    }
    await deleteDoc(doc(db, WORKOUT_DAY_NOTES_COLLECTION, workoutDayNoteDocId(userId, dateISO)));
  }, [userId]);

  const saveDayNote = useCallback(async (dateISO: string, note: string): Promise<void> => {
    const sanitized = sanitizeWorkoutDayNote({ note });
    // Pusta notatka = usunięcie (nie trzymamy pustych dokumentów).
    if (!sanitized.note) {
      await deleteDayNote(dateISO);
      return;
    }
    const record: WorkoutDayNote = {
      userId,
      date: dateISO,
      note: sanitized.note,
      updatedAt: Date.now(),
    };

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setNotes((prev) => {
        const next = { ...prev, [dateISO]: record };
        try { window.localStorage.setItem(E2E_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      return;
    }

    await setDoc(doc(db, WORKOUT_DAY_NOTES_COLLECTION, workoutDayNoteDocId(userId, dateISO)), record);
  }, [userId, deleteDayNote]);

  return { getDayNote, saveDayNote, deleteDayNote, isLoaded };
};
