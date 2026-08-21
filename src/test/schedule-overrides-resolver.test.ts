// Przełożenie treningu (spec 2026-08-11): kanoniczny resolver data -> dzień planu.
// Tabela przypadków żyje we wspólnym fixture (parity web<->functions, wzorzec
// cross-platform-contract-fixture) — resolver funkcyjny w garmin-day.ts przechodzi
// przez TĘ SAMĄ tabelę w swoim teście.
import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/cross-platform/schedule-overrides-v1.json';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import type { TrainingDay } from '@/data/trainingPlan';

const planDays = fixture.planDays as TrainingDay[];

describe('resolvePlannedDay: wspólny fixture (parity web<->functions)', () => {
  it.each(fixture.cases)('$name', (testCase) => {
    const { date, overrides, expected } = testCase;
    // WP-PLANS-2 (X27): opcjonalny start planu w case — dzień istnieje od startDate.
    const startDate = (testCase as { startDate?: string }).startDate ?? null;
    const resolved = resolvePlannedDay(date, planDays, overrides as ScheduleOverrides, startDate);
    expect(resolved?.id ?? null).toBe(expected);
  });
});

describe('resolvePlannedDay: kontrakt funkcji', () => {
  it('brak mapy overrides (undefined/null) działa jak reguła weekday', () => {
    expect(resolvePlannedDay('2026-08-10', planDays)?.id).toBe('day-1');
    expect(resolvePlannedDay('2026-08-10', planDays, null)?.id).toBe('day-1');
    expect(resolvePlannedDay('2026-08-11', planDays, undefined)).toBeNull();
  });

  it('zwraca dzień z planu przez referencję (bez kopii, bez mutacji wejścia)', () => {
    const overrides: ScheduleOverrides = { '2026-08-11': 'day-1' };
    const resolved = resolvePlannedDay('2026-08-11', planDays, overrides);
    expect(resolved).toBe(planDays[0]);
    expect(overrides).toEqual({ '2026-08-11': 'day-1' });
  });

  it('pusty plan: zawsze null, także z overridem', () => {
    expect(resolvePlannedDay('2026-08-10', [], {})).toBeNull();
    expect(resolvePlannedDay('2026-08-10', [], { '2026-08-10': 'day-1' })).toBeNull();
  });
});
