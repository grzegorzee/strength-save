import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { SetData } from '@/types';

export interface WorkoutStartLoadState {
  workoutsLoaded: boolean;
  planLoaded: boolean;
  cyclesLoaded: boolean;
  draftLoaded: boolean;
}

export interface WorkoutStartSnapshot {
  day: TrainingDay;
  date: string;
  activeCycleId: string | null;
}

export const areWorkoutStartSourcesReady = (state: WorkoutStartLoadState): boolean => (
  state.workoutsLoaded
  && state.planLoaded
  && state.cyclesLoaded
  && state.draftLoaded
);

const cycleEndDate = (cycle: PlanCycle): string => {
  if (cycle.endDate) return cycle.endDate;
  const start = new Date(`${cycle.startDate}T12:00:00`);
  start.setDate(start.getDate() + Math.max(1, cycle.durationWeeks) * 7 - 1);
  return [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-');
};

const cycleContainsDate = (cycle: PlanCycle, date: string): boolean => (
  date >= cycle.startDate && date <= cycleEndDate(cycle)
);

export const findUniqueCycleForDate = (
  cycles: PlanCycle[],
  date: string,
): PlanCycle | null => {
  const matching = cycles.filter((cycle) => cycleContainsDate(cycle, date));
  return matching.length === 1 ? matching[0] : null;
};

// Z141.2: guard bliźniak — budowa stanu startowego NIGDY nie niszczy żywego draftu.
// Draft (IndexedDB) jest źródłem prawdy; stan komponentu (ref) bywa pusty na świeżym
// mouncie (wyścig z hydracją, root cause incydentu 2026-07-24). Start może serie
// tylko UZUPEŁNIĆ o brakujące ćwiczenia.

export interface StartExerciseLike {
  id: string;
  name: string;
  sets: string;
}

export const buildStartExerciseSets = (input: {
  exercises: ReadonlyArray<StartExerciseLike>;
  /** Serie z draftu dla tej strony (źródło prawdy); null gdy draftu nie ma. */
  draftSets: Record<string, SetData[]> | null;
  /** Stan komponentu (exerciseSetsRef.current) — fallback, bywa pusty na świeżym mouncie. */
  stateSets: Record<string, SetData[]>;
  buildPrefill: (exercise: StartExerciseLike) => SetData[];
}): { sets: Record<string, SetData[]>; added: boolean } => {
  const base = input.draftSets && Object.keys(input.draftSets).length > 0
    ? input.draftSets
    : input.stateSets;
  const sets: Record<string, SetData[]> = { ...base };
  let added = false;
  input.exercises.forEach((exercise) => {
    if (sets[exercise.id]) return;
    sets[exercise.id] = input.buildPrefill(exercise);
    added = true;
  });
  return { sets, added };
};

export interface StartSessionMeta {
  sessionId: string;
  provisional: boolean;
  cloudUpdatedAt?: number;
  cloudRevision?: number;
}

export const buildStartDraft = (input: {
  uid: string;
  session: StartSessionMeta;
  snapshot: WorkoutStartSnapshot;
  /** Żywy draft tej strony do adopcji (serie/notatki/startedAt/wersja zostają); null → świeży start. */
  adoptedDraft: ActiveWorkoutDraft | null;
  sets: Record<string, SetData[]>;
  now: number;
}): ActiveWorkoutDraft => {
  const { uid, session, snapshot, adoptedDraft, sets, now } = input;
  const identity = {
    sessionId: session.sessionId,
    userId: uid,
    dayId: snapshot.day.id,
    date: snapshot.date,
    cycleId: snapshot.activeCycleId,
    sessionOrigin: session.provisional ? 'provisional' as const : 'remote' as const,
    remoteSessionId: session.provisional ? null : session.sessionId,
    cloudUpdatedAt: session.cloudUpdatedAt,
    cloudRevision: session.cloudRevision,
    exerciseSets: sets,
    exerciseNames: Object.fromEntries(
      snapshot.day.exercises.map((exercise) => [exercise.id, exercise.name]),
    ),
    dayName: snapshot.day.dayName,
    dayFocus: snapshot.day.focus,
    updatedAt: now,
    lastFirebaseSyncAt: null,
    dirty: true,
    completedLocally: false,
    finalSyncPending: false,
  };

  if (adoptedDraft) {
    return {
      ...identity,
      exerciseNotes: adoptedDraft.exerciseNotes,
      exerciseMetrics: adoptedDraft.exerciseMetrics,
      dayNotes: adoptedDraft.dayNotes,
      skippedExercises: adoptedDraft.skippedExercises,
      startedAt: adoptedDraft.startedAt,
      version: adoptedDraft.version,
      ...(adoptedDraft.lastTouchedExerciseId && { lastTouchedExerciseId: adoptedDraft.lastTouchedExerciseId }),
    };
  }

  return {
    ...identity,
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    skippedExercises: [],
    startedAt: now,
    version: 1,
  };
};

export const buildWorkoutStartSnapshot = (
  day: TrainingDay,
  date: string,
  cycles: PlanCycle[],
): WorkoutStartSnapshot => {
  const activeCycles = cycles.filter(
    (cycle) => cycle.status === 'active' && cycleContainsDate(cycle, date),
  );
  // Anomalia danych (2 aktywne cykle na tę datę) nie może BLOKOWAĆ startu treningu.
  // Wybierz deterministycznie najnowszy (createdAt, tie-break po id) i ostrzeż w logu.
  if (activeCycles.length > 1) {
    console.warn(
      `[workout-start] ${activeCycles.length} aktywne cykle na ${date}; wybrano najnowszy deterministycznie`,
      activeCycles.map((cycle) => cycle.id),
    );
  }
  const chosenCycle = [...activeCycles].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  )[0] ?? null;

  return {
    date,
    activeCycleId: chosenCycle?.id ?? null,
    day: {
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        instructions: exercise.instructions?.map((instruction) => ({ ...instruction })) ?? [],
      })),
    },
  };
};
