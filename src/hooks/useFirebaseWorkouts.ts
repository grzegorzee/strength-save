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

  const createWorkoutSession = useCallback(async (dayId: string): Promise<{ session: WorkoutSession | null; error?: string }> => {
    const session: WorkoutSession = {
      id: `workout-${Date.now()}`,
      dayId,
      date: new Date().toISOString().split('T')[0],
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
  }, []);

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
      const newExercise: ExerciseProgress = { exerciseId, sets, notes };

      const existingIndex = workout.exercises.findIndex(e => e.exerciseId === exerciseId);
      const newExercises = existingIndex >= 0
        ? workout.exercises.map((e, i) => i === existingIndex ? newExercise : e)
        : [...workout.exercises, newExercise];

      await updateDoc(workoutRef, { exercises: newExercises });
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
    return workouts.find(w => w.dayId === dayId && w.date === today);
  }, [workouts]);

  const getLatestWorkout = useCallback((dayId: string) => {
    const dayWorkouts = getWorkoutsByDay(dayId);
    return dayWorkouts[0];
  }, [getWorkoutsByDay]);

  const addMeasurement = useCallback(async (measurement: Omit<BodyMeasurement, 'id'>) => {
    const newMeasurement: BodyMeasurement = {
      ...measurement,
      id: `measurement-${Date.now()}`,
    };
    
    try {
      await setDoc(doc(db, MEASUREMENTS_COLLECTION, newMeasurement.id), newMeasurement);
    } catch (err) {
      console.error('Error adding measurement:', err);
    }
    
    return newMeasurement;
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
  };
};
