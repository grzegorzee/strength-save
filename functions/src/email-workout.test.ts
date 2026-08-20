// F-T3: mail podsumowania treningu — kontrakty: treść (serie/notatki/RPE/ból),
// ownership, limit dzienny, walidacja adresu, pusta historia.
import { describe, expect, it, vi } from "vitest";
import {
  buildHistoryEmailHtml,
  buildWorkoutEmailHtml,
  isValidRecipient,
  runEmailHistory,
  runEmailWorkout,
  HISTORY_EMAIL_MAX_WORKOUTS,
  type EmailWorkout,
  type EmailWorkoutDeps,
} from "./email-workout";

const workout = (over: Partial<EmailWorkout> = {}): EmailWorkout => ({
  id: "w1",
  userId: "u1",
  date: "2026-08-20",
  dayName: "Czwartek",
  dayFocus: "Góra B",
  completed: true,
  durationSec: 3617,
  notes: "Dobra energia",
  sessionRating: "down",
  sessionRatingReasons: ["too_heavy"],
  exercises: [{
    exerciseId: "ex-1",
    name: "Wyciskanie sztangi",
    rpe: 8,
    pain: "bark",
    notes: "lekki dyskomfort",
    sets: [
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: false },
      { reps: 10, weight: 40, completed: true, isWarmup: true },
    ],
  }],
  ...over,
});

const deps = (over: Partial<EmailWorkoutDeps> = {}): EmailWorkoutDeps => ({
  getWorkout: vi.fn(async () => workout()),
  listWorkoutsInRange: vi.fn(async () => [workout()]),
  getUserContext: vi.fn(async () => ({})),
  consumeQuota: vi.fn(async () => true),
  sendEmail: vi.fn(async () => ({})),
  logEmail: vi.fn(async () => undefined),
  ...over,
});

const sentHtml = (d: EmailWorkoutDeps): string =>
  (d.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][2] as string;

const loggedEntry = (d: EmailWorkoutDeps) =>
  (d.logEmail as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;

describe("buildWorkoutEmailHtml", () => {
  it("zawiera serie, notatki, RPE, ból, ocenę sesji, tonaż i czas", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl");
    expect(html).toContain("100 kg × 5");
    expect(html).toContain("zrobiona");
    expect(html).toContain("pominięta");
    expect(html).toContain("rozgrzewkowa");
    expect(html).toContain("RPE 8");
    expect(html).toContain("ból: bark");
    expect(html).toContain("lekki dyskomfort");
    expect(html).toContain("Dobra energia");
    expect(html).toContain("Ciężko (za ciężko)");
    expect(html).toContain("0.5 t");
    expect(html).toContain("1 h 0 min");
  });

  it("escapuje treść usera (notatka z HTML)", () => {
    const html = buildWorkoutEmailHtml(workout({ notes: "<img src=x>" }), "pl");
    expect(html).not.toContain("<img src=x>");
  });
});

describe("runEmailWorkout", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("happy path: wysyła i zalicza limit", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(d.consumeQuota).toHaveBeenCalledWith("u1", "2026-08-20");
    expect(d.sendEmail).toHaveBeenCalledOnce();
  });

  it("cudzy trening = forbidden (bez wysyłki)", async () => {
    const d = deps({ getWorkout: vi.fn(async () => workout({ userId: "intruz" })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: false, code: "forbidden" });
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("zły adres = invalid-recipient (bez odczytów)", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params, to: "nie-adres" })).toEqual({ ok: false, code: "invalid-recipient" });
    expect(d.getWorkout).not.toHaveBeenCalled();
  });

  it("limit dzienny wyczerpany = quota-exceeded (bez wysyłki)", async () => {
    const d = deps({ consumeQuota: vi.fn(async () => false) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: false, code: "quota-exceeded" });
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("błąd transportu = send-failed", async () => {
    const d = deps({ sendEmail: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: false, code: "send-failed" });
  });
});

describe("runEmailHistory", () => {
  const params = { uid: "u1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("wysyła treningi z zakresu w jednym mailu", async () => {
    const d = deps({ listWorkoutsInRange: vi.fn(async () => [workout(), workout({ id: "w2", date: "2026-08-18" })]) });
    expect(await runEmailHistory(d, { ...params })).toEqual({ ok: true });
    const html = (d.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][2] as string;
    expect(html).toContain("2026-08-20");
    expect(html).toContain("2026-08-18");
  });

  it("pusta historia = empty-history (bez wysyłki i bez zaliczania limitu)", async () => {
    const d = deps({ listWorkoutsInRange: vi.fn(async () => []) });
    expect(await runEmailHistory(d, { ...params })).toEqual({ ok: false, code: "empty-history" });
    expect(d.consumeQuota).not.toHaveBeenCalled();
  });

  // H-T2: zakresy historii — koniec z wysyłką 200 treningów naraz.
  it("range week (default): filtr date >= dziś-6 dni z limitem bezpieczeństwa 14", async () => {
    const d = deps();
    expect(await runEmailHistory(d, { ...params })).toEqual({ ok: true });
    expect(d.listWorkoutsInRange).toHaveBeenCalledWith("u1", { sinceDate: "2026-08-14", limit: 14 });
  });

  it("range last30: 30 najnowszych bez filtra daty", async () => {
    const d = deps();
    expect(await runEmailHistory(d, { ...params, range: "last30" })).toEqual({ ok: true });
    expect(d.listWorkoutsInRange).toHaveBeenCalledWith("u1", { limit: 30 });
  });

  it("nieznany range = invalid-range (bez odczytów i bez limitu)", async () => {
    const d = deps();
    expect(await runEmailHistory(d, { ...params, range: "all" as never })).toEqual({ ok: false, code: "invalid-range" });
    expect(d.listWorkoutsInRange).not.toHaveBeenCalled();
    expect(d.consumeQuota).not.toHaveBeenCalled();
  });

  it("HISTORY_EMAIL_MAX_WORKOUTS obniżony do 30", () => {
    expect(HISTORY_EMAIL_MAX_WORKOUTS).toBe(30);
  });
});

// G-T1: rejestr wysyłek email_log — każda wysyłka (udana i nieudana) zostawia wpis.
describe("email_log (G-T1)", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("wysyłka SES loguje wpis sent z sesMessageId", async () => {
    const d = deps({ sendEmail: vi.fn(async () => ({ transport: "ses" as const, sesMessageId: "ses-123" })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(d.logEmail).toHaveBeenCalledOnce();
    const entry = loggedEntry(d);
    expect(entry).toMatchObject({
      uid: "u1", to: "trener@example.com", type: "workout", workoutId: "w1",
      transport: "ses", sesMessageId: "ses-123", status: "sent", lang: "pl",
    });
    expect(String(entry.subject)).toContain("2026-08-20");
    expect(typeof entry.sentAt).toBe("string");
  });

  it("fallback Resend loguje transport=resend bez sesMessageId", async () => {
    const d = deps({ sendEmail: vi.fn(async () => ({ transport: "resend" as const })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    const entry = loggedEntry(d);
    expect(entry.transport).toBe("resend");
    expect(entry.sesMessageId).toBeUndefined();
    expect(entry.status).toBe("sent");
  });

  it("błąd totalny loguje status failed z komunikatem, NIE sent", async () => {
    const d = deps({ sendEmail: vi.fn(async () => ({ error: { message: "no-transport-configured" } })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: false, code: "send-failed" });
    const entry = loggedEntry(d);
    expect(entry.status).toBe("failed");
    expect(entry.error).toBe("no-transport-configured");
  });

  it("historia loguje type=history bez workoutId", async () => {
    const d = deps({ sendEmail: vi.fn(async () => ({ transport: "ses" as const, sesMessageId: "ses-9" })) });
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20" })).toEqual({ ok: true });
    const entry = loggedEntry(d);
    expect(entry.type).toBe("history");
    expect(entry.workoutId).toBeUndefined();
  });

  it("awaria zapisu logu NIE psuje wysyłki (mail wyszedł = ok)", async () => {
    const d = deps({ logEmail: vi.fn(async () => { throw new Error("firestore-down"); }) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
  });

  it("odrzucenie przed wysyłką (invalid-recipient) nie tworzy wpisu", async () => {
    const d = deps();
    await runEmailWorkout(d, { ...params, to: "nie-adres" });
    expect(d.logEmail).not.toHaveBeenCalled();
  });
});

// H-T3: język maila z ustawień USERA (users.language, to samo pole co digest);
// parametr klienta tylko fallback, brak wszystkiego = pl.
describe("język maila z profilu usera (H-T3)", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("profil language=en wygrywa z klientowym pl", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ language: "en" })) });
    expect(await runEmailWorkout(d, { ...params, lang: "pl" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("at the account owner's request");
  });

  it("profil language=pl wygrywa z klientowym en (i odwrotność poprzedniego)", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ language: "pl" })) });
    expect(await runEmailWorkout(d, { ...params, lang: "en" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("na prośbę właściciela konta");
  });

  it("brak języka w profilu = fallback na parametr klienta", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ displayName: "Greg" })) });
    expect(await runEmailWorkout(d, { ...params, lang: "en" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("at the account owner's request");
  });

  it("brak wszystkiego = pl", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({})) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("na prośbę właściciela konta");
  });

  it("awaria odczytu profilu nie blokuje wysyłki (fallback na parametr)", async () => {
    const d = deps({ getUserContext: vi.fn(async () => { throw new Error("firestore-down"); }) });
    expect(await runEmailWorkout(d, { ...params, lang: "en" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("at the account owner's request");
  });

  it("historia też bierze język z profilu", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ language: "en" })) });
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20", lang: "pl" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("at the account owner's request");
  });

  it("email_log dostaje finalny język (z profilu), nie klientowy", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ language: "en" })) });
    await runEmailWorkout(d, { ...params, lang: "pl" });
    expect(loggedEntry(d).lang).toBe("en");
  });
});

describe("isValidRecipient", () => {
  it("akceptuje zwykłe adresy, odrzuca śmieci", () => {
    expect(isValidRecipient("a@b.co")).toBe(true);
    expect(isValidRecipient("a b@c.co")).toBe(false);
    expect(isValidRecipient("")).toBe(false);
    expect(isValidRecipient(42)).toBe(false);
  });
});

describe("buildHistoryEmailHtml", () => {
  it("nagłówek z liczbą treningów", () => {
    const html = buildHistoryEmailHtml([workout()], "pl");
    expect(html).toContain("Historia treningów");
    expect(html).toContain("(1)");
  });
});

// G-T3: szablon w stylu marki — jasne tło, biała karta, limonka tylko jako
// akcent przy ciemnym tekście, layout tabelaryczny, zero obrazków, zero
// wykrzykników i AI-slopu w copy.
describe("szablon marki (G-T3)", () => {
  it("pojedynczy: jasne tło, biała karta, logo tekstowe, akcent limonkowy, max 640", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl");
    expect(html).toContain("#f6f7f9");
    expect(html).toContain("#ffffff");
    expect(html).toContain("STRENGTH SAVE");
    expect(html).toContain("#cefc22");
    expect(html).toContain("max-width:640px");
  });

  it("kafle hero: tonaż, czas, serie, ćwiczenia (PL i EN)", () => {
    const pl = buildWorkoutEmailHtml(workout(), "pl");
    expect(pl).toContain("Tonaż");
    expect(pl).toContain("Czas");
    expect(pl).toContain("Serie");
    expect(pl).toContain("Ćwiczenia");
    const en = buildWorkoutEmailHtml(workout(), "en");
    expect(en).toContain("Tonnage");
    expect(en).toContain("Time");
    expect(en).toContain("Sets");
    expect(en).toContain("Exercises");
  });

  it("layout tabelaryczny, inline CSS, zero obrazków i zewnętrznych zasobów", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl");
    expect(html).toContain("<table");
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("<link");
    expect(html).not.toContain("display:flex");
  });

  it("zero wykrzykników w copy (poza treścią wpisaną przez usera)", () => {
    const clean = workout({ notes: undefined, exercises: [{ exerciseId: "ex-1", name: "Wyciskanie", sets: [{ reps: 5, weight: 100, completed: true }] }] });
    expect(buildWorkoutEmailHtml(clean, "pl")).not.toContain("!");
    expect(buildWorkoutEmailHtml(clean, "en")).not.toContain("!");
    expect(buildHistoryEmailHtml([clean], "pl")).not.toContain("!");
  });

  it("stopka: wysłane na prośbę właściciela konta", () => {
    expect(buildWorkoutEmailHtml(workout(), "pl")).toContain("na prośbę właściciela konta");
    expect(buildWorkoutEmailHtml(workout(), "en")).toContain("at the account owner's request");
  });

  it("historia: zakres dat, liczba treningów, suma tonażu, łączny czas", () => {
    const html = buildHistoryEmailHtml([workout(), workout({ id: "w2", date: "2026-08-18" })], "pl");
    expect(html).toContain("2026-08-18");
    expect(html).toContain("2026-08-20");
    expect(html).toContain("(2)");
    expect(html).toContain("1.0 t");
    expect(html).toContain("2 h 1 min");
  });
});
