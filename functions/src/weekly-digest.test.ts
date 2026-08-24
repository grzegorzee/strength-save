import { describe, it, expect, vi } from "vitest";
import { runWeeklyDigest, buildStravaSummary, type WeeklyDigestDeps, type DigestUser } from "./weekly-digest";

// X27/WP-C: digest liczy biegi semantyką run-like (Run || sportType zawiera "Run"),
// spójnie z src/lib/strava-utils.isRunLike — TrailRun/VirtualRun nie ginie,
// a spacer nie wchodzi do kilometrów biegowych.
describe("buildStravaSummary (X27/WP-C: run-like)", () => {
  it("TrailRun po sportType liczy się do biegów, spacer nie", () => {
    const summary = buildStravaSummary([
      { date: "2026-06-23", type: "TrailRun", sportType: "TrailRun", name: "Trail", distance: 8000, averageSpeed: 3.0 },
      { date: "2026-06-24", type: "Walk", sportType: "Walk", name: "Spacer", distance: 20000, averageSpeed: 1.4 },
    ]);

    expect(summary?.runCount).toBe(1);
    expect(summary?.totalRunKm).toBe(8);
    expect(summary?.longestRun?.name).toBe("Trail");
  });

  it("same spacery → brak sekcji biegowej (null)", () => {
    expect(buildStravaSummary([
      { date: "2026-06-23", type: "Walk", name: "Spacer", distance: 5000 },
    ])).toBeNull();
  });
});

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
    queryWorkoutHistory: vi.fn(async () => []),
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
    expect(deps.queryWorkoutHistory).toHaveBeenCalledTimes(1);
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

  // Z160: pełne podsumowanie — i18n, jednostki, PR-y, porównanie WoW.
  it("user z language=en i unit=lbs dostaje mail EN w lbs", async () => {
    const deps = makeDeps([
      { uid: "u1", email: "a@b.c", status: "active", language: "en", preferences: { unit: "lbs" } },
    ]);

    await runWeeklyDigest(deps);

    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    const [, subject, html] = deps.sendEmail.mock.calls[0] as unknown as [string, string, string];
    expect(subject).toContain("your week");
    expect(subject).toContain("k lbs");
    expect(html).toContain("Working sets");
  });

  it("domyślnie (bez language) mail po polsku z tonażem w kg", async () => {
    const deps = makeDeps([{ uid: "u1", email: "a@b.c", status: "active" }]);

    await runWeeklyDigest(deps);

    const [, subject, html] = deps.sendEmail.mock.calls[0] as unknown as [string, string, string];
    expect(subject).toContain("Twój tydzień");
    expect(subject).toContain("t");
    expect(html).toContain("Serie robocze");
    expect(html).not.toContain("display:flex");
  });

  it("historia daje PR-y i porównanie z poprzednim tygodniem", async () => {
    // Tydzień digestu: 2026-06-22..28 (now = 2026-07-01). Poprzedni: 06-15..21.
    const history = [
      { ...workout("u1", "2026-06-17"), exercises: [{ exerciseId: "ex-1", name: "Przysiad ze sztangą", sets: [{ reps: 5, weight: 90, completed: true }] }] },
    ];
    const week = [
      { ...workout("u1", "2026-06-23"), exercises: [{ exerciseId: "ex-1", name: "Przysiad ze sztangą", sets: [{ reps: 5, weight: 100, completed: true }] }] },
    ];
    const deps = makeDeps(
      [{ uid: "u1", email: "a@b.c", status: "active" }],
      {
        queryCompletedWorkouts: vi.fn(async () => week),
        queryWorkoutHistory: vi.fn(async () => history),
      },
    );

    await runWeeklyDigest(deps);

    const [, , html] = deps.sendEmail.mock.calls[0] as unknown as [string, string, string];
    expect(html).toContain("Rekordy tygodnia");
    expect(html).toContain("Przysiad ze sztangą");
    expect(html).toContain("vs poprzedni tydzień");
  });
});

// T21b: digest zostawia wpis w email_log (type weekly_digest) po każdej próbie.
describe("T21b: rejestr wysyłek email_log w digeście", () => {
  it("udana wysyłka loguje wpis sent z treścią HTML", async () => {
    const logEmail = vi.fn(async () => undefined);
    const deps = makeDeps([{ uid: "u1", email: "a@b.c", status: "active" }], { logEmail });

    await runWeeklyDigest(deps);

    expect(logEmail).toHaveBeenCalledTimes(1);
    const [entry, html] = logEmail.mock.calls[0] as unknown as [Record<string, unknown>, string];
    expect(entry).toMatchObject({
      uid: "u1", to: "a@b.c", type: "weekly_digest", transport: "resend", status: "sent", lang: "pl",
    });
    expect(typeof entry.sentAt).toBe("string");
    expect(html).toContain("Serie robocze");
  });

  it("odrzucenie providera loguje status failed z komunikatem", async () => {
    const logEmail = vi.fn(async () => undefined);
    const deps = makeDeps(
      [{ uid: "u1", email: "a@b.c", status: "active" }],
      { logEmail, sendEmail: vi.fn(async () => ({ error: { message: "bounced" } })) },
    );

    const result = await runWeeklyDigest(deps);

    expect(result.failed).toBe(1);
    const [entry] = logEmail.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(entry.status).toBe("failed");
    expect(entry.error).toBe("bounced");
  });

  it("awaria rejestru nie psuje wysyłki (sent zaliczony)", async () => {
    const logEmail = vi.fn(async () => { throw new Error("firestore-down"); });
    const deps = makeDeps([{ uid: "u1", email: "a@b.c", status: "active" }], { logEmail });

    const result = await runWeeklyDigest(deps);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("user bez treningów nie zostawia wpisu; brak dep nie psuje digestu", async () => {
    const logEmail = vi.fn(async () => undefined);
    const deps = makeDeps(
      [{ uid: "u1", email: "a@b.c" }],
      { logEmail, queryCompletedWorkouts: vi.fn(async () => []) },
    );
    await runWeeklyDigest(deps);
    expect(logEmail).not.toHaveBeenCalled();

    const legacy = makeDeps([{ uid: "u1", email: "a@b.c" }]);
    await expect(runWeeklyDigest(legacy)).resolves.toMatchObject({ sent: 1 });
  });
});

describe("B-T6: producent zdarzenia inboxa (user_events)", () => {
  it("emituje week event z deterministycznym kluczem tygodnia dla usera z treningami", async () => {
    const writeUserEvent = vi.fn(async () => undefined);
    const deps = makeDeps([{ uid: "u1", email: "a@b.c" }], { writeUserEvent });

    await runWeeklyDigest(deps);

    expect(writeUserEvent).toHaveBeenCalledTimes(1);
    const [uid, event] = writeUserEvent.mock.calls[0];
    expect(uid).toBe("u1");
    // now = 2026-07-01 (środa) => poprzedni poniedziałek 2026-06-22.
    expect(event.key).toBe("week-2026-06-22");
    expect(event.type).toBe("week");
    expect(event.payload.weekStart).toBe("2026-06-22");
    expect(typeof event.payload.workouts).toBe("number");
    // X29: deep link ma prowadzić do listy tygodni, nie do taba summary.
    expect(event.deepLink).toBe("/analytics?tab=weekly");
  });

  it("dwa biegi tego samego tygodnia produkują ten sam klucz (idempotencja po stronie create)", async () => {
    const writeUserEvent = vi.fn(async () => undefined);
    const deps = makeDeps([{ uid: "u1", email: "a@b.c" }], { writeUserEvent });
    await runWeeklyDigest(deps);
    await runWeeklyDigest(deps);
    expect(writeUserEvent.mock.calls[0][1].key).toBe(writeUserEvent.mock.calls[1][1].key);
  });

  it("user bez treningów nie dostaje zdarzenia; brak dep nie psuje digestu", async () => {
    const writeUserEvent = vi.fn(async () => undefined);
    const deps = makeDeps(
      [{ uid: "u1", email: "a@b.c" }],
      { writeUserEvent, queryCompletedWorkouts: vi.fn(async () => []) },
    );
    await runWeeklyDigest(deps);
    expect(writeUserEvent).not.toHaveBeenCalled();

    const legacy = makeDeps([{ uid: "u1", email: "a@b.c" }]);
    await expect(runWeeklyDigest(legacy)).resolves.toMatchObject({ processed: 1 });
  });
});
