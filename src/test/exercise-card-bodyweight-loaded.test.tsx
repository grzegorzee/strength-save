import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

// F6: karta ćwiczenia bodyweight_loaded — kolumna „+kg” OPCJONALNA (puste = MC),
// seria zaliczona przy samych powtórzeniach, POPRZ. jako MC / +kg.

vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: 'test-uid' }) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
});

const pullUp: Exercise = { id: 'ex-pull', name: 'Podciąganie na drążku', sets: '4 x 6-8', instructions: [] };

const renderCard = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => {
  const onSetsChange = vi.fn();
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <ExerciseCard
            exercise={pullUp}
            index={1}
            isBodyweight
            trackingType="bodyweight_loaded"
            onSetsChange={onSetsChange}
            {...props}
          />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  return { ...view, card: view.container.querySelector('.exercise-card') as HTMLElement, onSetsChange };
};

const lastSets = (spy: ReturnType<typeof vi.fn>): SetData[] => spy.mock.calls.at(-1)?.[1] as SetData[];

describe('ExerciseCard — bodyweight_loaded (F6)', () => {
  it('ma kolumnę +kg obok powtórzeń, pole puste z placeholderem MC', () => {
    const { card } = renderCard({ savedSets: [{ reps: 0, weight: 0, completed: false }] });
    expect(within(card).getAllByText('+kg').length).toBeGreaterThan(0);
    const loadInput = within(card).getByLabelText(/Dociążenie w kg/) as HTMLInputElement;
    expect(loadInput.value).toBe('');
    expect(loadInput.placeholder).toBe('MC');
  });

  it('seria bez kg (sama masa ciała) jest zaliczana', () => {
    const { card, onSetsChange } = renderCard({ savedSets: [{ reps: 8, weight: 0, completed: false }] });
    fireEvent.click(within(card).getAllByRole('button', { name: /^Zaznacz serię jako zrobioną/ })[0]);
    expect(lastSets(onSetsChange)[0]).toMatchObject({ reps: 8, weight: 0, completed: true });
    expect(within(card).queryByText(/Wpisz/)).toBeNull();
  });

  it('dociążenie +10 kg zostaje zapisane jako weight (nie zerowane)', () => {
    const { card, onSetsChange } = renderCard({ savedSets: [{ reps: 6, weight: 0, completed: false }] });
    const loadInput = within(card).getByLabelText(/Dociążenie w kg/) as HTMLInputElement;
    fireEvent.change(loadInput, { target: { value: '10' } });
    fireEvent.blur(loadInput);
    expect(lastSets(onSetsChange)[0]).toMatchObject({ reps: 6, weight: 10 });
    fireEvent.click(within(card).getAllByRole('button', { name: /^Zaznacz serię jako zrobioną/ })[0]);
    expect(lastSets(onSetsChange)[0]).toMatchObject({ reps: 6, weight: 10, completed: true });
  });

  it('POPRZ.: MC dla serii bez dociążenia, +kg dla dociążonej', () => {
    const { card } = renderCard({
      savedSets: [{ reps: 0, weight: 0, completed: false }, { reps: 0, weight: 0, completed: false }],
      previousSets: [{ reps: 8, weight: 0, completed: true }, { reps: 6, weight: 10, completed: true }],
    });
    expect(card.textContent).toContain('MC');
    expect(card.textContent).toMatch(/\+10\s*×\s*6|\+10×6/);
  });

  it('pusta seria przy odhaczeniu adoptuje poprzednie dociążenie (nie masę ciała)', () => {
    const { card, onSetsChange } = renderCard({
      savedSets: [{ reps: 0, weight: 0, completed: false }],
      previousSets: [{ reps: 6, weight: 10, completed: true }],
    });
    fireEvent.click(within(card).getAllByRole('button', { name: /^Zaznacz serię jako zrobioną/ })[0]);
    expect(lastSets(onSetsChange)[0]).toMatchObject({ reps: 6, weight: 10, completed: true });
  });
});

describe('ExerciseCard — niezmienniki innych typów', () => {
  it('bodyweight_reps (Dead Bug) nadal bez kolumny kg', () => {
    const { card } = renderCard({
      exercise: { id: 'ex-db', name: 'Dead Bug (Robak - Brzuch)', sets: '3 x 10', instructions: [] },
      trackingType: 'bodyweight_reps',
      savedSets: [{ reps: 0, weight: 0, completed: false }],
    });
    expect(within(card).queryAllByText('+kg')).toHaveLength(0);
    expect(within(card).queryByLabelText(/Dociążenie/)).toBeNull();
  });

  it('assisted_bodyweight: podpowiedź „mniej asysty = trudniej”', () => {
    const { card } = renderCard({
      exercise: { id: 'ex-ad', name: 'Dipy na maszynie (Assisted Dip Machine)', sets: '3 x 8', instructions: [] },
      isBodyweight: false,
      trackingType: 'assisted_bodyweight',
      savedSets: [{ reps: 0, weight: 0, completed: false }],
    });
    expect(card.textContent).toContain('Mniej asysty = trudniej');
  });
});
