import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToday } from '@/hooks/useToday';
import { formatLocalDate } from '@/lib/utils';

// Z173: WKWebView żyje DNIAMI — useMemo(() => new Date(), []) na Dashboardzie
// zamrażał "dzisiaj" z momentu mountu i środa pokazywała "Pominięte", zanim
// w ogóle nadeszła.

describe('useToday (Z173)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rollover: po północy powrót do aplikacji daje nowy dzień', () => {
    vi.setSystemTime(new Date(2026, 7, 2, 23, 50)); // niedziela 23:50
    const { result } = renderHook(() => useToday());
    expect(formatLocalDate(result.current)).toBe('2026-08-02');

    vi.setSystemTime(new Date(2026, 7, 3, 0, 10)); // poniedziałek 00:10
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(formatLocalDate(result.current)).toBe('2026-08-03');
  });

  it('w obrębie tego samego dnia referencja jest STABILNA (bez re-renderów)', () => {
    vi.setSystemTime(new Date(2026, 7, 3, 10, 0));
    const { result } = renderHook(() => useToday());
    const first = result.current;

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe(first);
  });

  it('timer północy odświeża dzień bez żadnego zdarzenia (foreground przez noc)', () => {
    vi.setSystemTime(new Date(2026, 7, 2, 23, 59));
    const { result } = renderHook(() => useToday());
    expect(formatLocalDate(result.current)).toBe('2026-08-02');

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // 23:59 → 00:04
    });
    expect(formatLocalDate(result.current)).toBe('2026-08-03');
  });
});
