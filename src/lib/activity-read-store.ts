import {
  collection, getDocsFromServer, limit, orderBy, query, startAfter, where,
  type DocumentData, type QueryDocumentSnapshot, type QuerySnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { fetchWorkoutHistoryPage, type WorkoutHistoryCursor } from '@/lib/workout-read-store';
import type { StatsActivity } from '@/lib/all-time-stats';
import type { WorkoutSession } from '@/types';

export interface AllTimeActivityHistory {
  workouts: WorkoutSession[];
  activities: StatsActivity[];
}

const PAGE_SIZE = 250;
const isMockE2E = () => import.meta.env.VITE_E2E_MODE === 'true'
  && import.meta.env.VITE_USE_EMULATORS !== 'true';

const statsActivity = (id: string, data: DocumentData, uid: string, source: StatsActivity['source']): StatsActivity | null => {
  if (!id || data.userId !== uid || typeof data.type !== 'string' || !data.type.trim()) return null;
  // Only retain the fields used by these statistics, not HR or other health details.
  return {
    id, userId: uid, source, type: data.type,
    ...(typeof data.stravaId === 'number' && data.stravaId > 0 ? { stravaId: data.stravaId } : {}),
    ...(typeof data.movingTime === 'number' && Number.isFinite(data.movingTime) && data.movingTime >= 0
      ? { movingTime: data.movingTime } : {}),
    ...(typeof data.elapsedTime === 'number' && Number.isFinite(data.elapsedTime) && data.elapsedTime >= 0
      ? { elapsedTime: data.elapsedTime } : {}),
  };
};

type ActivityHistoryOptions = {
  includeStrava: boolean;
  signal?: AbortSignal;
  fromDate?: string;
  toDate?: string;
};

/** On demand only; cursors advance within the requested date window. */
const fetchActivityHistory = async (
  uid: string,
  options: ActivityHistoryOptions,
): Promise<AllTimeActivityHistory> => {
  const assertOwner = () => {
    if (options.signal?.aborted) throw new DOMException('History read cancelled', 'AbortError');
    if (!uid || (!isMockE2E() && auth.currentUser?.uid !== uid)) throw new Error('history-owner-changed');
  };
  assertOwner();

  const readStrength = async () => {
    const workouts: WorkoutSession[] = [];
    let cursor: WorkoutHistoryCursor | null = null;
    do {
      assertOwner();
      const page = await fetchWorkoutHistoryPage(uid, {
        pageSize: PAGE_SIZE, cursor, source: 'server',
        ...(options.fromDate ? { fromDate: options.fromDate } : {}),
        ...(options.toDate ? { toDate: options.toDate } : {}),
      });
      assertOwner();
      workouts.push(...page.workouts.filter((workout) => workout.userId === uid));
      cursor = page.nextCursor;
    } while (cursor);
    return workouts;
  };

  const readActivities = async (source: StatsActivity['source']) => {
    const collectionName = source === 'manual' ? 'manual_activities' : 'strava_activities';
    if (isMockE2E()) {
      const raw: unknown = JSON.parse(localStorage.getItem(`fittracker_e2e_${collectionName}`) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw.flatMap((data) => {
        if (!data || typeof data !== 'object' || typeof data.id !== 'string') return [];
        if ((options.fromDate && data.date < options.fromDate) || (options.toDate && data.date > options.toDate)) return [];
        const activity = statsActivity(data.id, data, uid, source);
        return activity ? [activity] : [];
      });
    }
    const activities: StatsActivity[] = [];
    let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
    while (true) {
      assertOwner();
      // Existing userId ASC/date DESC indexes cover both collections. The raw
      // snapshot cursor includes Firestore's implicit document ID tie-breaker.
      const snapshot: QuerySnapshot<DocumentData> = await getDocsFromServer(query(
        collection(db, collectionName), where('userId', '==', uid),
        ...(options.fromDate ? [where('date', '>=', options.fromDate)] : []),
        ...(options.toDate ? [where('date', '<=', options.toDate)] : []),
        orderBy('date', 'desc'),
        ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE),
      ));
      assertOwner();
      for (const doc of snapshot.docs) {
        const activity = statsActivity(doc.id, doc.data(), uid, source);
        if (activity) activities.push(activity);
      }
      if (snapshot.docs.length < PAGE_SIZE) return activities;
      // Advance on raw rows, even if an entire page was malformed and discarded.
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  };

  const [workouts, manual, strava] = await Promise.all([
    readStrength(), readActivities('manual'),
    options.includeStrava ? readActivities('strava') : Promise.resolve([]),
  ]);
  assertOwner();
  return { workouts, activities: [...manual, ...strava] };
};

export const fetchAllTimeActivityHistory = (
  uid: string,
  options: Pick<ActivityHistoryOptions, 'includeStrava' | 'signal'>,
): Promise<AllTimeActivityHistory> => fetchActivityHistory(uid, options);

export const fetchWeekActivityHistory = (
  uid: string,
  options: ActivityHistoryOptions & { fromDate: string; toDate: string },
): Promise<AllTimeActivityHistory> => fetchActivityHistory(uid, options);
