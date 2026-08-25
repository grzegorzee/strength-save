import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';
import { getRecommendedPlan } from '@/data/planTemplates';
import type { TrainingDay } from '@/data/trainingPlan';

// WP-O (X30): PlanWizardChoice niesie jawne odpowiedzi do snapshotu
// onboardingAnswers: trainingDays, recommendedTemplateId i planSource
// (recommended / browsed / custom). Harness wg plan-wizard-protocol.test.tsx.

const CUSTOM_DAY = { id: 'own-1', dayName: 'Własny A', weekday: 'monday', focus: 'FBW', exercises: [] } as TrainingDay;

// Tryb "own": PlanBuilder ciągnie firebase — atrapa od razu oddaje własny plan.
vi.mock('@/components/PlanBuilder', () => ({
  PlanBuilder: ({ onSubmit }: { onSubmit: (days: TrainingDay[], weeks: number) => void }) => (
    <button onClick={() => onSubmit([CUSTOM_DAY], 8)}>BUILDER-SUBMIT</button>
  ),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

// Bez showWelcome wizard startuje na kroku 2 (domyślnie beginner / build_muscle / 4 dni).
const goToStep5 = () => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

const expectedRecommendedId = getRecommendedPlan('build_muscle', 'beginner', 4).id;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('PlanWizardChoice: planSource + odpowiedzi onboardingu (WP-O)', () => {
  it('zatwierdzenie rekomendacji: planSource=recommended, templateId = recommendedTemplateId', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const choice = onConfirm.mock.calls[0][0];
    expect(choice.planSource).toBe('recommended');
    expect(choice.recommendedTemplateId).toBe(expectedRecommendedId);
    expect(choice.templateId).toBe(expectedRecommendedId);
    // Jawna odpowiedź z kroku 4 (4 dni = domyślne pon/wt/czw/pt).
    expect(choice.trainingDays).toEqual(['monday', 'tuesday', 'thursday', 'friday']);
    expect(choice.daysPerWeek).toBe(4);
  });

  it('wybór z Browse plans innego szablonu: planSource=browsed, rekomendacja zapamiętana osobno', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    // Ostatnia karta = najgorsze dopasowanie, na pewno inna niż rekomendacja.
    const headings = screen.getAllByRole('heading', { level: 3 });
    fireEvent.click(headings[headings.length - 1].closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));

    const choice = onConfirm.mock.calls[0][0];
    expect(choice.planSource).toBe('browsed');
    // Wybór z Browse ustawia daysPerWeek szablonu (istniejące zachowanie), więc
    // rekomendacja "w chwili zatwierdzenia" liczy się pod tę liczbę dni.
    expect(choice.recommendedTemplateId).toBe(getRecommendedPlan('build_muscle', 'beginner', choice.daysPerWeek).id);
    expect(choice.templateId).toBeDefined();
    expect(choice.templateId).not.toBe(expectedRecommendedId);
    expect(planTemplates.some((tpl) => tpl.id === choice.templateId)).toBe(true);
  });

  it('własny plan z PlanBuildera: planSource=custom, bez templateId, rekomendacja nadal zapisana', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Ułóż własny/ }));
    fireEvent.click(screen.getByText('BUILDER-SUBMIT'));

    const choice = onConfirm.mock.calls[0][0];
    expect(choice.planSource).toBe('custom');
    expect(choice.templateId).toBeUndefined();
    expect(choice.recommendedTemplateId).toBe(expectedRecommendedId);
    expect(choice.days).toEqual([CUSTOM_DAY]);
    expect(choice.durationWeeks).toBe(8);
  });

  it('niezmiennik: stary kontrakt wyboru (days/durationWeeks/startDate/level/objective/daysPerWeek) bez zmian', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5();
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));

    const choice = onConfirm.mock.calls[0][0];
    expect(choice.level).toBe('beginner');
    expect(choice.objective).toBe('build_muscle');
    expect(choice.days.length).toBe(4);
    expect(choice.durationWeeks).toBeGreaterThan(0);
    expect(choice.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
