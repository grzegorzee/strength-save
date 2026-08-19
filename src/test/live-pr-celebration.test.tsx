import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LivePRCelebration } from '@/components/LivePRCelebration';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/components/ConfettiBurst', () => ({
  ConfettiBurst: () => <div data-testid="confetti" />,
}));

const data = { name: 'Arnoldki', value: '20 kg', delta: '+2 kg' };

afterEach(() => {
  vi.useRealTimers();
});

describe('LivePRCelebration (B-T3: deadline ścienny 5,5 s)', () => {
  it('null = brak renderu', () => {
    const { container } = render(<LivePRCelebration data={null} onDone={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('pokazuje confetti, nazwę i deltę; tap zamyka natychmiast', () => {
    const onDone = vi.fn();
    render(<LivePRCelebration data={data} onDone={onDone} />);
    expect(screen.getByTestId('confetti')).toBeTruthy();
    expect(screen.getByText('Arnoldki')).toBeTruthy();
    expect(screen.getByText(/\+2 kg/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'a11y.close' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('live-pr-celebration'));
    expect(onDone).toHaveBeenCalled();
  });

  it('granica deadline: 5499 ms jeszcze widoczna, 5500 ms zamyka dokładnie raz', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<LivePRCelebration data={data} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(5499); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('rerender ze zmienionym onDone nie resetuje deadline’u', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<LivePRCelebration data={data} onDone={first} />);
    act(() => { vi.advanceTimersByTime(3000); });
    rerender(<LivePRCelebration data={data} onDone={second} />);
    act(() => { vi.advanceTimersByTime(2500); });
    // 5500 ms od pokazania: zamyka NAJNOWSZY callback, bez resetu do kolejnych 5,5 s.
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('powrót z tła po przekroczeniu deadline’u zamyka od razu (czas ścienny)', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<LivePRCelebration data={data} onDone={onDone} />);
    // Tło: JS wstrzymany — timery nie chodzą, ale zegar ścienny płynie.
    act(() => { vi.setSystemTime(Date.now() + 60_000); });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
