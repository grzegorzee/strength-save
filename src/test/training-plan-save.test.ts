import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';
import { resolvePlanDaysForSave } from '@/lib/training-plan-save';
import { addPlanDay } from '@/lib/plan-day-edit';
import { assignCycleDayIds } from '@/lib/plan-cycle-utils';

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
