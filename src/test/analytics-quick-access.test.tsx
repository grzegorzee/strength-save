// X50: osadzona Analityka nie tworzy drugiego poziomu nawigacji; samodzielna
// trasa /analytics zachowuje dotychczasowe skróty i zakładki.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

const fixtures = vi.hoisted(() => ({
  workouts: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, auth: {}, functions: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: false }),
}));
// Zakładki są lazy i ciężkie (recharts, Strava) — test sprawdza skróty, nie treść zakładek.
vi.mock('@/components/analytics/AnalyticsChartsTab', () => ({ default: () => <div data-testid="charts-tab" /> }));
vi.mock('@/components/analytics/AnalyticsWeeklyTab', () => ({ default: () => <div data-testid="weekly-tab" /> }));
vi.mock('@/components/strava/StravaTab', () => ({ StravaTab: () => null }));
vi.mock('@/components/analytics/MonthlyOverviewCard', () => ({ MonthlyOverviewCard: () => <div data-testid="monthly-overview-card" /> }));
vi.mock('@/components/analytics/HybridLoadCard', () => ({ HybridLoadCard: () => <div data-testid="hybrid-load-card" /> }));
vi.mock('@/components/ExportWorkoutsDialog', () => ({ ExportWorkoutsDialog: () => null }));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: fixtures.workouts, measurements: [], isLoaded: true }),
}));
vi.mock('@/hooks/useWorkoutHistoryPage', () => ({
  useWorkoutRange: () => ({ workouts: fixtures.workouts, isLoaded: true }),
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
  fixtures.workouts = [{
    id: 'w1', userId: 'u1', dayId: 'day-1', date: new Date().toISOString().slice(0, 10), completed: true,
    exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 60, completed: true }] }],
  }];
});

describe('niezmiennik samodzielnej trasy Analityki', () => {
  it('skróty Tonaż / Progresja nadal renderują się nad zakładkami', () => {
    renderAnalytics('/analytics', false);
    const quick = screen.getByTestId('analytics-quick-access');
    expect(quick.textContent).toContain('Tonaż');
    expect(quick.textContent).toContain('Progresja');
    const tablist = screen.getByRole('tablist');
    expect(quick.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('skrót Tonaż ustawia tab=charts&chart=tonnage bez view=', async () => {
    renderAnalytics('/analytics', false);
    fireEvent.click(screen.getByTestId('analytics-quick-tonnage'));
    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).not.toContain('view=');
    expect(search).toContain('tab=charts');
    expect(search).toContain('chart=tonnage');
    expect(screen.getByRole('tab', { name: 'Wykresy' })).toHaveAttribute('aria-selected', 'true');
    await screen.findByTestId('charts-tab');
  });

  it('skrót Progresja ustawia chart=progression', () => {
    renderAnalytics('/analytics', false);
    fireEvent.click(screen.getByTestId('analytics-quick-progression'));
    expect(screen.getByTestId('loc').textContent).toContain('chart=progression');
  });
});

describe('X50: uproszczone mobilne Podsumowanie', () => {
  it('osadzona Analityka nie dodaje drugiego poziomu zakładek ani skrótów wykresów', () => {
    renderAnalytics('/achievements?view=analytics', true);

    expect(screen.queryByTestId('analytics-quick-access')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('pierwszy przegląd zawiera jeden insight i dokładnie trzy metryki', () => {
    renderAnalytics('/achievements?view=analytics', true);

    const firstView = screen.getByTestId('analytics-summary-first-view');
    expect(within(firstView).getAllByTestId('analytics-summary-insight')).toHaveLength(1);
    expect(within(firstView).getAllByTestId('analytics-summary-metric')).toHaveLength(3);
    expect(within(firstView).queryByText('--')).not.toBeInTheDocument();
    expect(within(firstView).getByText('Nowe rekordy')).toBeInTheDocument();
  });

  it('domyślne Wyniki nie pokazują listy sesji ani ciężkich analiz', () => {
    renderAnalytics('/achievements?view=analytics', true);

    expect(screen.queryByText('Ukończone treningi')).not.toBeInTheDocument();
    expect(screen.queryByTestId('monthly-overview-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hybrid-load-card')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Miesiąc' })).not.toBeInTheDocument();
  });

  it('wtórne analizy pozostają dostępne przez deep link szczegółów', () => {
    renderAnalytics('/achievements?view=analytics&tab=details', true);

    expect(screen.getByTestId('monthly-overview-card')).toBeInTheDocument();
    expect(screen.getByTestId('hybrid-load-card')).toBeInTheDocument();
    expect(screen.queryByText('Ukończone treningi')).not.toBeInTheDocument();
  });

  it('PDF, CSV i kopiowanie pozostają w menu akcji', () => {
    renderAnalytics('/achievements?view=analytics', true);

    const trigger = screen.getByTestId('analytics-actions-trigger');
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(trigger);

    expect(screen.getByRole('menuitem', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Kopiuj' })).toBeInTheDocument();
  });
});
