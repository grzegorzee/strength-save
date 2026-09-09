import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', canUseStrava: false, profile: { uid: 'u1', stravaConnected: false } }),
}));
vi.mock('@/lib/activity-read-store', () => ({ fetchAllTimeActivityHistory: vi.fn() }));
import { fetchAllTimeActivityHistory } from '@/lib/activity-read-store';
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

const renderSheet = (uid: string | null = 'u1') => render(
  <LanguageProvider>
    <UnitProvider>
      <AllTimeStatsSheet
        open
        onOpenChange={() => {}}
        workouts={[workout('w1', '2026-06-01'), workout('w2', '2026-06-08')]}
        uid={uid ?? undefined}
      />
    </UnitProvider>
  </LanguageProvider>,
);

beforeEach(() => {
  vi.mocked(fetchAllTimeActivityHistory).mockReset().mockResolvedValue({
    workouts: [workout('w1', '2026-06-01'), workout('w2', '2026-06-08')], activities: [],
  });
});

// All-time figures require an authenticated owner and a complete read.
describe('AllTimeStatsSheet pełna historia (Z216/T23-1)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('z uid dociąga pełną historię na żądanie', async () => {
    const view = renderSheet('u1');
    expect(fetchAllTimeActivityHistory).toHaveBeenCalledWith('u1', expect.anything());
    await view.findByTestId('stat-activities');
  });

  it('bez uid nie czyta ani nie pokazuje danych poprzedniego listenera', () => {
    const view = renderSheet(null);
    expect(fetchAllTimeActivityHistory).not.toHaveBeenCalled();
    expect(view.queryByTestId('stat-workouts')).not.toBeInTheDocument();
  });
});

describe('AllTimeStatsSheet tiles (Z158)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('kafel ulubionego ćwiczenia: pełny tekst, bez truncate, pełna szerokość', async () => {
    const view = renderSheet();

    const value = await view.findByText('Wyciskanie hantla po skosie w górę');
    expect(value.classList.contains('truncate')).toBe(false);
    expect(value.classList.contains('break-words')).toBe(true);
    expect(value.closest('.col-span-2')).not.toBeNull();
  });

  it('kafel "Trenujesz od" ma pełną szerokość i zawijanie', async () => {
    const view = renderSheet();

    const value = await view.findByText(/1 czerwca 2026/);
    expect(value.classList.contains('truncate')).toBe(false);
    expect(value.closest('.col-span-2')).not.toBeNull();
  });

  it('kafle liczbowe zostają bez zmian (truncate + tabular-nums)', async () => {
    const view = renderSheet();

    const setsLabel = await view.findByText('Serie');
    const tile = setsLabel.parentElement as HTMLElement;
    const value = tile.querySelector('p:nth-child(2)') as HTMLElement;
    expect(value.classList.contains('truncate')).toBe(true);
    expect(value.classList.contains('tabular-nums')).toBe(true);
    expect(tile.classList.contains('col-span-2')).toBe(false);
  });
});
