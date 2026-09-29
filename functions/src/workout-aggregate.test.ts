import { describe, expect, it } from "vitest";
import {
  buildWorkoutContribution,
  applyWorkoutChange,
  rebuildAggregateFromWorkouts,
  rebuildAggregateWithCas,
  emptyWorkoutAggregate,
  needsAggregateRebuild,
  type WorkoutDocLike,
} from "./workout-aggregate";
import { buildBodyWeightTimeline, hasBodyweightLoadedWeight } from "./bodyweight-loaded";

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
      dayId: `day-${i % 3}`,
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
      id: "w-1", userId: "u", dayId: "day-1", date: "2026-08-01", completed: true, durationSec: 1800,
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
      id: "w-1", userId: "u", dayId: "day-1", date: "2026-08-01", completed: false, exercises: [],
    })).toBeNull();
  });

  it("completed bez ukończonej serii roboczej nie jest ukończonym treningiem", () => {
    expect(buildWorkoutContribution({
      id: "w-empty", userId: "u", dayId: "day-1", date: "2026-08-01", completed: true,
      exercises: [{ exerciseId: "ex-1", sets: [{ reps: 5, weight: 100, completed: false }] }],
    })).toBeNull();
    expect(buildWorkoutContribution({
      id: "w-warmup", userId: "u", dayId: "day-1", date: "2026-08-01", completed: true,
      exercises: [{ exerciseId: "ex-1", sets: [{ reps: 10, weight: 20, completed: true, isWarmup: true }] }],
    })).toBeNull();
  });

  it("uszkodzone kształty (brak exercises/sets) nie wywracają obliczeń ani licznika", () => {
    const c = buildWorkoutContribution({
      id: "w-1", userId: "u", dayId: "day-1", date: "2026-08-01", completed: true,
      exercises: [{ exerciseId: "x" } as never, null as never],
    });
    expect(c).toBeNull();
  });

  it("odrzuca dokumenty, których klient nie pokaże w Historii", () => {
    const valid: WorkoutDocLike = {
      id: "w-1", userId: "u", dayId: "day-1", date: "2026-08-01", completed: true,
      exercises: [{ exerciseId: "ex-1", sets: [{ reps: 5, weight: 100, completed: true }] }],
    };
    expect(buildWorkoutContribution({ ...valid, dayId: undefined })).toBeNull();
    expect(buildWorkoutContribution({ ...valid, date: "2026/08/01" })).toBeNull();
    expect(buildWorkoutContribution({ ...valid, exercises: undefined })).toBeNull();
    expect(buildWorkoutContribution({
      ...valid,
      exercises: [{ exerciseId: undefined, sets: [{ reps: 5, weight: 100, completed: true }] }],
    })).toBeNull();
    expect(buildWorkoutContribution({
      ...valid,
      exercises: [{ exerciseId: "ex-1", sets: [{ reps: Number.NaN, weight: 100, completed: true }] }],
    })).toBeNull();
    expect(buildWorkoutContribution({
      ...valid,
      exercises: [{ exerciseId: "ex-1", sets: [{ reps: "5", weight: "31.5", completed: true }] }],
    })).toEqual({ d: "2026-08-01", t: 157.5, s: 1, r: 5, dur: null });
    expect(buildWorkoutContribution({ ...valid, durationSec: "90" })?.dur).toBe(90);
    expect(buildWorkoutContribution({ ...valid, startedAt: "1000", completedAt: "31000" })?.dur).toBe(30);
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
    expect(agg.schemaVersion).toBe(2);
  });

  it("para provisional→remote liczy się raz, ale dwa quick workouts tego dnia liczą się osobno", () => {
    const completed = (id: string): WorkoutDocLike => ({
      id, userId: "u", dayId: id, date: "2026-09-03", completed: true,
      exercises: [{ exerciseId: "ex", sets: [{ reps: 5, weight: 20, completed: true }] }],
    });
    const remote = "workout-u-adhoc-2026-09-03-1000-2026-09-03";
    const otherQuick = "workout-u-adhoc-2026-09-03-2000-2026-09-03";
    const aggregate = rebuildAggregateFromWorkouts([
      completed(`local-${remote}`),
      completed(remote),
      completed(otherQuick),
    ]);
    expect(aggregate.totals.workoutCount).toBe(2);
    expect(aggregate.totals.totalTonnageKg).toBe(200);
  });
});

describe("v2 — rebuild CAS", () => {
  it("ponawia pełny odczyt, gdy delta triggera zmieni agregat podczas paginacji", async () => {
    let revision = "1";
    let reads = 0;
    const first: WorkoutDocLike = {
      id: "w-1", userId: "u", dayId: "day-1", date: "2026-09-01", completed: true,
      exercises: [{ exerciseId: "ex", sets: [{ reps: 5, weight: 20, completed: true }] }],
    };
    const second: WorkoutDocLike = {
      ...first, id: "w-2", dayId: "day-2", date: "2026-09-02",
    };

    const aggregate = await rebuildAggregateWithCas({
      readRevision: async () => revision,
      loadWorkouts: async () => {
        reads += 1;
        if (reads === 1) {
          revision = "2"; // trigger zapisał deltę w trakcie pierwszego odczytu
          return [first];
        }
        return [first, second];
      },
      storeIfRevision: async (expected) => expected === revision,
    });

    expect(reads).toBe(2);
    expect(aggregate.totals.workoutCount).toBe(2);
  });

  it("po konflikcie w każdej próbie zgłasza błąd zamiast zapisać stale", async () => {
    await expect(rebuildAggregateWithCas({
      readRevision: async () => "1",
      loadWorkouts: async () => [],
      storeIfRevision: async () => false,
    }, 2)).rejects.toThrow("WORKOUT_AGGREGATE_REBUILD_CONFLICT");
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

describe("v2 — migracja agregatu v1 bez ręcznej mutacji produkcji", () => {
  it("brak dokumentu albo schemat v1 wymusza pełny rebuild; v2 idzie deltą", () => {
    expect(needsAggregateRebuild(undefined)).toBe(true);
    expect(needsAggregateRebuild({ schemaVersion: 1, contributions: {}, totals: {} })).toBe(true);
    expect(needsAggregateRebuild({ contributions: {}, totals: {} })).toBe(true);
    // F6: v2 bez znacznika normalizacji bodyweight_loaded = jednorazowy rebuild
    // (legacy masa ciała z podciągania wypada z tonażu); ze znacznikiem = delta.
    expect(needsAggregateRebuild({ schemaVersion: 2, contributions: {}, totals: {} })).toBe(true);
    expect(needsAggregateRebuild({ schemaVersion: 2, bodyweightNormalization: 1, contributions: {}, totals: {} })).toBe(false);
  });

  it("delta pary provisional→remote nie podwaja licznika ani tonażu", () => {
    const contribution = { d: "2026-09-03", t: 100, s: 1, r: 5, dur: null };
    const remote = "workout-u-day-1-2026-09-03";
    let agg = applyWorkoutChange(emptyWorkoutAggregate(), `local-${remote}`, contribution);
    expect(agg.totals.workoutCount).toBe(1);
    agg = applyWorkoutChange(agg, remote, contribution);
    expect(agg.totals.workoutCount).toBe(1);
    expect(agg.totals.totalTonnageKg).toBe(100);
    // Sprzątnięcie provisional po promocji nie zmienia totals.
    expect(applyWorkoutChange(agg, `local-${remote}`, null).totals).toEqual(agg.totals);
  });
});

describe("F6 — tonaż klasyczny bez legacy masy ciała (bodyweight_loaded)", () => {
  const timeline = buildBodyWeightTimeline([
    { date: "2026-04-08", weight: 74.6 },
    { date: "2026-08-21" },
    { date: "2026-09-20", weight: 72.5 },
  ]);
  const legacy = (date: string, sets: Array<[number, number]>, name = "Podciąganie na drążku"): WorkoutDocLike => ({
    id: `w-${date}`, userId: "u", dayId: "day-1", date, completed: true,
    exercises: [{ exerciseId: "ex-1", name, sets: sets.map(([reps, weight]) => ({ reps, weight, completed: true })) }],
  });

  it("74 kg przy MC 74,6 nie jest tonażem; serie i powtórzenia zostają", () => {
    const c = buildWorkoutContribution(legacy("2026-06-04", [[6, 74], [4, 74]]), timeline);
    expect(c).toMatchObject({ t: 0, s: 2, r: 10 });
  });

  it("realne dociążenie liczy się normalnie (Reverse Crunch 12,5 kg)", () => {
    const c = buildWorkoutContribution(legacy("2026-03-09", [[8, 12.5]], "Reverse Crunch na ławce"), timeline);
    expect(c).toMatchObject({ t: 100, s: 1, r: 8 });
  });

  it("bez osi masy ciała (brak pomiarów) wkład bez zmian — jak przed F6", () => {
    expect(buildWorkoutContribution(legacy("2026-06-04", [[6, 74]]))).toMatchObject({ t: 444 });
    expect(buildWorkoutContribution(legacy("2026-06-04", [[6, 74]]), [])).toMatchObject({ t: 444 });
  });

  it("zwykłe ćwiczenie z ciężarem ≈ masie ciała NIE jest przeliczane", () => {
    const c = buildWorkoutContribution(legacy("2026-06-04", [[5, 74]], "Wiosłowanie sztangą"), timeline);
    expect(c).toMatchObject({ t: 370 });
  });

  it("rebuild z osią: ten sam licznik treningów, tonaż bez masy ciała, znacznik normalizacji", () => {
    const workouts = [legacy("2026-06-04", [[6, 74]]), legacy("2026-09-28", [[8, 72]]), legacy("2026-03-09", [[8, 12.5]], "Reverse Crunch na ławce")];
    const raw = rebuildAggregateFromWorkouts(workouts);
    const normalized = rebuildAggregateFromWorkouts(workouts, timeline);
    expect(normalized.totals.workoutCount).toBe(raw.totals.workoutCount);
    expect(normalized.totals.totalSets).toBe(raw.totals.totalSets);
    expect(normalized.totals.totalTonnageKg).toBe(100);
    expect(normalized.bodyweightNormalization).toBe(1);
    expect(needsAggregateRebuild(normalized)).toBe(false);
    // Delta zachowuje znacznik (inaczej każdy trigger robiłby pełny rebuild).
    expect(applyWorkoutChange(normalized, "w-x", null).bodyweightNormalization).toBe(1);
  });

  it("masa ciała potrzebna tylko gdy trening ma serię bodyweight_loaded z kg > 0", () => {
    expect(hasBodyweightLoadedWeight(legacy("2026-06-04", [[6, 74]]))).toBe(true);
    expect(hasBodyweightLoadedWeight(legacy("2026-10-01", [[8, 0]]))).toBe(false);
    expect(hasBodyweightLoadedWeight(legacy("2026-10-01", [[8, 80]], "Wiosłowanie sztangą"))).toBe(false);
  });
});
