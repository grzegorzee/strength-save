import { describe, it, expect } from "vitest";
import { buildGarminDayContext, type GarminPlanDay, type GarminWorkout } from "./garmin-day";

const day: GarminPlanDay = {
  id: "day-1",
  dayName: "Poniedziałek",
  weekday: "monday",
  focus: "Klatka / Przysiad",
  exercises: [
    { id: "ex-1", name: "Wyciskanie hantli (Lekki skos)", sets: "3 x 6-8" },
    { id: "ex-2", name: "Przysiad ze sztangą (High Bar)", sets: "3 x 6-8" },
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
    expect(ex1.s).toEqual([[6, 62.5], [6, 62.5], [6, 62.5]]);
    // Bez historii: puste serie wg liczby z planu, bez celu.
    const ex2 = ctx!.e[1];
    expect(ex2.t).toBeUndefined();
    expect(ex2.s).toEqual([[0, 0], [0, 0], [0, 0]]);
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
    expect(JSON.stringify(ctx).length).toBeLessThan(8 * 1024);
  });
});
