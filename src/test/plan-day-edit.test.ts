import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import {
  addPlanDay,
  removePlanDay,
  duplicatePlanDay,
  setPlanDayWeekday,
  setPlanDayFocus,
} from '@/lib/plan-day-edit';

const day = (id: string, weekday: TrainingDay['weekday'], focus = 'Focus', exercises: TrainingDay['exercises'] = []): TrainingDay => ({
  id,
  dayName: 'Dzień',
  weekday,
  focus,
  exercises,
});

const twoDays = (): TrainingDay[] => [
  day('day-1', 'monday', 'Klatka', [
    { id: 'ex-1-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [{ title: 'T', content: 'C' }] },
    { id: 'ex-1-2', name: 'Rozpiętki', sets: '3 x 10-12', instructions: [] },
  ]),
  day('day-2', 'wednesday', 'Plecy'),
];

describe('plan-day-edit (Z70)', () => {
  it('addPlanDay dodaje dzień z pierwszym wolnym weekday i unikalnym id', () => {
    const result = addPlanDay(twoDays());
    expect(result).toHaveLength(3);
    const added = result[2];
    expect(added.weekday).toBe('tuesday');
    expect(added.exercises).toEqual([]);
    expect(new Set(result.map((d) => d.id)).size).toBe(3);
  });

  it('addPlanDay z jawnym weekday używa go', () => {
    const result = addPlanDay(twoDays(), 'saturday');
    expect(result[2].weekday).toBe('saturday');
  });

  it('addPlanDay przy 6 dniach nie zmienia planu', () => {
    const six = [
      day('day-1', 'monday'), day('day-2', 'tuesday'), day('day-3', 'wednesday'),
      day('day-4', 'thursday'), day('day-5', 'friday'), day('day-6', 'saturday'),
    ];
    expect(addPlanDay(six)).toBe(six);
  });

  it('removePlanDay usuwa wskazany dzień', () => {
    const result = removePlanDay(twoDays(), 'day-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('day-2');
  });

  it('duplicatePlanDay kopiuje treść z nowymi id dnia i ćwiczeń', () => {
    const source = twoDays();
    const result = duplicatePlanDay(source, 'day-1');
    expect(result).toHaveLength(3);
    const copy = result[2];
    expect(copy.id).not.toBe('day-1');
    expect(copy.focus).toBe('Klatka');
    expect(copy.exercises).toHaveLength(2);
    expect(copy.exercises[0].name).toBe('Wyciskanie sztangi na ławce płaskiej');
    expect(copy.exercises[0].sets).toBe('3 x 6-8');
    const allExerciseIds = result.flatMap((d) => d.exercises.map((e) => e.id));
    expect(new Set(allExerciseIds).size).toBe(allExerciseIds.length);
  });

  it('duplicatePlanDay nie współdzieli referencji ze źródłem', () => {
    const source = twoDays();
    const result = duplicatePlanDay(source, 'day-1');
    const copy = result[2];
    copy.exercises[0].sets = '5 x 5';
    expect(source[0].exercises[0].sets).toBe('3 x 6-8');
  });

  it('duplicatePlanDay przy 6 dniach nie zmienia planu', () => {
    const six = [
      day('day-1', 'monday'), day('day-2', 'tuesday'), day('day-3', 'wednesday'),
      day('day-4', 'thursday'), day('day-5', 'friday'), day('day-6', 'saturday'),
    ];
    expect(duplicatePlanDay(six, 'day-1')).toBe(six);
  });

  it('setPlanDayWeekday zmienia weekday i dayName na wolny dzień', () => {
    const result = setPlanDayWeekday(twoDays(), 'day-1', 'friday');
    expect(result[0].weekday).toBe('friday');
    expect(result[0].dayName).toBe('Piątek');
    expect(result[1].weekday).toBe('wednesday');
  });

  it('setPlanDayWeekday z kolizją zamienia weekday między dniami', () => {
    const result = setPlanDayWeekday(twoDays(), 'day-1', 'wednesday');
    expect(result[0].weekday).toBe('wednesday');
    expect(result[1].weekday).toBe('monday');
    expect(result[1].dayName).toBe('Poniedziałek');
  });

  it('setPlanDayFocus ustawia cel dnia', () => {
    const result = setPlanDayFocus(twoDays(), 'day-2', 'Nogi');
    expect(result[1].focus).toBe('Nogi');
    expect(result[0].focus).toBe('Klatka');
  });
});
