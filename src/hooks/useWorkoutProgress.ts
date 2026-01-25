import { useState, useEffect, useCallback } from 'react';

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

const STORAGE_KEY = 'fitness-tracker-data';

interface StorageData {
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
}

const getStorageData = (): StorageData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading from localStorage:', e);
  }
  return { workouts: [], measurements: [] };
};

const saveStorageData = (data: StorageData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

export const useWorkoutProgress = () => {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const data = getStorageData();
    setWorkouts(data.workouts);
    setMeasurements(data.measurements);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveStorageData({ workouts, measurements });
    }
  }, [workouts, measurements, isLoaded]);

  const createWorkoutSession = useCallback((dayId: string): WorkoutSession => {
    const session: WorkoutSession = {
      id: `workout-${Date.now()}`,
      dayId,
      date: new Date().toISOString().split('T')[0],
      exercises: [],
      completed: false,
    };
    setWorkouts(prev => [...prev, session]);
    return session;
  }, []);

  const updateExerciseProgress = useCallback((
    sessionId: string,
    exerciseId: string,
    sets: SetData[],
    notes?: string
  ) => {
    setWorkouts(prev => prev.map(workout => {
      if (workout.id !== sessionId) return workout;
      
      const existingIndex = workout.exercises.findIndex(e => e.exerciseId === exerciseId);
      const newExercise: ExerciseProgress = { exerciseId, sets, notes };
      
      const newExercises = existingIndex >= 0
        ? workout.exercises.map((e, i) => i === existingIndex ? newExercise : e)
        : [...workout.exercises, newExercise];
      
      return { ...workout, exercises: newExercises };
    }));
  }, []);

  const completeWorkout = useCallback((sessionId: string) => {
    setWorkouts(prev => prev.map(workout =>
      workout.id === sessionId ? { ...workout, completed: true } : workout
    ));
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

  const addMeasurement = useCallback((measurement: Omit<BodyMeasurement, 'id'>) => {
    const newMeasurement: BodyMeasurement = {
      ...measurement,
      id: `measurement-${Date.now()}`,
    };
    setMeasurements(prev => [...prev, newMeasurement]);
    return newMeasurement;
  }, []);

  const getLatestMeasurement = useCallback(() => {
    return measurements.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
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

  return {
    workouts,
    measurements,
    isLoaded,
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
  };
};
