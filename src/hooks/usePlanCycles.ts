import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  getDoc,
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
import { formatLocalDate } from '@/lib/utils';
import { computeCycleStats } from '@/lib/cycle-insights';

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
    cycleId?: string | null,
  ): PlanCycleStats => computeCycleStats(workouts, planDays, startDate, endDate, durationWeeks, cycleId), []);

  const archiveCurrentPlan = useCallback(async (
    planDays: TrainingDay[],
    durationWeeks: number,
    startDate: string,
    workouts: WorkoutSession[],
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      const endDate = formatLocalDate(new Date());
      const activeCycle = getActiveCycle();
      const stats = computeStats(workouts, planDays, startDate, endDate, durationWeeks, activeCycle?.id);

      if (activeCycle) {
        await updateDoc(doc(db, CYCLES_COLLECTION, activeCycle.id), {
          days: planDays,
          durationWeeks,
          startDate,
          endDate,
          status: 'completed',
          stats,
        });
        return activeCycle.id;
      }

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
  }, [userId, computeStats, getActiveCycle]);

  const createActiveCycle = useCallback(async (
    planDays: TrainingDay[],
    durationWeeks: number,
    startDate: string,
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
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
  }, [userId]);

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
