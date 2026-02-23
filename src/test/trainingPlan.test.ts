import { describe, it, expect } from 'vitest';
import { getTrainingSchedule, getTodaysTraining, trainingPlan } from '@/data/trainingPlan';

describe('getTrainingSchedule', () => {
  it('generates 36 entries (12 weeks × 3 days)', () => {
    const schedule = getTrainingSchedule(new Date('2026-02-23'));
    expect(schedule).toHaveLength(36);
  });

  it('starts from Monday of the given week', () => {
    // 2026-02-23 is Monday
    const schedule = getTrainingSchedule(new Date('2026-02-23'));
    expect(schedule[0].date.getDay()).toBe(1); // Monday
    expect(schedule[0].dayId).toBe('day-1');
  });

  it('has correct day pattern: Mon, Wed, Fri', () => {
    const schedule = getTrainingSchedule(new Date('2026-02-23'));
    // First week
    expect(schedule[0].date.getDay()).toBe(1); // Mon
    expect(schedule[1].date.getDay()).toBe(3); // Wed
    expect(schedule[2].date.getDay()).toBe(5); // Fri
    expect(schedule[0].dayId).toBe('day-1');
    expect(schedule[1].dayId).toBe('day-2');
    expect(schedule[2].dayId).toBe('day-3');
  });

  it('goes back to Monday when starting from Wednesday', () => {
    const schedule = getTrainingSchedule(new Date('2026-02-25')); // Wednesday
    expect(schedule[0].date.getDay()).toBe(1); // still Monday
    expect(schedule[0].date.getDate()).toBe(23); // Feb 23
  });

  it('goes back to Monday when starting from Sunday', () => {
    const schedule = getTrainingSchedule(new Date('2026-03-01')); // Sunday
    expect(schedule[0].date.getDay()).toBe(1); // Monday
    expect(schedule[0].date.getDate()).toBe(23); // Feb 23
  });
});

describe('trainingPlan', () => {
  it('has 3 training days', () => {
    expect(trainingPlan).toHaveLength(3);
  });

  it('each day has exercises', () => {
    trainingPlan.forEach(day => {
      expect(day.exercises.length).toBeGreaterThan(0);
    });
  });

  it('each exercise has id, name, sets, instructions', () => {
    trainingPlan.forEach(day => {
      day.exercises.forEach(ex => {
        expect(ex.id).toBeTruthy();
        expect(ex.name).toBeTruthy();
        expect(ex.sets).toBeTruthy();
        expect(ex.instructions).toBeDefined();
        expect(Array.isArray(ex.instructions)).toBe(true);
      });
    });
  });

  it('weekdays are correct', () => {
    expect(trainingPlan[0].weekday).toBe('monday');
    expect(trainingPlan[1].weekday).toBe('wednesday');
    expect(trainingPlan[2].weekday).toBe('friday');
  });
});
