import { describe, expect, it } from 'vitest';
import { planTemplates, getPlanTemplateById, getRecommendedPlan } from '@/data/planTemplates';
import { exerciseLibrary } from '@/data/exerciseLibrary';

const libraryNames = new Set(exerciseLibrary.map((e) => e.name));
const validWeekdays = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

describe('planTemplates', () => {
  it('has at least one template', () => {
    expect(planTemplates.length).toBeGreaterThan(0);
  });

  it('library-sourced templates only use exercises from the library', () => {
    const unknown: string[] = [];
    for (const tpl of planTemplates) {
      if (tpl.source === 'imported') continue; // imported plans may use custom exercises
      for (const d of tpl.days) {
        for (const e of d.exercises) {
          if (!libraryNames.has(e.name)) unknown.push(`${tpl.id} → ${e.name}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it('daysPerWeek matches number of days', () => {
    for (const tpl of planTemplates) {
      expect(tpl.days.length).toBe(tpl.daysPerWeek);
    }
  });

  it('uses valid weekdays and sequential day ids', () => {
    for (const tpl of planTemplates) {
      tpl.days.forEach((d, i) => {
        expect(validWeekdays.has(d.weekday)).toBe(true);
        expect(d.id).toBe(`day-${i + 1}`);
      });
    }
  });

  it('all exercise ids are globally unique', () => {
    const ids = planTemplates.flatMap((t) => t.days.flatMap((d) => d.exercises.map((e) => e.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every exercise has a non-empty sets string', () => {
    for (const tpl of planTemplates) {
      for (const d of tpl.days) {
        for (const e of d.exercises) {
          expect(e.sets.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('getPlanTemplateById resolves known ids and returns undefined otherwise', () => {
    expect(getPlanTemplateById(planTemplates[0].id)?.id).toBe(planTemplates[0].id);
    expect(getPlanTemplateById('nope')).toBeUndefined();
  });

  it('getRecommendedPlan respektuje wybraną liczbę dni (krok 4 = krok 5)', () => {
    // Częstotliwość to twardy priorytet: rekomendacja MUSI mieć tyle dni co wybór usera.
    for (const days of [3, 4, 5]) {
      expect(getRecommendedPlan('build_muscle', 'beginner', days).daysPerWeek).toBe(days);
      expect(getRecommendedPlan('peak_strength', 'advanced', days).daysPerWeek).toBe(days);
      expect(getRecommendedPlan('fat_loss', 'intermediate', days).daysPerWeek).toBe(days);
    }
  });

  it('szablon 6-dniowy PPL×2 istnieje: wybór 6 dni daje plan 6-dniowy (Z72)', () => {
    const plan = getRecommendedPlan('build_muscle', 'intermediate', 6);
    expect(plan.days.length).toBe(6);
    expect(plan.daysPerWeek).toBe(6);
  });

  it('przy tej samej częstotliwości preferuje dopasowanie celu', () => {
    // Wśród planów 4-dniowych: peak_strength → plan o objective peak_strength.
    expect(getRecommendedPlan('peak_strength', 'advanced', 4).objective).toBe('peak_strength');
    expect(getRecommendedPlan('fat_loss', 'intermediate', 4).objective).toBe('fat_loss');
  });
});
