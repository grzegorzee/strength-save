import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkoutCompletionSequence } from '@/components/WorkoutCompletionSequence';
import type { PRComparison } from '@/lib/pr-utils';

// WP-F (X37): etap celebracji dostaje baner TYLKO dla kamienia milowego
// (prop milestone). Zwykły trening (milestone=null) = dotychczasowa
// celebracja bez banera i bez konfetti (niezmiennik z polityki confetti).

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    lang: 'pl',
  }),
}));
vi.mock('@/components/ConfettiBurst', () => ({
  ConfettiBurst: () => <div data-testid="confetti" />,
}));

const base = {
  justCompleted: true,
  summary: { volumeKg: 1000, completedSets: 10, plannedSets: 10, planPct: 100, prevVolumeKg: null, volumeDeltaPct: null, prevDate: null },
  durationSec: 1800,
  fmtTonnage: (kg: number) => `${kg}`,
  fmtWeight: (kg: number) => `${kg}`,
  fmtDuration: (s: number) => `${s}`,
  onRate: () => {},
  prs: [] as PRComparison[],
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WorkoutCompletionSequence: kamienie milowe (WP-F)', () => {
  it('kamień 1 (pierwszy trening): baner + konfetti, potem ocena po 2,5 s', () => {
    render(<WorkoutCompletionSequence {...base} milestone={{ kind: 'first', n: 1 }} workoutNumber={1} />);
    const banner = screen.getByTestId('workout-milestone-banner');
    expect(banner.textContent).toContain('workout.milestone.first');
    expect(screen.getByTestId('confetti')).toBeTruthy();
    expect(screen.getByText('workout.completedTitle')).toBeTruthy();
    // Jeden overlay naraz (rodzic nie dubluje własnego etapu celebracji).
    expect(document.querySelectorAll('[data-app-overlay]')).toHaveLength(1);

    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByTestId('workout-milestone-banner')).toBeNull();
    expect(screen.getByText('workout.completion.rateTitle')).toBeTruthy();
  });

  it('trening nr 2: bez banera i bez konfetti (zwykła celebracja bez zmian)', () => {
    render(<WorkoutCompletionSequence {...base} milestone={null} workoutNumber={2} />);
    expect(screen.queryByTestId('workout-milestone-banner')).toBeNull();
    expect(screen.queryByTestId('confetti')).toBeNull();
    expect(screen.getByText('workout.completedTitle')).toBeTruthy();
  });

  it('kamień 10: baner z numerem', () => {
    render(<WorkoutCompletionSequence {...base} milestone={{ kind: 'milestone', n: 10 }} workoutNumber={10} />);
    expect(screen.getByTestId('workout-milestone-banner').textContent).toContain('workout.milestone.nth:{"n":10}');
    expect(screen.getByTestId('confetti')).toBeTruthy();
  });

  it('X na banerze przechodzi do oceny (zasada 6: baner ma wyjście)', () => {
    render(<WorkoutCompletionSequence {...base} milestone={{ kind: 'first', n: 1 }} workoutNumber={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'a11y.close' }));
    expect(screen.queryByTestId('workout-milestone-banner')).toBeNull();
    expect(screen.getByText('workout.completion.rateTitle')).toBeTruthy();
  });

  it('podsumowanie pokazuje numer porządkowy treningu', () => {
    render(<WorkoutCompletionSequence {...base} justCompleted={false} milestone={null} workoutNumber={12} />);
    expect(screen.getByText('workout.summary.workoutNumber:{"n":12}')).toBeTruthy();
  });

  it('wejście z historii bez numeru: podsumowanie bez etykiety numeru', () => {
    render(<WorkoutCompletionSequence {...base} justCompleted={false} />);
    expect(screen.queryByText(/workout.summary.workoutNumber/)).toBeNull();
  });

  it('milestone bez justCompleted (wejście z historii): zero celebracji', () => {
    render(<WorkoutCompletionSequence {...base} justCompleted={false} milestone={{ kind: 'first', n: 1 }} workoutNumber={1} />);
    expect(screen.queryByTestId('workout-milestone-banner')).toBeNull();
    expect(screen.queryByText('workout.completedTitle')).toBeNull();
  });
});
