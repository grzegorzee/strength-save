// H-T4: minimalny port detekcji PR z src/lib/pr-utils.ts (detectNewPRs)
// pod maile: nowy max kg, nowe max powtórzenia przy tym samym ciężarze,
// nowy e1RM (Epley); brak wcześniejszych zapisów ćwiczenia = "pierwszy
// zapis", nie PR. Serie rozgrzewkowe i nieukończone nie liczą się.
import { describe, expect, it } from "vitest";
import { calculateE1RM, detectEmailPRs } from "./email-prs";
import type { EmailWorkout } from "./email-workout";
import { buildBodyWeightTimeline } from "./bodyweight-loaded";

const session = (over: Partial<EmailWorkout> = {}): EmailWorkout => ({
  id: "w-now",
  userId: "u1",
  date: "2026-08-20",
  completed: true,
  exercises: [{
    exerciseId: "ex-bench",
    name: "Wyciskanie sztangi",
    sets: [{ reps: 5, weight: 105, completed: true }],
  }],
  ...over,
});

const earlier = (weight: number, reps = 5, over: Partial<EmailWorkout> = {}): EmailWorkout => ({
  id: `w-prev-${weight}`,
  userId: "u1",
  date: "2026-08-10",
  completed: true,
  exercises: [{
    exerciseId: "ex-bench",
    name: "Wyciskanie sztangi",
    sets: [{ reps, weight, completed: true }],
  }],
  ...over,
});

describe("calculateE1RM (Epley, zgodnie z klientem)", () => {
  it("1 powtórzenie = ciężar, więcej = Epley zaokrąglony do 0.1", () => {
    expect(calculateE1RM(100, 1)).toBe(100);
    expect(calculateE1RM(100, 5)).toBe(116.7);
    expect(calculateE1RM(0, 5)).toBe(0);
  });
});

describe("detectEmailPRs (H-T4)", () => {
  it("nowy max kg = PR typu weight z old/new", () => {
    const { prs, firsts } = detectEmailPRs(session(), [earlier(100)]);
    expect(prs).toEqual([{
      exerciseId: "ex-bench", exerciseName: "Wyciskanie sztangi",
      type: "weight", newValue: 105, oldValue: 100,
    }]);
    expect(firsts).toEqual([]);
  });

  it("ten sam ciężar, więcej powtórzeń = PR typu reps", () => {
    const now = session({ exercises: [{ exerciseId: "ex-bench", name: "Wyciskanie sztangi", sets: [{ reps: 7, weight: 100, completed: true }] }] });
    const { prs } = detectEmailPRs(now, [earlier(100, 5)]);
    expect(prs.some((pr) => pr.type === "reps" && pr.newValue === 7 && pr.oldValue === 5)).toBe(true);
    expect(prs.some((pr) => pr.type === "weight")).toBe(false);
  });

  it("nowy e1RM bez nowego max kg = PR typu e1rm", () => {
    // 90x12 daje e1RM 126 > 116.7 (100x5), max kg bez zmian.
    const now = session({ exercises: [{ exerciseId: "ex-bench", name: "Wyciskanie sztangi", sets: [{ reps: 12, weight: 90, completed: true }] }] });
    const { prs } = detectEmailPRs(now, [earlier(100, 5)]);
    expect(prs).toEqual([{
      exerciseId: "ex-bench", exerciseName: "Wyciskanie sztangi",
      type: "e1rm", newValue: 126, oldValue: 116.7,
    }]);
  });

  it("bodyweight (bez ciężaru): PR po powtórzeniach", () => {
    const now = session({ exercises: [{ exerciseId: "ex-pullup", name: "Podciąganie", sets: [{ reps: 12, weight: 0, completed: true }] }] });
    const prev = earlier(0, 10, { exercises: [{ exerciseId: "ex-pullup", name: "Podciąganie", sets: [{ reps: 10, weight: 0, completed: true }] }] });
    const { prs } = detectEmailPRs(now, [prev]);
    expect(prs).toEqual([{
      exerciseId: "ex-pullup", exerciseName: "Podciąganie",
      type: "reps", newValue: 12, oldValue: 10,
    }]);
  });

  it("brak wcześniejszych zapisów ćwiczenia = pierwszy zapis, nie PR", () => {
    const { prs, firsts } = detectEmailPRs(session(), []);
    expect(prs).toEqual([]);
    expect(firsts).toEqual(["ex-bench"]);
  });

  it("serie rozgrzewkowe i nieukończone nie robią PR", () => {
    const now = session({ exercises: [{ exerciseId: "ex-bench", name: "Wyciskanie sztangi", sets: [
      { reps: 5, weight: 120, completed: true, isWarmup: true },
      { reps: 5, weight: 110, completed: false },
      { reps: 5, weight: 95, completed: true },
    ] }] });
    const { prs } = detectEmailPRs(now, [earlier(100, 5)]);
    expect(prs).toEqual([]);
  });

  it("match po nazwie łapie sesje ad-hoc z innym exerciseId", () => {
    const prev = earlier(100, 5, { exercises: [{ exerciseId: "adhoc-1", name: "Wyciskanie sztangi", sets: [{ reps: 5, weight: 100, completed: true }] }] });
    const { prs, firsts } = detectEmailPRs(session(), [prev]);
    expect(firsts).toEqual([]);
    expect(prs.some((pr) => pr.type === "weight" && pr.oldValue === 100)).toBe(true);
  });

  it("gorsza sesja = zero PR-ów i zero first", () => {
    const now = session({ exercises: [{ exerciseId: "ex-bench", name: "Wyciskanie sztangi", sets: [{ reps: 3, weight: 90, completed: true }] }] });
    const { prs, firsts } = detectEmailPRs(now, [earlier(100, 5)]);
    expect(prs).toEqual([]);
    expect(firsts).toEqual([]);
  });
});

// F6: bodyweight_loaded (weight = dociążenie, 0 = sama MC). Reguła jak w kliencie
// (pr-utils): więcej dociążenia przy powtórzeniach >= rekordowych = PR ciężaru,
// równe dociążenie i więcej powtórzeń = PR powtórzeń. Legacy (MC wpisana jako kg)
// normalizowane osią masy ciała, inaczej PR za dociążenie byłby przegapiony.
describe("detectEmailPRs — bodyweight_loaded (F6)", () => {
  const PULL = "Podciąganie na drążku";
  const pull = (id: string, date: string, sets: Array<[number, number]>): EmailWorkout => ({
    id, userId: "u1", date, completed: true,
    exercises: [{ exerciseId: "ex-pull", name: PULL, sets: sets.map(([reps, weight]) => ({ reps, weight, completed: true })) }],
  });
  const timeline = buildBodyWeightTimeline([{ date: "2026-06-10", weight: 74 }]);

  it("MC 8 powt. -> +10 kg x 8 = PR ciężaru (stara wartość 0 = sama MC)", () => {
    const { prs } = detectEmailPRs(pull("w-now", "2026-10-08", [[8, 10]]), [pull("w-1", "2026-10-01", [[8, 0]])]);
    expect(prs).toEqual([expect.objectContaining({ type: "weight", newValue: 10, oldValue: 0 })]);
  });

  it("równe dociążenie, więcej powtórzeń = PR powtórzeń; więcej kg przy mniej powtórzeniach = brak", () => {
    const base = [pull("w-1", "2026-10-01", [[8, 0]])];
    expect(detectEmailPRs(pull("w-now", "2026-10-08", [[9, 0]]), base).prs)
      .toEqual([expect.objectContaining({ type: "reps", newValue: 9, oldValue: 8 })]);
    expect(detectEmailPRs(pull("w-now", "2026-10-08", [[5, 10]]), base).prs).toEqual([]);
  });

  it("legacy 74 kg (MC 74) z osią masy ciała nie blokuje PR za +10 kg", () => {
    const legacy = [pull("w-1", "2026-09-01", [[8, 74], [8, 74]])];
    expect(detectEmailPRs(pull("w-now", "2026-10-08", [[8, 10]]), legacy).prs).toEqual([]);
    expect(detectEmailPRs(pull("w-now", "2026-10-08", [[8, 10]]), legacy, { bodyWeightTimeline: timeline }).prs)
      .toEqual([expect.objectContaining({ type: "weight", newValue: 10, oldValue: 0 })]);
  });

  it("zwykłe ćwiczenie bez zmian (e1RM, próg > 0)", () => {
    expect(detectEmailPRs(session(), [earlier(100)], { bodyWeightTimeline: timeline }).prs)
      .toEqual([expect.objectContaining({ type: "weight", newValue: 105 })]);
  });
});

describe("detectEmailPRs — bodyweight_loaded w mailu EN (nazwy zlokalizowane przed detekcją)", () => {
  it("Pull-Up: +10 kg po samej MC to PR ciężaru także po angielsku", () => {
    const en = (id: string, date: string, weight: number): EmailWorkout => ({
      id, userId: "u1", date, completed: true,
      exercises: [{ exerciseId: "ex-pull", name: "Pull-Up", sets: [{ reps: 8, weight, completed: true }] }],
    });
    expect(detectEmailPRs(en("w-now", "2026-10-08", 10), [en("w-1", "2026-10-01", 0)]).prs)
      .toEqual([expect.objectContaining({ type: "weight", newValue: 10, oldValue: 0 })]);
  });
});
