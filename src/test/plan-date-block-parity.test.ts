// F2 (2026-09-29): parity resolvera blokad dnia web<->functions (wzorzec
// schedule-overrides-parity). Push przypomnienia (functions) i Dashboard
// (web) muszą zgodnie odpowiadać, czy data jest dniem treningowym.
import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/cross-platform/plan-date-block-v1.json';
import { plannedDateBlockReason, type PlannedDateBlockContext } from '@/lib/plan-date-block';
import { plannedDateBlockReason as functionsReason } from '../../functions/src/plan-date-block';

describe('parity plannedDateBlockReason web<->functions (wspólny fixture)', () => {
  it.each(fixture.cases)('$name', ({ date, context, expected }) => {
    const web = plannedDateBlockReason(date, context as PlannedDateBlockContext);
    const fn = functionsReason(date, context as PlannedDateBlockContext);
    expect(web).toBe(expected);
    expect(fn).toBe(expected);
  });

  it('kontrakt fixture: wersja i komplet reguł', () => {
    expect(fixture.contract).toBe('strength-save-plan-date-block');
    expect(fixture.contractVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThanOrEqual(12);
  });
});
