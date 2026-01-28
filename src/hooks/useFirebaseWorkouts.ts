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
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface ExerciseProgress {
  exerciseId: string;
  sets: SetData[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  dayId: string;
  date: string;
  exercises: ExerciseProgress[];
  completed: boolean;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  armLeft?: number;
  armRight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
}

const WORKOUTS_COLLECTION = 'workouts';
const MEASUREMENTS_COLLECTION = 'measurements';

export const useFirebaseWorkouts = () => {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to workouts collection
  useEffect(() => {
    const workoutsQuery = query(collection(db, WORKOUTS_COLLECTION), orderBy('date', 'desc'));
    
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
  }, []);

  // Subscribe to measurements collection
  useEffect(() => {
    const measurementsQuery = query(collection(db, MEASUREMENTS_COLLECTION), orderBy('date', 'desc'));
    
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
  }, []);

  const createWorkoutSession = useCallback(async (dayId: string): Promise<{ session: WorkoutSession | null; error?: string; existing?: boolean }> => {
    const today = new Date().toISOString().split('T')[0];

    // Check if workout for today already exists (prevent duplicates)
    const existingWorkout = workouts.find(w => w.dayId === dayId && w.date === today);
    if (existingWorkout) {
      console.log('Workout already exists for today, returning existing:', existingWorkout.id);
      return { session: existingWorkout, existing: true };
    }

    const session: WorkoutSession = {
      id: `workout-${Date.now()}`,
      dayId,
      date: today,
      exercises: [],
      completed: false,
    };

    try {
      await setDoc(doc(db, WORKOUTS_COLLECTION, session.id), session);
      return { session };
    } catch (err) {
      console.error('Error creating workout:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { session: null, error: errorMessage };
    }
  }, [workouts]);

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

      // Sanitize sets - Firebase doesn't accept undefined values
      const sanitizedSets = sets.map(set => ({
        reps: set.reps ?? 0,
        weight: set.weight ?? 0,
        completed: set.completed ?? false,
      }));

      // Firebase doesn't accept undefined values - only include notes if defined
      const newExercise: ExerciseProgress = notes !== undefined
        ? { exerciseId, sets: sanitizedSets, notes }
        : { exerciseId, sets: sanitizedSets };

      const existingIndex = workout.exercises.findIndex(e => e.exerciseId === exerciseId);
      const newExercises = existingIndex >= 0
        ? workout.exercises.map((e, i) => i === existingIndex ? newExercise : e)
        : [...workout.exercises, newExercise];

      // Sanitize entire exercises array to remove any undefined
      const cleanExercises = newExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map(s => ({
          reps: s.reps ?? 0,
          weight: s.weight ?? 0,
          completed: s.completed ?? false,
        })),
        ...(ex.notes !== undefined && { notes: ex.notes }),
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

  const getWorkoutsByDay = useCallback((dayId: string) => {
    return workouts.filter(w => w.dayId === dayId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [workouts]);

  const getTodaysWorkout = useCallback((dayId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysWorkouts = workouts.filter(w => w.dayId === dayId && w.date === today);

    if (todaysWorkouts.length === 0) return undefined;
    if (todaysWorkouts.length === 1) return todaysWorkouts[0];

    // If multiple workouts exist for today, prefer:
    // 1. One with exercises (has data)
    // 2. One that is completed
    // 3. The newest one (by ID timestamp)
    return todaysWorkouts.sort((a, b) => {
      // Prefer workout with exercises
      const aHasExercises = a.exercises.length > 0;
      const bHasExercises = b.exercises.length > 0;
      if (aHasExercises && !bHasExercises) return -1;
      if (!aHasExercises && bHasExercises) return 1;

      // Prefer completed workout
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;

      // Prefer newer (higher timestamp in ID)
      return b.id.localeCompare(a.id);
    })[0];
  }, [workouts]);

  const getLatestWorkout = useCallback((dayId: string) => {
    const dayWorkouts = getWorkoutsByDay(dayId);
    return dayWorkouts[0];
  }, [getWorkoutsByDay]);

  const addMeasurement = useCallback(async (measurement: Omit<BodyMeasurement, 'id'>): Promise<{ measurement: BodyMeasurement | null; error?: string }> => {
    const newMeasurement: BodyMeasurement = {
      ...measurement,
      id: `measurement-${Date.now()}`,
    };

    try {
      await setDoc(doc(db, MEASUREMENTS_COLLECTION, newMeasurement.id), newMeasurement);
      return { measurement: newMeasurement };
    } catch (err) {
      console.error('Error adding measurement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { measurement: null, error: errorMessage };
    }
  }, []);

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

  // Import data from JSON
  const importData = useCallback(async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.workouts && Array.isArray(data.workouts)) {
        for (const workout of data.workouts) {
          await setDoc(doc(db, WORKOUTS_COLLECTION, workout.id), workout);
        }
      }
      
      if (data.measurements && Array.isArray(data.measurements)) {
        for (const measurement of data.measurements) {
          await setDoc(doc(db, MEASUREMENTS_COLLECTION, measurement.id), measurement);
        }
      }
      
      return { success: true, message: 'Dane zaimportowane pomyślnie!' };
    } catch (err) {
      console.error('Error importing data:', err);
      return { success: false, message: 'Błąd importu: nieprawidłowy format JSON' };
    }
  }, []);

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
      // Group workouts by date+dayId
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

        // Sort: prefer workouts with exercises, then completed, then newest
        const sorted = [...group].sort((a, b) => {
          const aHasExercises = a.exercises.length > 0;
          const bHasExercises = b.exercises.length > 0;
          if (aHasExercises && !bHasExercises) return -1;
          if (!aHasExercises && bHasExercises) return 1;
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return b.id.localeCompare(a.id);
        });

        // Keep the best one, delete the rest
        const toDelete = sorted.slice(1);
        for (const workout of toDelete) {
          await deleteDoc(doc(db, WORKOUTS_COLLECTION, workout.id));
          deleted++;
          console.log(`Deleted duplicate workout: ${workout.id}`);
        }
      }

      return { deleted };
    } catch (err) {
      console.error('Error cleaning up workouts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { deleted: 0, error: errorMessage };
    }
  }, [workouts]);

  return {
    workouts,
    measurements,
    isLoaded,
    error,
    createWorkoutSession,
    updateExerciseProgress,
    completeWorkout,
    getWorkoutsByDay,
    getTodaysWorkout,
    getLatestWorkout,
    addMeasurement,
    getLatestMeasurement,
    getTotalWeight,
    getCompletedWorkoutsCount,
    exportData,
    importData,
    deleteWorkout,
    cleanupEmptyWorkouts,
  };
};
