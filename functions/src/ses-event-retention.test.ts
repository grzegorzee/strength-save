import { describe, expect, it } from "vitest";
import {
  EMAIL_EVENT_RETENTION_MS,
  EMAIL_LOG_RETENTION_MS,
  emailEventRetentionCutoffMs,
  emailLogRetentionCutoffMs,
  isEmailEventExpired,
} from "./ses-event-retention";

describe("retencja szczegółowych zdarzeń SES", () => {
  const nowMs = Date.parse("2027-02-16T12:05:00.000Z");

  it("usuwa rekord dokładnie na granicy 180 dni", () => {
    const eventMs = Date.parse("2026-08-20T12:05:00.000Z");
    expect(nowMs - eventMs).toBe(EMAIL_EVENT_RETENTION_MS);
    expect(isEmailEventExpired(eventMs, nowMs)).toBe(true);
  });

  it("nie usuwa rekordu młodszego od 180 dni", () => {
    expect(isEmailEventExpired(nowMs - EMAIL_EVENT_RETENTION_MS + 1, nowMs)).toBe(false);
  });

  it("wyznacza bezpieczną granicę zapytania schedulera", () => {
    expect(emailEventRetentionCutoffMs(nowMs)).toBe(
      Date.parse("2026-08-20T12:05:00.000Z"),
    );
  });

  it("odrzuca nieprawidłowe wartości czasu", () => {
    expect(() => isEmailEventExpired(Number.NaN, nowMs)).toThrow(/timestamp/i);
    expect(() => emailEventRetentionCutoffMs(Number.NaN)).toThrow(/timestamp/i);
  });

  it("wyznacza 24-miesięczną granicę logu i jego treści", () => {
    const twoYearsMs = 730 * 24 * 60 * 60 * 1000;
    expect(EMAIL_LOG_RETENTION_MS).toBe(twoYearsMs);
    expect(emailLogRetentionCutoffMs(nowMs)).toBe(nowMs - twoYearsMs);
  });
});
