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

// Bug 11 (X30): odbiorca dostaje digest w poniedziałek o 08:00 SWOJEJ strefy.
// User bez strefy = Warszawa: poniedziałek 08:00 CEST = 06:00Z.
const WARSAW_MONDAY_08 = new Date("2026-06-29T06:00:00Z");

const makeDeps = (users: DigestUser[], over: Partial<WeeklyDigestDeps> = {}) => {
  const deps = {
    listUsers: vi.fn(async () => users),
    queryCompletedWorkouts: vi.fn(async () => users.map((user) => workout(user.uid))),
    queryWorkoutHistory: vi.fn(async () => []),
    queryStravaActivities: vi.fn(async () => []),
    sendEmail: vi.fn(async () => ({})),
    now: () => WARSAW_MONDAY_08,
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
    // Tydzień digestu: 2026-06-22..28 (now = poniedziałek 2026-06-29). Poprzedni: 06-15..21.
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
    // now = poniedziałek 2026-06-29 08:00 => poprzedni poniedziałek 2026-06-22.
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

// Bug 11 (X30): wysyłka o poniedziałkowym poranku ODBIORCY, okno tygodnia z jego daty.
describe("runWeeklyDigest: strefa odbiorcy (bug 11, X30)", () => {
  const pl: DigestUser = { uid: "pl", email: "pl@test.pl", status: "active" };
  const ny: DigestUser = { uid: "ny", email: "ny@test.us", status: "active", language: "en", timeZone: "America/New_York" };
  const nz: DigestUser = { uid: "nz", email: "nz@test.nz", status: "active", timeZone: "Pacific/Auckland" };

  it("poniedziałek 08:00 Warszawy: PL dostaje, NY (02:00 w nocy) NIE", async () => {
    const deps = makeDeps([pl, ny]);

    await runWeeklyDigest(deps);

    expect(deps.sendEmail.mock.calls.map((call) => call[0])).toEqual(["pl@test.pl"]);
  });

  it("poniedziałek 08:00 w Nowym Jorku (12:00Z): NY dostaje z oknem 06-22..06-28, PL (14:00) już nie", async () => {
    const writeUserEvent = vi.fn(async () => undefined);
    const deps = makeDeps([pl, ny], { now: () => new Date("2026-06-29T12:00:00Z"), writeUserEvent });

    await runWeeklyDigest(deps);

    expect(deps.sendEmail.mock.calls.map((call) => call[0])).toEqual(["ny@test.us"]);
    expect(deps.queryCompletedWorkouts).toHaveBeenCalledWith("2026-06-22", "2026-06-28");
    expect(writeUserEvent.mock.calls[0][1].key).toBe("week-2026-06-22");
  });

  it("poniedziałek 08:00 w Auckland to jeszcze niedziela 20:00Z: NZ dostaje pełny tydzień, PL (niedziela 22:00) czeka", async () => {
    const deps = makeDeps([pl, nz], { now: () => new Date("2026-06-28T20:00:00Z") });

    await runWeeklyDigest(deps);

    expect(deps.sendEmail.mock.calls.map((call) => call[0])).toEqual(["nz@test.nz"]);
    // Okno z LOKALNEJ daty odbiorcy (poniedziałek 06-29), nie z daty UTC (niedziela 06-28).
    expect(deps.queryCompletedWorkouts).toHaveBeenCalledWith("2026-06-22", "2026-06-28");
  });

  it("nikt nie ma teraz poniedziałkowego poranka: zero kwerend zbiorczych (koszt biegu co godzinę)", async () => {
    const deps = makeDeps([pl, ny], { now: () => new Date("2026-06-29T09:00:00Z") });

    const result = await runWeeklyDigest(deps);

    expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    expect(deps.queryCompletedWorkouts).not.toHaveBeenCalled();
    expect(deps.queryWorkoutHistory).not.toHaveBeenCalled();
    expect(deps.queryStravaActivities).not.toHaveBeenCalled();
  });

  it("nieznana strefa = Warszawa (bezpieczny default)", async () => {
    const deps = makeDeps([{ ...pl, timeZone: "Mars/Olympus" }]);

    await runWeeklyDigest(deps);

    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("etykieta zakresu liczona w UTC z dat okna (niezależna od strefy serwera)", async () => {
    const deps = makeDeps([pl]);

    await runWeeklyDigest(deps);

    const [, , html] = deps.sendEmail.mock.calls[0] as unknown as [string, string, string];
    expect(html).toContain("22 czerwca");
    expect(html).toContain("28 czerwca 2026");
  });
});
