// F-T3: mail podsumowania treningu — kontrakty: treść (serie/notatki/RPE/ból),
// ownership, limit dzienny, walidacja adresu, pusta historia.
import { describe, expect, it, vi } from "vitest";
import {
  buildHistoryEmailHtml,
  buildWorkoutEmailHtml,
  isValidRecipient,
  historyEmailSubject,
  runEmailHistory,
  runEmailWorkout,
  sanitizeTrainerName,
  workoutEmailSubject,
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
    const d = deps({ listWorkoutsInRange: vi.fn(async (_uid, opts) => (opts.beforeDate ? [] : [workout(), workout({ id: "w2", date: "2026-08-18" })])) });
    expect(await runEmailHistory(d, { ...params })).toEqual({ ok: true });
    const html = sentHtml(d);
    expect(html).toContain("20.08.2026");
    expect(html).toContain("18.08.2026");
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
    expect(String(entry.subject)).toContain("20.08.2026");
    expect(typeof entry.sentAt).toBe("string");
  });

  it("zachowuje historyczny transport=resend bez sesMessageId przy odczycie starego wyniku", async () => {
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

  // T21a: treść maila idzie drugim argumentem do logEmail (podgląd w panelu).
  it("logEmail dostaje pełny HTML maila jako drugi argument (workout)", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    const html = (d.logEmail as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(html).toContain("Wyciskanie sztangi");
    expect(html).toBe(sentHtml(d));
  });

  it("logEmail dostaje pełny HTML maila jako drugi argument (history)", async () => {
    const d = deps();
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20" })).toEqual({ ok: true });
    const html = (d.logEmail as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(html).toBe(sentHtml(d));
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

// H-T4: tytuł bez pauz i z imieniem usera, kafle podsumowania z seriami
// zrobione/planowane i PR-ami, sekcja nowych rekordów, wyróżniona najlepsza
// seria, podsumowanie setów per ćwiczenie, historia z sumą serii roboczych.
describe("tytuł i treść maila (H-T4)", () => {
  const prs = [{ exerciseId: "ex-1", exerciseName: "Wyciskanie sztangi", type: "weight" as const, newValue: 105, oldValue: 100 }];

  it("tytuł pojedynczego: bez pauz, z imieniem, dzień tygodnia + data per język", () => {
    expect(workoutEmailSubject(workout(), "pl", "Greg"))
      .toBe("Strength Save: trening Greg, czwartek 20.08.2026");
    expect(workoutEmailSubject(workout(), "en", "Greg"))
      .toBe("Strength Save: Greg's workout, Thursday, Aug 20, 2026");
  });

  it("tytuł bez imienia: bez 'undefined'", () => {
    const subject = workoutEmailSubject(workout(), "pl");
    expect(subject).toBe("Strength Save: trening, czwartek 20.08.2026");
    expect(subject).not.toContain("undefined");
  });

  it("tytuł historii: zakres dat zamiast liczby, per język", () => {
    const workouts = [workout(), workout({ id: "w2", date: "2026-08-18" })];
    expect(historyEmailSubject(workouts, "pl", "Greg"))
      .toBe("Strength Save: treningi Greg, 18.08.2026 do 20.08.2026");
    expect(historyEmailSubject(workouts, "en", "Greg"))
      .toBe("Strength Save: Greg's workouts, Aug 18, 2026 to Aug 20, 2026");
    expect(historyEmailSubject([workout()], "pl")).toBe("Strength Save: treningi, 20.08.2026");
  });

  it("zero em-dash i en-dash w tytułach i całym HTML", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl", { prs })
      + buildWorkoutEmailHtml(workout(), "en", { prs })
      + buildHistoryEmailHtml([workout()], "pl")
      + workoutEmailSubject(workout(), "pl", "Greg")
      + historyEmailSubject([workout()], "en", "Greg");
    expect(html).not.toMatch(/[–—]/);
  });

  it("nagłówek treści: dzień tygodnia + data + nazwa dnia (focus)", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl");
    expect(html).toContain("czwartek");
    expect(html).toContain("20.08.2026");
    expect(html).toContain("Góra B");
  });

  it("kafle: serie zrobione/planowane i kafel rekordów tylko gdy są", () => {
    const withPrs = buildWorkoutEmailHtml(workout(), "pl", { prs });
    expect(withPrs).toContain("1/2");
    expect(withPrs).toContain("Nowe rekordy");
    const withoutPrs = buildWorkoutEmailHtml(workout(), "pl");
    expect(withoutPrs).not.toContain("Nowe rekordy");
  });

  it("sekcja nowych rekordów: ćwiczenie + wartość + poprzednia", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl", { prs: [
      ...prs,
      { exerciseId: "ex-2", exerciseName: "Podciąganie", type: "reps", newValue: 12, oldValue: 10 },
      { exerciseId: "ex-3", exerciseName: "Przysiad", type: "e1rm", newValue: 150.5, oldValue: 145 },
    ] });
    expect(html).toContain("105 kg");
    expect(html).toContain("100 kg");
    expect(html).toContain("12 powt.");
    expect(html).toContain("e1RM");
    expect(html).toContain("150.5 kg");
  });

  it("najlepsza seria wyróżniona etykietą", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl");
    expect(html).toContain("najlepsza");
    expect(buildWorkoutEmailHtml(workout(), "en")).toContain("best");
  });

  it("podsumowanie setów per ćwiczenie w nagłówku wiersza", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl");
    expect(html).toContain("1/2 serie robocze + 1 rozgrzewkowa");
  });

  it("historia: suma serii roboczych w nagłówku zbiorczym i PR-y per sesja", () => {
    const workouts = [workout(), workout({ id: "w2", date: "2026-08-18" })];
    const html = buildHistoryEmailHtml(workouts, "pl", { prsBySession: { w2: prs } });
    expect(html).toContain("Serie robocze: 2");
    expect(html).toContain("Nowe rekordy");
    expect(html).toContain("105 kg");
  });
});

describe("przepływ PR w wysyłce (H-T4)", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("runEmailWorkout: pobiera wcześniejsze treningi i wkłada PR-y do maila", async () => {
    const prev = workout({ id: "w-prev", date: "2026-08-10", exercises: [{
      exerciseId: "ex-1", name: "Wyciskanie sztangi", sets: [{ reps: 5, weight: 90, completed: true }],
    }] });
    const d = deps({
      listWorkoutsInRange: vi.fn(async () => [prev]),
      getUserContext: vi.fn(async () => ({ displayName: "Greg" })),
    });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(d.listWorkoutsInRange).toHaveBeenCalledWith("u1", { beforeDate: "2026-08-20", limit: 100 });
    const subject = (d.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(subject).toContain("Greg");
    expect(sentHtml(d)).toContain("Nowe rekordy");
    expect(sentHtml(d)).toContain("100 kg");
  });

  it("runEmailHistory: baseline przed zakresem, PR-y per sesja narastająco", async () => {
    const inRange = [
      workout({ id: "w-new", date: "2026-08-20", exercises: [{ exerciseId: "ex-1", name: "Wyciskanie sztangi", sets: [{ reps: 5, weight: 110, completed: true }] }] }),
      workout({ id: "w-mid", date: "2026-08-18", exercises: [{ exerciseId: "ex-1", name: "Wyciskanie sztangi", sets: [{ reps: 5, weight: 105, completed: true }] }] }),
    ];
    const baseline = [workout({ id: "w-old", date: "2026-08-01", exercises: [{ exerciseId: "ex-1", name: "Wyciskanie sztangi", sets: [{ reps: 5, weight: 100, completed: true }] }] })];
    const list = vi.fn(async (_uid: string, opts: { sinceDate?: string; beforeDate?: string; limit: number }) =>
      (opts.beforeDate ? baseline : inRange));
    const d = deps({ listWorkoutsInRange: list });
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20" })).toEqual({ ok: true });
    expect(list).toHaveBeenCalledWith("u1", { sinceDate: "2026-08-14", limit: 14 });
    expect(list).toHaveBeenCalledWith("u1", { beforeDate: "2026-08-18", limit: 100 });
    // w-mid: PR 105 vs 100; w-new: PR 110 vs 105 (baseline narastający).
    expect(sentHtml(d)).toContain("105 kg");
    expect(sentHtml(d)).toContain("110 kg");
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
    expect(html).toContain("18.08.2026");
    expect(html).toContain("20.08.2026");
    expect(html).toContain("(2)");
    expect(html).toContain("1.0 t");
    expect(html).toContain("2 h 1 min");
  });
});

describe("J-T3: mail w 100% jednym języku", () => {
  // Kanoniczne dane są PL — przy lang=en tłumaczymy słownikami digestu:
  // nazwy ćwiczeń, dayFocus, dayName (dni tygodnia + custom przez focus).
  const plWorkout = (over: Partial<EmailWorkout> = {}) => workout({
    exercises: [
      { exerciseId: "ex-1", name: "Wyciskanie sztangi na skosie", sets: [{ reps: 5, weight: 100, completed: true }] },
      { exerciseId: "ex-2", name: "Moje własne cudo", sets: [{ reps: 8, weight: 40, completed: true }] },
    ],
    ...over,
  });
  const base = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("lang=en: dayName Czwartek -> Thursday, dayFocus Góra B -> Upper B, nazwy ze słownika, nieznana zostaje", async () => {
    const d = deps({
      getWorkout: vi.fn(async () => plWorkout()),
      getUserContext: vi.fn(async () => ({ language: "en" })),
    });
    expect(await runEmailWorkout(d, base)).toEqual({ ok: true });
    const html = sentHtml(d);
    expect(html).not.toContain("Czwartek");
    expect(html).toContain("Thursday");
    expect(html).not.toContain("Góra B");
    expect(html).toContain("Upper B");
    expect(html).toContain("Incline Barbell Press");
    expect(html).not.toContain("Wyciskanie sztangi na skosie");
    expect(html).toContain("Moje własne cudo");
  });

  it("lang=en: custom dayName (Góra B jako nazwa dnia) przez słownik focusu", async () => {
    const d = deps({
      getWorkout: vi.fn(async () => plWorkout({ dayName: "Góra B", dayFocus: undefined })),
      getUserContext: vi.fn(async () => ({ language: "en" })),
    });
    expect(await runEmailWorkout(d, base)).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("Upper B");
  });

  it("lang=pl: kanoniczne dane bez zmian", async () => {
    const d = deps({
      getWorkout: vi.fn(async () => plWorkout()),
      getUserContext: vi.fn(async () => ({ language: "pl" })),
    });
    expect(await runEmailWorkout(d, base)).toEqual({ ok: true });
    const html = sentHtml(d);
    expect(html).toContain("Czwartek");
    expect(html).toContain("Góra B");
    expect(html).toContain("Wyciskanie sztangi na skosie");
  });

  it("historia lang=en: sekcje treningów bez polskich nazw", async () => {
    const d = deps({
      listWorkoutsInRange: vi.fn(async (_uid: string, opts: { beforeDate?: string }) => (opts.beforeDate ? [] : [plWorkout()])),
      getUserContext: vi.fn(async () => ({ language: "en" })),
    });
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20" })).toEqual({ ok: true });
    const html = sentHtml(d);
    expect(html).not.toContain("Czwartek");
    expect(html).toContain("Upper B");
    expect(html).toContain("Incline Barbell Press");
    expect(html).toContain("Moje własne cudo");
  });
});

describe("J-T4: last30 czytelnie — tabela-przegląd (bez załączników, decyzja właściciela 2026-08-20)", () => {
  const manyWorkouts = (count: number): EmailWorkout[] =>
    Array.from({ length: count }, (_, i) => workout({
      id: `w${i + 1}`,
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    }));

  it("> 7 treningów: tabela-przegląd zamiast pełnych sekcji", () => {
    const html = buildHistoryEmailHtml(manyWorkouts(8), "pl");
    // Wiersz przeglądu: data, dzień, tonaż, czas, serie robocze, PR.
    expect(html).toContain("Tonaż");
    expect(html).toContain("Serie");
    expect(html).toContain("01.08.2026");
    expect(html).toContain("08.08.2026");
    // Pełne sekcje (lista serii per ćwiczenie) NIE wchodzą.
    expect(html).not.toContain("100 kg × 5");
    expect(html).not.toContain("Wyciskanie sztangi");
  });

  it("<= 7 treningów: pełne sekcje jak dotąd", () => {
    const html = buildHistoryEmailHtml(manyWorkouts(7), "pl");
    expect(html).toContain("100 kg × 5");
    expect(html).toContain("Wyciskanie sztangi");
  });

  it("last30 z 8 treningami: mail wychodzi z przeglądem, bez pełnych sekcji", async () => {
    const d = deps({
      listWorkoutsInRange: vi.fn(async (_uid: string, opts: { beforeDate?: string }) => (opts.beforeDate ? [] : manyWorkouts(8))),
    });
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20", range: "last30" })).toEqual({ ok: true });
    expect(sentHtml(d)).not.toContain("100 kg × 5");
    expect(sentHtml(d)).toContain("Tonaż");
  });
});

// WP-I (plan X29): imię trenera w nagłówku, jednostki wg preferences.unit,
// ownership egzekwowany w ADAPTERZE (getWorkout dostaje uid i filtruje).
describe("WP-I: imię trenera w powitaniu maila", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("trainerName w PL: powitanie 'Cześć Marek,'", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params, trainerName: "Marek" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("Cześć Marek,");
  });

  it("trainerName w EN: powitanie 'Hi Marek,'", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ language: "en" })) });
    expect(await runEmailWorkout(d, { ...params, trainerName: "Marek" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("Hi Marek,");
  });

  it("bez trainerName: zero powitania (mail jak dotąd)", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(sentHtml(d)).not.toContain("Cześć");
    expect(sentHtml(d)).not.toContain("Hi ");
  });

  it("historia też dostaje powitanie", async () => {
    const d = deps();
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20", trainerName: "Ania" })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("Cześć Ania,");
  });

  it("imię escapowane w HTML (treść od klienta)", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params, trainerName: "<b>Marek</b>" })).toEqual({ ok: true });
    expect(sentHtml(d)).not.toContain("<b>Marek</b>");
  });

  it("śmieciowy trainerName nie blokuje wysyłki (mail bez powitania)", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params, trainerName: 42 as never })).toEqual({ ok: true });
    expect(sentHtml(d)).not.toContain("Cześć");
  });

  it("sanitizeTrainerName: trim, nie-string odpada, przycięcie do 80", () => {
    expect(sanitizeTrainerName("  Marek ")).toBe("Marek");
    expect(sanitizeTrainerName(42)).toBeUndefined();
    expect(sanitizeTrainerName("   ")).toBeUndefined();
    expect(sanitizeTrainerName(undefined)).toBeUndefined();
    expect(sanitizeTrainerName("x".repeat(100))).toHaveLength(80);
  });
});

describe("WP-I: jednostki maila wg preferences.unit", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("unit=lbs: serie w lb (kg*2.20462 do 0.5 lb) i tonaż w k lb", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ unit: "lbs" })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    const html = sentHtml(d);
    expect(html).toContain("220.5 lb × 5"); // 100 kg
    expect(html).not.toContain("100 kg × 5");
    expect(html).toContain("1.1 k lb"); // tonaż 500 kg
    expect(html).not.toContain("0.5 t");
  });

  it("unit=kg (i brak pola): kg jak dotąd", async () => {
    const d = deps({ getUserContext: vi.fn(async () => ({ unit: "kg" })) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(sentHtml(d)).toContain("100 kg × 5");
    expect(sentHtml(d)).toContain("0.5 t");
  });

  it("buildWorkoutEmailHtml: PR-y też w lb przy unit=lbs", () => {
    const html = buildWorkoutEmailHtml(workout(), "pl", {
      unit: "lbs",
      prs: [{ exerciseId: "ex-1", exerciseName: "Wyciskanie sztangi", type: "weight", newValue: 105, oldValue: 100 }],
    });
    expect(html).toContain("231.5 lb"); // 105 kg
    expect(html).toContain("220.5 lb"); // 100 kg
    expect(html).not.toContain("105 kg");
  });

  it("historia z unit=lbs: sumy i tabela przeglądu w lb", async () => {
    const d = deps({
      getUserContext: vi.fn(async () => ({ unit: "lbs" })),
      listWorkoutsInRange: vi.fn(async (_uid: string, opts: { beforeDate?: string }) =>
        (opts.beforeDate ? [] : [workout(), workout({ id: "w2", date: "2026-08-18" })])),
    });
    expect(await runEmailHistory(d, { uid: "u1", to: "trener@example.com", today: "2026-08-20" })).toEqual({ ok: true });
    const html = sentHtml(d);
    expect(html).toContain("2.2 k lb"); // suma tonażu 1000 kg
    expect(html).not.toContain("1.0 t");
  });
});

describe("WP-I: ownership w adapterze getWorkout", () => {
  const params = { uid: "u1", workoutId: "w1", to: "trener@example.com", today: "2026-08-20" } as const;

  it("getWorkout dostaje uid żądającego (kontrakt adaptera)", async () => {
    const d = deps();
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: true });
    expect(d.getWorkout).toHaveBeenCalledWith("w1", "u1");
  });

  it("adapter nie widzi cudzego treningu (null) = not-found, bez wysyłki", async () => {
    const d = deps({ getWorkout: vi.fn(async () => null) });
    expect(await runEmailWorkout(d, { ...params })).toEqual({ ok: false, code: "not-found" });
    expect(d.sendEmail).not.toHaveBeenCalled();
    expect(d.consumeQuota).not.toHaveBeenCalled();
  });
});
