import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SetData, ExerciseProgress, WorkoutSession, BodyMeasurement } from '@/types';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import {
  buildWorkoutSessionId,
  createProvisionalWorkoutSession,
  isProvisionalWorkoutSessionId,
} from '@/lib/workout-session';

export type { SetData, ExerciseProgress, WorkoutSession, BodyMeasurement };

const WORKOUTS_COLLECTION = 'workouts';
const MEASUREMENTS_COLLECTION = 'measurements';

// Sanitize and clamp set values to valid ranges
const clampSet = (set: Partial<SetData>): SetData => ({
  reps: Math.max(0, Math.min(999, Math.round(Number(set.reps) || 0))),
  weight: Math.max(0, Math.min(999, Math.round((Number(set.weight) || 0) * 2) / 2)),
  completed: !!set.completed,
  ...(set.isWarmup && { isWarmup: true }),
});

export const useFirebaseWorkouts = (userId: string) => {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to workouts collection filtered by userId
  useEffect(() => {
    if (!userId) return;

    const workoutsQuery = query(
      collection(db, WORKOUTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(workoutsQuery,
      (snapshot) => {
        const workoutsData: WorkoutSession[] = [];
        snapshot.forEach((doc) => {
          workoutsData.push({ id: doc.id, ...doc.data() } as WorkoutSession);
        });
        setWorkouts(workoutsData);
        setIsLoaded(true);
      },
      (err) => {
        console.error('Error fetching workouts:', err);
        setError(err.message);
        setIsLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Subscribe to measurements collection filtered by userId
  useEffect(() => {
    if (!userId) return;

    const measurementsQuery = query(
      collection(db, MEASUREMENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(measurementsQuery,
      (snapshot) => {
        const measurementsData: BodyMeasurement[] = [];
        snapshot.forEach((doc) => {
          measurementsData.push({ id: doc.id, ...doc.data() } as BodyMeasurement);
        });
        setMeasurements(measurementsData);
      },
      (err) => {
        console.error('Error fetching measurements:', err);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const createWorkoutSession = useCallback(async (dayId: string, date?: string, cycleId?: string): Promise<{ session: WorkoutSession | null; error?: string; existing?: boolean; provisional?: boolean }> => {
    const workoutDate = date || formatLocalDate(new Date());
    const sessionId = buildWorkoutSessionId(userId, dayId, workoutDate);

    // Check if workout for this date already exists (prevent duplicates)
    const existingWorkout = workouts.find(w => w.id === sessionId || (w.dayId === dayId && w.date === workoutDate));
    if (existingWorkout) {
      if (cycleId && !existingWorkout.cycleId) {
        try {
          await updateDoc(doc(db, WORKOUTS_COLLECTION, existingWorkout.id), { cycleId });
          return {
            session: { ...existingWorkout, cycleId },
            existing: true,
          };
        } catch (err) {
          console.error('Error attaching cycleId to existing workout:', err);
        }
      }
      return { session: existingWorkout, existing: true };
    }

    const session: WorkoutSession = {
      id: sessionId,
      userId,
      dayId,
      date: workoutDate,
      exercises: [],
      completed: false,
      ...(cycleId && { cycleId }),
    };

    try {
      const workoutRef = doc(db, WORKOUTS_COLLECTION, session.id);
      const existingSnapshot = await getDoc(workoutRef);
      if (existingSnapshot.exists()) {
        return { session: { id: existingSnapshot.id, ...existingSnapshot.data() } as WorkoutSession, existing: true };
      }

      await setDoc(workoutRef, session);
      return { session };
    } catch (err) {
      console.error('Error creating workout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { session: null, error: errorMessage };
    }
  }, [workouts, userId]);

  const createOfflineWorkoutSession = useCallback((dayId: string, date?: string, cycleId?: string): WorkoutSession => {
    const workoutDate = date || formatLocalDate(new Date());
    return createProvisionalWorkoutSession(userId, dayId, workoutDate, cycleId);
  }, [userId]);

  const updateExerciseProgress = useCallback(async (
    sessionId: string,
    exerciseId: string,
    sets: SetData[],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) {
      return { success: false, error: 'Brak ID sesji treningowej' };
    }

    try {
      // Pobierz aktualny dokument z Firebase (nie z lokalnego state!)
      const workoutRef = doc(db, WORKOUTS_COLLECTION, sessionId);
      const workoutSnap = await getDoc(workoutRef);

      if (!workoutSnap.exists()) {
        console.error('Workout not found in Firebase:', sessionId);
        return { success: false, error: 'Nie znaleziono treningu w bazie danych' };
      }

      const workout = workoutSnap.data() as WorkoutSession;

      // Sanitize and clamp sets
      const sanitizedSets = sets.map(clampSet);

      // Firebase doesn't accept undefined values - only include notes if defined
      const newExercise: ExerciseProgress = notes !== undefined
        ? { exerciseId, sets: sanitizedSets, notes }
        : { exerciseId, sets: sanitizedSets };

      const existingIndex = workout.exercises.findIndex(e => e.exerciseId === exerciseId);
      const newExercises = existingIndex >= 0
        ? workout.exercises.map((e, i) => i === existingIndex ? newExercise : e)
        : [...workout.exercises, newExercise];

      // Sanitize and clamp entire exercises array
      const cleanExercises = newExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map(clampSet),
        ...(ex.notes !== undefined && { notes: String(ex.notes).slice(0, 2000) }),
      }));

      await updateDoc(workoutRef, { exercises: cleanExercises });
      return { success: true };
    } catch (err) {
      console.error('Error updating exercise:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd zapisu';
      return { success: false, error: errorMessage };
    }
  }, []);

  const completeWorkout = useCallback(async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await updateDoc(doc(db, WORKOUTS_COLLECTION, sessionId), {
        completed: true
      });
      return { success: true };
    } catch (err) {
      console.error('Error completing workout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateSkippedExercises = useCallback(async (sessionId: string, skippedExercises: string[]): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) return { success: false, error: 'Brak ID sesji' };
    try {
      await updateDoc(doc(db, WORKOUTS_COLLECTION, sessionId), { skippedExercises });
      return { success: true };
    } catch (err) {
      console.error('Error updating skipped exercises:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateWorkoutNotes = useCallback(async (sessionId: string, notes: string): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) return { success: false, error: 'Brak ID sesji' };
    try {
      await updateDoc(doc(db, WORKOUTS_COLLECTION, sessionId), { notes });
      return { success: true };
    } catch (err) {
      console.error('Error updating workout notes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: errorMessage };
    }
  }, []);

  const getWorkoutsByDay = useCallback((dayId: string) => {
    return workouts.filter(w => w.dayId === dayId).sort((a, b) =>
      parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    );
  }, [workouts]);

  const getTodaysWorkout = useCallback((dayId: string) => {
    const today = formatLocalDate(new Date());
    const todaysWorkouts = workouts.filter(w => w.dayId === dayId && w.date === today);

    if (todaysWorkouts.length === 0) return undefined;
    if (todaysWorkouts.length === 1) return todaysWorkouts[0];

    return todaysWorkouts.sort((a, b) => {
      const aHasExercises = a.exercises.length > 0;
      const bHasExercises = b.exercises.length > 0;
      if (aHasExercises && !bHasExercises) return -1;
      if (!aHasExercises && bHasExercises) return 1;
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return b.id.localeCompare(a.id);
    })[0];
  }, [workouts]);

  const getLatestWorkout = useCallback((dayId: string) => {
    const dayWorkouts = getWorkoutsByDay(dayId);
    return dayWorkouts[0];
  }, [getWorkoutsByDay]);

  const addMeasurement = useCallback(async (measurement: Omit<BodyMeasurement, 'id' | 'userId'>): Promise<{ measurement: BodyMeasurement | null; error?: string }> => {
    const id = `measurement-${Date.now()}`;

    // Sanitize: remove undefined values (Firebase doesn't accept them)
    const sanitized: Record<string, string | number> = { id, userId, date: measurement.date };
    for (const [key, value] of Object.entries(measurement)) {
      if (value !== undefined && key !== 'id' && key !== 'userId') {
        sanitized[key] = value;
      }
    }

    try {
      await setDoc(doc(db, MEASUREMENTS_COLLECTION, id), sanitized);
      return { measurement: { ...sanitized } as unknown as BodyMeasurement };
    } catch (err) {
      console.error('Error adding measurement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { measurement: null, error: errorMessage };
    }
  }, [userId]);

  const getLatestMeasurement = useCallback(() => {
    return measurements[0];
  }, [measurements]);

  const getTotalWeight = useCallback(() => {
    return workouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal, exercise) => {
        return exTotal + exercise.sets.reduce((setTotal, set) => {
          return setTotal + (set.completed ? set.reps * set.weight : 0);
        }, 0);
      }, 0);
    }, 0);
  }, [workouts]);

  const getCompletedWorkoutsCount = useCallback(() => {
    return workouts.filter(w => w.completed).length;
  }, [workouts]);

  // Export data to JSON
  const exportData = useCallback(() => {
    const data = {
      workouts,
      measurements,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }, [workouts, measurements]);

  // Import data from JSON (with schema validation)
  const importData = useCallback(async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      let imported = 0;

      if (data.workouts && Array.isArray(data.workouts)) {
        if (data.workouts.length > 500) {
          return { success: false, message: 'Zbyt dużo treningów (max 500)' };
        }
        for (const workout of data.workouts) {
          if (!workout.id || typeof workout.id !== 'string') continue;
          if (!workout.date || typeof workout.date !== 'string') continue;
          // Whitelist only known fields
          const safe: Record<string, unknown> = {
            id: String(workout.id).slice(0, 100),
            userId,
            dayId: String(workout.dayId || '').slice(0, 50),
            date: String(workout.date).slice(0, 10),
            completed: !!workout.completed,
            ...(workout.notes && { notes: String(workout.notes).slice(0, 5000) }),
            ...(Array.isArray(workout.skippedExercises) && { skippedExercises: workout.skippedExercises.filter((s: unknown) => typeof s === 'string').slice(0, 50) }),
          };
          if (Array.isArray(workout.exercises)) {
            safe.exercises = workout.exercises.slice(0, 50).map((ex: { exerciseId?: string; sets?: unknown[]; notes?: string }) => ({
              exerciseId: String(ex.exerciseId || '').slice(0, 100),
              sets: Array.isArray(ex.sets) ? ex.sets.slice(0, 20).map(clampSet) : [],
              ...(ex.notes && { notes: String(ex.notes).slice(0, 2000) }),
            }));
          } else {
            safe.exercises = [];
          }
          await setDoc(doc(db, WORKOUTS_COLLECTION, safe.id as string), safe);
          imported++;
        }
      }

      if (data.measurements && Array.isArray(data.measurements)) {
        if (data.measurements.length > 500) {
          return { success: false, message: 'Zbyt dużo pomiarów (max 500)' };
        }
        for (const m of data.measurements) {
          if (!m.id || typeof m.id !== 'string') continue;
          if (!m.date || typeof m.date !== 'string') continue;
          const safe: Record<string, string | number> = {
            id: String(m.id).slice(0, 100),
            userId,
            date: String(m.date).slice(0, 10),
          };
          const numFields = ['weight', 'armLeft', 'armRight', 'chest', 'waist', 'hips', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight'];
          for (const field of numFields) {
            if (m[field] !== undefined && typeof m[field] === 'number') {
              safe[field] = Math.max(0, Math.min(999, m[field]));
            }
          }
          await setDoc(doc(db, MEASUREMENTS_COLLECTION, safe.id as string), safe);
          imported++;
        }
      }

      return { success: true, message: `Zaimportowano ${imported} rekordów.` };
    } catch (err) {
      console.error('Error importing data:', err);
      return { success: false, message: 'Błąd importu: nieprawidłowy format JSON' };
    }
  }, [userId]);

  // Delete a specific workout (for cleanup)
  const deleteWorkout = useCallback(async (workoutId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteDoc(doc(db, WORKOUTS_COLLECTION, workoutId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting workout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: errorMessage };
    }
  }, []);

  // Cleanup empty/duplicate workouts
  const cleanupEmptyWorkouts = useCallback(async (): Promise<{ deleted: number; error?: string }> => {
    try {
      const grouped = new Map<string, WorkoutSession[]>();
      workouts.forEach(w => {
        const key = `${w.date}-${w.dayId}`;
        const existing = grouped.get(key) || [];
        existing.push(w);
        grouped.set(key, existing);
      });

      let deleted = 0;

      for (const [key, group] of grouped) {
        if (group.length <= 1) continue;

        const sorted = [...group].sort((a, b) => {
          const aHasExercises = a.exercises.length > 0;
          const bHasExercises = b.exercises.length > 0;
          if (aHasExercises && !bHasExercises) return -1;
          if (!aHasExercises && bHasExercises) return 1;
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return b.id.localeCompare(a.id);
        });

        const toDelete = sorted.slice(1);
        for (const workout of toDelete) {
          await deleteDoc(doc(db, WORKOUTS_COLLECTION, workout.id));
          deleted++;
        }
      }

      return { deleted };
    } catch (err) {
      console.error('Error cleaning up workouts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { deleted: 0, error: errorMessage };
    }
  }, [workouts]);

  const batchSaveWorkout = useCallback(async (
    sessionId: string,
    exercises: { exerciseId: string; sets: SetData[]; notes?: string }[],
    options?: { notes?: string; skippedExercises?: string[]; completed?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) return { success: false, error: 'Brak ID sesji' };

    try {
      const workoutRef = doc(db, WORKOUTS_COLLECTION, sessionId);

      const cleanExercises = exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map(clampSet),
        ...(ex.notes !== undefined && ex.notes !== '' && { notes: String(ex.notes).slice(0, 2000) }),
      }));

      const updateData: Record<string, unknown> = { exercises: cleanExercises };
      if (options?.notes !== undefined) updateData.notes = String(options.notes).slice(0, 5000);
      if (options?.skippedExercises) updateData.skippedExercises = options.skippedExercises;
      if (options?.completed) updateData.completed = true;

      await updateDoc(workoutRef, updateData);
      return { success: true };
    } catch (err) {
      console.error('Error batch saving workout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd zapisu';
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    workouts,
    measurements,
    isLoaded,
    error,
    createWorkoutSession,
    createOfflineWorkoutSession,
    updateExerciseProgress,
    completeWorkout,
    batchSaveWorkout,
    getWorkoutsByDay,
    getTodaysWorkout,
    getLatestWorkout,
    addMeasurement,
    getLatestMeasurement,
    getTotalWeight,
    getCompletedWorkoutsCount,
    updateWorkoutNotes,
    updateSkippedExercises,
    exportData,
    importData,
    deleteWorkout,
    cleanupEmptyWorkouts,
    isProvisionalWorkoutSessionId,
  };
};
