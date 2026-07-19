import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trainingPlan as defaultPlan, type TrainingDay, type Exercise } from '@/data/trainingPlan';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { useTranslation } from '@/contexts/LanguageContext';
import { swapExerciseIdentity } from '@/lib/exercise-swap';
import { saveTrainingPlanWithRevision } from '@/lib/training-plan-save';
import { sanitizeProgressionConfig, type ProgressionConfig } from '@/lib/progression-engine';
import { sanitizeTrainingPlanDays } from '@/lib/firestore-doc-guards';
import { reportClientError } from '@/lib/error-telemetry';
import { classifyWorkoutSyncError } from '@/lib/workout-sync-conflict';
import { trackTelemetryEvent } from '@/lib/app-telemetry';

const PLAN_COLLECTION = 'training_plans';

export const useTrainingPlan = (userId: string) => {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<TrainingDay[]>(defaultPlan);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [planDurationWeeks, setPlanDurationWeeks] = useState(12);
  const [planStartDate, setPlanStartDate] = useState<string | null>(null);
  const [planRevision, setPlanRevision] = useState(0);
  // Progresja programowa (Z119): null = pole nieustawione (stare plany, silnik wyłączony).
  const [progression, setProgression] = useState<ProgressionConfig | null>(null);

  // Subscribe to plan document using userId as doc ID
  useEffect(() => {
    // Brak userId (np. odświeżanie tokena): nie ma czego ładować → "puste, ale gotowe".
    // Inaczej isLoaded zostaje false i gate startu treningu wisi w spinnerze (#6).
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    const docRef = doc(db, PLAN_COLLECTION, userId);

    const unsubscribe = onSnapshot(docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.days !== undefined) {
            // P0: uszkodzone days NIE nadpisują stanu (zostaje poprzedni dobry
            // plan lub default) — raport zamiast renderowania śmieci.
            const days = sanitizeTrainingPlanDays(data.days);
            if (days !== null) {
              setPlan(days);
              setIsCustom(true);
            } else {
              void reportClientError(userId, { code: 'invalid-doc', phase: 'other', detail: `training_plans/${userId}:days` });
            }
          }
          if (data.durationWeeks) setPlanDurationWeeks(data.durationWeeks);
          if (data.startDate) setPlanStartDate(data.startDate);
          setProgression(sanitizeProgressionConfig(data.progression));
          setPlanRevision(typeof data.revision === 'number' ? Math.max(0, Math.floor(data.revision)) : 0);
        } else {
          // No custom plan, use default
          setPlan(defaultPlan);
          setIsCustom(false);
          setPlanRevision(0);
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

  // Auto-repair: if custom plan exists but startDate is missing, recover it from workout history
  const repairAttempted = useRef(false);
  useEffect(() => {
    if (!isLoaded || !isCustom || planStartDate || !userId || repairAttempted.current) return;
    repairAttempted.current = true;

    const repair = async () => {
      try {
        // Find earliest workout for this user to determine plan start
        // No orderBy — avoids composite index mismatch (existing index is date DESC)
        const q = query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
        );
        const snap = await getDocs(q);
        let startDateStr: string;

        if (!snap.empty) {
          // Find earliest date in JS
          let earliest: string | null = null;
          snap.forEach(d => {
            const date = d.data().date as string;
            if (!earliest || date < earliest) earliest = date;
          });
          startDateStr = formatLocalDate(getStartOfPlanWeek(parseLocalDate(earliest!)));
        } else {
          // No workouts found - use current week's Monday
          startDateStr = formatLocalDate(getStartOfPlanWeek(new Date()));
        }

        console.log('[useTrainingPlan] Auto-repairing missing startDate:', startDateStr);
        await updateDoc(doc(db, PLAN_COLLECTION, userId), { startDate: startDateStr });
        setPlanStartDate(startDateStr);
      } catch (err) {
        console.error('[useTrainingPlan] Failed to auto-repair startDate:', err);
      }
    };

    repair();
  }, [isLoaded, isCustom, planStartDate, userId]);

  const currentWeek = useMemo(() => {
    if (!planStartDate) return 1;
    const start = getStartOfPlanWeek(parseLocalDate(planStartDate));
    const nowWeekStart = getStartOfPlanWeek(new Date());
    // Plan startujący w przyszłości: tydzień 0 (jeszcze nie ruszył) — nie liczy postępu.
    if (nowWeekStart.getTime() < start.getTime()) return 0;
    const diffMs = nowWeekStart.getTime() - start.getTime();
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  }, [planStartDate]);

  const isPlanExpired = currentWeek > planDurationWeeks;
  const weeksRemaining = Math.max(0, planDurationWeeks - currentWeek);
  // False when the plan's start date is still in the future (plan hasn't begun yet).
  const planStarted = !planStartDate
    || getStartOfPlanWeek(new Date()).getTime() >= getStartOfPlanWeek(parseLocalDate(planStartDate)).getTime();

  const savePlan = useCallback(async (
    newPlan: TrainingDay[],
    options?: { durationWeeks?: number; startDate?: string; syncActiveCycle?: boolean; progression?: ProgressionConfig },
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: t('err.noUserId') };
    // Zapis przed załadowaniem snapshotu nadpisałby istniejący plan domyślnym stanem
    // (durationWeeks=12, startDate=null) — czyli skasowałby custom plan i datę startu.
    if (!isLoaded) return { success: false, error: t('err.planNotLoaded') };
    try {
      const nextDurationWeeks = options?.durationWeeks ?? planDurationWeeks;
      await saveTrainingPlanWithRevision(db, {
        userId,
        newPlan,
        expectedRevision: planRevision,
        durationWeeks: nextDurationWeeks,
        startDate: options?.startDate !== undefined ? options.startDate : planStartDate,
        syncActiveCycle: options?.syncActiveCycle,
        ...(options?.progression !== undefined ? { progression: options.progression } : {}),
      });

      trackTelemetryEvent(userId, 'action_plan_edited');
      return { success: true };
    } catch (err) {
      console.error('Error saving training plan:', err);
      // M19: transakcja zapisu planu wymaga sieci — offline dostaje ludzki
      // komunikat zamiast surowego błędu Firestore.
      if (classifyWorkoutSyncError(err) === 'offline') {
        return { success: false, error: t('err.planOffline') };
      }
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { success: false, error: errorMessage };
    }
  }, [userId, isLoaded, planDurationWeeks, planStartDate, planRevision, t]);

  const swapExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
    newName: string,
    newSets?: string,
    newVideoUrl?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return swapExerciseIdentity(
            ex,
            { name: newName, sets: newSets, videoUrl: newVideoUrl },
            day.exercises.map(e => e.id),
          );
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
    progression,
    currentWeek,
    isPlanExpired,
    weeksRemaining,
    planStarted,
    savePlan,
    swapExercise,
    updateExerciseSets,
    removeExercise,
    addExercise,
    moveExercise,
    resetToDefault,
  };
};
