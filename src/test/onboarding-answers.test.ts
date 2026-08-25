import { describe, expect, it } from 'vitest';
import { buildOnboardingAnswers, ONBOARDING_ANSWERS_VERSION } from '@/lib/onboarding-answers';

// WP-O (X30): snapshot odpowiedzi onboardingu — kompletny dla szablonu,
// bez pól undefined (Firestore odrzuca undefined w updateDoc).

const now = new Date('2026-08-25T10:00:00.000Z');

describe('buildOnboardingAnswers (WP-O)', () => {
  it('szablon z rekomendacji: komplet pól snapshotu', () => {
    const answers = buildOnboardingAnswers({
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 3,
      durationWeeks: 10,
      name: 'Grzegorz',
      trainingDays: ['monday', 'wednesday', 'friday'],
      planSource: 'recommended',
      templateId: 'tpl-fullbody-3',
      recommendedTemplateId: 'tpl-fullbody-3',
      planName: 'Mój plan',
    }, { accentColor: 'indigo', startDate: '2026-08-31', now });

    expect(answers).toEqual({
      version: ONBOARDING_ANSWERS_VERSION,
      completedAt: '2026-08-25T10:00:00.000Z',
      name: 'Grzegorz',
      accentColor: 'indigo',
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 3,
      trainingDays: ['monday', 'wednesday', 'friday'],
      planSource: 'recommended',
      templateId: 'tpl-fullbody-3',
      recommendedTemplateId: 'tpl-fullbody-3',
      durationWeeks: 10,
      startDate: '2026-08-31',
      planName: 'Mój plan',
    });
  });

  it('plan własny bez imienia: pola opcjonalne NIE powstają (zero undefined)', () => {
    const answers = buildOnboardingAnswers({
      level: 'advanced',
      objective: 'athletic',
      daysPerWeek: 4,
      durationWeeks: 8,
      trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
      planSource: 'custom',
      recommendedTemplateId: 'tpl-athletic-4',
    }, { accentColor: 'lime', startDate: '2026-09-07', now });

    expect(answers.planSource).toBe('custom');
    expect('name' in answers).toBe(false);
    expect('templateId' in answers).toBe(false);
    expect('planName' in answers).toBe(false);
    expect(Object.values(answers).some((v) => v === undefined)).toBe(false);
  });

  it('fallback planSource dla starego szkicu bez pola: templateId = recommended, brak = custom', () => {
    const base = { level: 'beginner', objective: 'build_muscle', daysPerWeek: 3, durationWeeks: 8 };
    const opts = { accentColor: 'lime', startDate: '2026-08-31', now };
    expect(buildOnboardingAnswers({ ...base, templateId: 'tpl-fullbody-3' }, opts).planSource).toBe('recommended');
    expect(buildOnboardingAnswers(base, opts).planSource).toBe('custom');
  });

  it('brak trainingDays (stary szkic): pusta tablica zamiast undefined', () => {
    const answers = buildOnboardingAnswers(
      { level: 'beginner', objective: 'build_muscle', daysPerWeek: 3, durationWeeks: 8 },
      { accentColor: 'lime', startDate: '2026-08-31', now },
    );
    expect(answers.trainingDays).toEqual([]);
  });
});
