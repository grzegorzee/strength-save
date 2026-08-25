import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';

// Bug 39 (X30): currentWeek liczyl sie raz na mount (useMemo z zaleznoscia
// wylacznie [planStartDate] wolal new Date() w srodku). WKWebView zyje DNIAMI:
// apka zostawiona otwarta w niedziele i wznowiona w poniedzialek pokazywala
// zeszlotygodniowy numer tygodnia, weeksRemaining i deload az do remountu
// trasy. Wzorzec naprawy = useToday (Z173).
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteField: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
}));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => {}) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('useTrainingPlan currentWeek (bug 39, X30): rollover nd->pn bez remountu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_E2E_MODE', 'true');
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('niedziela wieczorem tydzien 1, po polnocy powrot z tla daje tydzien 2', () => {
    // Plan startuje pn 2026-08-17 (mirror e2e useTrainingPlan, bez Firestore).
    localStorage.setItem('fittracker_e2e_plan', JSON.stringify({ startDate: '2026-08-17', durationWeeks: 12 }));
    vi.setSystemTime(new Date(2026, 7, 23, 23, 50)); // niedziela 23:50
    const { result } = renderHook(() => useTrainingPlan('user-1'), { wrapper });
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.currentWeek).toBe(1);

    vi.setSystemTime(new Date(2026, 7, 24, 0, 10)); // poniedzialek 00:10
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.currentWeek).toBe(2);
    expect(result.current.weeksRemaining).toBe(10);
  });

  it('planStarted przeskakuje na true na granicy startu planu (powrot z tla)', () => {
    // Plan startuje w poniedzialek; w niedziele przed startem planStarted=false.
    localStorage.setItem('fittracker_e2e_plan', JSON.stringify({ startDate: '2026-08-24', durationWeeks: 12 }));
    vi.setSystemTime(new Date(2026, 7, 23, 23, 50)); // niedziela przed startem
    const { result } = renderHook(() => useTrainingPlan('user-1'), { wrapper });
    expect(result.current.planStarted).toBe(false);
    expect(result.current.currentWeek).toBe(0);

    vi.setSystemTime(new Date(2026, 7, 24, 0, 10)); // poniedzialek startu
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.planStarted).toBe(true);
    expect(result.current.currentWeek).toBe(1);
  });
});
