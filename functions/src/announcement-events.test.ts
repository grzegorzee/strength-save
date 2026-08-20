import { describe, it, expect } from "vitest";
import { buildAnnouncementEvents } from "./announcement-events";

// T15: producent zdarzenia inboxa dla ogłoszeń admina (mirror adminSendPush).
describe("producent zdarzenia inboxa (announcement)", () => {
  const input = { title: "Nowość: eksport CSV", body: "Szczegóły w Analityce.", now: 1755640000000 };

  it("wszystkie uid dostają TEN SAM klucz w jednym broadcast", () => {
    const events = buildAnnouncementEvents(["u1", "u2", "u3"], input);
    expect(events).toHaveLength(3);
    const keys = new Set(events.map((e) => e.event.key));
    expect(keys.size).toBe(1);
    expect(events[0].event.key).toBe("announcement-1755640000000");
    expect(events.map((e) => e.uid)).toEqual(["u1", "u2", "u3"]);
  });

  it("dwa wywołania z różnym now dają różne klucze", () => {
    const first = buildAnnouncementEvents(["u1"], input);
    const second = buildAnnouncementEvents(["u1"], { ...input, now: 1755640005000 });
    expect(first[0].event.key).not.toBe(second[0].event.key);
  });

  it("payload przenosi title/body, deepLink null, typ announcement", () => {
    const [entry] = buildAnnouncementEvents(["u1"], input);
    expect(entry.event.type).toBe("announcement");
    expect(entry.event.payload).toEqual({ title: input.title, body: input.body });
    expect(entry.event.deepLink).toBeNull();
  });

  it("pusta lista uid = zero eventów", () => {
    expect(buildAnnouncementEvents([], input)).toEqual([]);
  });
});
