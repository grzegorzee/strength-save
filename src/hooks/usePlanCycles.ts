import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlanCycle, PlanCycleStats } from '@/types/cycles';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { calendarDayDiff, formatLocalDate } from '@/lib/utils';
import { computeCycleStats } from '@/lib/cycle-insights';
import { chunkForFirestoreWrite, shouldMergeContinuousCycles } from '@/lib/plan-cycle-utils';
import { isCycleVisible } from '@/lib/cycle-visibility';

const CYCLES_COLLECTION = 'plan_cycles';
const CYCLE_OPERATIONS_COLLECTION = 'plan_cycle_operations';

interface MergeOperation {
  userId: string;
  kind: 'merge_cycles';
  primaryCycleId: string;
  restCycleIds: string[];
  workoutIds: string[];
  newStart: string;
  newEnd: string;
  newDuration: number;
  phase: 'remapping' | 'updating_primary' | 'deleting';
  nextWorkoutIndex: number;
  nextCycleIndex: number;
}

const archivedDurationWeeks = (startDate: string, endDate: string, plannedWeeks: number): number => {
  const elapsedDays = calendarDayDiff(startDate, endDate) + 1;
  const elapsedWeeks = Math.max(1, Math.ceil(elapsedDays / 7));
  return Math.max(1, Math.min(plannedWeeks, elapsedWeeks));
};

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
      const completedCycle = !activeCycle
        ? cycles.find(cycle => cycle.status === 'completed' && cycle.startDate === startDate)
        : null;

      if (completedCycle) return completedCycle.id;

      const effectiveDurationWeeks = archivedDurationWeeks(startDate, endDate, durationWeeks);
      const stats = computeStats(workouts, planDays, startDate, endDate, effectiveDurationWeeks, activeCycle?.id);

      if (activeCycle) {
        await updateDoc(doc(db, CYCLES_COLLECTION, activeCycle.id), {
          days: planDays,
          durationWeeks: effectiveDurationWeeks,
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
        durationWeeks: effectiveDurationWeeks,
        startDate,
        endDate,
        status: 'completed',
        createdAt: new Date().toISOString(),
        stats,
      };

      const cycleId = `cycle-${userId}-${startDate}`;
      const cycleRef = doc(db, CYCLES_COLLECTION, cycleId);
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(cycleRef);
        if (!existing.exists()) transaction.set(cycleRef, cycle);
      });
      return cycleId;
    } catch (err) {
      console.error('[usePlanCycles] Archive error:', err);
      return null;
    }
  }, [userId, computeStats, getActiveCycle, cycles]);

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

      // The start date is the operation key. Retrying after a lost response must
      // observe the same cycle rather than create another active one.
      const cycleId = `cycle-${userId}-${startDate}`;
      const cycleRef = doc(db, CYCLES_COLLECTION, cycleId);
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(cycleRef);
        if (!existing.exists()) transaction.set(cycleRef, cycle);
      });
      return cycleId;
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

  const runMergeOperation = useCallback(async (
    operationId: string,
    operation: MergeOperation,
    workouts: WorkoutSession[],
  ): Promise<number> => {
    const operationRef = doc(db, CYCLE_OPERATIONS_COLLECTION, operationId);
    const primaryRef = doc(db, CYCLES_COLLECTION, operation.primaryCycleId);
    const primarySnapshot = await getDoc(primaryRef);
    if (!primarySnapshot.exists()) throw new Error(`Missing primary cycle ${operation.primaryCycleId}`);
    const primary = { id: primarySnapshot.id, ...primarySnapshot.data() } as PlanCycle;
    const restIds = new Set(operation.restCycleIds);

    let nextWorkoutIndex = operation.nextWorkoutIndex;
    if (operation.phase === 'remapping') {
      const workoutById = new Map(workouts.map(workout => [workout.id, workout]));
      const pendingIds = operation.workoutIds.slice(nextWorkoutIndex);
      for (const ids of chunkForFirestoreWrite(pendingIds)) {
        const batch = writeBatch(db);
        ids.forEach(id => {
          // A previously committed batch can be replayed safely if the checkpoint
          // write was the step that failed.
          if (workoutById.has(id)) batch.update(doc(db, 'workouts', id), { cycleId: primary.id });
        });
        await batch.commit();
        nextWorkoutIndex += ids.length;
        await updateDoc(operationRef, { nextWorkoutIndex });
      }
      await updateDoc(operationRef, { phase: 'updating_primary' });
      operation = { ...operation, phase: 'updating_primary', nextWorkoutIndex };
    }

    if (operation.phase === 'updating_primary') {
      const remapped = workouts.map(workout =>
        restIds.has(workout.cycleId ?? '') ? { ...workout, cycleId: primary.id } : workout,
      );
      const stats = computeCycleStats(remapped, primary.days, operation.newStart, operation.newEnd, operation.newDuration, primary.id);
      await updateDoc(primaryRef, { endDate: operation.newEnd, durationWeeks: operation.newDuration, stats });
      await updateDoc(operationRef, { phase: 'deleting' });
      operation = { ...operation, phase: 'deleting' };
    }

    let nextCycleIndex = operation.nextCycleIndex;
    if (operation.phase === 'deleting') {
      for (const cycleIds of chunkForFirestoreWrite(operation.restCycleIds.slice(nextCycleIndex))) {
        const batch = writeBatch(db);
        cycleIds.forEach(cycleId => batch.delete(doc(db, CYCLES_COLLECTION, cycleId)));
        await batch.commit();
        nextCycleIndex += cycleIds.length;
        await updateDoc(operationRef, { nextCycleIndex });
      }
      await deleteDoc(operationRef);
    }
    return operation.restCycleIds.length;
  }, []);

  // Scala zakończone cykle, które są kontynuacją tego samego planu. Stan operacji
  // jest trwały, więc 501+ treningów można dokończyć po reloadzie lub partial failure.
  const mergeContinuousCycles = useCallback(async (workouts: WorkoutSession[]): Promise<number> => {
    if (!userId) return 0;
    const pending = await getDocs(query(
      collection(db, CYCLE_OPERATIONS_COLLECTION),
      where('userId', '==', userId),
      where('kind', '==', 'merge_cycles'),
    ));
    let removed = 0;
    for (const pendingOperation of pending.docs) {
      removed += await runMergeOperation(pendingOperation.id, pendingOperation.data() as MergeOperation, workouts);
    }
    // Snapshot state can still contain cycles just deleted by a resumed operation.
    // Let the listener refresh before discovering new merge groups.
    if (!pending.empty) return removed;

    const completed = cycles
      .filter((c) => c.status === 'completed' && c.startDate && c.endDate && isCycleVisible(c))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const daysBetween = (a: string, b: string) => calendarDayDiff(a, b);
    const weeksBetween = (a: string, b: string) =>
      Math.max(1, Math.ceil((daysBetween(a, b) + 1) / 7));

    const groups: PlanCycle[][] = [];
    for (const c of completed) {
      const last = groups[groups.length - 1];
      const prev = last?.[last.length - 1];
      if (last && prev && shouldMergeContinuousCycles(prev, c)) {
        last.push(c);
      } else {
        groups.push([c]);
      }
    }

    for (const group of groups) {
      if (group.length < 2) continue;
      const primary = group[0];
      const rest = group.slice(1);
      const restIds = new Set(rest.map((c) => c.id));
      const newStart = primary.startDate;
      const newEnd = group[group.length - 1].endDate;
      const newDuration = weeksBetween(newStart, newEnd);

      const operationId = `merge-${primary.id}`;
      const operation: MergeOperation = {
        userId,
        kind: 'merge_cycles',
        primaryCycleId: primary.id,
        restCycleIds: rest.map(cycle => cycle.id),
        workoutIds: workouts.filter(workout => workout.cycleId && restIds.has(workout.cycleId)).map(workout => workout.id),
        newStart,
        newEnd,
        newDuration,
        phase: 'remapping',
        nextWorkoutIndex: 0,
        nextCycleIndex: 0,
      };
      await setDoc(doc(db, CYCLE_OPERATIONS_COLLECTION, operationId), operation, { merge: true });
      removed += await runMergeOperation(operationId, operation, workouts);
    }
    return removed;
  }, [cycles, runMergeOperation, userId]);

  // Usuwa pojedynczy cykl (np. błędny/fantomowy). Treningi NIE są kasowane —
  // odtagowujemy je z cycleId, żeby nie zostały osierocone pod nieistniejącym cyklem.
  const deleteCycle = useCallback(async (cycleId: string, workouts: WorkoutSession[] = []): Promise<boolean> => {
    if (!userId || !cycleId) return false;
    try {
      const tagged = workouts.filter((w) => w.cycleId === cycleId);
      for (let index = 0; index < tagged.length; index += 450) {
        const batch = writeBatch(db);
        tagged.slice(index, index + 450).forEach(workout => batch.update(doc(db, 'workouts', workout.id), { cycleId: null }));
        await batch.commit();
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
