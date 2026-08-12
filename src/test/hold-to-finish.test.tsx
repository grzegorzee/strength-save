import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HoldToFinishButton } from '@/components/HoldToFinishButton';

// Runna pakiet 1, krok 9 (spec B3): "Zakończ trening" przez przytrzymanie
// (ochrona przed przypadkowym tapnięciem spoconym palcem). Tap = hint,
// klawiatura = fallback do istniejącego potwierdzenia (a11y). Skipy pozostają
// tanim tapem gdzie indziej (reguła #6).

const renderButton = () => {
  const onConfirm = vi.fn();
  const onFallback = vi.fn();
  render(
    <HoldToFinishButton
      label="Zakończ trening"
      hint="Przytrzymaj, aby zakończyć"
      onConfirm={onConfirm}
      onFallback={onFallback}
      holdMs={500}
    />,
  );
  return { onConfirm, onFallback, button: screen.getByTestId('hold-to-finish') };
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('HoldToFinishButton', () => {
  it('pełne przytrzymanie wywołuje onConfirm dokładnie raz', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(600);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('krótki tap: hint zamiast zakończenia', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(150);
    fireEvent.pointerUp(button);
    vi.advanceTimersByTime(600);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('hold-hint').textContent).toContain('Przytrzymaj');
  });

  it('zjechanie palcem z przycisku anuluje przytrzymanie', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    vi.advanceTimersByTime(600);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('klawiatura (Enter): fallback do potwierdzenia, bez onConfirm (a11y)', () => {
    const { onConfirm, onFallback, button } = renderButton();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
