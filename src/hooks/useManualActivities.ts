import { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  sanitizeManualActivity,
  type ManualActivity,
  type ManualActivityInput,
  type ManualActivityType,
} from '@/lib/manual-activity';

const MANUAL_ACTIVITIES_COLLECTION = 'manual_activities';
// Rok codziennego cardio z zapasem; limit chroni koszty czytań.
const MANUAL_ACTIVITIES_LISTENER_LIMIT = 500;

const E2E_KEY = 'fittracker_e2e_manual_activities';

// E2E: wpisy z localStorage (Firestore w mock e2e zablokowany) — wzorzec useCustomExercises.
const readE2EActivities = (): ManualActivity[] => {
  if (import.meta.env.VITE_E2E_MODE !== 'true') return [];
  try {
    const raw = window.localStorage.getItem(E2E_KEY);
    return raw ? (JSON.parse(raw) as ManualActivity[]) : [];
  } catch {
    return [];
  }
};

const writeE2EActivities = (activities: ManualActivity[]): void => {
  try { window.localStorage.setItem(E2E_KEY, JSON.stringify(activities)); } catch { /* ignore */ }
};

/** CRUD ręcznych wpisów cardio (Z111). Edycja/usuwanie DOTYCZY tylko tej kolekcji — Strava read-only. */
export const useManualActivities = (userId: string) => {
  const [activities, setActivities] = useState<ManualActivity[]>(readE2EActivities);
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
      collection(db, MANUAL_ACTIVITIES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(MANUAL_ACTIVITIES_LISTENER_LIMIT),
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data: ManualActivity[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as ManualActivity);
        });
        setActivities(data);
        setIsLoaded(true);
      },
      (err) => {
        console.error('[useManualActivities] Error:', err);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const addActivity = useCallback(async (input: ManualActivityInput): Promise<{ ok: boolean; error?: string }> => {
    const sanitized = sanitizeManualActivity(input);
    if (!sanitized) return { ok: false, error: 'invalid' };

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      const created: ManualActivity = {
        ...(sanitized as ManualActivityInput & { type: ManualActivityType }),
        id: `ma-e2e-${Date.now()}`,
        userId,
        createdAt: Date.now(),
      };
      setActivities((prev) => {
        const next = [created, ...prev].sort((a, b) => b.date.localeCompare(a.date));
        writeE2EActivities(next);
        return next;
      });
      return { ok: true };
    }

    try {
      await addDoc(collection(db, MANUAL_ACTIVITIES_COLLECTION), {
        ...sanitized,
        userId,
        createdAt: Date.now(),
      });
      return { ok: true };
    } catch (err) {
      console.error('[useManualActivities] add error:', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [userId]);

  const updateActivity = useCallback(async (id: string, input: ManualActivityInput): Promise<{ ok: boolean; error?: string }> => {
    const sanitized = sanitizeManualActivity(input);
    if (!sanitized) return { ok: false, error: 'invalid' };

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setActivities((prev) => {
        const next = prev.map((a) => (a.id === id
          ? { ...(sanitized as ManualActivityInput & { type: ManualActivityType }), id, userId: a.userId, createdAt: a.createdAt }
          : a));
        writeE2EActivities(next);
        return next;
      });
      return { ok: true };
    }

    try {
      await updateDoc(doc(db, MANUAL_ACTIVITIES_COLLECTION, id), {
        ...sanitized,
        userId,
        createdAt: activities.find((a) => a.id === id)?.createdAt ?? Date.now(),
      });
      return { ok: true };
    } catch (err) {
      console.error('[useManualActivities] update error:', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [userId, activities]);

  const deleteActivity = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setActivities((prev) => {
        const next = prev.filter((a) => a.id !== id);
        writeE2EActivities(next);
        return next;
      });
      return { ok: true };
    }
    try {
      await deleteDoc(doc(db, MANUAL_ACTIVITIES_COLLECTION, id));
      return { ok: true };
    } catch (err) {
      console.error('[useManualActivities] delete error:', err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  return { activities, addActivity, updateActivity, deleteActivity, isLoaded };
};
