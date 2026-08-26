import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkoutMilestoneCelebration } from '@/components/WorkoutMilestoneCelebration';

// WP-F (X37): baner kamienia milowego po wzorcu LivePRCelebration (B-T3):
// deadline ścienny 2,5 s, X zamyka, tap w overlay zamyka, aria-live dla VoiceOver.

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/components/ConfettiBurst', () => ({
  ConfettiBurst: () => <div data-testid="confetti" />,
}));

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkoutMilestoneCelebration', () => {
  it('pierwszy trening: baner z treścią first + konfetti + X', () => {
    render(<WorkoutMilestoneCelebration milestone={{ kind: 'first', n: 1 }} onDone={() => {}} />);
    const banner = screen.getByTestId('workout-milestone-banner');
    expect(banner.getAttribute('aria-live')).toBe('polite');
    expect(banner.textContent).toContain('workout.milestone.first');
    expect(screen.getByTestId('confetti')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'a11y.close' })).toBeTruthy();
  });

  it('kamień 10: treść nth z numerem', () => {
    render(<WorkoutMilestoneCelebration milestone={{ kind: 'milestone', n: 10 }} onDone={() => {}} />);
    expect(screen.getByTestId('workout-milestone-banner').textContent).toContain('workout.milestone.nth:{"n":10}');
  });

  it('X zamyka natychmiast i dokładnie raz', () => {
    const onDone = vi.fn();
    render(<WorkoutMilestoneCelebration milestone={{ kind: 'first', n: 1 }} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'a11y.close' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('deadline: 2499 ms jeszcze widoczna, 2500 ms zamyka dokładnie raz', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<WorkoutMilestoneCelebration milestone={{ kind: 'first', n: 1 }} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(2499); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('rerender z nową tożsamością onDone nie resetuje deadline’u', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<WorkoutMilestoneCelebration milestone={{ kind: 'first', n: 1 }} onDone={first} />);
    act(() => { vi.advanceTimersByTime(1500); });
    rerender(<WorkoutMilestoneCelebration milestone={{ kind: 'first', n: 1 }} onDone={second} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('powrót z tła po deadline zamyka od razu (czas ścienny, JS wstrzymany na iOS)', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<WorkoutMilestoneCelebration milestone={{ kind: 'milestone', n: 50 }} onDone={onDone} />);
    act(() => { vi.setSystemTime(Date.now() + 60_000); });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
