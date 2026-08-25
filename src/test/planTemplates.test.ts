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

  // WP-PLANS-1 (X27, Task P6): klasyczny FBW w "Browse plans".
  it('szablon "Full Body Workout (FBW)" istnieje: 3 dni, komplet ćwiczeń z biblioteki', () => {
    const fbw = planTemplates.find((t) => t.name === 'Full Body Workout (FBW)');
    expect(fbw).toBeTruthy();
    expect(fbw!.daysPerWeek).toBe(3);
    expect(fbw!.days).toHaveLength(3);
    expect(fbw!.durationWeeks).toBe(12);
    for (const d of fbw!.days) {
      expect(d.exercises.length).toBeGreaterThanOrEqual(5);
      for (const e of d.exercises) {
        expect(libraryNames.has(e.name), `${d.id} → ${e.name}`).toBe(true);
      }
    }
  });

  // Niezmiennik (reguła 5 CLAUDE.md): nowy szablon nie podmienia rekomendacji
  // istniejącego przepływu (remis score rozstrzyga pozycja w tablicy).
  it('FBW nie zmienia rekomendacji: build_muscle/intermediate/3 dni nadal daje Balanced Builder', () => {
    expect(getRecommendedPlan('build_muscle', 'intermediate', 3).id).toBe('tpl-fullbody-3');
  });

  it('getPlanTemplateById resolves known ids and returns undefined otherwise', () => {
    expect(getPlanTemplateById(planTemplates[0].id)?.id).toBe(planTemplates[0].id);
    expect(getPlanTemplateById('nope')).toBeUndefined();
  });

  it('getRecommendedPlan respektuje wybraną liczbę dni (krok 4 = krok 5)', () => {
    // Częstotliwość to twardy priorytet: rekomendacja MUSI mieć tyle dni co wybór usera.
    // X31 H2: przywrócone po regresji WP-O (X30 pozwalał celowi przesunąć dni o ±1,
    // user z realnego konta wybrał redukcję + 3 dni i dostał 4-dniowy plan).
    for (const days of [2, 3, 4, 5, 6]) {
      expect(getRecommendedPlan('build_muscle', 'beginner', days).daysPerWeek).toBe(days);
      expect(getRecommendedPlan('peak_strength', 'advanced', days).daysPerWeek).toBe(days);
      expect(getRecommendedPlan('fat_loss', 'intermediate', days).daysPerWeek).toBe(days);
      expect(getRecommendedPlan('athletic', 'beginner', days).daysPerWeek).toBe(days);
    }
  });

  it('fat_loss ma w katalogu jeden szablon (4 dni): rekomendowany TYLKO przy wyborze 4 dni', () => {
    expect(getRecommendedPlan('fat_loss', 'intermediate', 4).id).toBe('tpl-lean-engine-4');
    expect(getRecommendedPlan('fat_loss', 'intermediate', 3).id).not.toBe('tpl-lean-engine-4');
    expect(getRecommendedPlan('fat_loss', 'intermediate', 5).id).not.toBe('tpl-lean-engine-4');
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
