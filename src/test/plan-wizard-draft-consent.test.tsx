import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';
import type { TrainingDay } from '@/data/trainingPlan';
import type { OnboardingDraftV1 } from '@/lib/onboarding-draft';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: ({ initialDays }: { initialDays?: TrainingDay[] }) =>
  <div data-testid="restored-custom-plan">{initialDays?.[0].exercises[0].name}</div>,
}));
import { PlanWizard } from '@/components/PlanWizard';

const draft = (custom: boolean): OnboardingDraftV1 => ({
  version: 1, updatedAt: Date.now(), phase: 'preview', wizardStep: 6,
  level: 'intermediate', objective: 'build_muscle', daysPerWeek: 3,
  trainingDays: ['monday', 'wednesday', 'friday'],
  planSource: custom ? 'custom' : 'browsed',
  ...(!custom ? { templateId: planTemplates[0].id } : {}),
  reviewDays: [{ id: 'custom-day', dayName: 'Day', weekday: 'monday', focus: 'Strength',
    exercises: [{ id: 'custom-exercise', name: 'Kept exercise', sets: '3 × 8', instructions: [] }],
  }],
});
const mount = (custom: boolean, record = vi.fn(async () => undefined)) => render(
  <LanguageProvider><UnitProvider><PlanWizard
    showWelcome legalConsent initialDraft={draft(custom)} onLegalConsent={record}
    confirmLabelKey="newplan.toReview" onConfirm={vi.fn()}
  /></UnitProvider></LanguageProvider>,
);
const acceptRequired = () => {
  fireEvent.click(screen.getByTestId('ob-personalization-next'));
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('ob-legal-submit'));
};
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('draft cannot bypass current required consents', () => {
  it.each([true, false])('a %s custom draft starts at legal entry while preserving its answers', custom => {
    mount(custom);
    expect(screen.getByTestId('ob-personalization-next')).toBeInTheDocument();
    expect(screen.queryByTestId('restored-custom-plan')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ob-start-cta')).not.toBeInTheDocument();
  });

  it('required acceptance without Health returns access to the complete custom draft', async () => {
    const record = vi.fn(async () => undefined);
    mount(true, record);
    acceptRequired();
    fireEvent.click(await screen.findByRole('button', { name: /Następny krok/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ułóż własny plan' }));
    expect(screen.getByTestId('restored-custom-plan')).toHaveTextContent('Kept exercise');
    expect(record).toHaveBeenCalledWith({ terms: true, privacy: true, health: false, marketing: false });
  });
});
