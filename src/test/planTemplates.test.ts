import { describe, expect, it } from 'vitest';
import { planTemplates, getPlanTemplateById, getRecommendedPlan } from '@/data/planTemplates';
import { exerciseLibrary, findLibraryExercise } from '@/data/exerciseLibrary';
import { parseDistanceRange, parseRepRange } from '@/lib/exercise-utils';
import { getTrackingType } from '@/lib/set-tracking';

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

  // T6 (2026-09-29): 16 nowych szablonów, sanie/spacery na dystans.
  it('T6: katalog ma 41 szablonów, w tym 16 nowych', () => {
    expect(planTemplates).toHaveLength(41);
    for (const id of ['tpl-fatloss-3', 'tpl-home-db-3', 'tpl-glutes-4', 'tpl-strength-2', 'tpl-beginner-ul-4', 'tpl-athletic-3', 'tpl-home-db-4', 'tpl-fatloss-2', 'tpl-fatloss-5', 'tpl-strength-ul-4', 'tpl-strength-6', 'tpl-glutes-2', 'tpl-health-50-2', 'tpl-kettlebell-3', 'tpl-express-3', 'tpl-travel-2']) {
      expect(getPlanTemplateById(id), id).toBeTruthy();
    }
  });

  it('T6: zapis w metrach tylko przy ćwiczeniach ciężar+dystans; metry to nie powtórzenia', () => {
    const rows = planTemplates.flatMap((tpl) => tpl.days.flatMap((d) => d.exercises.map((e) => ({ tpl, e }))));
    const distanceRows = rows.filter(({ e }) => parseDistanceRange(e.sets));
    expect(distanceRows.length).toBeGreaterThan(0);
    for (const { tpl, e } of distanceRows) {
      const lib = findLibraryExercise(e.name);
      expect(lib && getTrackingType(lib), `${tpl.id}: ${e.name} "${e.sets}"`).toBe('weight_distance_duration');
      expect(parseRepRange(e.sets).isMax, `${tpl.id}: ${e.name}`).toBe(true);
    }
    // Pchanie sań w planie (sanie -> dystans).
    expect(distanceRows.some(({ e }) => e.name === 'Pchanie sań (Sled Push)' && e.sets === '6 x 20 m')).toBe(true);
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

  // T6 (F7, 2026-09-29): początkujący nie dostaje ćwiczeń z ciałem podpartym
  // na rękach/przedramionach ani podnoszonym masą ciała (plank, pompki z podłogi,
  // podciąganie bez asysty, dipy, zwisy...). Kontrakt obejmuje KAŻDY szablon
  // beginner, także przyszłe (flaga requiresBodyweightSupport w bibliotece).
  it('F7: żaden szablon beginner nie zawiera ćwiczenia z requiresBodyweightSupport', () => {
    const violations = planTemplates
      .filter((tpl) => tpl.level === 'beginner')
      .flatMap((tpl) => tpl.days.flatMap((d) => d.exercises
        .filter((e) => findLibraryExercise(e.name)?.requiresBodyweightSupport)
        .map((e) => `${tpl.id} ${d.id}: ${e.name}`)));
    expect(violations).toEqual([]);
  });

  it('F7: poprawki beginner zachowują id szablonów, liczbę dni i ćwiczeń', () => {
    const shape = (id: string) => {
      const tpl = getPlanTemplateById(id)!;
      return { days: tpl.days.length, exercises: tpl.days.map((d) => d.exercises.length) };
    };
    expect(shape('tpl-fullbody-2')).toEqual({ days: 2, exercises: [5, 5] });
    expect(getPlanTemplateById('tpl-fullbody-2')!.days[0].exercises.map((e) => e.name)).toContain('Dead Bug (Robak - Brzuch)');
    expect(getPlanTemplateById('tpl-strength-5x5')!.days.flatMap((d) => d.exercises.map((e) => e.name)))
      .toEqual(expect.arrayContaining(['Modlitewnik (Cable Crunch)', 'Reverse Crunch na ławce']));
    expect(getPlanTemplateById('tpl-six-lifts-3')!.days.every((d) => d.exercises.some((e) => e.name === 'Ściąganie drążka neutralnym chwytem'))).toBe(true);
  });

  it('F7: kalistenika (drążek, poręcze, pompki) przechodzi na intermediate, serie czasowe 45 s', () => {
    const cal = getPlanTemplateById('tpl-calisthenics-3')!;
    expect(cal.level).toBe('intermediate');
    const timed = cal.days.flatMap((d) => d.exercises).filter((e) => /s$/.test(e.sets));
    expect(timed.length).toBeGreaterThan(0);
    for (const e of timed) expect(e.sets).toBe('3 x 45s');
  });
});
