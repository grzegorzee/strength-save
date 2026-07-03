import { describe, it, expect, vi } from "vitest";
import { runWeeklyDigest, type WeeklyDigestDeps, type DigestUser } from "./weekly-digest";

const workout = (userId: string, date = "2026-06-23") => ({
  userId,
  completed: true,
  date,
  exercises: [{
    exerciseId: "ex-1",
    sets: [{ reps: 10, weight: 100, completed: true }],
  }],
});

const makeDeps = (users: DigestUser[], over: Partial<WeeklyDigestDeps> = {}) => {
  const deps = {
    listUsers: vi.fn(async () => users),
    queryCompletedWorkouts: vi.fn(async () => users.map((user) => workout(user.uid))),
    queryStravaActivities: vi.fn(async () => []),
    sendEmail: vi.fn(async () => ({})),
    now: () => new Date("2026-07-01T08:00:00Z"),
    ...over,
  } satisfies WeeklyDigestDeps;
  return deps;
};

describe("runWeeklyDigest (R2-10)", () => {
  it("user ze status suspended nie dostaje maila", async () => {
    const deps = makeDeps([
      { uid: "u1", email: "a@b.c", status: "active" },
      { uid: "u2", email: "x@y.z", status: "suspended" },
    ]);

    await runWeeklyDigest(deps);

    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    expect(deps.sendEmail.mock.calls[0][0]).toBe("a@b.c");
  });

  it("user z notificationPrefs.weeklyDigest === false nie dostaje maila (opt-out)", async () => {
    const deps = makeDeps([
      { uid: "u1", email: "a@b.c", status: "active", notificationPrefs: { weeklyDigest: false } },
      { uid: "u2", email: "x@y.z", status: "active", notificationPrefs: { weeklyDigest: true } },
    ]);

    await runWeeklyDigest(deps);

    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    expect(deps.sendEmail.mock.calls[0][0]).toBe("x@y.z");
  });

  it("brak pola notificationPrefs/status = mail wychodzi (default wysyłaj)", async () => {
    const deps = makeDeps([{ uid: "u1", email: "a@b.c" }]);

    await runWeeklyDigest(deps);

    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("user bez treningów w tygodniu nie dostaje maila", async () => {
    const deps = makeDeps(
      [{ uid: "u1", email: "a@b.c", status: "active" }],
      { queryCompletedWorkouts: vi.fn(async () => []) },
    );

    await runWeeklyDigest(deps);

    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("liczba kwerend workouts/strava NIE zależy od liczby userów (po 1 kwerendzie zbiorczej)", async () => {
    const users: DigestUser[] = Array.from({ length: 50 }, (_, i) => ({
      uid: `u${i}`,
      email: `user${i}@test.pl`,
      status: "active",
    }));
    const deps = makeDeps(users);

    const result = await runWeeklyDigest(deps);

    expect(deps.queryCompletedWorkouts).toHaveBeenCalledTimes(1);
    expect(deps.queryStravaActivities).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(50);
  });

  it("blad providera liczy sie jako failed, nie przerywa pozostalych", async () => {
    const sendEmail = vi.fn(async (to: string) => (to === "a@b.c" ? { error: { message: "bounced" } } : {}));
    const deps = makeDeps(
      [
        { uid: "u1", email: "a@b.c", status: "active" },
        { uid: "u2", email: "x@y.z", status: "active" },
      ],
      { sendEmail },
    );

    const result = await runWeeklyDigest(deps);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });
});
