// X36 (głosówka właściciela po buildzie 124): "muszę wejść w Analitykę, potem
// Wykresy, potem Progresja" — skróty Tonaż / Progresja nad zakładkami Analityki
// otwierają wykres jednym tapnięciem (deep link ?tab=charts&chart=…).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, auth: {}, functions: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: false }),
}));
// Zakładki są lazy i ciężkie (recharts, Strava) — test sprawdza skróty, nie treść zakładek.
vi.mock('@/components/analytics/AnalyticsChartsTab', () => ({ default: () => <div data-testid="charts-tab" /> }));
vi.mock('@/components/analytics/AnalyticsWeeklyTab', () => ({ default: () => <div data-testid="weekly-tab" /> }));
vi.mock('@/components/strava/StravaTab', () => ({ StravaTab: () => null }));
vi.mock('@/components/analytics/MonthlyOverviewCard', () => ({ MonthlyOverviewCard: () => null }));
vi.mock('@/components/analytics/HybridLoadCard', () => ({ HybridLoadCard: () => null }));
vi.mock('@/components/ExportWorkoutsDialog', () => ({ ExportWorkoutsDialog: () => null }));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], measurements: [], isLoaded: true }),
}));
vi.mock('@/hooks/useWorkoutHistoryPage', () => ({
  useWorkoutRange: () => ({ workouts: [], isLoaded: true }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planStartDate: null }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({ usePlanCycles: () => ({ cycles: [], isLoaded: true }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

import Analytics from '@/pages/Analytics';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="loc">{location.search}</div>;
};

const renderAnalytics = (entry: string, embedded: boolean) => render(
  <MemoryRouter initialEntries={[entry]}>
    <LanguageProvider>
      <UnitProvider>
        <Analytics embedded={embedded} />
        <LocationProbe />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('X36: skróty Tonaż / Progresja w Analityce', () => {
  it('rząd skrótów renderuje się nad zakładkami z etykietami wykresów', () => {
    renderAnalytics('/achievements?view=analytics', true);
    const quick = screen.getByTestId('analytics-quick-access');
    expect(quick.textContent).toContain('Tonaż');
    expect(quick.textContent).toContain('Progresja');
    // Skróty są PRZED listą zakładek w DOM (pierwsze pod kciukiem po wejściu).
    const tablist = screen.getByRole('tablist');
    expect(quick.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('osadzona w Postępach: klik "Tonaż" ustawia ?view=analytics&tab=charts&chart=tonnage', () => {
    renderAnalytics('/achievements?view=analytics', true);
    fireEvent.click(screen.getByTestId('analytics-quick-tonnage'));
    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).toContain('view=analytics');
    expect(search).toContain('tab=charts');
    expect(search).toContain('chart=tonnage');
    expect(screen.getByRole('tab', { name: 'Wykresy' })).toHaveAttribute('aria-selected', 'true');
  });

  it('osadzona: klik "Progresja" ustawia chart=progression', () => {
    renderAnalytics('/achievements?view=analytics', true);
    fireEvent.click(screen.getByTestId('analytics-quick-progression'));
    expect(screen.getByTestId('loc').textContent).toContain('chart=progression');
  });

  it('samodzielna (/analytics): bez view=, z tab=charts&chart=', () => {
    renderAnalytics('/analytics', false);
    fireEvent.click(screen.getByTestId('analytics-quick-tonnage'));
    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).not.toContain('view=');
    expect(search).toContain('tab=charts');
    expect(search).toContain('chart=tonnage');
  });
});
