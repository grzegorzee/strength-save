import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const reportClientError = vi.fn(async (_uid: string, _entry: unknown) => undefined);
vi.mock('@/lib/error-telemetry', () => ({
  reportClientError: (uid: string, entry: unknown) => reportClientError(uid, entry),
}));

const authMock = vi.hoisted(() => ({ currentUser: null as null | { uid: string } }));
vi.mock('@/lib/firebase', () => ({ auth: authMock }));

import { ErrorBoundary } from '@/components/ErrorBoundary';

const Bomb = (): never => {
  throw new Error('BOOM_RENDER');
};

describe('ErrorBoundary (Z56)', () => {
  beforeEach(() => {
    reportClientError.mockClear();
    authMock.currentUser = null;
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

  it('bez propa uid raportuje z uid z auth (top-level boundary, Z154)', () => {
    authMock.currentUser = { uid: 'auth-user' };

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(reportClientError).toHaveBeenCalledTimes(1);
    expect(reportClientError.mock.calls[0][0]).toBe('auth-user');
  });

  it('asercja Firestore: przycisk mówi o restarcie apki, nie o odświeżeniu strony', () => {
    const FirestoreBomb = (): never => {
      throw new Error('FIRESTORE (12.8.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)');
    };
    render(
      <ErrorBoundary uid="u1">
        <FirestoreBomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /Uruchom ponownie|Restart app/ })).toBeTruthy();
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
