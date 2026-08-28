import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decideWorkoutHealthCommit,
  executeWorkoutSyncV2,
  type WorkoutSyncV2Deps,
  type WorkoutSyncV2Input,
} from "./workout-sync-v2";

const baseInput = (overrides: Partial<WorkoutSyncV2Input> = {}): WorkoutSyncV2Input => ({
  v: 2,
  sessionId: "workout-1",
  expectedRevision: 2,
  writeId: "write-12345678",
  healthEpoch: 7,
  healthGrantId: "grant-7",
  healthMode: "replace",
  exercises: [{
    exerciseId: "squat",
    name: "Squat",
    notes: "steady",
    sets: [{ reps: 5, weight: 100, completed: true }],
    rpe: 8.5,
    pain: 2,
    quality: 4,
  }],
  options: { completed: true, completedAt: 1_787_000_000_000 },
  ...overrides,
});

const activeProfile = {
  consents: {
    healthGranted: true,
    healthVersion: "1.1",
    healthEpoch: 7,
    healthGrantId: "grant-7",
  },
};

const createHarness = (overrides: {
  owner?: string;
  revision?: number;
  lastWriteId?: string;
  lastWriteDigest?: string;
  profile?: Record<string, unknown>;
  legacyExercise?: Record<string, unknown>;
} = {}) => {
  let workout: Record<string, unknown> = {
    userId: overrides.owner ?? "u1",
    revision: overrides.revision ?? 2,
    ...(overrides.lastWriteId ? { lastWriteId: overrides.lastWriteId } : {}),
    ...(overrides.lastWriteDigest ? { lastWriteDigest: overrides.lastWriteDigest } : {}),
    exercises: [overrides.legacyExercise ?? {
      exerciseId: "squat",
      sets: [{ reps: 3, weight: 90, completed: true }],
    }],
  };
  let health: Record<string, unknown> | null = null;
  const profile = overrides.profile ?? activeProfile;

  const deps: WorkoutSyncV2Deps = {
    commitBase: vi.fn(async (uid, input, build) => {
      const result = build(workout, profile, uid, 1_787_000_001_000);
      if (result.baseUpdate) workout = { ...workout, ...result.baseUpdate };
      return result;
    }),
    commitHealth: vi.fn(async (_uid, candidate, validateGrant) => {
      if (!validateGrant(profile)) return false;
      health = candidate;
      return true;
    }),
  };
  return { deps, getWorkout: () => workout, getHealth: () => health };
};

describe("syncWorkoutV2", () => {
  it("odrzuca ukończoną serię bez żadnej dodatniej wartości treningowej", async () => {
    const h = createHarness();
    await expect(executeWorkoutSyncV2("u1", baseInput({
      exercises: [{
        exerciseId: "empty-set",
        sets: [{ reps: 0, weight: 0, completed: true }],
      }],
      healthMode: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }), h.deps)).rejects.toMatchObject({ code: "INVALID_WORKOUT_PAYLOAD" });
    expect(h.deps.commitHealth).not.toHaveBeenCalled();
  });

  it("nie uznaje samej dodatniej wagi za wykonaną pracę", async () => {
    const h = createHarness();
    await expect(executeWorkoutSyncV2("u1", baseInput({
      exercises: [{
        exerciseId: "weight-without-work",
        sets: [{ reps: 0, weight: 100, completed: true }],
      }],
      healthMode: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }), h.deps)).rejects.toMatchObject({ code: "INVALID_WORKOUT_PAYLOAD" });
    expect(h.deps.commitHealth).not.toHaveBeenCalled();
  });

  it("zachowuje pustą nieukończoną serię checkpointu", async () => {
    const h = createHarness();
    const result = await executeWorkoutSyncV2("u1", baseInput({
      exercises: [{
        exerciseId: "checkpoint-set",
        sets: [{ reps: 0, weight: 0, completed: false }],
      }],
      options: {},
      healthMode: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }), h.deps);

    expect(result).toMatchObject({ revision: 3, health: "none" });
    expect(h.getWorkout().exercises).toEqual([{
      exerciseId: "checkpoint-set",
      sets: [{ reps: 0, weight: 0, completed: false }],
    }]);
  });

  it("akceptuje powtórzenia bez ciężaru i zachowuje idempotentny retry", async () => {
    const h = createHarness();
    const bodyweightInput = baseInput({
      exercises: [{
        exerciseId: "walking-lunge",
        name: "Wykroki",
        sets: [{ reps: 12, weight: 0, completed: true }],
      }],
      healthMode: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    });

    await expect(executeWorkoutSyncV2("u1", bodyweightInput, h.deps))
      .resolves.toMatchObject({ revision: 3, health: "none" });
    await expect(executeWorkoutSyncV2("u1", bodyweightInput, h.deps))
      .resolves.toMatchObject({ revision: 3, alreadyApplied: true, health: "none" });
    expect(h.getWorkout().exercises).toEqual([{
      exerciseId: "walking-lunge",
      name: "Wykroki",
      sets: [{ reps: 12, weight: 0, completed: true }],
    }]);
  });

  it("nie pozwala spóźnionemu side-write nadpisać nowszych metryk", () => {
    expect(decideWorkoutHealthCommit({
      baseWorkout: { userId: "u1", revision: 4, lastWriteId: "write-new" },
      currentHealth: {
        userId: "u1", workoutId: "workout-1", baseRevision: 4,
        sourceWriteId: "write-new", metrics: [{ exerciseId: "squat", rpe: 7 }],
      },
      candidate: {
        userId: "u1", workoutId: "workout-1", healthEpoch: 7, healthGrantId: "grant-7",
        baseRevision: 3, sourceWriteId: "write-old", updatedAt: 1,
        metrics: [{ exerciseId: "squat", rpe: 9 }],
      },
    })).toBe("noop");
  });

  it("lost ACK tego samego side-write jest idempotentnym no-op", () => {
    const candidate = {
      userId: "u1", workoutId: "workout-1", healthEpoch: 7, healthGrantId: "grant-7",
      baseRevision: 3, sourceWriteId: "write-12345678", updatedAt: 1,
      metrics: [{ exerciseId: "squat", rpe: 8.5 }],
    };
    expect(decideWorkoutHealthCommit({
      baseWorkout: { userId: "u1", revision: 3, lastWriteId: "write-12345678" },
      currentHealth: candidate,
      candidate,
    })).toBe("noop");
  });

  it("jawne wyczyszczenie wszystkich metryk tworzy operację delete", () => {
    const candidate = {
      userId: "u1", workoutId: "workout-1", healthEpoch: 7, healthGrantId: "grant-7",
      baseRevision: 3, sourceWriteId: "write-12345678", updatedAt: 1, metrics: [],
    };
    expect(decideWorkoutHealthCommit({
      baseWorkout: { userId: "u1", revision: 3, lastWriteId: "write-12345678" },
      currentHealth: {
        ...candidate,
        baseRevision: 2,
        sourceWriteId: "write-previous",
        metrics: [{ exerciseId: "squat", pain: 2 }],
      },
      candidate,
    })).toBe("delete");
  });

  it("bez zgody zapisuje bazowy trening, usuwa nowe health i nie tworzy side-write", async () => {
    const h = createHarness({ profile: {} });
    const result = await executeWorkoutSyncV2("u1", baseInput(), h.deps);
    expect(result).toMatchObject({ revision: 3, health: "stripped" });
    expect(h.getWorkout().exercises).toEqual([{
      exerciseId: "squat", name: "Squat", notes: "steady",
      sets: [{ reps: 5, weight: 100, completed: true }],
    }]);
    expect(h.getHealth()).toBeNull();
  });

  it("z aktualnym grantem zapisuje metryki wyłącznie w zamkniętym dokumencie health", async () => {
    const h = createHarness();
    const result = await executeWorkoutSyncV2("u1", baseInput(), h.deps);
    expect(result).toMatchObject({ revision: 3, health: "written" });
    expect(h.getWorkout().exercises).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ rpe: expect.anything() }),
    ]));
    expect(h.getHealth()).toMatchObject({
      userId: "u1", workoutId: "workout-1", healthEpoch: 7, healthGrantId: "grant-7",
      metrics: [{ exerciseId: "squat", rpe: 8.5, pain: 2, quality: 4 }],
    });
  });

  it("stale fence lub withdraw nie zapisują health, ale baza nadal dochodzi", async () => {
    const stale = createHarness();
    await expect(executeWorkoutSyncV2("u1", baseInput({ healthEpoch: 6 }), stale.deps))
      .resolves.toMatchObject({ revision: 3, health: "stripped" });
    expect(stale.getHealth()).toBeNull();

    const withdrawn = createHarness({
      profile: { consents: { healthGranted: false, healthVersion: "1.1", healthEpoch: 8, healthGrantId: null } },
    });
    await expect(executeWorkoutSyncV2("u1", baseInput(), withdrawn.deps))
      .resolves.toMatchObject({ revision: 3, health: "stripped" });
    expect(withdrawn.getHealth()).toBeNull();
  });

  it("lost ACK: retry tego samego writeId nie podbija rewizji i ponawia health side-write", async () => {
    const h = createHarness();
    const first = await executeWorkoutSyncV2("u1", baseInput(), h.deps);
    const retry = await executeWorkoutSyncV2("u1", baseInput(), h.deps);
    expect(first.revision).toBe(3);
    expect(retry).toMatchObject({ revision: 3, alreadyApplied: true, health: "written" });
    expect(h.deps.commitHealth).toHaveBeenCalledTimes(2);
  });

  it("konflikt expectedRevision nie zapisuje bazy ani health", async () => {
    const h = createHarness({ revision: 3 });
    await expect(executeWorkoutSyncV2("u1", baseInput(), h.deps))
      .rejects.toMatchObject({ code: "WORKOUT_CONFLICT" });
    expect(h.deps.commitHealth).not.toHaveBeenCalled();
  });

  it("nigdy nie usuwa ani nie nadpisuje legacy embedded health", async () => {
    const h = createHarness({ legacyExercise: {
      exerciseId: "squat",
      sets: [{ reps: 3, weight: 90, completed: true }],
      rpe: 6,
      pain: 1,
      quality: 3,
    } });
    await executeWorkoutSyncV2("u1", baseInput(), h.deps);
    expect(h.getWorkout().exercises).toEqual([expect.objectContaining({ rpe: 6, pain: 1, quality: 3 })]);
  });

  it("niepoprawne metryki są odrzucane, a poprawna baza pozostaje", async () => {
    const h = createHarness();
    const input = baseInput({ exercises: [{
      exerciseId: "squat", sets: [{ reps: 5, weight: 100, completed: true }],
      rpe: 8.3, pain: 99, quality: Number.NaN,
    }] });
    const result = await executeWorkoutSyncV2("u1", input, h.deps);
    expect(result.health).toBe("stripped");
    expect(h.getHealth()).toBeNull();
    expect(h.getWorkout().exercises).toEqual([{
      exerciseId: "squat", sets: [{ reps: 5, weight: 100, completed: true }],
    }]);
  });

  it("właściciel z tokenu musi zgadzać się z dokumentem", async () => {
    const h = createHarness({ owner: "other" });
    await expect(executeWorkoutSyncV2("u1", baseInput(), h.deps))
      .rejects.toMatchObject({ code: "WORKOUT_FORBIDDEN" });
    expect(h.deps.commitHealth).not.toHaveBeenCalled();
  });

  it("awaria health side-write raportuje retry bez cofania zatwierdzonej bazy", async () => {
    const h = createHarness();
    vi.mocked(h.deps.commitHealth).mockRejectedValueOnce(new Error("temporary"));
    const result = await executeWorkoutSyncV2("u1", baseInput(), h.deps);
    expect(result).toMatchObject({ revision: 3, health: "pending" });
    expect(h.getWorkout().revision).toBe(3);
  });

  it("replace bez metryk czyści poprzedni sidecar zamiast zostawiać stare dane", async () => {
    const h = createHarness();
    const result = await executeWorkoutSyncV2("u1", baseInput({
      exercises: [{
        exerciseId: "squat",
        sets: [{ reps: 5, weight: 100, completed: true }],
      }],
    }), h.deps);
    expect(result).toMatchObject({ revision: 3, health: "written" });
    expect(h.getHealth()).toMatchObject({ metrics: [] });
  });
});
