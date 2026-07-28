import { describe, expect, it } from 'vitest';
import { trainingPlan } from '@/data/trainingPlan';
import { planTemplates } from '@/data/planTemplates';
import { EXERCISE_NAME_EN } from '@/data/exercise-i18n';

// Z156: każda nazwa ćwiczenia, którą może wygenerować plan (domyślny albo szablon),
// MUSI mieć wpis w EXERCISE_NAME_EN — inaczej user w trybie EN widzi polską nazwę
// w analityce, dashboardzie i historii. Test inwentarzowy zostaje na stałe: blokuje
// przyszłe luki przy dodawaniu ćwiczeń/szablonów.
describe('exercise i18n coverage (Z156)', () => {
  it('every exercise name used by the default plan and all templates has an EN entry', () => {
    const usedNames = new Set<string>([
      ...trainingPlan.flatMap((day) => day.exercises.map((ex) => ex.name)),
      ...planTemplates.flatMap((tpl) => tpl.days.flatMap((day) => day.exercises.map((ex) => ex.name))),
    ]);

    const missing = [...usedNames].filter((name) => !(name in EXERCISE_NAME_EN)).sort();

    expect(missing).toEqual([]);
  });
});
