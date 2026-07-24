import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { TrainingDay } from '../data/trainingPlan';
import type { ProgressionConfig } from './progression-engine';
import { alignPlanDaysWithCycleIds, buildActiveCyclePlanPatch } from './plan-cycle-utils';

const PLAN_COLLECTION = 'training_plans';
const CYCLES_COLLECTION = 'plan_cycles';

export interface SaveTrainingPlanWithRevisionParams {
  userId: string;
  newPlan: TrainingDay[];
  expectedRevision: number;
  durationWeeks: number;
  startDate: string | null;
  syncActiveCycle?: boolean;
  /** Progresja programowa (Z119): undefined = nie ruszaj pola, null = brak zmiany też. */
  progression?: ProgressionConfig;
}

/**
 * Z151: przy aktywnym cyklu zapisywane dni planu są wyrównywane do id dni
 * PIERWSZEGO aktywnego cyklu (id dnia cyklu jest niezmienne przez całe jego
 * życie). Ten sam wyrównany zestaw idzie do training_plans.days ORAZ patcha
 * cyklu. Bez aktywnego cyklu dni wchodzą bez zmian (default day-N zostaje).
 */
export const resolvePlanDaysForSave = (
  newPlan: TrainingDay[],
  activeCycles: Array<{ days?: TrainingDay[]; startDate?: string } | undefined>,
): TrainingDay[] => {
  const firstActive = activeCycles.find(cycle =>
    cycle && Array.isArray(cycle.days) && typeof cycle.startDate === 'string' && cycle.startDate.length > 0);
  if (!firstActive) return newPlan;
  return alignPlanDaysWithCycleIds(newPlan, firstActive.days!, firstActive.startDate!);
};

export const saveTrainingPlanWithRevision = async (
  firestoreDb: Firestore,
  params: SaveTrainingPlanWithRevisionParams,
): Promise<void> => {
  const planRef = doc(firestoreDb, PLAN_COLLECTION, params.userId);
  const activeCyclesQuery = query(
    collection(firestoreDb, CYCLES_COLLECTION),
    where('userId', '==', params.userId),
    where('status', '==', 'active'),
  );
  // The browser Firestore SDK only permits document reads inside a transaction.
  // Resolve the active references first, then re-read every one in the transaction
  // so concurrent edits retry against the plan + active-cycle consistency boundary.
  const activeCycleRefs = params.syncActiveCycle === false
    ? []
    : (await getDocs(activeCyclesQuery)).docs.map(snapshot => snapshot.ref);

  await runTransaction(firestoreDb, async transaction => {
    const current = await transaction.get(planRef);
    const activeCycles = params.syncActiveCycle === false
      ? []
      : await Promise.all(activeCycleRefs.map(ref => transaction.get(ref)));
    const currentRevision = typeof current.data()?.revision === 'number'
      ? Math.max(0, Math.floor(current.data()!.revision))
      : 0;

    if (currentRevision !== params.expectedRevision) {
      throw new Error('PLAN_CONFLICT');
    }

    // Z151: plan i cykl trzymają identyczne id po każdym zapisie — wyrównany
    // zestaw dni trafia do OBU dokumentów.
    const alignedPlan = params.syncActiveCycle === false
      ? params.newPlan
      : resolvePlanDaysForSave(
        params.newPlan,
        activeCycles.filter(snapshot => snapshot.exists()).map(snapshot => snapshot.data() as { days?: TrainingDay[]; startDate?: string }),
      );

    transaction.set(planRef, {
      days: alignedPlan,
      updatedAt: new Date().toISOString(),
      durationWeeks: params.durationWeeks,
      revision: currentRevision + 1,
      ...(params.startDate ? { startDate: params.startDate } : {}),
      ...(params.progression !== undefined ? { progression: params.progression } : {}),
    }, { merge: true });

    if (params.syncActiveCycle !== false) {
      const patch = buildActiveCyclePlanPatch(alignedPlan, params.durationWeeks, params.startDate);
      activeCycles.filter(snapshot => snapshot.exists()).forEach(snapshot => transaction.update(snapshot.ref, patch));
    }
  });
};
