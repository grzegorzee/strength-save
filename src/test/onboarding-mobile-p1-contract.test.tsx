import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { OnboardingMarketingStep } from '@/components/OnboardingMarketingStep';
import { PlanDaysEditor } from '@/components/PlanDaysEditor';
import { PlanPreview } from '@/components/PlanPreview';
import { PlanStartStep } from '@/components/PlanStartStep';
import type { TrainingDay } from '@/data/trainingPlan';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => params ? `${key}:${JSON.stringify(params)}` : key,
    lang: 'pl',
  }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({ customExercises: [], addCustomExercise: vi.fn() }),
}));
vi.mock('@/components/ExercisePicker', () => ({ ExercisePicker: () => null }));

const days: TrainingDay[] = [{
  id: 'day-1',
  dayName: 'Góra A',
  weekday: 'monday',
  focus: 'Push',
  exercises: [
    { id: 'ex-1', name: 'Wyciskanie sztangi', sets: '4 × 6-8', instructions: [] },
    { id: 'ex-2', name: 'Wiosłowanie', sets: 'AMRAP', instructions: [] },
  ],
}];

const renderStartStep = () => render(
  <PlanStartStep
    name="Mój plan"
    onNameChange={() => {}}
    weeks={12}
    templateWeeks={12}
    onWeeksChange={() => {}}
    firstWorkoutDate="2026-08-27"
    firstWorkoutOptions={['2026-08-27']}
    onFirstWorkoutChange={() => {}}
    todayISO="2026-08-27"
    objective="build_muscle"
    onStart={() => {}}
    onPreview={() => {}}
    previewLabel="Podgląd"
  />,
);

const renderDaysEditor = () => render(
  <PlanDaysEditor
    days={days}
    onDaysChange={() => {}}
    onAddExercise={() => {}}
    onSwapExercise={() => {}}
    onRemoveExercise={() => {}}
    onMoveExercise={() => {}}
    onUpdateSets={() => {}}
    durationWeeks={12}
    onDurationWeeksChange={() => {}}
  />,
);

describe('mobilny kontrakt pod-ekranów onboardingu', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('pierwszy krok ma ścieżkę wyjścia do zmiany konta', () => {
    const routes = readFileSync('src/components/AuthenticatedApp.tsx', 'utf8');
    const onboarding = readFileSync('src/pages/Onboarding.tsx', 'utf8');

    expect(routes).toContain('<Onboarding onExitBack={onLogout} />');
    expect(onboarding).toContain('onExitBack={onExitBack}');
  });

  it('PlanPreview ma widoczny viewport nad klawiaturą, osobny scroll i bezpieczną strefę akcji', () => {
    render(
      <PlanPreview
        days={days}
        onDaysChange={() => {}}
        onBack={() => {}}
        onConfirm={() => {}}
        onChooseOther={() => {}}
        confirmLabel="Start"
      />,
    );

    expect(screen.getByTestId('plan-preview-screen').className).toContain('h-[calc(100dvh-var(--keyboard-inset,0px))]');
    expect(screen.getByTestId('plan-preview-scroll').className).toContain('overflow-y-auto');
    expect(screen.getByTestId('plan-preview-actions').className).toContain('safe-area-inset-bottom');
    expect(screen.getByLabelText('common.back').className).toEqual(expect.stringContaining('min-h-11'));
    expect(screen.getByLabelText('common.back').className).toEqual(expect.stringContaining('min-w-11'));
  });

  it('krok marketingowy utrzymuje oba wybory nad klawiaturą i respektuje safe area', () => {
    render(<OnboardingMarketingStep onAccept={() => {}} onDecline={() => {}} onBack={() => {}} />);

    expect(screen.getByTestId('marketing-screen').className).toContain('h-[calc(100dvh-var(--keyboard-inset,0px))]');
    expect(screen.getByTestId('marketing-scroll').className).toContain('overflow-y-auto');
    expect(screen.getByTestId('marketing-actions').className).toContain('safe-area-inset-bottom');
    expect(screen.getByTestId('marketing-accept').className).toContain('min-h-12');
    expect(screen.getByTestId('marketing-decline').className).toContain('min-h-12');
  });

  it('Start planu ma przewijalną treść, dolne CTA i pole nazwy z natywnym Done', async () => {
    renderStartStep();

    expect(screen.getByTestId('ob-start-scroll').className).toContain('overflow-y-auto');
    // Widoczna wysokość kroku jest już pomniejszona o keyboard inset. Stopka
    // kotwiczy się do jej dołu, bez podwójnego odejmowania wysokości klawiatury.
    expect(screen.getByTestId('ob-start-actions').className).toContain('bottom-0');
    expect(screen.getByTestId('ob-start-cta').className).toContain('min-h-12');
    const input = screen.getByTestId('ob-plan-name');
    expect(input).toHaveAttribute('enterkeyhint', 'done');
    fireEvent.focus(input);
    await waitFor(() => {
      expect(screen.getByTestId('ob-start-scroll').scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });
    act(() => fireEvent.keyDown(input, { key: 'Enter' }));
    expect(input).not.toHaveFocus();
  });

  it('edytor planu daje inputom recovery po klawiaturze i co najmniej 44 px dla ikon', () => {
    renderDaysEditor();

    const duration = screen.getByTestId('duration-custom-input');
    expect(duration).toHaveAttribute('enterkeyhint', 'done');
    fireEvent.focus(duration);
    expect(duration.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    duration.focus();
    fireEvent.keyDown(duration, { key: 'Enter' });
    expect(duration).not.toHaveFocus();

    const focus = screen.getByPlaceholderText('planbuilder.focusPlaceholderOptional');
    expect(focus).toHaveAttribute('enterkeyhint', 'done');
    fireEvent.focus(focus);
    expect(focus.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center', behavior: 'smooth' });

    for (const label of [
      'daysedit.duplicateDay',
      'daysedit.removeDay',
      'daysedit.moveUp',
      'daysedit.moveDown',
      'planeditor.swapExercise',
      'daysedit.removeExercise',
    ]) {
      const control = screen.getAllByLabelText(label)[0];
      expect(control.className).toContain('min-h-11');
      expect(control.className).toContain('min-w-11');
    }

    fireEvent.click(screen.getByTestId('edit-sets-ex-1'));
    for (const id of ['sets-count-dec', 'sets-count-inc', 'sets-save', 'sets-cancel']) {
      const control = screen.getByTestId(id);
      expect(control.className).toContain('min-h-11');
      expect(control.className).toContain('min-w-11');
    }
    const reps = screen.getByTestId('sets-reps-input');
    expect(reps).toHaveAttribute('enterkeyhint', 'done');
    fireEvent.focus(reps);
    expect(reps.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center', behavior: 'smooth' });
    reps.focus();
    fireEvent.keyDown(reps, { key: 'Enter' });
    expect(reps).not.toHaveFocus();
  });
});
