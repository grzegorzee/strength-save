import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

vi.mock('@/components/PlanDaysEditor', () => ({
  PlanDaysEditor: ({ days, onDaysChange }: { days: TrainingDay[]; onDaysChange: (days: TrainingDay[]) => void }) => (
    <>
      <div data-testid="builder-days">
        {days.flatMap((day) => day.exercises.map((exercise) => exercise.name)).join(',')}
      </div>
      <button type="button" onClick={() => onDaysChange(CUSTOM_DAYS)}>LOAD-CUSTOM-DAYS</button>
    </>
  ),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanBuilder } from '@/components/PlanBuilder';
import { PlanWizard } from '@/components/PlanWizard';

const DRAFT_KEY = 'ss-plan-builder-draft_test-user';
const CUSTOM_DAYS: TrainingDay[] = [{
  id: 'custom-day-1',
  dayName: 'Dzień własny',
  weekday: 'monday',
  focus: 'Nogi',
  exercises: [{
    id: 'custom-exercise-1',
    name: 'Goblet Squat',
    sets: '3 × 10',
    instructions: [],
  }],
}];

const withLanguage = (node: React.ReactNode) => (
  <LanguageProvider><UnitProvider>{node}</UnitProvider></LanguageProvider>
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  cleanup();
});

describe('PlanBuilder draft recovery', () => {
  it('P0: submit -> krok 6 -> kill/reload zachowuje ćwiczenia własnego planu', async () => {
    const onSubmit = vi.fn();
    const firstMount = render(withLanguage(
      <PlanBuilder
        initialDays={CUSTOM_DAYS}
        initialDurationWeeks={10}
        draftStorageKey={DRAFT_KEY}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    ));

    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toContain('Goblet Squat'));
    fireEvent.click(screen.getByRole('button', { name: /Dalej do podglądu/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // PlanWizard przechodzi teraz na krok 6. Symulujemy ubicie WKWebView przed
    // finalnym zapisem planu: remount nie dostaje już stanu Reacta.
    firstMount.unmount();
    render(withLanguage(
      <PlanBuilder
        draftStorageKey={DRAFT_KEY}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    ));

    expect(screen.getByTestId('builder-days')).toHaveTextContent('Goblet Squat');
    expect(localStorage.getItem(DRAFT_KEY)).toContain('Goblet Squat');
  });

  it('sekwencja PlanWizard: custom builder -> 6/6 -> remount wraca do buildera z pełnym draftem', async () => {
    const draft = {
      version: 1 as const,
      updatedAt: Date.now(),
      phase: 'wizard' as const,
      wizardStep: 5,
      planSource: 'custom' as const,
      level: 'beginner' as const,
      objective: 'build_muscle' as const,
      daysPerWeek: 4,
    };
    const firstMount = render(withLanguage(
      <PlanWizard
        initialDraft={draft}
        builderDraftKey={DRAFT_KEY}
        confirmLabelKey="newplan.toReview"
        onConfirm={vi.fn()}
      />,
    ));

    fireEvent.click(screen.getByRole('button', { name: /Zacznij od zera/i }));
    fireEvent.click(screen.getByRole('button', { name: 'LOAD-CUSTOM-DAYS' }));
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toContain('Goblet Squat'));
    fireEvent.click(screen.getByRole('button', { name: /Dalej do podglądu/i }));
    expect(screen.getByTestId('ob-start-step')).toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_KEY)).toContain('Goblet Squat');

    firstMount.unmount();
    render(withLanguage(
      <PlanWizard
        initialDraft={draft}
        builderDraftKey={DRAFT_KEY}
        confirmLabelKey="newplan.toReview"
        onConfirm={vi.fn()}
      />,
    ));

    expect(screen.getByTestId('builder-days')).toHaveTextContent('Goblet Squat');
  });

  it('stary przepływ: submit nadal finalizuje focus i przekazuje tygodnie dokładnie raz', () => {
    const onSubmit = vi.fn();
    render(withLanguage(
      <PlanBuilder
        initialDays={[{ ...CUSTOM_DAYS[0], focus: '   ' }]}
        initialDurationWeeks={12}
        draftStorageKey={DRAFT_KEY}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    ));

    fireEvent.click(screen.getByRole('button', { name: /Dalej do podglądu/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith([
      expect.objectContaining({ focus: 'Trening 1', exercises: CUSTOM_DAYS[0].exercises }),
    ], 12);
  });
});
