import { describe, expect, it, vi } from "vitest";
import { getInvalidFcmTokens, mapReminderPlanDoc, runDailyReminder, type DailyReminderDeps } from "./daily-reminder";
import { shouldLogLoginSuccess } from "./registration";

// Bug 11 (X30): "dziś" i pora liczone per user ze strefy; testy podają CHWILĘ biegu.
// Poniedziałek 07:00 CEST = 05:00Z (user bez strefy = Warszawa, niezmiennik).
const WARSAW_MONDAY_07 = new Date("2026-07-06T05:00:00Z");
const WARSAW_SUNDAY_07 = new Date("2026-07-05T05:00:00Z");

describe("getInvalidFcmTokens", () => {
  it("keeps only tokens rejected permanently by FCM", () => {
    expect(getInvalidFcmTokens(["valid", "expired", "transient"], [
      { success: true },
      { success: false, error: { code: "messaging/registration-token-not-registered" } },
      { success: false, error: { code: "messaging/internal-error" } },
    ])).toEqual(["expired"]);
  });
});

describe("runDailyReminder (R2-12)", () => {
  const makeDeps = (over: Partial<DailyReminderDeps> = {}): DailyReminderDeps => ({
    listTokenRegistrations: vi.fn(async () => [
      { id: "r1", userId: "u1", token: "t1" },
      { id: "r2", userId: "u2", token: "t2" },
    ]),
    getUsers: vi.fn(async (userIds: string[]) => new Map(userIds.map((uid) => [uid, { displayName: `User ${uid}` }]))),
    getPlanDays: vi.fn(async (userIds: string[]) => new Map(userIds.map((uid) => [uid, [{ weekday: "monday", focus: "Push" }]]))),
    sendMulticast: vi.fn(async (tokens: string[]) => ({
      successCount: tokens.length,
      failureCount: 0,
      responses: tokens.map(() => ({ success: true })),
    })),
    deleteRegistrations: vi.fn(async () => undefined),
    getTodayWorkout: vi.fn(async () => null),
    now: WARSAW_MONDAY_07,
    ...over,
  });

  it("Z167: user z language='en' dostaje push po angielsku (focus przetlumaczony)", async () => {
    const deps = makeDeps({
      listTokenRegistrations: vi.fn(async () => [{ id: "r1", userId: "u1", token: "t1" }]),
      getUsers: vi.fn(async () => new Map([["u1", { displayName: "John Doe", language: "en" }]])),
      getPlanDays: vi.fn(async () => new Map([["u1", [{ weekday: "monday", focus: "Góra A" }]]])),
    });

    await runDailyReminder(deps);

    expect(deps.sendMulticast).toHaveBeenCalledWith(
      ["t1"],
      "Hey John! Time to train",
      "Today's plan: Upper A. Open the app and log your first set.",
    );
  });

  it("Z167: user bez pola language dostaje dotychczasowy push PL (niezmiennik)", async () => {
    const deps = makeDeps({
      listTokenRegistrations: vi.fn(async () => [{ id: "r1", userId: "u1", token: "t1" }]),
      getUsers: vi.fn(async () => new Map([["u1", { displayName: "Jan Kowalski" }]])),
      getPlanDays: vi.fn(async () => new Map([["u1", [{ weekday: "monday", focus: "Góra A" }]]])),
    });

    await runDailyReminder(deps);

    expect(deps.sendMulticast).toHaveBeenCalledWith(
      ["t1"],
      "Cześć Jan! Czas na trening",
      "Dziś w planie: Góra A. Wejdź i odhacz pierwszą serię.",
    );
  });

  it("Z167: EN bez imienia = tytul bez powitania", async () => {
    const deps = makeDeps({
      listTokenRegistrations: vi.fn(async () => [{ id: "r1", userId: "u1", token: "t1" }]),
      getUsers: vi.fn(async () => new Map([["u1", { language: "en" }]])),
      getPlanDays: vi.fn(async () => new Map([["u1", [{ weekday: "monday", focus: "Push" }]]])),
    });

    await runDailyReminder(deps);

    expect(deps.sendMulticast).toHaveBeenCalledWith(
      ["t1"],
      "Time to train",
      "Today's plan: Push. Open the app and log your first set.",
    );
  });

  it("czyta TYLKO userów z tokenami (2 tokeny = 2 odczyty userów, nie cala kolekcja)", async () => {
    const deps = makeDeps();

    const result = await runDailyReminder(deps);

    expect(deps.getUsers).toHaveBeenCalledTimes(1);
    expect(deps.getUsers).toHaveBeenCalledWith(["u1", "u2"]);
    expect(deps.getPlanDays).toHaveBeenCalledWith(["u1", "u2"]);
    expect(result.sent).toBe(2);
  });

  it("opt-out / zawieszenie wyklucza usera przed odczytem planu", async () => {
    const deps = makeDeps({
      getUsers: vi.fn(async () => new Map([
        ["u1", { notificationPrefs: { dailyReminder: false } }],
        ["u2", { status: "suspended" }],
      ])),
    });

    const result = await runDailyReminder(deps);

    expect(deps.getPlanDays).toHaveBeenCalledWith([]);
    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("dzien wolny = brak wysylki", async () => {
    const deps = makeDeps({ now: WARSAW_SUNDAY_07 });

    const result = await runDailyReminder(deps);

    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.candidates).toBe(0);
  });

  it("nie wysyla przed startDate planu, nawet gdy zgadza sie weekday", async () => {
    const deps = makeDeps({
      getPlanDays: vi.fn(async () => new Map([["u1", {
        days: [{ id: "push", weekday: "monday", focus: "Push" }],
        startDate: "2026-07-13",
      }], ["u2", {
        days: [{ id: "push", weekday: "monday", focus: "Push" }],
        startDate: "2026-07-13",
      }]]) as never),
    });

    const result = await runDailyReminder(deps);

    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.candidates).toBe(0);
  });

  it("respektuje skippedDates, scheduleOverrides i zakonczony plan", async () => {
    const deps = makeDeps({
      getPlanDays: vi.fn(async () => new Map([["u1", {
        days: [{ id: "push", weekday: "monday", focus: "Push" }],
        startDate: "2026-06-01",
        skippedDates: ["2026-07-06"],
      }], ["u2", {
        days: [{ id: "push", weekday: "monday", focus: "Push" }],
        startDate: "2026-06-01",
        status: "ended",
        scheduleOverrides: { "2026-07-06": "push" },
      }]]) as never),
    });

    const result = await runDailyReminder(deps);

    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.candidates).toBe(0);
  });

  // Z146 (X18C): poranny push pomija userów, którzy dziś już trenują / potrenowali.
  it("user z rozpoczetym treningiem na dzis (startedAt) jest POMINIETY", async () => {
    const deps = makeDeps({
      getTodayWorkout: vi.fn(async (uid: string) => (
        uid === "u1" ? { startedAt: 1_753_340_000_000 } : null
      )),
    });

    const result = await runDailyReminder(deps);

    expect(result.sent).toBe(1); // tylko u2
    const sentTokens = (deps.sendMulticast as ReturnType<typeof vi.fn>).mock.calls.flatMap((call) => call[0]);
    expect(sentTokens).toEqual(["t2"]);
  });

  it("user z ukonczonym treningiem na dzis (completed) jest POMINIETY", async () => {
    const deps = makeDeps({
      getTodayWorkout: vi.fn(async (uid: string) => (
        uid === "u2" ? { completed: true } : null
      )),
    });

    const result = await runDailyReminder(deps);

    expect(result.sent).toBe(1);
    const sentTokens = (deps.sendMulticast as ReturnType<typeof vi.fn>).mock.calls.flatMap((call) => call[0]);
    expect(sentTokens).toEqual(["t1"]);
  });

  // Z155: createWorkoutSession tworzy dokument BEZ startedAt (startedAt dolatywał
  // dopiero z finalnym synciem) — realny aktywny trening to { completed: false }.
  it("user z aktywnym treningiem bez startedAt (realny dokument klienta) jest POMINIETY", async () => {
    const deps = makeDeps({
      getTodayWorkout: vi.fn(async (uid: string) => (
        uid === "u1" ? { completed: false } : null
      )),
    });

    const result = await runDailyReminder(deps);

    expect(result.skippedActive).toBe(1);
    expect(result.sent).toBe(1); // tylko u2
    const sentTokens = (deps.sendMulticast as ReturnType<typeof vi.fn>).mock.calls.flatMap((call) => call[0]);
    expect(sentTokens).toEqual(["t2"]);
  });

  it("user bez dokumentu treningu na dzis dostaje push (bez regresji)", async () => {
    const deps = makeDeps({ getTodayWorkout: vi.fn(async () => null) });

    const result = await runDailyReminder(deps);

    expect(result.sent).toBe(2);
  });

  it("odczyt treningu TYLKO dla kandydatow po dotychczasowych filtrach (1 query per kandydat)", async () => {
    const getTodayWorkout = vi.fn(async () => null);
    const deps = makeDeps({
      now: WARSAW_SUNDAY_07, // dzień wolny — zero kandydatów
      getTodayWorkout,
    });

    await runDailyReminder(deps);

    expect(getTodayWorkout).not.toHaveBeenCalled();
  });

  it("permanentnie odrzucone tokeny sa usuwane", async () => {
    const deps = makeDeps({
      sendMulticast: vi.fn(async (tokens: string[]) => ({
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({ success: false, error: { code: "messaging/registration-token-not-registered" } })),
      })),
    });

    const result = await runDailyReminder(deps);

    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r1"]);
    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r2"]);
    expect(result.invalidTokens).toBe(2);
  });
});

// Bug 11 (X30): push o lokalnej 07:00 usera, z dniem planu i datą z JEGO strefy.
describe("runDailyReminder: strefa usera (bug 11, X30)", () => {
  const registrations = [
    { id: "r1", userId: "pl", token: "t-pl" },
    { id: "r2", userId: "la", token: "t-la" },
  ];
  const makeDeps = (now: Date, over: Partial<DailyReminderDeps> = {}): DailyReminderDeps => ({
    listTokenRegistrations: vi.fn(async () => registrations),
    getUsers: vi.fn(async () => new Map([
      ["pl", { displayName: "Jan" }],
      ["la", { displayName: "Joe", language: "en", timeZone: "America/Los_Angeles" }],
    ])),
    getPlanDays: vi.fn(async (userIds: string[]) => new Map(userIds.map((uid) => [uid, [
      { weekday: "monday", focus: "Push" },
      { weekday: "tuesday", focus: "Pull" },
    ]]))),
    sendMulticast: vi.fn(async (tokens: string[]) => ({
      successCount: tokens.length,
      failureCount: 0,
      responses: tokens.map(() => ({ success: true })),
    })),
    deleteRegistrations: vi.fn(async () => undefined),
    getTodayWorkout: vi.fn(async () => null),
    now,
    ...over,
  });
  const sentTokens = (deps: DailyReminderDeps) =>
    (deps.sendMulticast as ReturnType<typeof vi.fn>).mock.calls.flatMap((call) => call[0] as string[]);

  it("wtorek 07:00 Warszawy: PL dostaje push wtorkowy, LA (poniedziałek 22:00) NIC — bez pusha z jutrzejszym planem o 22:00", async () => {
    const deps = makeDeps(new Date("2026-07-07T05:00:00Z"));

    await runDailyReminder(deps);

    expect(sentTokens(deps)).toEqual(["t-pl"]);
    expect(deps.sendMulticast).toHaveBeenCalledWith(["t-pl"], expect.any(String), expect.stringContaining("Pull"));
    // Plan czytany tylko dla userów w porze porannej (koszt: bieg co godzinę).
    expect(deps.getPlanDays).toHaveBeenCalledWith(["pl"]);
  });

  it("wtorek 07:00 w LA (14:00Z): LA dostaje push z WTORKOWYM planem i datą lokalną, PL (16:00) nic", async () => {
    const deps = makeDeps(new Date("2026-07-07T14:00:00Z"));

    await runDailyReminder(deps);

    expect(sentTokens(deps)).toEqual(["t-la"]);
    expect(deps.sendMulticast).toHaveBeenCalledWith(["t-la"], "Hey Joe! Time to train", expect.stringContaining("Pull"));
    // Tłumienie po dzisiejszym treningu: data z zegara usera, nie serwera.
    expect(deps.getTodayWorkout).toHaveBeenCalledWith("la", "2026-07-07");
  });

  it("poniedziałek 22:00 w LA (wtorek 05:00Z): dzisiejszy trening LA z datą 2026-07-06 nie jest pytany, bo to nie pora pusha", async () => {
    const deps = makeDeps(new Date("2026-07-07T05:00:00Z"));

    await runDailyReminder(deps);

    expect(deps.getTodayWorkout).not.toHaveBeenCalledWith("la", expect.anything());
  });

  it("nieznana strefa = Warszawa (bezpieczny default)", async () => {
    const deps = makeDeps(new Date("2026-07-07T05:00:00Z"), {
      getUsers: vi.fn(async () => new Map([["pl", { displayName: "Jan", timeZone: "Mars/Olympus" }]])),
      listTokenRegistrations: vi.fn(async () => [registrations[0]]),
    });

    await runDailyReminder(deps);

    expect(sentTokens(deps)).toEqual(["t-pl"]);
  });

  it("bieg o godzinie, która nie jest niczyim porankiem: zero odczytów planu i zero pushy", async () => {
    const deps = makeDeps(new Date("2026-07-07T20:00:00Z")); // Warszawa 22:00, LA 13:00

    const result = await runDailyReminder(deps);

    expect(deps.getPlanDays).toHaveBeenCalledWith([]);
    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.candidates).toBe(0);
  });
});

// F2 (2026-09-29): urlop 22-27.09 u właściciela, a dailyReminder wysłał pushe
// 22, 23 i 25.09. Guard znał tylko skippedDates, loader gubił pole vacation.
// Niezmiennik: dzień w [vacation.startDate, vacation.endDate] nie jest dniem
// treningowym (pusha nie ma), dzień po urlopie znowu jest.
describe("runDailyReminder: urlop i pauza (F2)", () => {
  // Kształt z produkcji: d1 pon, d2 śr, d3 pt; override przenosi d1 na wtorek 22.09.
  const prodPlanDoc = {
    days: [
      { id: "d1", weekday: "monday", focus: "Push" },
      { id: "d2", weekday: "wednesday", focus: "Pull" },
      { id: "d3", weekday: "friday", focus: "Nogi" },
    ],
    startDate: "2026-09-01",
    scheduleOverrides: { "2026-09-22": "d1" },
    vacation: { startDate: "2026-09-22", endDate: "2026-09-27", activity: "none", extendedWeeks: 1 },
    status: "active",
  };
  const warsaw07 = (dateISO: string) => new Date(`${dateISO}T05:00:00Z`); // 07:00 CEST

  const makeDeps = (now: Date, planDoc: Record<string, unknown> = prodPlanDoc): DailyReminderDeps => ({
    listTokenRegistrations: vi.fn(async () => [{ id: "r1", userId: "u1", token: "t1" }]),
    getUsers: vi.fn(async () => new Map([["u1", { displayName: "Grzegorz" }]])),
    getPlanDays: vi.fn(async () => new Map([["u1", mapReminderPlanDoc(planDoc)]])),
    sendMulticast: vi.fn(async (tokens: string[]) => ({
      successCount: tokens.length,
      failureCount: 0,
      responses: tokens.map(() => ({ success: true })),
    })),
    deleteRegistrations: vi.fn(async () => undefined),
    getTodayWorkout: vi.fn(async () => null),
    now,
  });

  it("loader przepisuje vacation i reducedMode z dokumentu planu", () => {
    const mapped = mapReminderPlanDoc({
      ...prodPlanDoc,
      reducedMode: { startDate: "2026-10-01", endDate: "2026-10-05", level: "pause" },
    });
    expect(mapped.vacation).toEqual({ startDate: "2026-09-22", endDate: "2026-09-27" });
    expect(mapped.reducedMode).toEqual({ startDate: "2026-10-01", endDate: "2026-10-05", level: "pause" });
  });

  it("loader odrzuca śmieciowe vacation (brak pola zamiast wyjątku)", () => {
    const mapped = mapReminderPlanDoc({ ...prodPlanDoc, vacation: { startDate: 5, endDate: null } });
    expect(mapped.vacation).toBeUndefined();
  });

  it.each(["2026-09-22", "2026-09-23", "2026-09-25"])(
    "dzień treningowy %s w urlopie (także z override) = zero pushy",
    async (dateISO) => {
      const deps = makeDeps(warsaw07(dateISO));
      const result = await runDailyReminder(deps);
      expect(deps.sendMulticast).not.toHaveBeenCalled();
      expect(result.candidates).toBe(0);
    },
  );

  it("pierwszy dzień treningowy po urlopie (pon 28.09) = push z planem dnia", async () => {
    const deps = makeDeps(warsaw07("2026-09-28"));
    const result = await runDailyReminder(deps);
    expect(result.candidates).toBe(1);
    expect(deps.sendMulticast).toHaveBeenCalledWith(["t1"], "Cześć Grzegorz! Czas na trening", "Dziś w planie: Push. Wejdź i odhacz pierwszą serię.");
  });

  it("bez urlopu ten sam dzień dostaje push (niezmiennik: urlop jedynym powodem ciszy)", async () => {
    const { vacation: _vacation, ...withoutVacation } = prodPlanDoc;
    const deps = makeDeps(warsaw07("2026-09-23"), withoutVacation);
    await runDailyReminder(deps);
    expect(deps.sendMulticast).toHaveBeenCalledTimes(1);
  });

  it("tryb pauzy (reducedMode level pause) wycisza push, tryb lżejszy nie", async () => {
    const { vacation: _vacation, ...withoutVacation } = prodPlanDoc;
    const paused = makeDeps(warsaw07("2026-09-23"), {
      ...withoutVacation,
      reducedMode: { startDate: "2026-09-22", endDate: "2026-09-25", level: "pause" },
    });
    await runDailyReminder(paused);
    expect(paused.sendMulticast).not.toHaveBeenCalled();

    const lighter = makeDeps(warsaw07("2026-09-23"), {
      ...withoutVacation,
      reducedMode: { startDate: "2026-09-22", endDate: "2026-09-25", level: "lighter" },
    });
    await runDailyReminder(lighter);
    expect(lighter.sendMulticast).toHaveBeenCalledTimes(1);
  });
});

describe("shouldLogLoginSuccess (R2-12)", () => {
  const now = new Date("2026-07-03T12:00:00Z");

  it("brak poprzedniego loginu = loguj", () => {
    expect(shouldLogLoginSuccess(undefined, now)).toBe(true);
  });

  it("poprzedni login starszy niz 20 h = loguj", () => {
    expect(shouldLogLoginSuccess("2026-07-02T10:00:00Z", now)).toBe(true);
  });

  it("drugi login tego samego dnia = NIE loguj (audit log 1x/dzien)", () => {
    expect(shouldLogLoginSuccess("2026-07-03T08:00:00Z", now)).toBe(false);
  });

  it("niesparsowalna data = loguj (bezpieczny default)", () => {
    expect(shouldLogLoginSuccess("nie-data", now)).toBe(true);
  });
});
