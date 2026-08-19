import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LivePRCelebration } from '@/components/LivePRCelebration';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/components/ConfettiBurst', () => ({
  ConfettiBurst: () => <div data-testid="confetti" />,
}));

const data = { name: 'Arnoldki', value: '20 kg', delta: '+2 kg' };

describe('LivePRCelebration', () => {
  it('null = brak renderu', () => {
    const { container } = render(<LivePRCelebration data={null} onDone={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('pokazuje confetti, nazwę i deltę; tap zamyka', () => {
    const onDone = vi.fn();
    render(<LivePRCelebration data={data} onDone={onDone} />);
    expect(screen.getByTestId('confetti')).toBeTruthy();
    expect(screen.getByText('Arnoldki')).toBeTruthy();
    expect(screen.getByText(/\+2 kg/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'a11y.close' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('live-pr-celebration'));
    expect(onDone).toHaveBeenCalled();
  });

  it('auto-znika po ~2.2 s', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<LivePRCelebration data={data} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(2300); });
    expect(onDone).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
