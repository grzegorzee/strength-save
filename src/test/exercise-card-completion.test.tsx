import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

const exercise = (name = 'Wyciskanie sztangi na ławce płaskiej'): Exercise => ({
  id: 'exercise-1',
  name,
  sets: '1 x 8-10',
  instructions: [],
});

const emptySet = (): SetData => ({ reps: 0, weight: 0, completed: false });

const renderCard = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => {
  const onSetsChange = vi.fn();
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <ExerciseCard
            exercise={exercise()}
            index={1}
            savedSets={[emptySet()]}
            onSetsChange={onSetsChange}
            {...props}
          />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  return { onSetsChange };
};

const clickCheck = () => fireEvent.click(screen.getByRole('button', { name: /Zaznacz serię jako zrobioną/i }));

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
});

describe('ExerciseCard — ręczne ukończenie serii wymaga danych', () => {
  it('nie zapisuje pustej serii i pokazuje jasną drogę wyjścia', () => {
    const { onSetsChange } = renderCard();

    clickCheck();

    expect(onSetsChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Wpisz ciężar i powtórzenia, a potem zaznacz serię.');
  });

  it('usuwa błąd po uzupełnieniu pól i pozwala ponowić akcję', () => {
    const { onSetsChange } = renderCard();
    clickCheck();

    fireEvent.change(screen.getByLabelText(/Set 1, kg/i), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText(/Set 1, Powt\./i), { target: { value: '8' } });
    expect(screen.queryByRole('alert')).toBeNull();
    clickCheck();

    const saved = onSetsChange.mock.calls.at(-1)?.[1] as SetData[];
    expect(saved[0]).toMatchObject({ reps: 8, weight: 60, completed: true });
  });

  it('pokazuje ten sam komunikat działania po angielsku', () => {
    localStorage.setItem('app-language', 'en');
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /Mark set as done/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter the weight and reps, then mark the set as done.');
  });

  it('adoptuje poprzedni wynik przed walidacją i kończy serię', () => {
    const { onSetsChange } = renderCard({
      previousSets: [{ reps: 8, weight: 60, completed: true }],
    });

    clickCheck();

    const saved = onSetsChange.mock.calls.at(-1)?.[1] as SetData[];
    expect(saved[0]).toMatchObject({ reps: 8, weight: 60, completed: true });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('pozwala ukończyć serię bodyweight z powtórzeniami i 0 kg', () => {
    const { onSetsChange } = renderCard({
      isBodyweight: true,
      savedSets: [{ reps: 10, weight: 0, completed: false }],
    });

    clickCheck();

    const saved = onSetsChange.mock.calls.at(-1)?.[1] as SetData[];
    expect(saved[0]).toMatchObject({ reps: 10, weight: 0, completed: true });
  });

  it('pozwala ukończyć Przysiady wykroczne z powtórzeniami i 0 kg', () => {
    const { onSetsChange } = renderCard({
      exercise: exercise('Przysiady wykroczne'),
      savedSets: [{ reps: 10, weight: 0, completed: false }],
    });

    clickCheck();

    const saved = onSetsChange.mock.calls.at(-1)?.[1] as SetData[];
    expect(saved[0]).toMatchObject({ reps: 10, weight: 0, completed: true });
  });
});
