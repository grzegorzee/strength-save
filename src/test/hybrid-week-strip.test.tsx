import { beforeEach, describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { HybridWeekStrip } from '@/components/HybridWeekStrip';
import { parseLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

// Z148 (X18C): pasek tygodnia, który się tłumaczy — min wysokość słupka, legenda,
// kropki dni planu, własny podpis metryki (zamiast udawania "Planu tygodnia").

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

const strengthWorkout = (date: string, durationSec: number, rpe: number): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'day-1',
  date,
  exercises: [{
    exerciseId: 'ex-1',
    sets: [
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: true },
    ],
    rpe,
  }],
  completed: true,
  durationSec,
  updatedAt: 1,
  revision: 1,
} as unknown as WorkoutSession);

const WEEK_START = parseLocalDate('2026-07-20'); // poniedziałek

const renderStrip = (props: Partial<Parameters<typeof HybridWeekStrip>[0]> = {}) => render(
  <LanguageProvider>
    <HybridWeekStrip
      workouts={[strengthWorkout('2026-07-20', 7200, 8), strengthWorkout('2026-07-21', 60, 5)]}
      activities={[]}
      weekStart={WEEK_START}
      {...props}
    />
  </LanguageProvider>,
);

const stackHeight = (stack: HTMLElement): number => Array.from(stack.children)
  .reduce((sum, child) => sum + (parseFloat((child as HTMLElement).style.height) || 0), 0);

describe('HybridWeekStrip (Z148)', () => {
  it('słupek dnia z totalLoad > 0 ma co najmniej 3 px (koniec znikających dni)', () => {
    const view = renderStrip();
    // Wtorek: mikroskopijne obciążenie względem poniedziałku — przed fixem 0 px.
    const tiny = view.getByTestId('strip-bar-2026-07-21');
    expect(stackHeight(tiny)).toBeGreaterThanOrEqual(3);
    // Dzień bez obciążenia zostaje pusty (zero px).
    const empty = view.getByTestId('strip-bar-2026-07-23');
    expect(stackHeight(empty)).toBe(0);
  });

  it('legenda widoczna w komponencie (siła + cardio), nie tylko w title', () => {
    const view = renderStrip();
    const legend = view.getByTestId('strip-legend');
    expect(within(legend).getByText('Siła')).toBeTruthy();
    expect(within(legend).getByText('Cardio')).toBeTruthy();
  });

  it('dzień z planu ma kropkę pod etykietą, niezależnie od obciążenia', () => {
    const view = renderStrip({ plannedWeekdays: ['monday', 'wednesday'] });
    // Poniedziałek (jest obciążenie) + środa (zero obciążenia) — obie z kropką.
    expect(view.getAllByTestId('plan-day-dot')).toHaveLength(2);
  });

  it('bez plannedWeekdays nie ma kropek (widok jak dotąd)', () => {
    const view = renderStrip();
    expect(view.queryAllByTestId('plan-day-dot')).toHaveLength(0);
  });

  it('komponent ma własny podpis metryki (i18n)', () => {
    const view = renderStrip();
    expect(view.getByText('Obciążenie treningowe')).toBeTruthy();
    expect(view.getByText(/czas × intensywność/)).toBeTruthy();
  });
});
