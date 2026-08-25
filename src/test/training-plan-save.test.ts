import { describe, expect, it, vi } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';
import {
  MAX_PLAN_WEEKS,
  MIN_PLAN_WEEKS,
  clampPlanDurationWeeks,
  resolvePlanDaysForSave,
  saveTrainingPlanWithRevision,
} from '@/lib/training-plan-save';
import { sanitizeTrainingPlanName, sanitizeTrainingPlanStatus } from '@/lib/firestore-doc-guards';
import { addPlanDay } from '@/lib/plan-day-edit';
import { assignCycleDayIds } from '@/lib/plan-cycle-utils';

// WP-PLANS-1 (X27): transakcja zapisu planu na mockach — status i clamp
// durationWeeks muszą przepływać przez transaction.set (align X19 bez zmian).
const transactionMock = vi.hoisted(() => ({
  sets: [] as Array<Record<string, unknown>>,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: 'training_plans/u1' })),
  getDocs: vi.fn(async () => ({ docs: [] })),
  query: vi.fn(),
  where: vi.fn(),
  runTransaction: vi.fn(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    await fn({
      get: vi.fn(async () => ({ exists: () => true, data: () => ({ revision: 0 }) })),
      set: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
        transactionMock.sets.push(payload);
      }),
      update: vi.fn(),
    });
  }),
}));

// Z151: niezmienniki starych przepływów przy zapisie planu (reguła 5 CLAUDE.md).
describe('resolvePlanDaysForSave (Z151)', () => {
  const START = '2026-07-21';
  const activeCycle = () => ({
    startDate: START,
    days: assignCycleDayIds(defaultPlan, START),
  });

  it('resetToDefault przy aktywnym cyklu: dni default dostają id cyklu, nie day-N', () => {
    const result = resolvePlanDaysForSave(defaultPlan, [activeCycle()]);

    expect(result.map(day => day.id)).toEqual(defaultPlan.map((_, index) => `${START}-d${index + 1}`));
    // Treść (ćwiczenia wraz z id) zostaje z planu — twarda zasada 4.
    expect(result.map(day => day.exercises)).toEqual(defaultPlan.map(day => day.exercises));
  });

  it('addPlanDay + zapis przy aktywnym cyklu: nowy dzień w formacie cyklu', () => {
    const alignedDays = assignCycleDayIds(defaultPlan, START);
    const withNewDay = addPlanDay(alignedDays);
    expect(withNewDay[withNewDay.length - 1].id).toMatch(/^day-\d+$/);

    const result = resolvePlanDaysForSave(withNewDay, [activeCycle()]);

    expect(result.slice(0, defaultPlan.length).map(day => day.id))
      .toEqual(alignedDays.map(day => day.id));
    expect(result[result.length - 1].id).toBe(`${START}-d${defaultPlan.length + 1}`);
  });

  it('edycja ćwiczenia w PlanEditor nie zmienia id dnia', () => {
    const alignedDays = assignCycleDayIds(defaultPlan, START);
    const edited: TrainingDay[] = alignedDays.map((day, index) => index === 0
      ? {
        ...day,
        exercises: day.exercises.map((exercise, exIndex) => exIndex === 0
          ? { ...exercise, name: 'Wyciskanie sztangi', sets: '4 x 5' }
          : exercise),
      }
      : day);

    const result = resolvePlanDaysForSave(edited, [activeCycle()]);

    expect(result.map(day => day.id)).toEqual(alignedDays.map(day => day.id));
    expect(result[0].exercises[0].name).toBe('Wyciskanie sztangi');
  });

  it('plan BEZ aktywnego cyklu zostaje przy day-N (zachowanie dotychczasowe)', () => {
    expect(resolvePlanDaysForSave(defaultPlan, [])).toBe(defaultPlan);
    expect(resolvePlanDaysForSave(defaultPlan, [undefined])).toBe(defaultPlan);
  });

  it('cykl bez days/startDate (kształt legacy) nie wyrównuje — plan wchodzi bez zmian', () => {
    expect(resolvePlanDaysForSave(defaultPlan, [{ startDate: '', days: undefined }])).toBe(defaultPlan);
  });
});

// WP-PLANS-1 (X27, Task P1): pole status na training_plans + zakres długości planu.
describe('training plan status + duration bounds (WP-PLANS-1)', () => {
  it('sanitizer: brak pola / śmieci → active, jawne ended → ended', () => {
    expect(sanitizeTrainingPlanStatus(undefined)).toBe('active');
    expect(sanitizeTrainingPlanStatus(null)).toBe('active');
    expect(sanitizeTrainingPlanStatus('garbage')).toBe('active');
    expect(sanitizeTrainingPlanStatus(42)).toBe('active');
    expect(sanitizeTrainingPlanStatus('ended')).toBe('ended');
    expect(sanitizeTrainingPlanStatus('active')).toBe('active');
  });

  it('clampPlanDurationWeeks trzyma zakres 2-36 (stare dane z Firestore też)', () => {
    expect(MIN_PLAN_WEEKS).toBe(2);
    expect(MAX_PLAN_WEEKS).toBe(36);
    expect(clampPlanDurationWeeks(1)).toBe(2);
    expect(clampPlanDurationWeeks(37)).toBe(36);
    expect(clampPlanDurationWeeks(12)).toBe(12);
    expect(clampPlanDurationWeeks(11.6)).toBe(12);
    expect(clampPlanDurationWeeks(Number.NaN)).toBe(12);
  });

  it('saveTrainingPlanWithRevision przepuszcza status przez transakcję i clampuje durationWeeks', async () => {
    transactionMock.sets.length = 0;
    await saveTrainingPlanWithRevision({} as never, {
      userId: 'u1',
      newPlan: defaultPlan,
      expectedRevision: 0,
      durationWeeks: 40,
      startDate: '2026-08-24',
      status: 'ended',
    });

    expect(transactionMock.sets).toHaveLength(1);
    expect(transactionMock.sets[0].status).toBe('ended');
    expect(transactionMock.sets[0].durationWeeks).toBe(36);
  });

  it('saveTrainingPlanWithRevision bez statusu NIE dotyka pola (merge zostawia stare)', async () => {
    transactionMock.sets.length = 0;
    await saveTrainingPlanWithRevision({} as never, {
      userId: 'u1',
      newPlan: defaultPlan,
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-08-24',
    });

    expect(transactionMock.sets).toHaveLength(1);
    expect('status' in transactionMock.sets[0]).toBe(false);
  });
});

// WP-PLANS-2 (X27, Task O1): pole name na training_plans.
describe('training plan name (WP-PLANS-2)', () => {
  it('saveTrainingPlanWithRevision przepuszcza name przez transakcję', async () => {
    transactionMock.sets.length = 0;
    await saveTrainingPlanWithRevision({} as never, {
      userId: 'u1',
      newPlan: defaultPlan,
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-08-24',
      name: 'Mój blok FBW',
    });

    expect(transactionMock.sets).toHaveLength(1);
    expect(transactionMock.sets[0].name).toBe('Mój blok FBW');
  });

  it('bez name pole nie powstaje (merge zostawia starą nazwę)', async () => {
    transactionMock.sets.length = 0;
    await saveTrainingPlanWithRevision({} as never, {
      userId: 'u1',
      newPlan: defaultPlan,
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-08-24',
    });

    expect('name' in transactionMock.sets[0]).toBe(false);
  });

  it('sanitizer nazwy: string trim + max 60, śmieci → null', () => {
    expect(sanitizeTrainingPlanName('  Mój plan  ')).toBe('Mój plan');
    expect(sanitizeTrainingPlanName('x'.repeat(80))).toBe('x'.repeat(60));
    expect(sanitizeTrainingPlanName('')).toBeNull();
    expect(sanitizeTrainingPlanName('   ')).toBeNull();
    expect(sanitizeTrainingPlanName(42)).toBeNull();
    expect(sanitizeTrainingPlanName(undefined)).toBeNull();
  });
});

// X34b: skippedDates (dni tygodnia startu przed pierwszym treningiem) ida w TEJ
// SAMEJ transakcji co plan, nie osobnym updateDoc.
describe('training plan skippedDates (X34b)', () => {
  it('saveTrainingPlanWithRevision przepuszcza skippedDates przez transakcję (jeden set)', async () => {
    transactionMock.sets.length = 0;
    await saveTrainingPlanWithRevision({} as never, {
      userId: 'u1',
      newPlan: defaultPlan,
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-08-24',
      skippedDates: ['2026-08-24', '2026-08-26'],
    });

    expect(transactionMock.sets).toHaveLength(1);
    expect(transactionMock.sets[0].skippedDates).toEqual(['2026-08-24', '2026-08-26']);
    expect(transactionMock.sets[0].startDate).toBe('2026-08-24');
  });

  it('bez skippedDates pole nie powstaje (merge zostawia stare; niezmiennik edycji planu)', async () => {
    transactionMock.sets.length = 0;
    await saveTrainingPlanWithRevision({} as never, {
      userId: 'u1',
      newPlan: defaultPlan,
      expectedRevision: 0,
      durationWeeks: 12,
      startDate: '2026-08-24',
    });

    expect('skippedDates' in transactionMock.sets[0]).toBe(false);
  });
});
