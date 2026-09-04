import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanDaysEditor } from '@/components/PlanDaysEditor';
import type { TrainingDay } from '@/data/trainingPlan';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), lang: 'pl' }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({ customExercises: [], addCustomExercise: vi.fn() }),
}));
vi.mock('@/components/ExercisePicker', () => ({
  ExercisePicker: () => null,
}));

const day: TrainingDay = {
  id: 'day-1',
  dayName: 'Góra A',
  weekday: 'monday',
  focus: 'Push',
  exercises: [
    { id: 'ex-1', name: 'Wyciskanie sztangi', sets: '4 × 6-8', instructions: [] },
    { id: 'ex-2', name: 'Martwy ciąg', sets: 'AMRAP', instructions: [] },
  ],
};

const renderEditor = (onUpdateSets = vi.fn(), onDaysChange = vi.fn()) => {
  render(
    <PlanDaysEditor
      days={[day]}
      onDaysChange={onDaysChange}
      onAddExercise={() => {}}
      onSwapExercise={() => {}}
      onRemoveExercise={() => {}}
      onMoveExercise={() => {}}
      onUpdateSets={onUpdateSets}
      durationWeeks={12}
      onDurationWeeksChange={() => {}}
    />,
  );
  return { onUpdateSets, onDaysChange };
};

describe('PlanDaysEditor: strukturalna edycja serii (FIX-C)', () => {
  it('stepper zwiększa liczbę serii i zapisuje "5 × 6-8"', () => {
    const { onUpdateSets } = renderEditor();
    fireEvent.click(screen.getByTestId('edit-sets-ex-1'));
    fireEvent.click(screen.getByTestId('sets-count-inc'));
    fireEvent.click(screen.getByTestId('sets-save'));
    expect(onUpdateSets).toHaveBeenCalledWith('day-1', 'ex-1', '5 × 6-8');
  });

  it('stepper nie schodzi poniżej 1 serii', () => {
    const { onUpdateSets } = renderEditor();
    fireEvent.click(screen.getByTestId('edit-sets-ex-1'));
    for (let i = 0; i < 10; i += 1) fireEvent.click(screen.getByTestId('sets-count-dec'));
    fireEvent.click(screen.getByTestId('sets-save'));
    expect(onUpdateSets).toHaveBeenCalledWith('day-1', 'ex-1', '1 × 6-8');
  });

  it('edycja powtórzeń zapisuje nowy zakres', () => {
    const { onUpdateSets } = renderEditor();
    fireEvent.click(screen.getByTestId('edit-sets-ex-1'));
    fireEvent.change(screen.getByTestId('sets-reps-input'), { target: { value: '10-12' } });
    fireEvent.click(screen.getByTestId('sets-save'));
    expect(onUpdateSets).toHaveBeenCalledWith('day-1', 'ex-1', '4 × 10-12');
  });

  it('format bez "N x": fallback do surowego pola tekstowego', () => {
    const { onUpdateSets } = renderEditor();
    fireEvent.click(screen.getByTestId('edit-sets-ex-2'));
    const raw = screen.getByTestId('sets-raw-input');
    fireEvent.change(raw, { target: { value: '3 obwody' } });
    fireEvent.click(screen.getByTestId('sets-save'));
    expect(onUpdateSets).toHaveBeenCalledWith('day-1', 'ex-2', '3 obwody');
  });

  it('anuluj nie zapisuje zmian', () => {
    const { onUpdateSets } = renderEditor();
    fireEvent.click(screen.getByTestId('edit-sets-ex-1'));
    fireEvent.click(screen.getByTestId('sets-count-inc'));
    fireEvent.click(screen.getByTestId('sets-cancel'));
    expect(onUpdateSets).not.toHaveBeenCalled();
  });

  it('na telefonie pełna nazwa i parametry nie konkurują o miejsce z akcjami', () => {
    renderEditor();

    const name = screen.getByTestId('exercise-name-ex-1');
    const prescription = screen.getByTestId('edit-sets-ex-1');
    const actions = screen.getByTestId('exercise-actions-ex-1');

    expect(name).toHaveTextContent('Wyciskanie sztangi');
    expect(name.className).toContain('whitespace-normal');
    expect(name.className).not.toContain('truncate');
    expect(prescription).toHaveTextContent('4 × 6-8');
    expect(actions.className).toContain('border-t');
    expect(screen.getByText(/planbuilder\.exerciseCountFew/)).toBeTruthy();
  });

  it('jedno tapnięcie w widoczną akcję dodaje dokładnie jeden pusty dzień', () => {
    const { onDaysChange } = renderEditor();

    fireEvent.click(screen.getByTestId('add-plan-day'));

    expect(onDaysChange).toHaveBeenCalledTimes(1);
    const nextDays = onDaysChange.mock.calls[0][0] as TrainingDay[];
    expect(nextDays).toHaveLength(2);
    expect(nextDays[1]).toMatchObject({ id: 'day-2', weekday: 'tuesday', exercises: [] });
  });
});
