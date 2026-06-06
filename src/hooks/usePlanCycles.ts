import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlanCycle, PlanCycleStats } from '@/types/cycles';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { computeCycleStats } from '@/lib/cycle-insights';

const CYCLES_COLLECTION = 'plan_cycles';

// E2E: cykle wstrzyknięte do localStorage (spójnie z bypassem auth). Czytane synchronicznie,
// by były dostępne od pierwszego renderu (getCycleById local-first nie zależy od async Firestore).
const readE2ECycles = (): PlanCycle[] => {
  if (import.meta.env.VITE_E2E_MODE !== 'true') return [];
  try {
    const raw = window.localStorage.getItem('fittracker_e2e_cycles');
    return raw ? (JSON.parse(raw) as PlanCycle[]) : [];
  } catch {
    return [];
  }
};

export const usePlanCycles = (userId: string) => {
  const [cycles, setCycles] = useState<PlanCycle[]>(readE2ECycles);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setIsLoaded(true);
      return;
    }

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

  // Naprawa: scala zakończone cykle, które są kontynuacją tego samego planu bez
  // wyboru nowego (kolejny zaczyna się ≤14 dni po końcu poprzedniego). Remapuje
  // treningi na cykl główny, rozszerza jego zakres i przelicza statystyki.
  const mergeContinuousCycles = useCallback(async (workouts: WorkoutSession[]): Promise<number> => {
    const completed = cycles
      .filter((c) => c.status === 'completed' && c.startDate && c.endDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const daysBetween = (a: string, b: string) =>
      Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86_400_000);
    const weeksBetween = (a: string, b: string) =>
      Math.max(1, Math.ceil((daysBetween(a, b) + 1) / 7));

    const groups: PlanCycle[][] = [];
    for (const c of completed) {
      const last = groups[groups.length - 1];
      const prev = last?.[last.length - 1];
      if (last && prev && c.startDate >= prev.endDate && daysBetween(prev.endDate, c.startDate) <= 14) {
        last.push(c);
      } else {
        groups.push([c]);
      }
    }

    let removed = 0;
    for (const group of groups) {
      if (group.length < 2) continue;
      const primary = group[0];
      const rest = group.slice(1);
      const restIds = new Set(rest.map((c) => c.id));
      const newStart = primary.startDate;
      const newEnd = group[group.length - 1].endDate;
      const newDuration = weeksBetween(newStart, newEnd);

      const toRemap = workouts.filter((w) => w.cycleId && restIds.has(w.cycleId));
      for (const w of toRemap) {
        await updateDoc(doc(db, 'workouts', w.id), { cycleId: primary.id });
      }

      const remapped = workouts.map((w) => (w.cycleId && restIds.has(w.cycleId) ? { ...w, cycleId: primary.id } : w));
      const stats = computeCycleStats(remapped, primary.days, newStart, newEnd, newDuration, primary.id);
      await updateDoc(doc(db, CYCLES_COLLECTION, primary.id), { endDate: newEnd, durationWeeks: newDuration, stats });

      for (const c of rest) {
        await deleteDoc(doc(db, CYCLES_COLLECTION, c.id));
        removed += 1;
      }
    }
    return removed;
  }, [cycles]);

  // Usuwa pojedynczy cykl (np. błędny/fantomowy). Treningi NIE są kasowane —
  // odtagowujemy je z cycleId, żeby nie zostały osierocone pod nieistniejącym cyklem.
  const deleteCycle = useCallback(async (cycleId: string, workouts: WorkoutSession[] = []): Promise<boolean> => {
    if (!userId || !cycleId) return false;
    try {
      const tagged = workouts.filter((w) => w.cycleId === cycleId);
      for (const w of tagged) {
        await updateDoc(doc(db, 'workouts', w.id), { cycleId: null });
      }
      await deleteDoc(doc(db, CYCLES_COLLECTION, cycleId));
      return true;
    } catch (err) {
      console.error('[usePlanCycles] deleteCycle error:', err);
      return false;
    }
  }, [userId]);

  return {
    cycles,
    isLoaded,
    getActiveCycle,
    archiveCurrentPlan,
    createActiveCycle,
    getCycleById,
    mergeContinuousCycles,
    deleteCycle,
  };
};
