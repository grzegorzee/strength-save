import {
  collection,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeMeasurementDoc, sanitizeWorkoutDoc } from '@/lib/firestore-doc-guards';
import { reportClientError } from '@/lib/error-telemetry';
import type { BodyMeasurement, WorkoutSession } from '@/types';

export const WORKOUT_LISTENER_LIMIT = 500;
export const MEASUREMENT_LISTENER_LIMIT = 365;
export const WORKOUT_HISTORY_PAGE_SIZE = 100;
export const WORKOUT_RANGE_PAGE_SIZE = 250;
export const WORKOUT_RANGE_MAX_PAGES = 20;

const WORKOUTS_COLLECTION = 'workouts';
const MEASUREMENTS_COLLECTION = 'measurements';
const isBackendDisabledForMockE2E = (): boolean => (
  import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true'
);

// Wywoływane wyłącznie w trybie mock E2E (gałąź isBackendDisabledForMockE2E).
const readE2EWorkouts = (): WorkoutSession[] => {
  try {
    const raw = window.localStorage.getItem('fittracker_e2e_workouts');
    return raw ? (JSON.parse(raw) as WorkoutSession[]) : [];
  } catch {
    return [];
  }
};

export interface WorkoutReadSnapshot {
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  isLoaded: boolean;
  error: string | null;
  // true dopóki snapshot pochodzi z persistentLocalCache — stale rewizje z cache
  // NIE mogą seedować baseline konfliktu (audyt 3.5).
  workoutsFromCache: boolean;
}

export interface WorkoutHistoryCursor {
  date: string;
  id: string;
}

export interface WorkoutHistoryPage {
  workouts: WorkoutSession[];
  nextCursor: WorkoutHistoryCursor | null;
}

const EMPTY_SNAPSHOT: WorkoutReadSnapshot = {
  workouts: [],
  measurements: [],
  isLoaded: false,
  error: null,
  workoutsFromCache: true,
};

// Brak userId (np. odświeżanie tokena) = nie ma czego ładować → "puste, ale gotowe".
// Stabilna referencja wymagana przez useSyncExternalStore (inaczej pętla renderów).
const EMPTY_LOADED_SNAPSHOT: WorkoutReadSnapshot = {
  workouts: [],
  measurements: [],
  isLoaded: true,
  error: null,
  workoutsFromCache: true,
};

type Listener = () => void;

interface StoreEntry {
  snapshot: WorkoutReadSnapshot;
  listeners: Set<Listener>;
  unsubscribeWorkouts: Unsubscribe | null;
  unsubscribeMeasurements: Unsubscribe | null;
}

const stores = new Map<string, StoreEntry>();

// P0: uszkodzony dokument = odrzucony i zaraportowany (limit sesyjny w telemetrii),
// zamiast renderowania śmieci (NaN w seriach, brak date wywracał widoki).
const toWorkout = (userId: string, id: string, data: unknown): WorkoutSession | null => {
  const workout = sanitizeWorkoutDoc(id, data);
  if (workout === null) {
    void reportClientError(userId, { code: 'invalid-doc', phase: 'other', detail: `workouts/${id}` });
  }
  return workout;
};
const toMeasurement = (userId: string, id: string, data: unknown): BodyMeasurement | null => {
  const measurement = sanitizeMeasurementDoc(id, data);
  if (measurement === null) {
    void reportClientError(userId, { code: 'invalid-doc', phase: 'other', detail: `measurements/${id}` });
  }
  return measurement;
};

const getOrCreateStore = (userId: string): StoreEntry => {
  const existing = stores.get(userId);
  if (existing) return existing;

  const entry: StoreEntry = {
    snapshot: EMPTY_SNAPSHOT,
    listeners: new Set(),
    unsubscribeWorkouts: null,
    unsubscribeMeasurements: null,
  };
  stores.set(userId, entry);
  return entry;
};

const emit = (entry: StoreEntry, next: Partial<WorkoutReadSnapshot>): void => {
  entry.snapshot = { ...entry.snapshot, ...next };
  entry.listeners.forEach(listener => listener());
};

const startStore = (userId: string, entry: StoreEntry): void => {
  if (entry.unsubscribeWorkouts || entry.unsubscribeMeasurements) return;

  if (isBackendDisabledForMockE2E()) {
    // E2E mock: historia treningów wstrzykiwana z localStorage (wzorzec fittracker_e2e_cycles).
    entry.snapshot = { workouts: readE2EWorkouts(), measurements: [], isLoaded: true, error: null, workoutsFromCache: false };
    return;
  }

  const workoutsQuery = query(
    collection(db, WORKOUTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(WORKOUT_LISTENER_LIMIT),
  );

  entry.unsubscribeWorkouts = onSnapshot(
    workoutsQuery,
    (snapshot) => {
      emit(entry, {
        workouts: snapshot.docs
          .map(workoutDoc => toWorkout(userId, workoutDoc.id, workoutDoc.data()))
          .filter((workout): workout is WorkoutSession => workout !== null),
        isLoaded: true,
        error: null,
        workoutsFromCache: snapshot.metadata.fromCache,
      });
    },
    (err) => {
      console.error('Error fetching workouts:', err);
      emit(entry, { isLoaded: true, error: err.message });
    },
  );

  const measurementsQuery = query(
    collection(db, MEASUREMENTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(MEASUREMENT_LISTENER_LIMIT),
  );

  entry.unsubscribeMeasurements = onSnapshot(
    measurementsQuery,
    (snapshot) => {
      emit(entry, {
        measurements: snapshot.docs
          .map(measurementDoc => toMeasurement(userId, measurementDoc.id, measurementDoc.data()))
          .filter((measurement): measurement is BodyMeasurement => measurement !== null),
      });
    },
    (err) => {
      console.error('Error fetching measurements:', err);
    },
  );
};

const stopStore = (userId: string, entry: StoreEntry): void => {
  entry.unsubscribeWorkouts?.();
  entry.unsubscribeMeasurements?.();
  stores.delete(userId);
};

export const subscribeWorkoutReads = (userId: string, listener: Listener): Unsubscribe => {
  if (!userId) return () => undefined;

  const entry = getOrCreateStore(userId);
  entry.listeners.add(listener);
  startStore(userId, entry);

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      stopStore(userId, entry);
    }
  };
};

export const getWorkoutReadSnapshot = (userId: string): WorkoutReadSnapshot => {
  if (!userId) return EMPTY_LOADED_SNAPSHOT;
  return getOrCreateStore(userId).snapshot;
};

const buildWorkoutHistoryConstraints = (
  userId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    completed?: boolean;
    cursor?: WorkoutHistoryCursor | null;
    pageSize?: number;
  },
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
  ];
  if (options.fromDate) constraints.push(where('date', '>=', options.fromDate));
  if (options.toDate) constraints.push(where('date', '<=', options.toDate));
  if (options.completed !== undefined) constraints.push(where('completed', '==', options.completed));
  constraints.push(orderBy('date', 'desc'), orderBy(documentId(), 'desc'));
  if (options.cursor) constraints.push(startAfter(options.cursor.date, options.cursor.id));
  constraints.push(limit(options.pageSize ?? WORKOUT_HISTORY_PAGE_SIZE));
  return constraints;
};

export const fetchWorkoutHistoryPage = async (
  userId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    completed?: boolean;
    cursor?: WorkoutHistoryCursor | null;
    pageSize?: number;
  } = {},
): Promise<WorkoutHistoryPage> => {
  if (!userId) return { workouts: [], nextCursor: null };
  if (isBackendDisabledForMockE2E()) {
    // E2E mock: historia z haka fittracker_e2e_workouts (filtry jak w zapytaniu, bez paginacji).
    const injected = readE2EWorkouts()
      .filter((w) => (options.completed === undefined || w.completed === options.completed)
        && (!options.fromDate || w.date >= options.fromDate)
        && (!options.toDate || w.date <= options.toDate))
      .sort((a, b) => b.date.localeCompare(a.date));
    return { workouts: injected, nextCursor: null };
  }

  const pageSize = Math.max(1, Math.min(options.pageSize ?? WORKOUT_HISTORY_PAGE_SIZE, 250));
  const snapshot = await getDocs(query(
    collection(db, WORKOUTS_COLLECTION),
    ...buildWorkoutHistoryConstraints(userId, { ...options, pageSize }),
  ));
  const workouts = snapshot.docs
    .map(workoutDoc => toWorkout(userId, workoutDoc.id, workoutDoc.data()))
    .filter((workout): workout is WorkoutSession => workout !== null);
  const last = workouts.at(-1);
  return {
    workouts,
    // Pełność strony po SUROWYM snapshotcie: odfiltrowany uszkodzony dokument
    // nie może przerwać paginacji w środku historii (P0).
    nextCursor: snapshot.docs.length === pageSize && last ? { date: last.date, id: last.id } : null,
  };
};

export const fetchWorkoutRange = async (
  userId: string,
  options: {
    fromDate: string;
    toDate: string;
    completed?: boolean;
    pageSize?: number;
    maxPages?: number;
  },
): Promise<WorkoutSession[]> => {
  if (!userId) return [];
  if (isBackendDisabledForMockE2E()) return [];

  const pageSize = Math.max(1, Math.min(options.pageSize ?? WORKOUT_RANGE_PAGE_SIZE, 250));
  const maxPages = Math.max(1, Math.min(options.maxPages ?? WORKOUT_RANGE_MAX_PAGES, WORKOUT_RANGE_MAX_PAGES));
  let cursor: WorkoutHistoryCursor | null = null;
  const workouts: WorkoutSession[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchWorkoutHistoryPage(userId, {
      fromDate: options.fromDate,
      toDate: options.toDate,
      completed: options.completed,
      pageSize,
      cursor,
    });
    workouts.push(...result.workouts);
    cursor = result.nextCursor;
    if (!cursor) break;
  }

  return workouts;
};
