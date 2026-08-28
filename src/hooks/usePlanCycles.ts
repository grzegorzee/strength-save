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
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlanCycle, PlanCycleChoice, PlanCycleStats } from '@/types/cycles';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { calendarDayDiff, formatLocalDate } from '@/lib/utils';
import { computeCycleStats } from '@/lib/cycle-insights';
import { chunkForFirestoreWrite, planTemplateHash, shouldMergeContinuousCycles } from '@/lib/plan-cycle-utils';
import { isCycleVisible } from '@/lib/cycle-visibility';
import { sanitizePlanCycleDoc } from '@/lib/firestore-doc-guards';
import { reportClientError } from '@/lib/error-telemetry';
import { fetchWorkoutRange } from '@/lib/workout-read-store';

const CYCLES_COLLECTION = 'plan_cycles';
const CYCLE_OPERATIONS_COLLECTION = 'plan_cycle_operations';
const CYCLES_LISTENER_LIMIT = 60;

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

// Bug 16: przekazane okno workouts (limit listenera 500) nie pokrywa całej
// historii — pełną listę sesji otagowanych danymi cyklami rozstrzyga serwerowe
// zapytanie po cycleId (chunk po 10 = bezpieczny limit dysjunkcji `in`).
const fetchWorkoutIdsByCycleIds = async (userId: string, cycleIds: string[]): Promise<Set<string>> => {
  const ids = new Set<string>();
  for (let index = 0; index < cycleIds.length; index += 10) {
    const chunk = cycleIds.slice(index, index + 10);
    const snap = await getDocs(query(
      collection(db, 'workouts'),
      where('userId', '==', userId),
      where('cycleId', 'in', chunk),
    ));
    snap.docs.forEach((workoutDoc) => ids.add(workoutDoc.id));
  }
  return ids;
};

const archivedDurationWeeks = (startDate: string, endDate: string, plannedWeeks: number): number => {
  // H1 bug B (X31): cykl, który nie ruszył (endDate < startDate), nie ma
  // ujemnego zakresu — liczy się jak jednodniowy.
  const elapsedDays = Math.max(0, calendarDayDiff(startDate, endDate)) + 1;
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
  // H1 (X31): true dopiero po snapshocie z serwera (metadata.fromCache false
  // przynajmniej raz). Automatyczne mutacje na cyklach (auto-end planu,
  // auto-repair brakującego cyklu) nie mają prawa ruszyć na samym cache.
  const [hasServerSnapshot, setHasServerSnapshot] = useState(false);

  useEffect(() => {
    // Brak userId (np. odświeżanie tokena): nie ma czego ładować → "puste, ale gotowe".
    // Inaczej isLoaded zostaje false i gate startu treningu wisi w spinnerze (#6).
    if (!userId) {
      setIsLoaded(true);
      setHasServerSnapshot(true);
      return;
    }

    setHasServerSnapshot(false);

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setIsLoaded(true);
      setHasServerSnapshot(true);
      return;
    }

    // Limit (Z55): 60 najnowszych cykli = 5 lat historii przy miesięcznych cyklach.
    // orderBy startDate desc gwarantuje, że tniemy najstarsze.
    const q = query(
      collection(db, CYCLES_COLLECTION),
      where('userId', '==', userId),
      orderBy('startDate', 'desc'),
      limit(CYCLES_LISTENER_LIMIT),
    );

    // H1: includeMetadataChanges — snapshot z serwera o tej samej treści co
    // cache inaczej nie jest dostarczany (flaga serwera nigdy by nie wstała).
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.metadata.fromCache) setHasServerSnapshot(true);
        const data: PlanCycle[] = [];
        snapshot.forEach((doc) => {
          // P0: uszkodzony cykl odpada z hydracji i jest raportowany zamiast
          // renderować śmieci (zły status/days wywracał logikę aktywnego cyklu).
          const cycle = sanitizePlanCycleDoc(doc.id, doc.data());
          if (cycle === null) {
            void reportClientError(userId, { code: 'invalid-doc', phase: 'other', detail: `plan_cycles/${doc.id}` });
            return;
          }
          data.push(cycle);
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
    // H1 bug B (X31): startCycleWithPlan przekazuje id ŚWIEŻO utworzonego cyklu —
    // przy replanie z tą samą datą startu archiwizacja nie ma prawa zamknąć
    // cyklu, który właśnie powstał (incydent 2026-08-25: zero aktywnych cykli).
    opts?: { excludeCycleId?: string },
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      const today = formatLocalDate(new Date());
      // H1 bug B: cykl, który nigdy nie ruszył (start w przyszłości), zamykamy
      // z endDate = startDate — bez rekordu z endDate przed startem. UI (Cykle,
      // Historia, Osiągnięcia) i tak ukrywa zamknięte cykle bez treningów.
      const endDate = today < startDate ? startDate : today;
      // H1 (X31): archiwizujemy cykl KOŃCZONEGO planu. Po replanie na przyszły
      // poniedziałek bywają dwa aktywne cykle naraz (stary do wygaśnięcia + nowy
      // czekający); "pierwszy aktywny" (orderBy startDate desc) wskazywałby
      // NOWY cykl. Preferencja: aktywny cykl o startDate kończonego planu,
      // fallback jak dotąd (legacy konta bez wyrównanych dat).
      const activeCandidates = cycles.filter(cycle =>
        cycle.status === 'active' && cycle.id !== opts?.excludeCycleId);
      const activeCycle = activeCandidates.find(cycle => cycle.startDate === startDate)
        ?? activeCandidates[0]
        ?? null;
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
      const archivedId = await runTransaction(db, async transaction => {
        const existing = await transaction.get(cycleRef);
        if (!existing.exists()) {
          transaction.set(cycleRef, cycle);
          return cycleId;
        }
        // H1 bug B: deterministyczne id zajęte przez ŻYWY cykl (np. właśnie
        // utworzony pod tą samą datą startu, którego stale `cycles` jeszcze nie
        // widzi) — to nie jest archiwum tego planu; nic nie zamykamy.
        const existingStatus = (existing.data() as { status?: unknown }).status;
        if (existingStatus === 'active' || cycleId === opts?.excludeCycleId) return null;
        return cycleId;
      });
      return archivedId;
    } catch (err) {
      console.error('[usePlanCycles] Archive error:', err);
      return null;
    }
  }, [userId, computeStats, cycles]);

  const createActiveCycle = useCallback(async (
    planDays: TrainingDay[],
    durationWeeks: number,
    startDate: string,
    // WP-6 (X33): odpowiedzi z kreatora zapisywane NA cyklu od razu w dokumencie
    // (brak osobnego update). Bez opts (auto-repair Dashboard/Cycles) pole nie
    // powstaje. Reuse aktywnego cyklu (retry) nie nadpisuje istniejącego choice.
    opts?: { choice?: PlanCycleChoice },
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
        ...(opts?.choice ? { choice: opts.choice } : {}),
      };

      // The start date is the operation key. Retrying after a lost response must
      // observe the same cycle rather than create another active one.
      const baseId = `cycle-${userId}-${startDate}`;
      const baseRef = doc(db, CYCLES_COLLECTION, baseId);
      const cycleId = await runTransaction(db, async transaction => {
        const existing = await transaction.get(baseRef);
        if (!existing.exists()) {
          transaction.set(baseRef, cycle);
          return baseId;
        }
        // Retry tej samej operacji: aktywny cykl tego samego planu pod tym id → reuse.
        const data = existing.data() as {
          status?: unknown;
          durationWeeks?: unknown;
          days?: unknown;
          choice?: { entry?: unknown };
        };
        const sameActivePlan = data.status === 'active'
          && data.durationWeeks === durationWeeks
          && Array.isArray(data.days)
          && planTemplateHash(data.days as TrainingDay[]) === planTemplateHash(planDays);
        if (sameActivePlan) return baseId;
        // Niedokończony onboarding może mieć już cykl, gdy zapis planu stracił
        // odpowiedź lub się nie udał. Zmiana wyboru po restarcie nadal należy do
        // tej samej operacji onboardingu: podmieniamy jej snapshot pod
        // deterministycznym id, zamiast zostawiać dwa aktywne cykle. Replan nie
        // wchodzi w tę gałąź i zachowuje dotychczasowy mechanizm sufiksu.
        const replacesIncompleteOnboarding = data.status === 'active'
          && data.choice?.entry === 'onboarding'
          && opts?.choice?.entry === 'onboarding';
        if (replacesIncompleteOnboarding) {
          transaction.set(baseRef, cycle);
          return baseId;
        }
        // H1 bug B (X31): id zajęte przez ZAMKNIĘTY cykl (albo aktywny z innym
        // planem) — ponowny wybór planu z tą samą datą startu. Dotąd transakcja
        // była no-op i zwracała "sukces" bez aktywnego cyklu (konto usera
        // 2026-08-25: plan active, zero aktywnych cykli). Nowy dokument z
        // sufiksem; stary zostaje nietknięty.
        const freshId = `${baseId}-${Date.now()}`;
        transaction.set(doc(db, CYCLES_COLLECTION, freshId), cycle);
        return freshId;
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
        // Bug 15: ten sam P0-guard co listener — surowy dokument (legacy/import
        // backupu) bez stats/days craszował closeout NewPlan (TypeError na days).
        const cycle = sanitizePlanCycleDoc(snap.id, snap.data());
        if (cycle === null) {
          void reportClientError(userId, { code: 'invalid-doc', phase: 'other', detail: `plan_cycles/${snap.id}` });
          return null;
        }
        return cycle;
      }
    } catch (err) {
      console.error('[usePlanCycles] getCycleById error:', err);
    }
    return null;
  }, [cycles, userId]);

  const runMergeOperation = useCallback(async (
    operationId: string,
    operation: MergeOperation,
  ): Promise<number> => {
    const operationRef = doc(db, CYCLE_OPERATIONS_COLLECTION, operationId);
    const primaryRef = doc(db, CYCLES_COLLECTION, operation.primaryCycleId);
    const primarySnapshot = await getDoc(primaryRef);
    if (!primarySnapshot.exists()) throw new Error(`Missing primary cycle ${operation.primaryCycleId}`);
    const primary = { id: primarySnapshot.id, ...primarySnapshot.data() } as PlanCycle;
    const restIds = new Set(operation.restCycleIds);

    let nextWorkoutIndex = operation.nextWorkoutIndex;
    if (operation.phase === 'remapping') {
      // Bug 16: istnienie i potrzebę remapu rozstrzyga serwer, nie okno 500
      // przekazanych workouts (przy wznowieniu operacji okno mogło się przesunąć).
      // Sesja już przemapowana lub skasowana nie wraca z zapytania — replay
      // committed batcha po padniętym checkpoincie pozostaje bezpieczny.
      const stillTagged = await fetchWorkoutIdsByCycleIds(operation.userId, operation.restCycleIds);
      const pendingIds = operation.workoutIds.slice(nextWorkoutIndex);
      for (const ids of chunkForFirestoreWrite(pendingIds)) {
        const batch = writeBatch(db);
        ids.forEach(id => {
          if (stillTagged.has(id)) batch.update(doc(db, 'workouts', id), { cycleId: primary.id });
        });
        await batch.commit();
        nextWorkoutIndex += ids.length;
        await updateDoc(operationRef, { nextWorkoutIndex });
      }
      await updateDoc(operationRef, { phase: 'updating_primary' });
      operation = { ...operation, phase: 'updating_primary', nextWorkoutIndex };
    }

    if (operation.phase === 'updating_primary') {
      // Bug 16: staty scalonego cyklu z pełnego zakresu dat (serwer), nie z okna
      // 500 — inaczej sesje starsze niż okno zaniżały totalWorkouts/tonaż.
      const rangeWorkouts = await fetchWorkoutRange(operation.userId, {
        fromDate: operation.newStart,
        toDate: operation.newEnd,
      });
      const remapped = rangeWorkouts.map(workout =>
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
      removed += await runMergeOperation(pendingOperation.id, pendingOperation.data() as MergeOperation);
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

      // Bug 16: pełna lista sesji do remapu z serwera (okno 500 obcinało starsze
      // sesje, które zostawały z cycleId na skasowany cykl => "Poza cyklami").
      // Unia z oknem: sesja otagowana lokalnie, jeszcze niewidoczna w zapytaniu,
      // też wchodzi do operacji.
      const workoutIdSet = await fetchWorkoutIdsByCycleIds(userId, rest.map(cycle => cycle.id));
      workouts.forEach(workout => {
        if (workout.cycleId && restIds.has(workout.cycleId)) workoutIdSet.add(workout.id);
      });

      const operationId = `merge-${primary.id}`;
      const operation: MergeOperation = {
        userId,
        kind: 'merge_cycles',
        primaryCycleId: primary.id,
        restCycleIds: rest.map(cycle => cycle.id),
        workoutIds: [...workoutIdSet],
        newStart,
        newEnd,
        newDuration,
        phase: 'remapping',
        nextWorkoutIndex: 0,
        nextCycleIndex: 0,
      };
      await setDoc(doc(db, CYCLE_OPERATIONS_COLLECTION, operationId), operation, { merge: true });
      removed += await runMergeOperation(operationId, operation);
    }
    return removed;
  }, [cycles, runMergeOperation, userId]);

  // Usuwa pojedynczy cykl (np. błędny/fantomowy). Treningi NIE są kasowane —
  // odtagowujemy je z cycleId, żeby nie zostały osierocone pod nieistniejącym cyklem.
  const deleteCycle = useCallback(async (cycleId: string, workouts: WorkoutSession[] = []): Promise<boolean> => {
    if (!userId || !cycleId) return false;
    try {
      // Bug 16 (ta sama dziura co merge): sesje otagowane cyklem bierzemy
      // z serwera, nie tylko z przekazanego okna — inaczej starsze sesje
      // zostawały z cycleId na skasowany cykl ("Poza cyklami" na stałe).
      const tagged = await fetchWorkoutIdsByCycleIds(userId, [cycleId]);
      workouts.forEach((workout) => {
        if (workout.cycleId === cycleId) tagged.add(workout.id);
      });
      const taggedIds = [...tagged];
      for (const ids of chunkForFirestoreWrite(taggedIds)) {
        const batch = writeBatch(db);
        ids.forEach(id => batch.update(doc(db, 'workouts', id), { cycleId: null }));
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
    hasServerSnapshot,
    getActiveCycle,
    archiveCurrentPlan,
    createActiveCycle,
    getCycleById,
    mergeContinuousCycles,
    deleteCycle,
  };
};
