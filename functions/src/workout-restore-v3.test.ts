import { describe, expect, it, vi } from "vitest";
import {
  buildWorkoutRestoreV3Plan,
  executeWorkoutRestoreV3,
  parseWorkoutRestoreV3Input,
  type WorkoutRestoreV3Deps,
  type WorkoutRestoreV3Input,
} from "./workout-restore-v3";

const profile = {
  status: "active",
  consents: {
    healthGranted: true,
    healthVersion: "1.1",
    healthEpoch: 7,
    healthGrantId: "grant-7",
  },
};

const input = (overrides: Partial<WorkoutRestoreV3Input> = {}): WorkoutRestoreV3Input => ({
  v: 3,
  restoreId: "restore-12345678",
  workout: {
    id: "workout-1",
    userId: "foreign-owner-from-backup",
    dayId: "day-1",
    date: "2026-08-28",
    completed: true,
    revision: 4,
    exercises: [{
      exerciseId: "squat",
      name: "Squat",
      sets: [{ reps: 5, weight: 100, completed: true }],
    }],
  },
  health: {
    workoutId: "workout-1",
    metrics: [{ exerciseId: "squat", rpe: 8.5, pain: 2, quality: 4 }],
  },
  healthEpoch: 7,
  healthGrantId: "grant-7",
  ...overrides,
});

const harness = (options: {
  existingWorkout?: Record<string, unknown> | null;
  existingHealth?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
} = {}) => {
  let workout = options.existingWorkout ?? null;
  let health = options.existingHealth ?? null;
  let writes = 0;
  const deps: WorkoutRestoreV3Deps = {
    commit: vi.fn(async (uid, parsed, build) => {
      const plan = build(
        workout,
        health,
        options.user === undefined ? profile : options.user,
        uid,
        1_788_000_000_000,
      );
      if (plan.baseDoc) {
        writes += 1;
        workout = plan.baseDoc;
        health = plan.healthDoc;
      }
      return plan;
    }),
  };
  return { deps, getWorkout: () => workout, getHealth: () => health, getWrites: () => writes };
};

describe("restoreWorkoutBackupV3", () => {
  it("odrzuca ukończoną serię bez żadnej dodatniej wartości treningowej", () => {
    expect(() => parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        exercises: [{
          exerciseId: "empty-set",
          sets: [{ reps: 0, weight: 0, completed: true }],
        }],
      },
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }))).toThrowError(expect.objectContaining({ code: "INVALID_RESTORE_PAYLOAD" }));
  });

  it("nie uznaje samej dodatniej wagi za wykonaną pracę", () => {
    expect(() => parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        exercises: [{
          exerciseId: "weight-without-work",
          sets: [{ reps: 0, weight: 100, completed: true }],
        }],
      },
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }))).toThrowError(expect.objectContaining({ code: "INVALID_RESTORE_PAYLOAD" }));
  });

  it("odtwarza pusty checkpoint, ale ukończone wykroki z zerowym ciężarem pozostają ważne", () => {
    const checkpoint = parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        completed: false,
        exercises: [{
          exerciseId: "checkpoint-set",
          sets: [{ reps: 0, weight: 0, completed: false }],
        }],
      },
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }));
    expect(checkpoint.workout.exercises).toEqual([{
      exerciseId: "checkpoint-set",
      sets: [{ reps: 0, weight: 0, completed: false }],
    }]);

    const bodyweight = parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        exercises: [{
          exerciseId: "walking-lunge",
          sets: [{ reps: 12, weight: 0, completed: true }],
        }],
      },
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }));
    const first = buildWorkoutRestoreV3Plan(null, null, profile, "u1", bodyweight, 123);
    const retry = buildWorkoutRestoreV3Plan(first.baseDoc, null, profile, "u1", bodyweight, 456);

    expect(first.baseDoc?.exercises).toEqual([{
      exerciseId: "walking-lunge",
      sets: [{ reps: 12, weight: 0, completed: true }],
    }]);
    expect(retry).toMatchObject({ status: "already-present", baseDoc: null, healthDoc: null });
  });

  it("przygotowuje bazę i health w jednym planie, a owner zawsze pochodzi z auth", async () => {
    const h = harness();
    const result = await executeWorkoutRestoreV3("real-owner", input(), h.deps);

    expect(result).toEqual({ status: "restored", workoutId: "workout-1" });
    expect(h.getWrites()).toBe(1);
    expect(h.getWorkout()).toMatchObject({
      id: "workout-1",
      userId: "real-owner",
      healthSidecarPresent: true,
      healthSidecarRevision: 4,
    });
    expect(h.getWorkout()).not.toHaveProperty("rpe");
    expect((h.getWorkout()?.exercises as Record<string, unknown>[])[0]).not.toHaveProperty("rpe");
    expect(h.getHealth()).toMatchObject({
      userId: "real-owner",
      workoutId: "workout-1",
      healthEpoch: 7,
      healthGrantId: "grant-7",
      sourceWriteId: "restore-12345678",
      metrics: [{ exerciseId: "squat", rpe: 8.5, pain: 2, quality: 4 }],
    });
  });

  it("odrzuca health bez dokładnie aktualnego grantu przed atomowym commitem", async () => {
    const h = harness();
    await expect(executeWorkoutRestoreV3("u1", input({ healthEpoch: 6 }), h.deps))
      .rejects.toMatchObject({ code: "HEALTH_GRANT_REQUIRED" });
    expect(h.getWrites()).toBe(0);
    expect(h.getWorkout()).toBeNull();
    expect(h.getHealth()).toBeNull();
  });

  it("nie zapisuje nic użytkownikowi bez dostępu callable", async () => {
    const h = harness({ user: { status: "suspended" } });
    await expect(executeWorkoutRestoreV3("u1", input(), h.deps))
      .rejects.toMatchObject({ code: "ACCESS_DENIED" });
    expect(h.getWrites()).toBe(0);
  });

  it("retry identycznego payloadu jest idempotentny, ale inna treść daje jawny konflikt", async () => {
    const h = harness();
    await executeWorkoutRestoreV3("u1", input(), h.deps);
    await expect(executeWorkoutRestoreV3("u1", input(), h.deps)).resolves.toEqual({
      status: "already-present",
      workoutId: "workout-1",
    });
    expect(h.getWrites()).toBe(1);

    const changed = input({
      workout: { ...input().workout, notes: "different" },
    });
    await expect(executeWorkoutRestoreV3("u1", changed, h.deps))
      .rejects.toMatchObject({ code: "WORKOUT_RESTORE_CONFLICT" });
    expect(h.getWrites()).toBe(1);
  });

  it("stary marker restore nie ukrywa późniejszej zmiany istniejącego treningu", () => {
    const parsed = parseWorkoutRestoreV3Input(input());
    const first = buildWorkoutRestoreV3Plan(null, null, profile, "u1", parsed, 123);
    const changedWorkout = { ...first.baseDoc, notes: "changed after restore" };
    expect(() => buildWorkoutRestoreV3Plan(
      changedWorkout,
      first.healthDoc,
      profile,
      "u1",
      parsed,
      456,
    )).toThrowError(expect.objectContaining({ code: "WORKOUT_RESTORE_CONFLICT" }));
  });

  it("nie akceptuje osadzonego health ani sidecara dla innego treningu", () => {
    expect(() => parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        exercises: [{ exerciseId: "squat", sets: [], rpe: 9 }],
      },
    }))).toThrowError(expect.objectContaining({ code: "INVALID_RESTORE_PAYLOAD" }));

    expect(() => parseWorkoutRestoreV3Input(input({
      health: { workoutId: "other", metrics: [{ exerciseId: "squat", rpe: 8 }] },
    }))).toThrowError(expect.objectContaining({ code: "INVALID_RESTORE_PAYLOAD" }));
  });

  it("egzekwuje limit 50 ćwiczeń i 100 serii łącznie", () => {
    expect(() => parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        exercises: Array.from({ length: 51 }, (_, index) => ({ exerciseId: `e-${index}`, sets: [] })),
      },
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }))).toThrowError(expect.objectContaining({ code: "INVALID_RESTORE_PAYLOAD" }));

    expect(() => parseWorkoutRestoreV3Input(input({
      workout: {
        ...input().workout,
        exercises: [{
          exerciseId: "squat",
          sets: Array.from({ length: 101 }, () => ({ reps: 1, weight: 0, completed: true })),
        }],
      },
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }))).toThrowError(expect.objectContaining({ code: "INVALID_RESTORE_PAYLOAD" }));
  });

  it("restore bez health zapisuje bazę bez sidecara i także jest idempotentny", () => {
    const noHealth = parseWorkoutRestoreV3Input(input({
      health: undefined,
      healthEpoch: undefined,
      healthGrantId: undefined,
    }));
    const first = buildWorkoutRestoreV3Plan(null, null, profile, "u1", noHealth, 123);
    expect(first.baseDoc).toMatchObject({ userId: "u1", healthSidecarPresent: false });
    expect(first.healthDoc).toBeNull();

    const retry = buildWorkoutRestoreV3Plan(first.baseDoc, null, profile, "u1", noHealth, 456);
    expect(retry).toMatchObject({ status: "already-present", baseDoc: null, healthDoc: null });
  });
});
