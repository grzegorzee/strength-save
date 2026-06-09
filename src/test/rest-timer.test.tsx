import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RestTimer } from '@/components/RestTimer';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { notification: vi.fn() },
  NotificationType: { Success: 'SUCCESS' },
}));

vi.mock('@/lib/timer-sound', () => ({
  playTimerSound: vi.fn(),
  unlockTimerSound: vi.fn(),
}));

const renderTimer = (defaultSeconds = 3, onClose = vi.fn()) => {
  render(
    <LanguageProvider>
      <RestTimer defaultSeconds={defaultSeconds} exerciseLabel="Bench press" onClose={onClose} />
    </LanguageProvider>,
  );
  return { onClose };
};

describe('RestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T10:00:00.000Z'));
    localStorage.setItem('app-language', 'pl');
    vi.mocked(playTimerSound).mockClear();
    vi.mocked(unlockTimerSound).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down by deadline and fires finish feedback once', () => {
    renderTimer(3);

    expect(screen.getByText('0:03')).toBeInTheDocument();
    expect(unlockTimerSound).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('0:02')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('START!')).toBeInTheDocument();
    expect(playTimerSound).toHaveBeenCalledTimes(1);
    expect(playTimerSound).toHaveBeenCalledWith('finish');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(playTimerSound).toHaveBeenCalledTimes(1);
  });

  it('pauses, resumes and closes', () => {
    const { onClose } = renderTimer(4);

    fireEvent.click(screen.getByRole('button', { name: 'Pauza' }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('0:04')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wznów' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('0:03')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
