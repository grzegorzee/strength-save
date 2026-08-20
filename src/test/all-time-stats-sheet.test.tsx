import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

// Z216: sheet importuje fetchWorkoutRange — mock odcina inicjalizację firebase w jsdom.
vi.mock('@/lib/workout-read-store', () => ({
  fetchWorkoutRange: vi.fn(async () => []),
}));
import { fetchWorkoutRange } from '@/lib/workout-read-store';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { AllTimeStatsSheet } from '@/components/AllTimeStatsSheet';
import type { WorkoutSession } from '@/types';

// Z158: kafle tekstowe (ulubione ćwiczenie, "Trenujesz od") pełna szerokość +
// zawijanie zamiast ucinania "..." — user nie widział własnego ulubionego ćwiczenia.

const workout = (id: string, date: string): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{
    exerciseId: 'ex-incline',
    name: 'Wyciskanie hantla po skosie w górę',
    sets: [{ reps: 8, weight: 30, completed: true }],
  }],
} as unknown as WorkoutSession);

const renderSheet = (uid?: string) => render(
  <LanguageProvider>
    <UnitProvider>
      <AllTimeStatsSheet
        open
        onOpenChange={() => {}}
        workouts={[workout('w1', '2026-06-01'), workout('w2', '2026-06-08')]}
        uid={uid}
      />
    </UnitProvider>
  </LanguageProvider>,
);

// T23-1: bez uid sheet nie dociąga pełnej historii i liczy tylko okno 'recent'
// listenera (zaniżone "Twoje liczby") — Dashboard musi przekazywać uid jak AppHeader.
describe('AllTimeStatsSheet pełna historia (Z216/T23-1)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    vi.mocked(fetchWorkoutRange).mockClear();
  });

  it('z uid dociąga pełną historię przez fetchWorkoutRange', () => {
    renderSheet('u1');
    expect(fetchWorkoutRange).toHaveBeenCalledWith('u1', expect.anything());
  });

  it('bez uid nie woła fetchWorkoutRange (fallback na okno listenera)', () => {
    renderSheet();
    expect(fetchWorkoutRange).not.toHaveBeenCalled();
  });
});

describe('AllTimeStatsSheet tiles (Z158)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('kafel ulubionego ćwiczenia: pełny tekst, bez truncate, pełna szerokość', () => {
    const view = renderSheet();

    const value = view.getByText('Wyciskanie hantla po skosie w górę');
    expect(value.classList.contains('truncate')).toBe(false);
    expect(value.classList.contains('break-words')).toBe(true);
    expect(value.closest('.col-span-2')).not.toBeNull();
  });

  it('kafel "Trenujesz od" ma pełną szerokość i zawijanie', () => {
    const view = renderSheet();

    const value = view.getByText(/1 czerwca 2026/);
    expect(value.classList.contains('truncate')).toBe(false);
    expect(value.closest('.col-span-2')).not.toBeNull();
  });

  it('kafle liczbowe zostają bez zmian (truncate + tabular-nums)', () => {
    const view = renderSheet();

    const setsLabel = view.getByText('Serie');
    const tile = setsLabel.parentElement as HTMLElement;
    const value = tile.querySelector('p:nth-child(2)') as HTMLElement;
    expect(value.classList.contains('truncate')).toBe(true);
    expect(value.classList.contains('tabular-nums')).toBe(true);
    expect(tile.classList.contains('col-span-2')).toBe(false);
  });
});
