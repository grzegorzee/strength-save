import {
  collection,
  documentId,
  getDocs,
  getDocsFromCache,
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
import type { ActiveHealthGrant } from '@/lib/legal-versions';
import {
  joinWorkoutHealth,
  sanitizeWorkoutHealthDoc,
  type WorkoutHealthDocument,
} from '@/lib/workout-health-read';

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
const WORKOUT_HEALTH_COLLECTION = 'workout_health_v2';
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

// WP-G (X35a): pomiary ciała wstrzykiwane jak treningi (fittracker_e2e_measurements).
const readE2EMeasurements = (): BodyMeasurement[] => {
  try {
    const raw = window.localStorage.getItem('fittracker_e2e_measurements');
    return raw ? (JSON.parse(raw) as BodyMeasurement[]) : [];
  } catch {
    return [];
  }
};

export interface WorkoutReadSnapshot {
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  isLoaded: boolean;
  error: string | null;
  /** Błąd wyłącznie listenera pomiarów; UI nie może mylić go z historią treningów. */
  measurementError: string | null;
  // true dopóki snapshot pochodzi z persistentLocalCache — stale rewizje z cache
  // NIE mogą seedować baseline konfliktu (audyt 3.5).
  workoutsFromCache: boolean;
  /** true oznacza, że marker bazy wskazuje brakujący/stary sidecar w cache. */
  healthDataIncomplete: boolean;
  healthError: string | null;
}

export interface WorkoutHistoryCursor {
  date: string;
  id: string;
}

export interface WorkoutHistoryPage {
  workouts: WorkoutSession[];
  nextCursor: WorkoutHistoryCursor | null;
  healthDataIncomplete?: boolean;
  /** E-T5: source 'cache' bez danych w cache — hook czeka na serwer, bez pustego błysku. */
  cacheMiss?: boolean;
}

const chunks = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
};

const fetchWorkoutHealthForPage = async (
  userId: string,
  workouts: WorkoutSession[],
  source: 'cache' | 'default',
): Promise<Map<string, WorkoutHealthDocument>> => {
  const ids = workouts
    .filter(workout => workout.healthSidecarPresent === true
      && workout.healthSidecarRevision === workout.revision)
    .map(workout => workout.id);
  if (ids.length === 0) return new Map();

  const documents = await Promise.all(chunks(ids, 30).map(async (idsChunk) => {
    const healthQuery = query(
      collection(db, WORKOUT_HEALTH_COLLECTION),
      where('userId', '==', userId),
      where(documentId(), 'in', idsChunk),
    );
    try {
      const snapshot = source === 'cache'
        ? await getDocsFromCache(healthQuery)
        : await getDocs(healthQuery);
      return snapshot.docs;
    } catch {
      return [];
    }
  }));

  return new Map(documents.flat().flatMap((healthDoc) => {
    const health = sanitizeWorkoutHealthDoc(healthDoc.id, healthDoc.data(), userId);
    if (!health) {
      void reportClientError(userId, {
        code: 'invalid-doc',
        phase: 'other',
        detail: `${WORKOUT_HEALTH_COLLECTION}/${healthDoc.id}`,
      });
      return [];
    }
    return [[health.workoutId, health] as const];
  }));
};

const EMPTY_SNAPSHOT: WorkoutReadSnapshot = {
  workouts: [],
  measurements: [],
  isLoaded: false,
  error: null,
  measurementError: null,
  workoutsFromCache: true,
  healthDataIncomplete: false,
  healthError: null,
};

// Brak userId (np. odświeżanie tokena) = nie ma czego ładować → "puste, ale gotowe".
// Stabilna referencja wymagana przez useSyncExternalStore (inaczej pętla renderów).
const EMPTY_LOADED_SNAPSHOT: WorkoutReadSnapshot = {
  workouts: [],
  measurements: [],
  isLoaded: true,
  error: null,
  measurementError: null,
  workoutsFromCache: true,
  healthDataIncomplete: false,
  healthError: null,
};

type Listener = () => void;

interface StoreEntry {
  snapshot: WorkoutReadSnapshot;
  baseWorkouts: WorkoutSession[];
  healthByWorkoutId: Map<string, WorkoutHealthDocument>;
  listeners: Set<Listener>;
  // Z213: tier pomiarów per subskrybent; listener działa na maksimum aktywnych tierów.
  measurementTiers: Map<Listener, MeasurementTier>;
  activeMeasurementTier: MeasurementTier;
  // Z216: analogiczny tier treningów (recent 120 / full 500).
  workoutTiers: Map<Listener, WorkoutTier>;
  healthGrants: Map<Listener, ActiveHealthGrant | null>;
  activeHealthGrant: ActiveHealthGrant | null;
  activeWorkoutTier: WorkoutTier | null;
  activeHealthLimit: number | null;
  unsubscribeWorkouts: Unsubscribe | null;
  unsubscribeHealth: Unsubscribe | null;
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
    baseWorkouts: [],
    healthByWorkoutId: new Map(),
    listeners: new Set(),
    measurementTiers: new Map(),
    activeMeasurementTier: 'none',
    workoutTiers: new Map(),
    healthGrants: new Map(),
    activeHealthGrant: null,
    activeWorkoutTier: null,
    activeHealthLimit: null,
    unsubscribeWorkouts: null,
    unsubscribeHealth: null,
    unsubscribeMeasurements: null,
  };
  stores.set(userId, entry);
  return entry;
};

const emit = (entry: StoreEntry, next: Partial<WorkoutReadSnapshot>): void => {
  entry.snapshot = { ...entry.snapshot, ...next };
  entry.listeners.forEach(listener => listener());
};

const sameGrant = (a: ActiveHealthGrant | null, b: ActiveHealthGrant | null): boolean => (
  a === b || (!!a && !!b && a.healthEpoch === b.healthEpoch && a.healthGrantId === b.healthGrantId)
);

const effectiveHealthGrant = (grants: Iterable<ActiveHealthGrant | null>): ActiveHealthGrant | null => {
  for (const grant of grants) if (grant) return grant;
  return null;
};

const emitVisibleWorkouts = (entry: StoreEntry, next: Partial<WorkoutReadSnapshot> = {}): void => {
  const mode = entry.activeHealthGrant ? 'active' as const : 'base' as const;
  let incomplete = false;
  const workouts = entry.baseWorkouts.map((workout) => {
    const joined = joinWorkoutHealth(workout, entry.healthByWorkoutId.get(workout.id) ?? null, {
      mode,
      activeGrant: entry.activeHealthGrant,
    });
    if (joined.state === 'partial') incomplete = true;
    return joined.workout;
  });
  emit(entry, { workouts, healthDataIncomplete: incomplete, ...next });
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
        measurementError: null,
      });
    },
    (err) => {
      // Bug 40: sam console.error = cicha degradacja (puste Pomiary/Analityka
      // bez informacji i bez śladu w telemetrii). Symetrycznie do treningów:
      // error do snapshotu + client_errors. isLoaded zostaje przy listenerze
      // treningów (otwiera go jego sukces LUB błąd) — tu go nie ruszamy.
      console.error('Error fetching measurements:', err);
      emit(entry, { error: err.message, measurementError: err.message });
      void reportClientError(userId, { code: 'listener-error', phase: 'other', detail: `measurements-listener: ${err.message}` });
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
      entry.baseWorkouts = snapshot.docs
        .map(workoutDoc => toWorkout(userId, workoutDoc.id, workoutDoc.data()))
        .filter((workout): workout is WorkoutSession => workout !== null);
      emitVisibleWorkouts(entry, {
        isLoaded: true,
        error: null,
        workoutsFromCache: snapshot.metadata.fromCache,
      });
    },
    (err) => {
      console.error('Error fetching workouts:', err);
      emit(entry, { isLoaded: true, error: err.message });
      // Bug 40: błąd listenera był niewidoczny dla client_errors (tylko konsola).
      void reportClientError(userId, { code: 'listener-error', phase: 'other', detail: `workouts-listener: ${err.message}` });
    },
  );
};

const ensureHealthListener = (userId: string, entry: StoreEntry): void => {
  const grant = effectiveHealthGrant(entry.healthGrants.values());
  const grantChanged = !sameGrant(grant, entry.activeHealthGrant);
  entry.activeHealthGrant = grant;
  const healthLimit = grant && entry.activeWorkoutTier
    ? workoutLimitForTier(entry.activeWorkoutTier)
    : null;

  if (!grant) {
    entry.unsubscribeHealth?.();
    entry.unsubscribeHealth = null;
    entry.activeHealthLimit = null;
    if (grantChanged) emitVisibleWorkouts(entry, { healthError: null });
    return;
  }
  if (entry.unsubscribeHealth && entry.activeHealthLimit === healthLimit) {
    if (grantChanged) emitVisibleWorkouts(entry);
    return;
  }

  entry.unsubscribeHealth?.();
  entry.activeHealthLimit = healthLimit;
  const healthQuery = query(
    collection(db, WORKOUT_HEALTH_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(healthLimit ?? RECENT_WORKOUTS_LIMIT),
  );
  entry.unsubscribeHealth = onSnapshot(
    healthQuery,
    (snapshot) => {
      entry.healthByWorkoutId = new Map(snapshot.docs.flatMap((healthDoc) => {
        const health = sanitizeWorkoutHealthDoc(healthDoc.id, healthDoc.data(), userId);
        if (!health) {
          void reportClientError(userId, {
            code: 'invalid-doc',
            phase: 'other',
            detail: `${WORKOUT_HEALTH_COLLECTION}/${healthDoc.id}`,
          });
          return [];
        }
        return [[health.workoutId, health] as const];
      }));
      emitVisibleWorkouts(entry, { healthError: null });
    },
    (err) => {
      console.error('Error fetching workout health:', err);
      emitVisibleWorkouts(entry, { healthError: err.message });
      void reportClientError(userId, {
        code: 'listener-error',
        phase: 'other',
        detail: `workout-health-listener: ${err.message}`,
      });
    },
  );
};

const startStore = (userId: string, entry: StoreEntry): void => {
  if (isBackendDisabledForMockE2E()) {
    if (!entry.snapshot.isLoaded) {
      // E2E mock: historia treningów wstrzykiwana z localStorage (wzorzec fittracker_e2e_cycles).
      entry.snapshot = {
        workouts: readE2EWorkouts(),
        measurements: readE2EMeasurements(),
        isLoaded: true,
        error: null,
        measurementError: null,
        workoutsFromCache: false,
        healthDataIncomplete: false,
        healthError: null,
      };
    }
    return;
  }

  ensureWorkoutListener(userId, entry);
  ensureHealthListener(userId, entry);
  ensureMeasurementListener(userId, entry);
};

const stopStore = (userId: string, entry: StoreEntry): void => {
  entry.unsubscribeWorkouts?.();
  entry.unsubscribeHealth?.();
  entry.unsubscribeMeasurements?.();
  stores.delete(userId);
};

export const subscribeWorkoutReads = (
  userId: string,
  listener: Listener,
  measurementTier: MeasurementTier = 'full',
  workoutTier: WorkoutTier = 'full',
  activeHealthGrant: ActiveHealthGrant | null = null,
): Unsubscribe => {
  if (!userId) return () => undefined;

  const entry = getOrCreateStore(userId);
  entry.listeners.add(listener);
  entry.measurementTiers.set(listener, measurementTier);
  entry.workoutTiers.set(listener, workoutTier);
  entry.healthGrants.set(listener, activeHealthGrant);
  startStore(userId, entry);

  return () => {
    entry.listeners.delete(listener);
    entry.measurementTiers.delete(listener);
    entry.workoutTiers.delete(listener);
    entry.healthGrants.delete(listener);
    if (entry.listeners.size === 0) {
      stopStore(userId, entry);
    } else if (!isBackendDisabledForMockE2E()) {
      ensureWorkoutListener(userId, entry);
      ensureHealthListener(userId, entry);
      ensureMeasurementListener(userId, entry);
    }
  };
};

export const getWorkoutReadSnapshot = (userId: string): WorkoutReadSnapshot => {
  if (!userId) return EMPTY_LOADED_SNAPSHOT;
  return getOrCreateStore(userId).snapshot;
};

/** Bug 40: jawna ścieżka wyjścia z błędu listenera pomiarów. Zachowuje ostatnie
 * poprawne dane i error do chwili pierwszego udanego snapshotu. */
export const retryMeasurementReads = (userId: string): void => {
  if (!userId || isBackendDisabledForMockE2E()) return;
  const entry = getOrCreateStore(userId);
  entry.unsubscribeMeasurements?.();
  entry.unsubscribeMeasurements = null;
  ensureMeasurementListener(userId, entry);
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
    /** E-T5: 'cache' czyta wyłącznie z lokalnego cache Firestore (pierwsze malowanie
     * bez czekania na serwer przy słabym zasięgu); default = jak dotąd (server-first). */
    source?: 'cache' | 'default';
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
  const historyQuery = query(
    collection(db, WORKOUTS_COLLECTION),
    ...buildWorkoutHistoryConstraints(userId, { ...options, pageSize }),
  );
  let snapshot;
  if (options.source === 'cache') {
    try {
      snapshot = await getDocsFromCache(historyQuery);
    } catch {
      // Brak danych w cache (pierwsze uruchomienie) — hook czeka na serwer.
      return { workouts: [], nextCursor: null, cacheMiss: true };
    }
  } else {
    snapshot = await getDocs(historyQuery);
  }
  // Pusty cache nie rozstrzyga "brak treningów" — dopiero serwer to potwierdzi.
  if (options.source === 'cache' && snapshot.docs.length === 0) {
    return { workouts: [], nextCursor: null, cacheMiss: true };
  }
  const baseWorkouts = snapshot.docs
    .map(workoutDoc => toWorkout(userId, workoutDoc.id, workoutDoc.data()))
    .filter((workout): workout is WorkoutSession => workout !== null);
  const healthByWorkoutId = await fetchWorkoutHealthForPage(
    userId,
    baseWorkouts,
    options.source === 'cache' ? 'cache' : 'default',
  );
  let healthDataIncomplete = false;
  const workouts = baseWorkouts.map((workout) => {
    const joined = joinWorkoutHealth(
      workout,
      healthByWorkoutId.get(workout.id) ?? null,
      { mode: 'owner' },
    );
    if (joined.state === 'partial') healthDataIncomplete = true;
    return joined.workout;
  });
  // Pełność strony po SUROWYM snapshotcie: odfiltrowany uszkodzony dokument
  // nie może przerwać paginacji w środku historii (P0). Bug 41: kursor też
  // z SUROWEGO ogona — strona zakończona odrzuconymi dokumentami (w skrajności
  // odrzucona w całości) szła po ostatnim POPRAWNYM dokumencie, więc ogon wracał
  // na następnej stronie, a pełna odrzucona strona zatrzymywała paginację
  // (nextCursor=null zjadał też fetchWorkoutRange i Load More w Historii).
  let nextCursor: WorkoutHistoryCursor | null = null;
  if (snapshot.docs.length === pageSize) {
    const rawLast = snapshot.docs.at(-1);
    const rawLastDate = rawLast ? (rawLast.data() as { date?: unknown }).date : undefined;
    const last = workouts.at(-1);
    if (rawLast && typeof rawLastDate === 'string') {
      nextCursor = { date: rawLastDate, id: rawLast.id };
    } else if (last) {
      // Surowa data nie jest stringiem (startAfter wymaga wartości porównywalnej
      // z polem date) — fallback na ostatni poprawny dokument: ogon strony wróci
      // przy kolejnym odczycie, ale paginacja idzie dalej.
      nextCursor = { date: last.date, id: last.id };
    }
    // Brak obu: strona w całości odrzucona i bez porównywalnych dat — stop;
    // każdy odrzut zaraportowany invalid-doc (toWorkout), przypadek widoczny w client_errors.
  }
  return {
    workouts,
    nextCursor,
    ...(healthDataIncomplete ? { healthDataIncomplete: true } : {}),
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
