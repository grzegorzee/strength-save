import { describe, expect, it, vi } from "vitest";
import { runGarminIngest, type GarminIngestDeps } from "./garmin-ingest";

const NOW = 1_786_291_200_000;

describe("Android -> Garmin -> web sequence (X25/Z228)", () => {
  it("keeps the Android canonical doc, drains an offline Garmin batch once and exposes one web history", async () => {
    const saved = new Map<string, Record<string, unknown>>([["android-session-1", {
      id: "android-session-1",
      userId: "uid-tech",
      dayId: "day-android",
      date: "2026-08-10",
      completed: false,
      revision: 3,
      updatedAt: NOW - 4_000,
      exercises: [{
        exerciseId: "squat",
        name: "Back squat",
        sets: [
          {
            reps: 5, weight: 100, completed: true,
            updatedAt: NOW - 2_000, updatedEventId: "phone-z",
          },
          { reps: 0, weight: 0, completed: false, updatedAt: NOW - 4_000 },
        ],
      }],
    }]]);
    const deps: GarminIngestDeps = {
      findCanonicalSession: vi.fn(async (_uid, date, dayId) => {
        const found = [...saved.entries()].find(([, doc]) => doc.date === date && doc.dayId === dayId);
        return found ? { docId: found[0], doc: found[1] } : null;
      }),
      saveWorkout: vi.fn(async (docId, doc) => { saved.set(docId, doc); }),
      now: () => NOW,
    };
    const offlineBatch = {
      protocolVersion: 1,
      workoutId: "android-session-1",
      sessionId: "android-session-1",
      date: "2026-08-10",
      dayId: "day-android",
      startedAt: NOW - 900_000,
      finishedAt: NOW,
      events: [
        {
          id: "garmin-a", eventId: "garmin-a", exerciseId: "squat", exerciseName: "Back squat",
          setIndex: 0, reps: 5, weight: 97.5, at: NOW - 2_000,
        },
        {
          id: "garmin-set-1", eventId: "garmin-set-1", exerciseId: "squat", exerciseName: "Back squat",
          setIndex: 1, reps: 5, weight: 102.5, at: NOW - 1_000,
        },
      ],
    };

    // Offline: only Garmin Storage owns the batch; cloud/web still has one Android doc.
    expect(deps.saveWorkout).not.toHaveBeenCalled();
    expect([...saved.keys()]).toEqual(["android-session-1"]);

    const first = await runGarminIngest(deps, "uid-tech", "garmin-device-1", offlineBatch);
    const retryAfterLostAck = await runGarminIngest(deps, "uid-tech", "garmin-device-1", offlineBatch);
    expect(first).toMatchObject({ ok: true, docId: "android-session-1", merged: true });
    expect(retryAfterLostAck).toMatchObject({ ok: true, docId: "android-session-1", merged: true });
    expect(deps.saveWorkout).toHaveBeenCalledTimes(1);
    expect([...saved.keys()]).toEqual(["android-session-1"]);

    const webHistory = saved.get("android-session-1")!;
    expect(webHistory).toMatchObject({ completed: true, durationSec: 900 });
    expect(webHistory.exercises).toEqual([expect.objectContaining({
      exerciseId: "squat",
      sets: [
        expect.objectContaining({ weight: 100, updatedEventId: "phone-z" }),
        expect.objectContaining({ weight: 102.5, updatedEventId: "garmin-set-1" }),
      ],
    })]);
  });
});
