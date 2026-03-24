import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlanCycle, PlanCycleStats } from '@/types/cycles';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { calculate1RM } from '@/lib/pr-utils';

const CYCLES_COLLECTION = 'plan_cycles';

export const usePlanCycles = (userId: string) => {
  const [cycles, setCycles] = useState<PlanCycle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, CYCLES_COLLECTION),
      where('userId', '==', userId),
      orderBy('startDate', 'desc'),
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data: PlanCycle[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as PlanCycle);
        });
        setCycles(data);
        setIsLoaded(true);
      },
      (err) => {
        console.error('[usePlanCycles] Error:', err);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const getActiveCycle = useCallback(() => {
    return cycles.find(c => c.status === 'active') || null;
  }, [cycles]);

  const computeStats = useCallback((
    workouts: WorkoutSession[],
    planDays: TrainingDay[],
    startDate: string,
    endDate: string,
    durationWeeks: number,
  ): PlanCycleStats => {
    const cycleWorkouts = workouts.filter(
      w => w.completed && w.date >= startDate && w.date <= endDate,
    );

    const totalWorkouts = cycleWorkouts.length;

    const totalTonnage = cycleWorkouts.reduce((sum, w) =>
      sum + w.exercises.reduce((exSum, ex) =>
        exSum + ex.sets.reduce((setSum, s) =>
          setSum + (s.completed ? s.reps * s.weight : 0), 0), 0), 0);

    // Detect PRs per exercise
    const exerciseBests = new Map<string, { weight: number; estimated1RM: number }>();
    const exerciseNames = new Map(planDays.flatMap(d => d.exercises.map(e => [e.id, e.name])));

    for (const workout of cycleWorkouts) {
      for (const ex of workout.exercises) {
        for (const set of ex.sets) {
          if (!set.completed || set.isWarmup) continue;
          const est1RM = calculate1RM(set.weight, set.reps);
          const current = exerciseBests.get(ex.exerciseId);
          if (!current || est1RM > current.estimated1RM) {
            exerciseBests.set(ex.exerciseId, { weight: set.weight, estimated1RM: est1RM });
          }
        }
      }
    }

    const prs = Array.from(exerciseBests.entries())
      .map(([exId, data]) => ({
        exerciseName: exerciseNames.get(exId) || exId,
        weight: data.weight,
        estimated1RM: Math.round(data.estimated1RM * 10) / 10,
      }))
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 10);

    const expectedWorkouts = planDays.length * durationWeeks;
    const completionRate = expectedWorkouts > 0
      ? Math.round((totalWorkouts / expectedWorkouts) * 100)
      : 0;

    return { totalWorkouts, totalTonnage, prs, completionRate };
  }, []);

  const archiveCurrentPlan = useCallback(async (
    planDays: TrainingDay[],
    durationWeeks: number,
    startDate: string,
    workouts: WorkoutSession[],
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const stats = computeStats(workouts, planDays, startDate, endDate, durationWeeks);

      const cycle: Omit<PlanCycle, 'id'> = {
        userId,
        days: planDays,
        durationWeeks,
        startDate,
        endDate,
        status: 'completed',
        createdAt: new Date().toISOString(),
        stats,
      };

      const docRef = await addDoc(collection(db, CYCLES_COLLECTION), cycle);
      return docRef.id;
    } catch (err) {
      console.error('[usePlanCycles] Archive error:', err);
      return null;
    }
  }, [userId, computeStats]);

  const createActiveCycle = useCallback(async (
    planDays: TrainingDay[],
    durationWeeks: number,
    startDate: string,
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      // Mark any existing active cycle as completed
      const activeCycle = getActiveCycle();
      if (activeCycle) {
        await updateDoc(doc(db, CYCLES_COLLECTION, activeCycle.id), {
          status: 'completed',
          endDate: new Date().toISOString().split('T')[0],
        });
      }

      const cycle: Omit<PlanCycle, 'id'> = {
        userId,
        days: planDays,
        durationWeeks,
        startDate,
        endDate: '',
        status: 'active',
        createdAt: new Date().toISOString(),
        stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
      };

      const docRef = await addDoc(collection(db, CYCLES_COLLECTION), cycle);
      return docRef.id;
    } catch (err) {
      console.error('[usePlanCycles] Create active cycle error:', err);
      return null;
    }
  }, [userId, getActiveCycle]);

  const getCycleById = useCallback(async (cycleId: string): Promise<PlanCycle | null> => {
    // First check local state
    const local = cycles.find(c => c.id === cycleId);
    if (local) return local;

    // Fallback to Firestore
    try {
      const snap = await getDoc(doc(db, CYCLES_COLLECTION, cycleId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as PlanCycle;
      }
    } catch (err) {
      console.error('[usePlanCycles] getCycleById error:', err);
    }
    return null;
  }, [cycles]);

  return {
    cycles,
    isLoaded,
    getActiveCycle,
    archiveCurrentPlan,
    createActiveCycle,
    getCycleById,
  };
};
