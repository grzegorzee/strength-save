import { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import { isTrackingType } from '@/lib/set-tracking';

const CUSTOM_EXERCISES_COLLECTION = 'custom_exercises';
// 100 własnych ćwiczeń wystarcza na lata; limit chroni koszty czytań.
const CUSTOM_EXERCISES_LISTENER_LIMIT = 100;

/** Własne ćwiczenie usera w kształcie ćwiczenia z biblioteki + stabilne id ('custom-'+docId). */
export interface CustomExercise extends LibraryExercise {
  id: string;
}

export interface CustomExerciseInput {
  name: string;
  category: LibraryExercise['category'];
  isBodyweight: boolean;
  type: 'compound' | 'isolation';
  /** Typ śledzenia serii (Z105). Brak = weight_reps (isBodyweight => bodyweight_reps). */
  tracking?: LibraryExercise['tracking'];
}

const E2E_KEY = 'fittracker_e2e_custom_exercises';

// E2E: własne ćwiczenia z localStorage (Firestore w mock e2e jest zablokowany) —
// wzorzec fittracker_e2e_cycles z usePlanCycles.
const readE2ECustomExercises = (): CustomExercise[] => {
  if (import.meta.env.VITE_E2E_MODE !== 'true') return [];
  try {
    const raw = window.localStorage.getItem(E2E_KEY);
    return raw ? (JSON.parse(raw) as CustomExercise[]) : [];
  } catch {
    return [];
  }
};

const toCustomExercise = (docId: string, data: Record<string, unknown>): CustomExercise => ({
  id: `custom-${docId}`,
  name: String(data.name ?? ''),
  category: data.category as LibraryExercise['category'],
  type: data.type === 'isolation' ? 'isolation' : 'compound',
  isBodyweight: data.isBodyweight === true,
  ...(isTrackingType(data.tracking) ? { tracking: data.tracking } : {}),
  instructions: [],
});

export const useCustomExercises = (userId: string) => {
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>(readE2ECustomExercises);
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
      collection(db, CUSTOM_EXERCISES_COLLECTION),
      where('userId', '==', userId),
      limit(CUSTOM_EXERCISES_LISTENER_LIMIT),
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data: CustomExercise[] = [];
        snapshot.forEach((docSnap) => {
          data.push(toCustomExercise(docSnap.id, docSnap.data() as Record<string, unknown>));
        });
        // Sortowanie klienckie po nazwie — where+orderBy(createdAt) wymagałoby indeksu złożonego.
        data.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
        setCustomExercises(data);
        setIsLoaded(true);
      },
      (err) => {
        console.error('[useCustomExercises] Error:', err);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const addCustomExercise = useCallback(async (input: CustomExerciseInput): Promise<CustomExercise> => {
    const name = input.name.trim();

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      const created: CustomExercise = {
        id: `custom-e2e-${Date.now()}`,
        name,
        category: input.category,
        type: input.type,
        isBodyweight: input.isBodyweight,
        ...(input.tracking ? { tracking: input.tracking } : {}),
        instructions: [],
      };
      setCustomExercises((prev) => {
        const next = [...prev, created];
        try { window.localStorage.setItem(E2E_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      return created;
    }

    const ref = await addDoc(collection(db, CUSTOM_EXERCISES_COLLECTION), {
      userId,
      name,
      category: input.category,
      isBodyweight: input.isBodyweight,
      type: input.type,
      ...(input.tracking ? { tracking: input.tracking } : {}),
      createdAt: Date.now(),
    });
    return {
      id: `custom-${ref.id}`,
      name,
      category: input.category,
      type: input.type,
      isBodyweight: input.isBodyweight,
      ...(input.tracking ? { tracking: input.tracking } : {}),
      instructions: [],
    };
  }, [userId]);

  const removeCustomExercise = useCallback(async (customId: string): Promise<void> => {
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setCustomExercises((prev) => {
        const next = prev.filter((ex) => ex.id !== customId);
        try { window.localStorage.setItem(E2E_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      return;
    }
    const docId = customId.replace(/^custom-/, '');
    await deleteDoc(doc(db, CUSTOM_EXERCISES_COLLECTION, docId));
  }, []);

  return { customExercises, addCustomExercise, removeCustomExercise, isLoaded };
};
