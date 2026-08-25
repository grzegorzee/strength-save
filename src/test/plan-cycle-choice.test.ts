import { describe, expect, it } from 'vitest';
import { buildPlanCycleChoice, PLAN_CYCLE_CHOICE_VERSION } from '@/lib/plan-cycle-choice';
import { sanitizePlanCycleChoice } from '@/lib/firestore-doc-guards';

// WP-6 (X33): odpowiedzi z kreatora (PlanWizardChoice) -> plan_cycles.choice.
// Czysta funkcja: pola opcjonalne bez wartosci NIE powstaja (Firestore odrzuca
// undefined), chosenAt = przekazane "teraz", entry rozroznia onboarding / replan.

const NOW = new Date('2026-08-25T10:30:00.000Z');

const wizardChoice = {
  level: 'intermediate' as const,
  objective: 'build_muscle' as const,
  daysPerWeek: 3,
  trainingDays: ['monday', 'wednesday', 'friday'] as const,
  planSource: 'recommended' as const,
  templateId: 'tpl-fullbody-3',
  recommendedTemplateId: 'tpl-fullbody-3',
  planName: 'Mój plan',
};

describe('buildPlanCycleChoice (WP-6, X33)', () => {
  it('pelny wybor z kreatora -> kontrakt choice v1 z chosenAt = teraz i entry', () => {
    expect(buildPlanCycleChoice(wizardChoice, 'onboarding', NOW)).toEqual({
      version: PLAN_CYCLE_CHOICE_VERSION,
      chosenAt: '2026-08-25T10:30:00.000Z',
      level: 'intermediate',
      objective: 'build_muscle',
      daysPerWeek: 3,
      trainingDays: ['monday', 'wednesday', 'friday'],
      planSource: 'recommended',
      templateId: 'tpl-fullbody-3',
      recommendedTemplateId: 'tpl-fullbody-3',
      planName: 'Mój plan',
      entry: 'onboarding',
    });
    expect(PLAN_CYCLE_CHOICE_VERSION).toBe(1);
  });

  it('plan wlasny bez szablonu i nazwy: pola opcjonalne NIE powstaja, entry replan', () => {
    const out = buildPlanCycleChoice(
      { level: 'beginner', objective: 'fat_loss', daysPerWeek: 2, trainingDays: ['tuesday', 'thursday'], planSource: 'custom' },
      'replan',
      NOW,
    );
    expect(out).toEqual({
      version: 1,
      chosenAt: '2026-08-25T10:30:00.000Z',
      level: 'beginner',
      objective: 'fat_loss',
      daysPerWeek: 2,
      trainingDays: ['tuesday', 'thursday'],
      planSource: 'custom',
      entry: 'replan',
    });
    expect(Object.values(out).some((value) => value === undefined)).toBe(false);
  });

  it('fallbacki jak w onboardingAnswers: brak planSource -> recommended/custom po templateId, brak trainingDays -> []', () => {
    expect(buildPlanCycleChoice({ level: 'advanced', objective: 'peak_strength', daysPerWeek: 4, templateId: 'tpl-x' }, 'replan', NOW))
      .toMatchObject({ planSource: 'recommended', trainingDays: [], templateId: 'tpl-x' });
    expect(buildPlanCycleChoice({ level: 'advanced', objective: 'peak_strength', daysPerWeek: 4 }, 'replan', NOW))
      .toMatchObject({ planSource: 'custom', trainingDays: [] });
  });

  it('planName: trim + max 60, pusty = brak pola', () => {
    expect(buildPlanCycleChoice({ ...wizardChoice, planName: `  ${'a'.repeat(70)} ` }, 'onboarding', NOW).planName)
      .toBe('a'.repeat(60));
    expect(buildPlanCycleChoice({ ...wizardChoice, planName: '   ' }, 'onboarding', NOW)).not.toHaveProperty('planName');
  });

  it('roundtrip: wynik przechodzi sanitizer hydracji bez zmian (ksztalt = produkcja)', () => {
    const built = buildPlanCycleChoice(wizardChoice, 'onboarding', NOW);
    expect(sanitizePlanCycleChoice(built)).toEqual(built);
    const minimal = buildPlanCycleChoice({ level: 'beginner', objective: 'athletic', daysPerWeek: 5 }, 'replan', NOW);
    expect(sanitizePlanCycleChoice(minimal)).toEqual(minimal);
  });
});
