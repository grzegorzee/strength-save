// Krok 6 przełożenia treningu: parity resolvera web<->functions (wzorzec
// cross-platform-contract-fixture / garmin-parity). TA SAMA tabela przypadków
// przechodzi przez resolver webowy i lustrzany resolver funkcyjny — wyniki
// muszą być identyczne, inaczej zegarek Garmin pokaże inny dzień niż telefon.
import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/cross-platform/schedule-overrides-v1.json';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { resolvePlannedGarminDay, type GarminPlanDay } from '../../functions/src/garmin-day';
import type { TrainingDay } from '@/data/trainingPlan';

const webPlanDays = fixture.planDays as TrainingDay[];
const garminPlanDays = fixture.planDays as GarminPlanDay[];

describe('parity resolvera web<->functions (wspólny fixture)', () => {
  it.each(fixture.cases)('$name', ({ date, overrides, expected }) => {
    const web = resolvePlannedDay(date, webPlanDays, overrides as ScheduleOverrides);
    const garmin = resolvePlannedGarminDay(date, garminPlanDays, overrides as ScheduleOverrides);
    expect(web?.id ?? null).toBe(expected);
    expect(garmin?.id ?? null).toBe(expected);
    expect(garmin?.id ?? null).toBe(web?.id ?? null);
  });

  it('kontrakt fixture: wersja i komplet reguł', () => {
    expect(fixture.contract).toBe('strength-save-schedule-overrides');
    expect(fixture.contractVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThanOrEqual(14);
  });
});
