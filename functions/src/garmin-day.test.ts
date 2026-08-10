import { describe, it, expect } from "vitest";
import {
  GARMIN_RESPONSE_MAX_BYTES,
  buildGarminDayContext,
  buildRecentExercises,
  isGarminResponseWithinLimit,
  type GarminPlanDay,
  type GarminWorkout,
} from "./garmin-day";

const day: GarminPlanDay = {
  id: "day-1",
  dayName: "Poniedziałek",
  weekday: "monday",
  focus: "Klatka / Przysiad",
  exercises: [
    { id: "ex-1", name: "Wyciskanie hantli (Lekki skos)", sets: "3 x 6-8" },
    { id: "ex-2", name: "Plank", sets: "3 x 60", tracking: "duration" },
  ],
};

const workout = (exerciseId: string, weight: number, reps: number): GarminWorkout => ({
  date: "2026-07-13",
  completed: true,
  exercises: [{
    exerciseId,
    sets: [
      { reps, weight, completed: true },
      { reps, weight, completed: true },
      { reps, weight, completed: true },
    ],
  }],
});

// 2026-07-20 = poniedziałek.
describe("buildGarminDayContext (Z125)", () => {
  it("dzień planu wg weekday: kompaktowy JSON z pre-fill z historii i celem", () => {
    const ctx = buildGarminDayContext([day], [workout("ex-1", 60, 8)], "2026-07-20", {});
    expect(ctx).not.toBeNull();
    expect(ctx!.d).toBe("2026-07-20");
    expect(ctx!.y).toBe("day-1");
    const ex1 = ctx!.e[0];
    // Góra zakresu dowieziona => cel +2.5 kg, reps do dołu zakresu (parytet z decideNextSet).
    expect(ex1.t).toBe("62.5 kg × 6");
    expect(ex1.k).toBe("weight_reps");
    expect(ex1.s).toEqual([[6, 62.5], [6, 62.5], [6, 62.5]]);
    // Bez historii: puste serie wg liczby z planu, bez celu.
    const ex2 = ctx!.e[1];
    expect(ex2.t).toBeUndefined();
    expect(ex2.k).toBe("duration");
    expect(ex2.s).toEqual([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  });

  it("carries duration, distance, assistance and warm-up semantics in additive tuple fields", () => {
    const trackedDay: GarminPlanDay = {
      ...day,
      exercises: [
        { id: "duration", name: "Plank", sets: "1 x 60", tracking: "duration" },
        { id: "carry", name: "Spacer farmera", sets: "1 x 40", tracking: "weight_distance_duration" },
        { id: "assist", name: "Podciąganie wspomagane", sets: "1 x 8", tracking: "assisted_bodyweight" },
      ],
    };
    const history: GarminWorkout[] = [{
      date: "2026-07-19", completed: true,
      exercises: [
        { exerciseId: "duration", sets: [{ reps: 0, weight: 0, durationSec: 60, completed: true }] },
        { exerciseId: "carry", sets: [{ reps: 0, weight: 24, distanceM: 40, durationSec: 55, completed: true, isWarmup: true }] },
        { exerciseId: "assist", sets: [{ reps: 8, weight: 0, assistWeight: 25, completed: true }] },
      ],
    }];
    const ctx = buildGarminDayContext([trackedDay], history, "2026-07-20", {});
    expect(ctx?.e).toEqual([
      expect.objectContaining({ k: "duration", s: [[0, 0, 60]] }),
      expect.objectContaining({ k: "weight_distance_duration", s: [[0, 24, 55, 40, 0, 1]] }),
      expect.objectContaining({ k: "assisted_bodyweight", s: [[8, 0, 0, 0, 25]] }),
    ]);
  });

  it("wynik w zakresie => cel: ten sam ciężar, +1 powtórzenie", () => {
    const ctx = buildGarminDayContext([day], [workout("ex-1", 60, 7)], "2026-07-20", {});
    expect(ctx!.e[0].t).toBe("60 kg × 8");
    expect(ctx!.e[0].s).toEqual([[8, 60], [8, 60], [8, 60]]);
  });

  it("przypięta notatka trafia do kontekstu (przycięta do 140)", () => {
    const ctx = buildGarminDayContext([day], [], "2026-07-20", {
      "Wyciskanie hantli (Lekki skos)": "x".repeat(500),
    });
    expect(ctx!.e[0].p).toHaveLength(140);
  });

  it("dzień wolny => null", () => {
    expect(buildGarminDayContext([day], [], "2026-07-21", {})).toBeNull(); // wtorek
  });

  it("duży plan mieści się w limicie ~8KB makeWebRequest", () => {
    const bigDay: GarminPlanDay = {
      ...day,
      exercises: Array.from({ length: 12 }, (_, i) => ({
        id: `ex-${i}`,
        name: `Bardzo długa nazwa ćwiczenia numer ${i} (Wariant maszynowy)`,
        sets: "5 x 8-12",
      })),
    };
    const workouts = bigDay.exercises.map((e) => workout(e.id, 100, 12));
    const notes = Object.fromEntries(bigDay.exercises.map((e) => [e.name, "n".repeat(140)]));
    const ctx = buildGarminDayContext([bigDay], workouts, "2026-07-20", notes);
    expect(GARMIN_RESPONSE_MAX_BYTES).toBe(8 * 1024);
    expect(isGarminResponseWithinLimit(ctx)).toBe(true);
    expect(isGarminResponseWithinLimit({ v: 1, value: "ą".repeat(5000) })).toBe(false);
  });
});

// Szybki trening na zegarku: lista ostatnich ćwiczeń (r) z historii.
describe("buildRecentExercises", () => {
  const w = (date: string, exerciseId: string, opts: { name?: string; weight?: number; reps?: number; completed?: boolean; warmupOnly?: boolean } = {}): GarminWorkout => ({
    date,
    completed: opts.completed ?? true,
    exercises: [{
      exerciseId,
      ...(opts.name ? { name: opts.name } : {}),
      sets: [
        { reps: opts.reps ?? 8, weight: opts.weight ?? 60, completed: true, isWarmup: opts.warmupOnly ?? false },
      ],
    }],
  });

  it("dedup po exerciseId, wygrywa najnowsze wykonanie, sort od najnowszych", () => {
    const recents = buildRecentExercises([
      w("2026-07-01", "ex-1", { name: "Przysiad", weight: 80, reps: 6 }),
      w("2026-07-20", "ex-1", { name: "Przysiad", weight: 85, reps: 5 }),
      w("2026-07-10", "ex-2", { name: "Wiosłowanie", weight: 50, reps: 10 }),
    ]);
    expect(recents.map((r) => r.i)).toEqual(["ex-1", "ex-2"]);
    expect(recents[0]).toEqual({ i: "ex-1", n: "Przysiad", w: 85, p: 5 });
  });

  it("quick-workout recents retain the four tracking fields", () => {
    const recents = buildRecentExercises([{
      date: "2026-07-20", completed: true,
      exercises: [{
        exerciseId: "carry", name: "Spacer farmera",
        sets: [{ reps: 0, weight: 24, durationSec: 60, distanceM: 40, completed: true }],
      }],
    }]);
    expect(recents[0]).toEqual({
      i: "carry", n: "Spacer farmera", k: "weight_distance_duration",
      w: 24, p: 0, d: 60, m: 40,
    });
  });

  it("limit 10, brak snapshotu nazwy => exerciseId, bodyweight (0 kg) wchodzi", () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      w(`2026-07-${String(i + 1).padStart(2, "0")}`, `ex-${i}`));
    expect(buildRecentExercises(many)).toHaveLength(10);
    expect(buildRecentExercises([w("2026-07-01", "ex-x")])[0].n).toBe("ex-x");
    expect(buildRecentExercises([w("2026-07-01", "ex-bw", { weight: 0, reps: 12 })])[0]).toMatchObject({ w: 0, p: 12 });
  });

  it("pomija nieukończone treningi i serie rozgrzewkowe", () => {
    expect(buildRecentExercises([
      w("2026-07-20", "ex-1", { completed: false }),
      w("2026-07-19", "ex-2", { warmupOnly: true }),
    ])).toEqual([]);
  });
});
