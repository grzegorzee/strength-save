import { describe, expect, it, vi } from "vitest";

import { disconnectStravaForUser, type StravaDisconnectDeps } from "./strava-disconnect";

function makeDeps(overrides: Partial<StravaDisconnectDeps> = {}): StravaDisconnectDeps {
  return {
    deleteActivities: vi.fn().mockResolvedValue(0),
    deleteConnection: vi.fn().mockResolvedValue(undefined),
    clearProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("disconnectStravaForUser", () => {
  it("deletes activities, connection and clears profile", async () => {
    const deps = makeDeps({ deleteActivities: vi.fn().mockResolvedValue(123) });

    const result = await disconnectStravaForUser("user-1", deps);

    expect(result).toEqual({ deletedActivities: 123 });
    expect(deps.deleteActivities).toHaveBeenCalledWith("user-1");
    expect(deps.deleteConnection).toHaveBeenCalledWith("user-1");
    expect(deps.clearProfile).toHaveBeenCalledWith("user-1");
  });

  it("does not clear profile when activity deletion fails (retryable disconnect)", async () => {
    const deps = makeDeps({
      deleteActivities: vi.fn().mockRejectedValue(new Error("firestore down")),
    });

    await expect(disconnectStravaForUser("user-1", deps)).rejects.toThrow("firestore down");
    expect(deps.deleteConnection).not.toHaveBeenCalled();
    expect(deps.clearProfile).not.toHaveBeenCalled();
  });

  it("ignores a failing connection delete and still clears the profile", async () => {
    const deps = makeDeps({
      deleteConnection: vi.fn().mockRejectedValue(new Error("not found")),
    });

    const result = await disconnectStravaForUser("user-1", deps);

    expect(result).toEqual({ deletedActivities: 0 });
    expect(deps.clearProfile).toHaveBeenCalledWith("user-1");
  });
});
