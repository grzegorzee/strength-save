import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Z217: agregat all-time treningów dla kafli Dashboardu (tonaż, licznik) i
// przyszłej redukcji listenera 500 (Z216). Źródłem prawdy jest MAPA WKŁADÓW per
// workoutId — totals są przeliczane z mapy przy każdej zmianie, więc dokument
// jest odtwarzalny, idempotentny (set po kluczu, nie increment) i odporny na
// at-least-once delivery triggerów. Pisze WYŁĄCZNIE backend (rules: write false);
// klient czyta users/{uid}/aggregates/allTime z fallbackiem na lokalne obliczenia.
//
// v2 świadomie NIE zawiera: streaków (semantyka tygodniowa liczona od "dziś",
// zostaje w kliencie), PR i ulubionego ćwiczenia (wymagają nazw/serii per
// trening — AllTimeStatsSheet pobiera pełną historię na żądanie). Względem v1
// odrzuca completed bez serii roboczej i deduplikuje parę provisional→remote.

export interface WorkoutSetLike {
  reps?: unknown;
  weight?: unknown;
  completed?: unknown;
  isWarmup?: unknown;
}

export interface WorkoutDocLike {
  id: string;
  userId: string;
  dayId?: string;
  date: string;
  completed?: boolean;
  durationSec?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  exercises?: Array<{ exerciseId?: string; sets?: WorkoutSetLike[] } | null>;
}

/** Kompaktowy wkład jednego UKOŃCZONEGO treningu do agregatu. */
export interface WorkoutContribution {
  /** data treningu (YYYY-MM-DD) */
  d: string;
  /** tonaż kg (ukończone serie robocze, bez rozgrzewki — reguła Z106) */
  t: number;
  /** liczba ukończonych serii roboczych */
  s: number;
  /** suma powtórzeń serii roboczych */
  r: number;
  /** czas trwania w sekundach albo null (treningi sprzed M32) */
  dur: number | null;
}

export interface WorkoutAggregateTotals {
  workoutCount: number;
  totalTonnageKg: number;
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  workoutsWithDuration: number;
  firstWorkoutDate: string | null;
}

export interface WorkoutAggregate {
  schemaVersion: number;
  contributions: Record<string, WorkoutContribution>;
  totals: WorkoutAggregateTotals;
}

export const WORKOUT_AGGREGATE_SCHEMA_VERSION = 2;

export const emptyWorkoutAggregate = (): WorkoutAggregate => ({
  schemaVersion: WORKOUT_AGGREGATE_SCHEMA_VERSION,
  contributions: {},
  totals: {
    workoutCount: 0,
    totalTonnageKg: 0,
    totalSets: 0,
    totalReps: 0,
    totalDurationSec: 0,
    workoutsWithDuration: 0,
    firstWorkoutDate: null,
  },
});

/** Czas trwania jak workoutDurationSec w kliencie: durationSec albo znaczniki. */
const durationSecOf = (workout: WorkoutDocLike): number | null => {
  const durationSec = asFiniteNumber(workout.durationSec);
  if (durationSec !== null && durationSec > 0) return Math.floor(durationSec);
  const startedAt = asFiniteNumber(workout.startedAt);
  const completedAt = asFiniteNumber(workout.completedAt);
  if (startedAt !== null && completedAt !== null && completedAt > startedAt) {
    return Math.floor((completedAt - startedAt) / 1000);
  }
  return null;
};

// Parytet z klientowym sanitizeWorkoutDoc: legacy Firestore może zawierać
// liczby jako stringi, ale puste/NaN/Infinity nie przechodzą.
const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Wkład treningu albo null (nieukończony / bez daty — nie liczy się do agregatu). */
export const buildWorkoutContribution = (workout: WorkoutDocLike): WorkoutContribution | null => {
  if (!workout.completed) return null;
  // Ten sam dokument bazowy co sanitizeWorkoutDoc po stronie klienta. Agregat
  // nie może policzyć rekordu, którego Historia odrzuci jako niewidoczny.
  if (typeof workout.id !== "string" || workout.id.length === 0) return null;
  if (typeof workout.userId !== "string" || typeof workout.dayId !== "string") return null;
  if (typeof workout.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(workout.date)) return null;
  if (!Array.isArray(workout.exercises)) return null;

  let tonnage = 0;
  let sets = 0;
  let reps = 0;
  for (const exercise of workout.exercises) {
    if (!exercise || typeof exercise.exerciseId !== "string" || !Array.isArray(exercise.sets)) continue;
    const exerciseSets = exercise.sets;
    for (const set of exerciseSets) {
      if (!set || !set.completed || set.isWarmup === true) continue;
      const setReps = asFiniteNumber(set.reps);
      const setWeight = asFiniteNumber(set.weight);
      if (setReps === null || setWeight === null) continue;
      sets += 1;
      reps += setReps;
      tonnage += setReps * setWeight;
    }
  }
  // Ten sam kontrakt co klient: completed bez wykonanej serii roboczej jest
  // pustym/przerwanym rekordem, a nie ukończonym treningiem.
  if (sets === 0) return null;
  return { d: workout.date, t: tonnage, s: sets, r: reps, dur: durationSecOf(workout) };
};

const canonicalWorkoutSessionId = (sessionId: string): string => (
  sessionId.startsWith("local-workout-") ? sessionId.slice("local-".length) : sessionId
);

const totalsFromContributions = (
  contributions: Record<string, WorkoutContribution>,
): WorkoutAggregateTotals => {
  const totals: WorkoutAggregateTotals = {
    workoutCount: 0,
    totalTonnageKg: 0,
    totalSets: 0,
    totalReps: 0,
    totalDurationSec: 0,
    workoutsWithDuration: 0,
    firstWorkoutDate: null,
  };
  // Snapshot przejściowy może zawierać provisional i wypromowany remote.
  // Deduplikujemy tylko tę parę deterministycznych id; dwa quick workouts mają
  // różne identyfikatory (timestamp w dayId), więc pozostają osobnymi sesjami.
  const canonical = new Map<string, [string, WorkoutContribution]>();
  for (const [sessionId, contribution] of Object.entries(contributions)) {
    const key = canonicalWorkoutSessionId(sessionId);
    const existing = canonical.get(key);
    if (!existing || sessionId === key) canonical.set(key, [sessionId, contribution]);
  }
  for (const [, contribution] of canonical.values()) {
    totals.workoutCount += 1;
    totals.totalTonnageKg += contribution.t;
    totals.totalSets += contribution.s;
    totals.totalReps += contribution.r;
    if (contribution.dur !== null) {
      totals.workoutsWithDuration += 1;
      totals.totalDurationSec += contribution.dur;
    }
    if (totals.firstWorkoutDate === null || contribution.d < totals.firstWorkoutDate) {
      totals.firstWorkoutDate = contribution.d;
    }
  }
  return totals;
};

/** Brak dokumentu albo schemat sprzed v2 (inna definicja ukończonego treningu):
 * delta na starej mapie wkładów mieszałaby semantyki, więc pełny rebuild. */
export const needsAggregateRebuild = (existing: unknown): boolean => (
  (existing as { schemaVersion?: unknown } | null | undefined)?.schemaVersion
    !== WORKOUT_AGGREGATE_SCHEMA_VERSION
);

/** Idempotentna zmiana: set/delete wkładu po workoutId + przeliczenie totals z mapy. */
export const applyWorkoutChange = (
  aggregate: WorkoutAggregate,
  workoutId: string,
  contribution: WorkoutContribution | null,
): WorkoutAggregate => {
  const contributions = { ...aggregate.contributions };
  if (contribution === null) {
    delete contributions[workoutId];
  } else {
    contributions[workoutId] = contribution;
  }
  return {
    schemaVersion: WORKOUT_AGGREGATE_SCHEMA_VERSION,
    contributions,
    totals: totalsFromContributions(contributions),
  };
};

/** Pełny rebuild (backfill) — idempotentny, można odpalać wielokrotnie. */
export const rebuildAggregateFromWorkouts = (workouts: WorkoutDocLike[]): WorkoutAggregate => {
  const contributions: Record<string, WorkoutContribution> = {};
  for (const workout of workouts) {
    const contribution = buildWorkoutContribution(workout);
    if (contribution !== null && typeof workout.id === "string" && workout.id.length > 0) {
      contributions[workout.id] = contribution;
    }
  }
  return {
    schemaVersion: WORKOUT_AGGREGATE_SCHEMA_VERSION,
    contributions,
    totals: totalsFromContributions(contributions),
  };
};

const aggregateRef = (db: admin.firestore.Firestore, uid: string) =>
  db.collection("users").doc(uid).collection("aggregates").doc("allTime");

const REBUILD_PAGE_SIZE = 500;

type AggregateRevision = string | null;

const snapshotRevision = (snapshot: admin.firestore.DocumentSnapshot): AggregateRevision => {
  const updateTime = snapshot.updateTime;
  return updateTime ? `${updateTime.seconds}:${updateTime.nanoseconds}` : null;
};

interface AggregateRebuildCasDeps {
  readRevision: () => Promise<AggregateRevision>;
  loadWorkouts: () => Promise<WorkoutDocLike[]>;
  storeIfRevision: (revision: AggregateRevision, aggregate: WorkoutAggregate) => Promise<boolean>;
}

/** Rebuild nie może nadpisać delty triggera zapisanej podczas paginacji.
 * Jeśli rewizja agregatu zmieniła się pomiędzy odczytem a transakcją, czytamy
 * historię ponownie. Po wyczerpaniu prób zgłaszamy błąd zamiast zapisać stale. */
export const rebuildAggregateWithCas = async (
  deps: AggregateRebuildCasDeps,
  maxAttempts = 3,
): Promise<WorkoutAggregate> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const revision = await deps.readRevision();
    const aggregate = rebuildAggregateFromWorkouts(await deps.loadWorkouts());
    if (await deps.storeIfRevision(revision, aggregate)) return aggregate;
  }
  throw new Error("WORKOUT_AGGREGATE_REBUILD_CONFLICT");
};

const loadAllWorkouts = async (
  db: admin.firestore.Firestore,
  uid: string,
): Promise<WorkoutDocLike[]> => {
  const workouts: WorkoutDocLike[] = [];
  let cursor: admin.firestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query = db.collection("workouts")
      .where("userId", "==", uid)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(REBUILD_PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    for (const docSnapshot of snapshot.docs) {
      workouts.push({ ...(docSnapshot.data() as WorkoutDocLike), id: docSnapshot.id });
    }
    if (snapshot.docs.length < REBUILD_PAGE_SIZE) break;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
  return workouts;
};

/** Pełny rebuild z historii usera (paginacja po id) + zapis dokumentu. */
const rebuildAndStore = async (
  db: admin.firestore.Firestore,
  uid: string,
): Promise<WorkoutAggregate> => {
  const ref = aggregateRef(db, uid);
  return rebuildAggregateWithCas({
    readRevision: async () => snapshotRevision(await ref.get()),
    loadWorkouts: () => loadAllWorkouts(db, uid),
    storeIfRevision: (revision, aggregate) => db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (snapshotRevision(current) !== revision) return false;
      transaction.set(ref, {
        ...aggregate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    }),
  });
};

const readAggregate = (
  snapshot: admin.firestore.DocumentSnapshot,
): WorkoutAggregate => {
  if (!snapshot.exists) return emptyWorkoutAggregate();
  const data = snapshot.data() as Partial<WorkoutAggregate> | undefined;
  if (!data || typeof data.contributions !== "object" || data.contributions === null) {
    return emptyWorkoutAggregate();
  }
  return {
    schemaVersion: WORKOUT_AGGREGATE_SCHEMA_VERSION,
    contributions: data.contributions as Record<string, WorkoutContribution>,
    totals: totalsFromContributions(data.contributions as Record<string, WorkoutContribution>),
  };
};

/** Trigger: każdy zapis workouts/{id} aktualizuje agregat właściciela. */
export const onWorkoutWrittenAggregate = onDocumentWritten(
  { document: "workouts/{workoutId}", region: "us-central1" },
  async (event) => {
    const workoutId = event.params.workoutId;
    const before = event.data?.before;
    const after = event.data?.after;
    const afterData = after?.exists ? (after.data() as WorkoutDocLike) : null;
    const beforeData = before?.exists ? (before.data() as WorkoutDocLike) : null;
    const uid = afterData?.userId ?? beforeData?.userId;
    if (!uid) return;

    const contribution = afterData
      ? buildWorkoutContribution({ ...afterData, id: workoutId })
      : null;

    const db = admin.firestore();

    // Istniejący user bez dokumentu (albo stary schemat): przyrostowy apply
    // zbudowałby agregat od JEDNEGO treningu i kafle pokazałyby bzdury.
    // Rebuild ma CAS na rewizji agregatu: delta triggera zapisana podczas
    // paginacji wymusza ponowny odczyt historii zamiast zostać nadpisana.
    const existingSnapshot = await aggregateRef(db, uid).get();
    if (!existingSnapshot.exists || needsAggregateRebuild(existingSnapshot.data())) {
      const rebuilt = await rebuildAndStore(db, uid);
      logger.info(`[workoutAggregate] rebuild uid=${uid} completed=${rebuilt.totals.workoutCount}`);
      return;
    }

    await db.runTransaction(async (transaction) => {
      const ref = aggregateRef(db, uid);
      const snapshot = await transaction.get(ref);
      const current = readAggregate(snapshot);
      const existing = current.contributions[workoutId];
      // Bez zmiany wkładu nie ma zapisu (zapisy checkpointowe serii w trakcie
      // treningu nie generują kosztu, dopóki nie zmieniają ukończonych danych).
      const unchanged = contribution === null
        ? existing === undefined
        : existing !== undefined
          && existing.d === contribution.d && existing.t === contribution.t
          && existing.s === contribution.s && existing.r === contribution.r
          && existing.dur === contribution.dur;
      if (unchanged) return;

      const next = applyWorkoutChange(current, workoutId, contribution);
      transaction.set(ref, {
        ...next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  },
);

/** Backfill/naprawa: pełny rebuild agregatu zalogowanego usera (idempotentny). */
export const rebuildWorkoutAggregate = onCall(
  { region: "us-central1", enforceAppCheck: false },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const aggregate = await rebuildAndStore(admin.firestore(), uid);
    logger.info(`[rebuildWorkoutAggregate] uid=${uid} completed=${aggregate.totals.workoutCount}`);
    return { workoutCount: aggregate.totals.workoutCount };
  },
);
