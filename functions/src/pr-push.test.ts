import { describe, expect, it, vi } from "vitest";
import {
  buildPrPushMessage,
  isCompletionTransition,
  runPrPush,
  type PrPushDeps,
} from "./pr-push";
import type { EmailWorkout } from "./email-workout";

// X35c (WP-E): push o nowym rekordzie po zapisie UKOŃCZONEGO treningu.
// Detekcja wzorem email-prs (waga / powtórzenia / e1RM vs baseline usera),
// idempotencja przez znacznik per workoutId (claim = create), gate prefs.prPush.

const workout = (over: Partial<EmailWorkout> = {}): EmailWorkout => ({
  id: "w-new",
  userId: "u1",
  date: "2026-08-25",
  completed: true,
  exercises: [
    { exerciseId: "squat", name: "Przysiad", sets: [{ reps: 5, weight: 100, completed: true }] },
  ],
  ...over,
});

const baseline = (): EmailWorkout[] => [
  workout({
    id: "w-old",
    date: "2026-08-20",
    exercises: [
      { exerciseId: "squat", name: "Przysiad", sets: [{ reps: 5, weight: 95, completed: true }] },
      { exerciseId: "bench", name: "Wyciskanie leżąc", sets: [{ reps: 8, weight: 80, completed: true }] },
    ],
  }),
];

const baseDeps = (overrides: Partial<PrPushDeps> = {}): PrPushDeps => ({
  getUser: vi.fn(async () => ({ displayName: "Grzesiek", language: "pl", status: "active" })),
  listBaselineWorkouts: vi.fn(async () => baseline()),
  claimPrPush: vi.fn(async () => true),
  listTokenRegistrations: vi.fn(async () => [{ id: "r1", token: "t1" }]),
  sendMulticast: vi.fn(async (tokens: string[]) => ({
    successCount: tokens.length,
    failureCount: 0,
    responses: tokens.map(() => ({ success: true })),
  })),
  deleteRegistrations: vi.fn(async () => {}),
  ...overrides,
});

describe("isCompletionTransition", () => {
  it("true tylko dla przejścia na completed=true", () => {
    expect(isCompletionTransition(null, { completed: true })).toBe(true);
    expect(isCompletionTransition({ completed: false }, { completed: true })).toBe(true);
    expect(isCompletionTransition({}, { completed: true })).toBe(true);
    expect(isCompletionTransition({ completed: true }, { completed: true })).toBe(false);
    expect(isCompletionTransition({ completed: true }, { completed: false })).toBe(false);
    expect(isCompletionTransition(null, { completed: false })).toBe(false);
    expect(isCompletionTransition({ completed: false }, null)).toBe(false);
  });
});

describe("runPrPush", () => {
  it("nowy max ciężaru = push 'Nowy rekord: Przysiad 100 kg' + znacznik", async () => {
    const deps = baseDeps();
    const result = await runPrPush(deps, workout());

    expect(result).toMatchObject({ status: "sent", prs: 1, sent: 1, failed: 0 });
    expect(deps.claimPrPush).toHaveBeenCalledWith("w-new", "u1");
    expect(deps.sendMulticast).toHaveBeenCalledTimes(1);
    const [tokens, title, body, data] = vi.mocked(deps.sendMulticast).mock.calls[0];
    expect(tokens).toEqual(["t1"]);
    expect(title).toBe("Nowy rekord: Przysiad 100 kg");
    expect(body).toContain("95 kg");
    expect(data).toEqual({ type: "pr", deepLink: "/history" });
  });

  it("brak rekordu (ten sam ciężar) = bez pusha i bez znacznika", async () => {
    const deps = baseDeps();
    const result = await runPrPush(deps, workout({
      exercises: [{ exerciseId: "squat", name: "Przysiad", sets: [{ reps: 5, weight: 95, completed: true }] }],
    }));

    expect(result).toEqual({ status: "no-prs" });
    expect(deps.claimPrPush).not.toHaveBeenCalled();
    expect(deps.sendMulticast).not.toHaveBeenCalled();
  });

  it("pierwszy zapis ćwiczenia (brak historii) to nie rekord", async () => {
    const deps = baseDeps({ listBaselineWorkouts: vi.fn(async () => []) });
    expect(await runPrPush(deps, workout())).toEqual({ status: "no-prs" });
    expect(deps.sendMulticast).not.toHaveBeenCalled();
  });

  it("prefs.prPush === false = pomija BEZ czytania historii", async () => {
    const deps = baseDeps({
      getUser: vi.fn(async () => ({ status: "active", notificationPrefs: { prPush: false } })),
    });
    expect(await runPrPush(deps, workout())).toEqual({ status: "skipped", reason: "prefs-off" });
    expect(deps.listBaselineWorkouts).not.toHaveBeenCalled();
    expect(deps.sendMulticast).not.toHaveBeenCalled();
  });

  it("inne wyłączone przełączniki (dailyReminder) nie blokują pusha o rekordzie", async () => {
    const deps = baseDeps({
      getUser: vi.fn(async () => ({ status: "active", notificationPrefs: { dailyReminder: false } })),
    });
    expect((await runPrPush(deps, workout())).status).toBe("sent");
  });

  it("zawieszony user / wyłączony dostęp = pomija", async () => {
    const suspended = baseDeps({ getUser: vi.fn(async () => ({ status: "suspended" })) });
    expect(await runPrPush(suspended, workout())).toEqual({ status: "skipped", reason: "access" });
    const disabled = baseDeps({ getUser: vi.fn(async () => ({ status: "active", access: { enabled: false } })) });
    expect(await runPrPush(disabled, workout())).toEqual({ status: "skipped", reason: "access" });
  });

  it("nieukończony trening albo bez serii roboczych = pomija bez odczytów", async () => {
    const deps = baseDeps();
    expect(await runPrPush(deps, workout({ completed: false }))).toEqual({ status: "skipped", reason: "not-completed" });
    expect(await runPrPush(deps, workout({
      exercises: [{ exerciseId: "squat", sets: [{ reps: 5, weight: 100, completed: true, isWarmup: true }] }],
    }))).toEqual({ status: "skipped", reason: "no-working-sets" });
    expect(deps.getUser).not.toHaveBeenCalled();
  });

  it("idempotencja: znacznik już istnieje (retry triggera) = bez drugiego pusha", async () => {
    const deps = baseDeps({ claimPrPush: vi.fn(async () => false) });
    expect(await runPrPush(deps, workout())).toEqual({ status: "skipped", reason: "already-sent" });
    expect(deps.sendMulticast).not.toHaveBeenCalled();
  });

  it("brak tokenów = bez znacznika (późniejsza rejestracja telefonu nic nie zmienia)", async () => {
    const deps = baseDeps({ listTokenRegistrations: vi.fn(async () => []) });
    expect(await runPrPush(deps, workout())).toEqual({ status: "skipped", reason: "no-tokens" });
    expect(deps.claimPrPush).not.toHaveBeenCalled();
  });

  it("EN + lbs: nazwa i jednostka usera", async () => {
    const deps = baseDeps({
      getUser: vi.fn(async () => ({ status: "active", language: "en", preferences: { unit: "lbs" } })),
    });
    await runPrPush(deps, workout({
      exercises: [{ exerciseId: "squat", name: "Przysiad goblet", sets: [{ reps: 5, weight: 100, completed: true }] }],
    }));
    const [, title, body] = vi.mocked(deps.sendMulticast).mock.calls[0];
    expect(title).toBe("New record: Goblet Squat 220.5 lb");
    expect(body).toContain("Previously 209.5 lb");
  });

  it("kilka rekordów w jednym treningu = jeden push z listą", async () => {
    const deps = baseDeps();
    await runPrPush(deps, workout({
      exercises: [
        { exerciseId: "squat", name: "Przysiad", sets: [{ reps: 5, weight: 100, completed: true }] },
        { exerciseId: "bench", name: "Wyciskanie leżąc", sets: [{ reps: 10, weight: 80, completed: true }] },
      ],
    }));
    const [, title, body] = vi.mocked(deps.sendMulticast).mock.calls[0];
    expect(title).toBe("2 nowe rekordy");
    expect(body).toBe("Przysiad 100 kg, Wyciskanie leżąc 10 powt.");
  });

  it("sprząta martwe tokeny FCM", async () => {
    const deps = baseDeps({
      listTokenRegistrations: vi.fn(async () => [{ id: "r1", token: "t1" }, { id: "r2", token: "t2" }]),
      sendMulticast: vi.fn(async (tokens: string[]) => ({
        successCount: 1,
        failureCount: 1,
        responses: tokens.map((token) => (token === "t2"
          ? { success: false, error: { code: "messaging/registration-token-not-registered" } }
          : { success: true })),
      })),
    });
    const result = await runPrPush(deps, workout());
    expect(result).toMatchObject({ status: "sent", sent: 1, failed: 1, invalidTokens: 1 });
    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r2"]);
  });
});

describe("buildPrPushMessage", () => {
  it("liczebnik PL: 5+ rekordów", () => {
    const prs = Array.from({ length: 5 }, (_, i) => ({
      exerciseId: `e${i}`, exerciseName: `Cw${i}`, type: "weight" as const, newValue: 10 + i, oldValue: 9,
    }));
    expect(buildPrPushMessage(prs, "pl", "kg").title).toBe("5 nowych rekordów");
  });

  it("e1RM formatowane jako szacowane 1RM", () => {
    const message = buildPrPushMessage(
      [{ exerciseId: "e", exerciseName: "Przysiad", type: "e1rm", newValue: 120.5, oldValue: 118 }],
      "pl",
      "kg",
    );
    expect(message.title).toBe("Nowy rekord: Przysiad szac. 1RM 120.5 kg");
    expect(message.body).toBe("Poprzednio szac. 1RM 118 kg. Tak trzymaj!");
  });
});
