import { describe, expect, it } from 'vitest';
import { planTemplates, getPlanTemplateById } from '@/data/planTemplates';
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
});
