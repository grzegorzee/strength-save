import { describe, it, expect, vi } from "vitest";
import {
  validateIngestPayload,
  buildSessionFromEvents,
  runGarminIngest,
  type GarminIngestDeps,
} from "./garmin-ingest";

const NOW = 1_752_960_000_000;

const validPayload = () => ({
  workoutId: "w-20260720-1",
  date: "2026-07-20",
  dayId: "day-1",
  dayName: "Poniedziałek",
  startedAt: NOW - 3_600_000,
  finishedAt: NOW,
  events: [
    { id: "e1", exerciseId: "ex-1", exerciseName: "Wyciskanie hantli (Lekki skos)", setIndex: 0, reps: 6, weight: 62.5, at: NOW - 3000 },
    { id: "e2", exerciseId: "ex-1", exerciseName: "Wyciskanie hantli (Lekki skos)", setIndex: 1, reps: 6, weight: 62.5, at: NOW - 2000 },
    { id: "e3", exerciseId: "ex-2", exerciseName: "Przysiad ze sztangą (High Bar)", setIndex: 0, reps: 8, weight: 80, at: NOW - 1000 },
  ],
});

const makeDeps = (over: Partial<GarminIngestDeps> = {}) => {
  const saved = new Map<string, Record<string, unknown>>();
  const deps: GarminIngestDeps = {
    hasCompletedSessionForDay: vi.fn(async () => false),
    saveWorkout: vi.fn(async (docId: string, doc: Record<string, unknown>) => { saved.set(docId, doc); }),
    now: () => NOW,
    ...over,
  };
  return { deps, saved };
};

describe("validateIngestPayload (Z125)", () => {
  it("poprawna paczka przechodzi", () => {
    expect(validateIngestPayload(validPayload())).not.toBeNull();
  });

  it("śmieci i przekroczone limity odrzucane", () => {
    expect(validateIngestPayload(null)).toBeNull();
    expect(validateIngestPayload({})).toBeNull();
    expect(validateIngestPayload({ ...validPayload(), date: "20-07-2026" })).toBeNull();
    expect(validateIngestPayload({ ...validPayload(), events: [] })).toBeNull();
    const badWeight = validPayload();
    badWeight.events[0].weight = 5000;
    expect(validateIngestPayload(badWeight)).toBeNull();
    const tooMany = validPayload();
    tooMany.events = Array.from({ length: 501 }, (_, i) => ({ ...validPayload().events[0], id: `e${i}`, setIndex: i }));
    expect(validateIngestPayload(tooMany)).toBeNull();
  });
});

describe("buildSessionFromEvents (Z125)", () => {
  it("składa WorkoutSession ze snapshotami nazw; duplikaty eventId zdeduplikowane", () => {
    const payload = validateIngestPayload({
      ...validPayload(),
      events: [...validPayload().events, ...validPayload().events], // podwójna wysyłka
    });
    const session = buildSessionFromEvents(payload!, "user-1", "dev123", { adhoc: false });
    expect(session.userId).toBe("user-1");
    expect(session.dayId).toBe("day-1");
    expect(session.completed).toBe(true);
    expect(session.exercises).toHaveLength(2);
    expect(session.exercises[0]).toMatchObject({
      exerciseId: "ex-1",
      name: "Wyciskanie hantli (Lekki skos)",
    });
    expect(session.exercises[0].sets).toEqual([
      { reps: 6, weight: 62.5, completed: true },
      { reps: 6, weight: 62.5, completed: true },
    ]);
  });

  it("konflikt tej samej serii: wygrywa ostatnie zdarzenie po timestamp", () => {
    const raw = validPayload();
    raw.events = [
      { id: "a", exerciseId: "ex-1", exerciseName: "Wyciskanie", setIndex: 0, reps: 6, weight: 60, at: NOW - 5000 },
      { id: "b", exerciseId: "ex-1", exerciseName: "Wyciskanie", setIndex: 0, reps: 8, weight: 62.5, at: NOW - 1000 },
    ];
    const session = buildSessionFromEvents(validateIngestPayload(raw)!, "user-1", "dev123", { adhoc: false });
    expect(session.exercises[0].sets).toEqual([{ reps: 8, weight: 62.5, completed: true }]);
  });
});

describe("runGarminIngest (Z125)", () => {
  it("zapisuje sesję pod idempotentnym docId garmin-<deviceId>-<workoutId>", async () => {
    const { deps, saved } = makeDeps();
    const out = await runGarminIngest(deps, "user-1", "dev123", validPayload());
    expect(out).toMatchObject({ ok: true, docId: "garmin-dev123-w-20260720-1", adhoc: false });
    const doc = saved.get("garmin-dev123-w-20260720-1")!;
    expect(doc).toMatchObject({ userId: "user-1", dayId: "day-1", date: "2026-07-20", completed: true });
    expect(doc.durationSec).toBe(3600);
  });

  it("guard jednoczesności: istnieje completed sesja tego dnia planu => zapis jako ad-hoc, zero nadpisania", async () => {
    const { deps, saved } = makeDeps({ hasCompletedSessionForDay: vi.fn(async () => true) });
    const out = await runGarminIngest(deps, "user-1", "dev123", validPayload());
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error("unreachable");
    expect(out.adhoc).toBe(true);
    const doc = saved.get(out.docId)!;
    expect(doc.dayId).not.toBe("day-1");
    expect(String(doc.dayId)).toMatch(/^adhoc-2026-07-20-/);
    expect(String(doc.dayName)).toContain("Garmin");
  });

  it("niepoprawna paczka => invalid, zero zapisu", async () => {
    const { deps, saved } = makeDeps();
    const out = await runGarminIngest(deps, "user-1", "dev123", { nope: 1 });
    expect(out).toEqual({ ok: false, reason: "invalid" });
    expect(saved.size).toBe(0);
  });
});
