import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanDaysEditor } from '@/components/PlanDaysEditor';
import type { TrainingDay } from '@/data/trainingPlan';

// WP-PLANS-1 (X27, Task P5): długość planu 2-36 tygodni — chipsy [8,10,12,16]
// nadal działają, pole "własna liczba" przyjmuje 2-36, wartości spoza dają
// komunikat walidacji i BRAK zapisu (clamp dopiero na save, nie przy wpisywaniu).

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
  exercises: [{ id: 'ex-1', name: 'Wyciskanie sztangi', sets: '4 × 6-8', instructions: [] }],
};

const renderEditor = (onDurationWeeksChange = vi.fn()) => {
  render(
    <PlanDaysEditor
      days={[day]}
      onDaysChange={() => {}}
      onAddExercise={() => {}}
      onSwapExercise={() => {}}
      onRemoveExercise={() => {}}
      onMoveExercise={() => {}}
      onUpdateSets={() => {}}
      durationWeeks={12}
      onDurationWeeksChange={onDurationWeeksChange}
    />,
  );
  return onDurationWeeksChange;
};

describe('PlanDaysEditor: długość planu 2-36 (WP-PLANS-1)', () => {
  it('chipsy [8,10,12,16] nadal działają', () => {
    const onChange = renderEditor();
    fireEvent.click(screen.getByText('planbuilder.weeksShort:{"n":8}'));
    expect(onChange).toHaveBeenCalledWith(8);
    fireEvent.click(screen.getByText('planbuilder.weeksShort:{"n":16}'));
    expect(onChange).toHaveBeenCalledWith(16);
  });

  it('własna liczba w zakresie 2-36 zapisuje się', () => {
    const onChange = renderEditor();
    fireEvent.change(screen.getByTestId('duration-custom-input'), { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
    expect(screen.queryByTestId('duration-custom-error')).toBeNull();
  });

  it('1 tydzień → komunikat walidacji, brak zapisu', () => {
    const onChange = renderEditor();
    fireEvent.change(screen.getByTestId('duration-custom-input'), { target: { value: '1' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('duration-custom-error')).toBeTruthy();
  });

  it('37 tygodni → komunikat walidacji, brak zapisu', () => {
    const onChange = renderEditor();
    fireEvent.change(screen.getByTestId('duration-custom-input'), { target: { value: '37' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('duration-custom-error')).toBeTruthy();
  });

  it('poprawienie błędnej wartości na poprawną chowa komunikat i zapisuje', () => {
    const onChange = renderEditor();
    const input = screen.getByTestId('duration-custom-input');
    fireEvent.change(input, { target: { value: '37' } });
    expect(screen.getByTestId('duration-custom-error')).toBeTruthy();
    fireEvent.change(input, { target: { value: '36' } });
    expect(onChange).toHaveBeenCalledWith(36);
    expect(screen.queryByTestId('duration-custom-error')).toBeNull();
  });
});
