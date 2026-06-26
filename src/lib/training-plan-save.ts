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
import { buildActiveCyclePlanPatch } from './plan-cycle-utils';

const PLAN_COLLECTION = 'training_plans';
const CYCLES_COLLECTION = 'plan_cycles';

export interface SaveTrainingPlanWithRevisionParams {
  userId: string;
  newPlan: TrainingDay[];
  expectedRevision: number;
  durationWeeks: number;
  startDate: string | null;
  syncActiveCycle?: boolean;
}

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

    transaction.set(planRef, {
      days: params.newPlan,
      updatedAt: new Date().toISOString(),
      durationWeeks: params.durationWeeks,
      revision: currentRevision + 1,
      ...(params.startDate ? { startDate: params.startDate } : {}),
    }, { merge: true });

    if (params.syncActiveCycle !== false) {
      const patch = buildActiveCyclePlanPatch(params.newPlan, params.durationWeeks, params.startDate);
      activeCycles.filter(snapshot => snapshot.exists()).forEach(snapshot => transaction.update(snapshot.ref, patch));
    }
  });
};
