import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trainingPlan as defaultPlan, type TrainingDay, type Exercise } from '@/data/trainingPlan';

const PLAN_COLLECTION = 'training_plans';

export const useTrainingPlan = (userId: string) => {
  const [plan, setPlan] = useState<TrainingDay[]>(defaultPlan);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [planDurationWeeks, setPlanDurationWeeks] = useState(12);
  const [planStartDate, setPlanStartDate] = useState<string | null>(null);

  // Subscribe to plan document using userId as doc ID
  useEffect(() => {
    if (!userId) return;

    const docRef = doc(db, PLAN_COLLECTION, userId);

    const unsubscribe = onSnapshot(docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.days && Array.isArray(data.days)) {
            setPlan(data.days as TrainingDay[]);
            setIsCustom(true);
          }
          if (data.durationWeeks) setPlanDurationWeeks(data.durationWeeks);
          if (data.startDate) setPlanStartDate(data.startDate);
        } else {
          // No custom plan, use default
          setPlan(defaultPlan);
          setIsCustom(false);
        }
        setIsLoaded(true);
      },
      (err) => {
        console.error('Error fetching training plan:', err);
        setPlan(defaultPlan);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const currentWeek = useMemo(() => {
    if (!planStartDate) return 1;
    const start = new Date(planStartDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, week);
  }, [planStartDate]);

  const isPlanExpired = currentWeek > planDurationWeeks;

  const savePlan = useCallback(async (
    newPlan: TrainingDay[],
    options?: { durationWeeks?: number; startDate?: string },
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'Brak userId' };
    try {
      await setDoc(doc(db, PLAN_COLLECTION, userId), {
        days: newPlan,
        updatedAt: new Date().toISOString(),
        ...(options?.durationWeeks && { durationWeeks: options.durationWeeks }),
        ...(options?.startDate && { startDate: options.startDate }),
      });
      return { success: true };
    } catch (err) {
      console.error('Error saving training plan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: errorMessage };
    }
  }, [userId]);

  const swapExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
    newName: string,
    newSets?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            name: newName,
            ...(newSets && { sets: newSets }),
            instructions: [],
          };
        }),
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const updateExerciseSets = useCallback(async (
    dayId: string,
    exerciseId: string,
    newSets: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, sets: newSets } : ex,
        ),
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const removeExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.filter(ex => ex.id !== exerciseId),
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const addExercise = useCallback(async (
    dayId: string,
    exercise: Exercise,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: [...day.exercises, exercise],
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const moveExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
    direction: 'up' | 'down',
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      const exercises = [...day.exercises];
      const idx = exercises.findIndex(e => e.id === exerciseId);
      if (idx < 0) return day;

      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= exercises.length) return day;

      [exercises[idx], exercises[newIdx]] = [exercises[newIdx], exercises[idx]];
      return { ...day, exercises };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const resetToDefault = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return savePlan(defaultPlan);
  }, [savePlan]);

  return {
    plan,
    isLoaded,
    isCustom,
    planDurationWeeks,
    planStartDate,
    currentWeek,
    isPlanExpired,
    savePlan,
    swapExercise,
    updateExerciseSets,
    removeExercise,
    addExercise,
    moveExercise,
    resetToDefault,
  };
};
