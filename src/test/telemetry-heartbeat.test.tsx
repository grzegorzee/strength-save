import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { TelemetryHeartbeat } from '@/components/TelemetryHeartbeat';

// Z211: batching telemetrii. Okresowy flush co 5 min (maks. 12/h zamiast 120/h),
// dodatkowo przy online, przejściu w tło (hidden) i pagehide. Powrót do foreground
// nie generuje osobnego flusha — bufor localStorage i retry zostają bez zmian.

const flushMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/app-telemetry', () => ({
  flushTelemetryEvents: flushMock,
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'user-1' }),
}));

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('Z211 — TelemetryHeartbeat batching', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    flushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('wykonuje maks. 12 okresowych flushy na godzinę (plus jeden startowy)', () => {
    render(<TelemetryHeartbeat />);
    expect(flushMock).toHaveBeenCalledTimes(1); // startowy
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(flushMock).toHaveBeenCalledTimes(1 + 12);
  });

  it('flushuje przy online i pagehide', () => {
    render(<TelemetryHeartbeat />);
    flushMock.mockClear();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(flushMock).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(flushMock).toHaveBeenCalledTimes(2);
  });

  it('flushuje przy przejściu w tło, ale nie przy powrocie do foreground', () => {
    render(<TelemetryHeartbeat />);
    flushMock.mockClear();
    act(() => {
      setHidden(true);
    });
    expect(flushMock).toHaveBeenCalledTimes(1);
    act(() => {
      setHidden(false);
    });
    expect(flushMock).toHaveBeenCalledTimes(1); // bez dodatkowego flusha
  });
});
