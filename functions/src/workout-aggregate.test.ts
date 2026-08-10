import { describe, expect, it } from "vitest";
import {
  buildWorkoutContribution,
  applyWorkoutChange,
  rebuildAggregateFromWorkouts,
  emptyWorkoutAggregate,
  type WorkoutDocLike,
} from "./workout-aggregate";

// Z217: agregat all-time dla kafli Dashboardu. Test równoważności liczy przeciw
// golden values zamrożonym w src/test/z215-history-freeze.test.ts (fixture 600):
// tonaż 374400, ukończone 540, serie 1080, czas 540*3600, pierwsza data 2024-12-11.

const dateFor = (i: number): string => {
  const d = new Date(Date.UTC(2026, 7, 1));
  d.setUTCDate(d.getUTCDate() - i);
  return d.toISOString().slice(0, 10);
};

const buildFixture = (): WorkoutDocLike[] => {
  const workouts: WorkoutDocLike[] = [];
  for (let i = 0; i < 600; i += 1) {
    const weight = 40 + (i % 5) * 10;
    const reps = 5 + (i % 3);
    workouts.push({
      id: `w-${i}`,
      userId: "u",
      date: dateFor(i),
      completed: i % 10 !== 9,
      durationSec: 3600,
      exercises: [
        {
          exerciseId: `ex-${i % 4}`,
          sets: [
            { reps, weight, completed: true },
            { reps, weight, completed: true },
            { reps: 10, weight: 20, completed: true, isWarmup: true },
          ],
        },
      ],
    });
  }
  return workouts;
};

describe("Z217 — buildWorkoutContribution", () => {
  it("liczy tonaż z ukończonych serii roboczych, bez rozgrzewki", () => {
    const c = buildWorkoutContribution({
      id: "w-1", userId: "u", date: "2026-08-01", completed: true, durationSec: 1800,
      exercises: [{
        exerciseId: "ex-1",
        sets: [
          { reps: 5, weight: 100, completed: true },
          { reps: 5, weight: 100, completed: false }, // nieukończona — poza tonażem
          { reps: 10, weight: 40, completed: true, isWarmup: true }, // rozgrzewka — poza
        ],
      }],
    });
    expect(c).toEqual({ d: "2026-08-01", t: 500, s: 1, r: 5, dur: 1800 });
  });

  it("nieukończony trening nie wnosi wkładu", () => {
    expect(buildWorkoutContribution({
      id: "w-1", userId: "u", date: "2026-08-01", completed: false, exercises: [],
    })).toBeNull();
  });

  it("uszkodzone kształty (brak exercises/sets) nie wywracają obliczeń", () => {
    const c = buildWorkoutContribution({
      id: "w-1", userId: "u", date: "2026-08-01", completed: true,
      exercises: [{ exerciseId: "x" } as never, null as never],
    });
    expect(c).toEqual({ d: "2026-08-01", t: 0, s: 0, r: 0, dur: null });
  });
});

describe("Z217 — rebuildAggregateFromWorkouts (równoważność z golden Z215)", () => {
  it("fixture 600 daje dokładnie golden values", () => {
    const agg = rebuildAggregateFromWorkouts(buildFixture());
    expect(agg.totals.workoutCount).toBe(540);
    expect(agg.totals.totalTonnageKg).toBe(374400);
    expect(agg.totals.totalSets).toBe(1080);
    expect(agg.totals.totalReps).toBe(6480);
    expect(agg.totals.totalDurationSec).toBe(540 * 3600);
    expect(agg.totals.workoutsWithDuration).toBe(540);
    expect(agg.totals.firstWorkoutDate).toBe("2024-12-11");
    expect(Object.keys(agg.contributions)).toHaveLength(540);
    expect(agg.schemaVersion).toBe(1);
  });
});

describe("Z217 — applyWorkoutChange (idempotentne delty)", () => {
  const base = (): ReturnType<typeof emptyWorkoutAggregate> => {
    let agg = emptyWorkoutAggregate();
    agg = applyWorkoutChange(agg, "w-1", { d: "2026-08-01", t: 500, s: 1, r: 5, dur: 1800 });
    agg = applyWorkoutChange(agg, "w-2", { d: "2026-08-02", t: 300, s: 2, r: 10, dur: null });
    return agg;
  };

  it("dodanie i edycja aktualizują totals z mapy wkładów", () => {
    const agg = base();
    expect(agg.totals.workoutCount).toBe(2);
    expect(agg.totals.totalTonnageKg).toBe(800);
    expect(agg.totals.workoutsWithDuration).toBe(1);
    expect(agg.totals.firstWorkoutDate).toBe("2026-08-01");

    const edited = applyWorkoutChange(agg, "w-1", { d: "2026-08-01", t: 700, s: 1, r: 5, dur: 1800 });
    expect(edited.totals.totalTonnageKg).toBe(1000);
    expect(edited.totals.workoutCount).toBe(2);
  });

  it("usunięcie treningu zdejmuje wkład; ponowne usunięcie niczego nie psuje (idempotencja)", () => {
    const agg = base();
    const removed = applyWorkoutChange(agg, "w-1", null);
    expect(removed.totals.workoutCount).toBe(1);
    expect(removed.totals.totalTonnageKg).toBe(300);
    expect(removed.totals.firstWorkoutDate).toBe("2026-08-02");
    const removedTwice = applyWorkoutChange(removed, "w-1", null);
    expect(removedTwice.totals).toEqual(removed.totals);
  });

  it("ten sam event dostarczony dwa razy daje ten sam stan (at-least-once delivery)", () => {
    const agg = base();
    const once = applyWorkoutChange(agg, "w-3", { d: "2026-08-03", t: 100, s: 1, r: 5, dur: null });
    const twice = applyWorkoutChange(once, "w-3", { d: "2026-08-03", t: 100, s: 1, r: 5, dur: null });
    expect(twice.totals).toEqual(once.totals);
    expect(Object.keys(twice.contributions)).toHaveLength(3);
  });
});
