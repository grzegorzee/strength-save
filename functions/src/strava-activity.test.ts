import { describe, it, expect } from "vitest";
import {
  activityDateStr,
  diffRefreshableFields,
  mapStravaActivityToDoc,
  type StravaApiActivityInput,
  type StravaActivityDoc,
} from "./strava-activity";

const baseActivity: StravaApiActivityInput = {
  id: 123,
  name: "Morning Run",
  type: "Run",
  start_date: "2026-06-01T05:30:00Z",
  start_date_local: "2026-06-01T07:30:00",
  distance: 10000,
  moving_time: 3000,
  elapsed_time: 3100,
  average_heartrate: 150,
  max_heartrate: 175,
  total_elevation_gain: 80,
  average_speed: 3.3,
  calories: 600,
  description: "easy",
  sport_type: "Run",
  average_cadence: 85,
  trainer: false,
  kudos_count: 4,
};

describe("activityDateStr", () => {
  it("prefers the local date when available", () => {
    expect(activityDateStr(baseActivity)).toBe("2026-06-01");
  });

  it("falls back to UTC start_date when local is missing", () => {
    expect(activityDateStr({ start_date: "2026-06-01T23:30:00Z" })).toBe("2026-06-01");
  });
});

describe("mapStravaActivityToDoc", () => {
  it("maps API fields to the stored doc shape", () => {
    const doc = mapStravaActivityToDoc("user-1", baseActivity, "2026-06-02T00:00:00.000Z");
    expect(doc).toMatchObject({
      userId: "user-1",
      stravaId: 123,
      name: "Morning Run",
      date: "2026-06-01",
      calories: 600,
      kudosCount: 4,
      stravaUrl: "https://www.strava.com/activities/123",
      syncedAt: "2026-06-02T00:00:00.000Z",
    });
  });

  it("normalizes falsy numeric fields to null", () => {
    const doc = mapStravaActivityToDoc("u", { ...baseActivity, calories: 0, distance: undefined }, "t");
    expect(doc.calories).toBeNull();
    expect(doc.distance).toBeNull();
  });
});

describe("diffRefreshableFields", () => {
  const incoming = mapStravaActivityToDoc("u", baseActivity, "2026-06-02T00:00:00.000Z");

  it("returns null for a brand-new activity (no existing data)", () => {
    expect(diffRefreshableFields(undefined, incoming)).toBeNull();
  });

  it("returns null when refreshable fields are unchanged", () => {
    const existing: Partial<StravaActivityDoc> = { ...incoming, syncedAt: "older" };
    expect(diffRefreshableFields(existing, incoming)).toBeNull();
  });

  it("returns only changed fields plus a fresh syncedAt when Strava backfills data", () => {
    const existing: Partial<StravaActivityDoc> = {
      ...incoming,
      description: null, // user typed it later
      calories: null, // computed later by Strava
      kudosCount: 4,
      syncedAt: "older",
    };
    const changes = diffRefreshableFields(existing, incoming);
    expect(changes).toEqual({
      description: "easy",
      calories: 600,
      syncedAt: "2026-06-02T00:00:00.000Z",
    });
  });

  it("detects accumulating kudos as a change", () => {
    const existing: Partial<StravaActivityDoc> = { ...incoming, kudosCount: 1, syncedAt: "older" };
    const changes = diffRefreshableFields(existing, incoming);
    expect(changes).toMatchObject({ kudosCount: 4 });
  });

  it("treats missing existing field as null (no false positive)", () => {
    // existing doc predates a field but incoming is also null -> no change
    const incomingNullCalories = mapStravaActivityToDoc("u", { ...baseActivity, calories: 0 }, "now");
    const existing: Partial<StravaActivityDoc> = { ...incomingNullCalories };
    delete existing.calories;
    existing.syncedAt = "older";
    expect(diffRefreshableFields(existing, incomingNullCalories)).toBeNull();
  });
});
