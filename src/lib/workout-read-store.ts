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

// Z213: pomiary per ekran. Ekrany, które potrzebują tylko najnowszego pomiaru
// (Dashboard, WorkoutDay), dostają sondę zamiast 365 dokumentów; komponenty sync
// nie uruchamiają listenera pomiarów wcale. Pełna lista zostaje na ekranach
// Pomiary/Analityka/Ustawienia (eksport). Sonda > 1, bo selekcja najnowszego
// pomiaru pomija puste/częściowe wpisy (patrz selectLatestMeasurement).
export type MeasurementTier = 'none' | 'latest' | 'full';
export const LATEST_MEASUREMENTS_PROBE = 25;

const MEASUREMENT_TIER_RANK: Record<MeasurementTier, number> = { none: 0, latest: 1, full: 2 };

export const effectiveMeasurementTier = (tiers: Iterable<MeasurementTier>): MeasurementTier => {
  let effective: MeasurementTier = 'none';
  for (const tier of tiers) {
    if (MEASUREMENT_TIER_RANK[tier] > MEASUREMENT_TIER_RANK[effective]) effective = tier;
  }
  return effective;
};

export const measurementLimitForTier = (tier: MeasurementTier): number => {
  if (tier === 'full') return MEASUREMENT_LISTENER_LIMIT;
  if (tier === 'latest') return LATEST_MEASUREMENTS_PROBE;
  return 0;
};

// Z216: tier listenera treningów. Najczęstsze ekrany (Dashboard, DayPlan,
// nagłówek, sync) potrzebują tylko ostatniego okna — liczby all-time dostarcza
// agregat Z217. Ekrany liczące z pełnej historii (WorkoutDay z PR, Achievements,
// Analytics, eksport, backfill cykli) jawnie deklarują 'full'. Okno 120 ≈ pół
// roku treningów 2-5x/tydzień — ostatni trening danego dnia planu i 12-tygodniowe
// podsumowania zawsze się w nim mieszczą.
export type WorkoutTier = 'recent' | 'full';
export const RECENT_WORKOUTS_LIMIT = 120;

const WORKOUT_TIER_RANK: Record<WorkoutTier, number> = { recent: 0, full: 1 };

export const effectiveWorkoutTier = (tiers: Iterable<WorkoutTier>): WorkoutTier => {
  let effective: WorkoutTier = 'recent';
  for (const tier of tiers) {
    if (WORKOUT_TIER_RANK[tier] > WORKOUT_TIER_RANK[effective]) effective = tier;
  }
  return effective;
};

export const workoutLimitForTier = (tier: WorkoutTier): number =>
  (tier === 'full' ? WORKOUT_LISTENER_LIMIT : RECENT_WORKOUTS_LIMIT);

/**
 * Najnowszy pomiar z faktycznymi danymi (lista jest desc po dacie). Puste/częściowe
 * wpisy pomijamy, by formularze prefillowały się sensownymi wartościami. Jedna
 * implementacja dla pełnej listy i sondy — wyniki UI identyczne, dopóki wartościowy
 * wpis mieści się w sondzie (walidacja zapisu wymaga >=1 wartości, więc w praktyce zawsze).
 */
export const selectLatestMeasurement = (measurements: BodyMeasurement[]): BodyMeasurement | undefined => {
  const hasValue = (m: BodyMeasurement) =>
    m.weight != null || m.armLeft != null || m.armRight != null || m.chest != null ||
    m.waist != null || m.hips != null || m.thighLeft != null || m.thighRight != null ||
    m.calfLeft != null || m.calfRight != null;
  return measurements.find(hasValue) ?? measurements[0];
};

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
  // Z213: tier pomiarów per subskrybent; listener działa na maksimum aktywnych tierów.
  measurementTiers: Map<Listener, MeasurementTier>;
  activeMeasurementTier: MeasurementTier;
  // Z216: analogiczny tier treningów (recent 120 / full 500).
  workoutTiers: Map<Listener, WorkoutTier>;
  activeWorkoutTier: WorkoutTier | null;
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
    measurementTiers: new Map(),
    activeMeasurementTier: 'none',
    workoutTiers: new Map(),
    activeWorkoutTier: null,
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

// Z213: (re)startuje listener pomiarów zgodnie z maksymalnym tierem aktywnych
// subskrybentów. Zmiana effective tieru (np. wejście na ekran Pomiarów przy
// aktywnym Dashboardzie) zamyka starą subskrypcję i otwiera nową z właściwym
// limitem. Tier 'none' = zero listenera; snapshot zostaje (nikt go nie czyta).
const ensureMeasurementListener = (userId: string, entry: StoreEntry): void => {
  const tier = effectiveMeasurementTier(entry.measurementTiers.values());
  if (tier === entry.activeMeasurementTier && (tier === 'none' || entry.unsubscribeMeasurements)) return;

  entry.unsubscribeMeasurements?.();
  entry.unsubscribeMeasurements = null;
  entry.activeMeasurementTier = tier;
  if (tier === 'none') return;

  const measurementsQuery = query(
    collection(db, MEASUREMENTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(measurementLimitForTier(tier)),
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

// Z216: (re)startuje listener treningów zgodnie z maksymalnym tierem aktywnych
// subskrybentów — wejście na ekran 'full' (Analytics, WorkoutDay) podnosi okno
// do 500, powrót na ekrany 'recent' zwęża je do 120.
const ensureWorkoutListener = (userId: string, entry: StoreEntry): void => {
  const tier = effectiveWorkoutTier(entry.workoutTiers.values());
  if (tier === entry.activeWorkoutTier && entry.unsubscribeWorkouts) return;

  entry.unsubscribeWorkouts?.();
  entry.activeWorkoutTier = tier;

  const workoutsQuery = query(
    collection(db, WORKOUTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(workoutLimitForTier(tier)),
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
};

const startStore = (userId: string, entry: StoreEntry): void => {
  if (isBackendDisabledForMockE2E()) {
    if (!entry.snapshot.isLoaded) {
      // E2E mock: historia treningów wstrzykiwana z localStorage (wzorzec fittracker_e2e_cycles).
      entry.snapshot = { workouts: readE2EWorkouts(), measurements: [], isLoaded: true, error: null, workoutsFromCache: false };
    }
    return;
  }

  ensureWorkoutListener(userId, entry);
  ensureMeasurementListener(userId, entry);
};

const stopStore = (userId: string, entry: StoreEntry): void => {
  entry.unsubscribeWorkouts?.();
  entry.unsubscribeMeasurements?.();
  stores.delete(userId);
};

export const subscribeWorkoutReads = (
  userId: string,
  listener: Listener,
  measurementTier: MeasurementTier = 'full',
  workoutTier: WorkoutTier = 'full',
): Unsubscribe => {
  if (!userId) return () => undefined;

  const entry = getOrCreateStore(userId);
  entry.listeners.add(listener);
  entry.measurementTiers.set(listener, measurementTier);
  entry.workoutTiers.set(listener, workoutTier);
  startStore(userId, entry);

  return () => {
    entry.listeners.delete(listener);
    entry.measurementTiers.delete(listener);
    entry.workoutTiers.delete(listener);
    if (entry.listeners.size === 0) {
      stopStore(userId, entry);
    } else if (!isBackendDisabledForMockE2E()) {
      ensureWorkoutListener(userId, entry);
      ensureMeasurementListener(userId, entry);
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
