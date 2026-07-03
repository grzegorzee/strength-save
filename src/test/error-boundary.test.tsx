import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const reportClientError = vi.fn(async (_uid: string, _entry: unknown) => undefined);
vi.mock('@/lib/error-telemetry', () => ({
  reportClientError: (uid: string, entry: unknown) => reportClientError(uid, entry),
}));

import { ErrorBoundary } from '@/components/ErrorBoundary';

const Bomb = (): never => {
  throw new Error('BOOM_RENDER');
};

describe('ErrorBoundary (Z56)', () => {
  beforeEach(() => {
    reportClientError.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('render dziecka rzucającego błąd pokazuje fallback i raportuje render-crash', () => {
    render(
      <ErrorBoundary uid="u1">
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Coś poszło nie tak|Something went wrong/)).toBeTruthy();
    expect(reportClientError).toHaveBeenCalledTimes(1);
    const [uid, entry] = reportClientError.mock.calls[0] as unknown as [string, { code: string; phase: string; detail: string }];
    expect(uid).toBe('u1');
    expect(entry.code).toBe('render-crash');
    expect(entry.detail).toContain('BOOM_RENDER');
  });

  it('bez uid nie raportuje (telemetria wymaga uid), fallback nadal działa', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Coś poszło nie tak|Something went wrong/)).toBeTruthy();
    expect(reportClientError).not.toHaveBeenCalled();
  });

  it('własny fallback dostaje reset i jest renderowany zamiast domyślnego', () => {
    render(
      <ErrorBoundary uid="u1" fallback={() => <p>route-fallback</p>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('route-fallback')).toBeTruthy();
  });
});
