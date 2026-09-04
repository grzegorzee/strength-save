import { describe, expect, it } from "vitest";
import {
  compareWeeks,
  computeWeekStats,
  detectWeekPRs,
  setTonnage,
  type DigestWorkout,
} from "./weekly-digest-stats";

const workout = (over: Partial<DigestWorkout> = {}): DigestWorkout => ({
  userId: "u1",
  completed: true,
  date: "2026-07-20",
  exercises: [{
    exerciseId: "ex-1",
    name: "Wyciskanie sztangi na ławce płaskiej",
    sets: [
      { reps: 10, weight: 20, completed: true, isWarmup: true },
      { reps: 8, weight: 80, completed: true },
      { reps: 8, weight: 80, completed: true },
    ],
  }],
  ...over,
});

describe("setTonnage (zgodność z metodą apki, Z160)", () => {
  it("zwykła seria = reps x weight; rozgrzewka i nieukończone = 0", () => {
    expect(setTonnage({ reps: 8, weight: 80, completed: true })).toBe(640);
    expect(setTonnage({ reps: 8, weight: 80, completed: true, isWarmup: true })).toBe(0);
    expect(setTonnage({ reps: 8, weight: 80, completed: false })).toBe(0);
  });

  it("seria czasowa/dystansowa z ciężarem wchodzi jako ciężar x 1", () => {
    expect(setTonnage({ reps: 0, weight: 40, durationSec: 30, completed: true })).toBe(40);
    expect(setTonnage({ reps: 0, weight: 40, distanceM: 20, completed: true })).toBe(40);
    expect(setTonnage({ reps: 0, weight: 0, durationSec: 30, completed: true })).toBe(0);
  });
});

describe("computeWeekStats", () => {
  it("liczy sesje, serie robocze, powtórzenia, tonaż i czas", () => {
    const stats = computeWeekStats([
      workout({ durationSec: 3600 }),
      workout({ date: "2026-07-22", startedAt: 1000_000, completedAt: 1000_000 + 30 * 60 * 1000, durationSec: undefined }),
    ]);

    expect(stats.sessions).toBe(2);
    expect(stats.workingSets).toBe(4);
    expect(stats.reps).toBe(32);
    expect(stats.tonnageKg).toBe(2560);
    expect(stats.durationSec).toBe(3600 + 30 * 60);
    expect(stats.topExercises[0]).toEqual({ name: "Wyciskanie sztangi na ławce płaskiej", tonnageKg: 2560 });
  });

  it("guard: dokument bez exercises / z uszkodzonymi sets nie wywraca liczenia", () => {
    const broken = [
      { userId: "u1", completed: true, date: "2026-07-20" } as DigestWorkout,
      { userId: "u1", completed: true, date: "2026-07-21", exercises: [{ exerciseId: "x" }] } as DigestWorkout,
      workout(),
    ];

    const stats = computeWeekStats(broken);

    expect(stats.sessions).toBe(1);
    expect(stats.tonnageKg).toBe(1280);
  });

  it("odrzuca warmup-only i deduplikuje provisional→remote, ale nie dwa quick workouts", () => {
    const remote = workout({ id: "workout-123", date: "2026-07-21" });
    const provisional = workout({ id: "local-workout-123", date: "2026-07-21" });
    const warmupOnly = workout({
      id: "warmup-only",
      exercises: [{ name: "A", sets: [{ reps: 10, weight: 20, completed: true, isWarmup: true }] }],
    });
    const quickA = workout({ id: "workout-quick-a", date: "2026-07-22" });
    const quickB = workout({ id: "workout-quick-b", date: "2026-07-22" });

    const stats = computeWeekStats([provisional, remote, warmupOnly, quickA, quickB]);

    expect(stats.sessions).toBe(3);
    expect(stats.workingSets).toBe(6);
  });

  it("top 3 ćwiczenia wg tonażu", () => {
    const multi = workout({
      exercises: [
        { name: "A", sets: [{ reps: 10, weight: 100, completed: true }] },
        { name: "B", sets: [{ reps: 10, weight: 50, completed: true }] },
        { name: "C", sets: [{ reps: 10, weight: 80, completed: true }] },
        { name: "D", sets: [{ reps: 10, weight: 10, completed: true }] },
      ],
    });

    const stats = computeWeekStats([multi]);

    expect(stats.topExercises.map((e) => e.name)).toEqual(["A", "C", "B"]);
  });
});

describe("detectWeekPRs", () => {
  it("nowy ciężar maksymalny względem historii = PR weight/both", () => {
    const history = [workout({ date: "2026-07-01" })]; // max 80 kg
    const week = [workout({
      date: "2026-07-21",
      exercises: [{
        name: "Wyciskanie sztangi na ławce płaskiej",
        sets: [{ reps: 8, weight: 90, completed: true }],
      }],
    })];

    const prs = detectWeekPRs(week, history);

    expect(prs).toHaveLength(1);
    expect(prs[0].type).toBe("both");
    expect(prs[0].newValue).toBe(90);
    expect(prs[0].oldValue).toBe(80);
  });

  it("bez wcześniejszej bazy (pierwszy raz ćwiczenia) nie ma PR", () => {
    const week = [workout()];
    expect(detectWeekPRs(week, [])).toEqual([]);
  });

  it("bodyweight (weight=0): PR po powtórzeniach", () => {
    const bw = (reps: number, date: string) => workout({
      date,
      exercises: [{ name: "Podciąganie na drążku", sets: [{ reps, weight: 0, completed: true }] }],
    });

    const prs = detectWeekPRs([bw(12, "2026-07-21")], [bw(10, "2026-07-01")]);

    expect(prs).toEqual([{ exerciseName: "Podciąganie na drążku", type: "reps", newValue: 12, oldValue: 10 }]);
  });

  it("guard: uszkodzone dokumenty w historii nie wywracają detekcji", () => {
    const week = [workout()];
    const history = [{ userId: "u1", completed: true } as DigestWorkout];

    expect(() => detectWeekPRs(week, history)).not.toThrow();
  });
});

describe("compareWeeks", () => {
  it("delty sesji i tonażu", () => {
    const current = computeWeekStats([workout(), workout({ date: "2026-07-22" })]);
    const previous = computeWeekStats([workout({ date: "2026-07-15" })]);

    expect(compareWeeks(current, previous)).toEqual({ sessionsDelta: 1, tonnageDeltaKg: 1280 });
  });
});
