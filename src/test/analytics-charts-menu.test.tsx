// X28 WP-D: (D3) zakładka Wykresy jako menu kafli — jeden wykres na raz,
// deep-link ?chart=, Rza tylko na poziomie menu; (D4) restyle tygodni —
// zwarta lista wierszy, chipy PR po rozwinięciu, bieżący tydzień accent-ring.
// Fixtury dokumentów przez canonical-states ('active-plan-rpe').
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { buildCanonicalState, type CanonicalState } from '@/test/canonical-states';

const fixtures = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
}));

// Pułapka: transitive import @/lib/firebase wywraca jsdom (Auth internal assertion).
vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, auth: {} }));
vi.mock('@/contexts/UserContext', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(fixtures.state) };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(fixtures.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useTrainingPlan: () => helpers.buildUseTrainingPlanResult(fixtures.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return { usePlanCycles: () => helpers.buildUsePlanCyclesResult(fixtures.state) };
});
vi.mock('@/hooks/useActivities', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useActivities: () => helpers.buildUseActivitiesResult() };
});

import AnalyticsChartsTab from '@/components/analytics/AnalyticsChartsTab';
import AnalyticsWeeklyTab from '@/components/analytics/AnalyticsWeeklyTab';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="loc">{location.search}</div>;
};

const renderCharts = (initialEntry = '/analytics?tab=charts') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <LanguageProvider>
      <UnitProvider>
        <AnalyticsChartsTab />
        <LocationProbe />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const renderWeekly = () => render(
  <MemoryRouter initialEntries={['/analytics?tab=weekly']}>
    <LanguageProvider>
      <UnitProvider>
        <AnalyticsWeeklyTab />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const tiles = () => screen.getAllByTestId('exercise-group-tile');
const tileByLabel = (label: string) => tiles().find((tile) => within(tile).queryByText(label));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  // Realne "dzisiaj" — Rza i tygodnie liczą new Date(), fixtura musi być względna.
  fixtures.state = buildCanonicalState('active-plan-rpe');
});

describe('D3: wykresy jako kafle z deep-linkiem ?chart=', () => {
  it('bez ?chart renderuje menu: 5 kafli z opisami + Rza, żaden wykres', () => {
    renderCharts();

    expect(tiles()).toHaveLength(5);
    ['Treningi', 'Tonaż', 'Waga', 'Seria', 'Progresja'].forEach((label) => {
      expect(tileByLabel(label), `kafel ${label}`).toBeTruthy();
    });
    // X36: Tonaż i Progresja na początku menu (najczęściej oglądane).
    expect(within(tiles()[0]).getByText('Tonaż')).toBeInTheDocument();
    expect(within(tiles()[1]).getByText('Progresja')).toBeInTheDocument();
    // Rza przypisany do poziomu menu.
    expect(screen.getByText('MASZYNA · tygodnie')).toBeInTheDocument();
    // Żaden wykres się nie renderuje (StatSummary wykresów nieobecne).
    expect(screen.queryByText('Łącznie ukończonych')).toBeNull();
    expect(screen.queryByText('Tonaż łączny')).toBeNull();
    expect(screen.queryByText('Progresja ciężarów')).toBeNull();
    expect(screen.getByTestId('monthly-overview-card')).toBeInTheDocument();
    expect(screen.getByTestId('hybrid-load-card')).toBeInTheDocument();
  });

  it('Progresja wybiera ćwiczenie z pełnej historii i nie filtruje po dniach aktualnego planu', () => {
    renderCharts('/analytics?tab=charts&chart=progression');

    expect(screen.queryByRole('button', { name: 'Wszystkie' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dzień A' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('klik kafla "Tonaż" wchodzi w ?chart=tonnage: tylko wykres tonażu, bez Rza', () => {
    renderCharts();

    fireEvent.click(tileByLabel('Tonaż')!);

    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).toContain('chart=tonnage');
    expect(search).toContain('tab=charts');
    expect(screen.getByText('Tonaż łączny')).toBeInTheDocument();
    expect(screen.queryByText('MASZYNA · tygodnie')).toBeNull();
    expect(screen.queryAllByTestId('exercise-group-tile')).toHaveLength(0);
  });

  it('back z wykresu wraca do menu i zachowuje ?tab=charts (edge case 4)', () => {
    renderCharts('/analytics?tab=charts&chart=tonnage');

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));

    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).toContain('tab=charts');
    expect(search).not.toContain('chart=tonnage');
    expect(tiles()).toHaveLength(5);
  });

  it('nieznany ?chart=xyz renderuje menu (edge case 4)', () => {
    renderCharts('/analytics?tab=charts&chart=xyz');

    expect(tiles()).toHaveLength(5);
    expect(screen.queryByText('Tonaż łączny')).toBeNull();
  });

  it('w widoku wykresu chipsy pozostałych wykresów przełączają bez wracania do menu', () => {
    renderCharts('/analytics?tab=charts&chart=tonnage');

    fireEvent.click(screen.getByRole('button', { name: 'Treningi' }));

    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).toContain('chart=workouts');
    expect(screen.getByText('Łącznie ukończonych')).toBeInTheDocument();
    expect(screen.queryByText('Tonaż łączny')).toBeNull();
  });

  it('wykres Treningi pokazuje kanoniczny licznik bez pustych sesji i dubla sync', () => {
    const base = fixtures.state.workouts[0];
    const remote = { ...base, id: 'workout-canonical-user-1-day-a-2026-08-20' };
    fixtures.state = {
      ...fixtures.state,
      workouts: [
        { ...remote, id: `local-${remote.id}` },
        remote,
        { ...base, id: 'empty', exercises: [] },
        {
          ...base,
          id: 'warmup-only',
          exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 10, weight: 20, completed: true, isWarmup: true }] }],
        },
        { ...base, id: 'quick-a', dayId: 'quick-a' },
        { ...base, id: 'quick-b', dayId: 'quick-b' },
      ],
    };

    renderCharts('/analytics?tab=charts&chart=workouts');

    expect(screen.getByText('Łącznie ukończonych').previousElementSibling).toHaveTextContent('3');
  });
});

describe('D4: tygodnie w nowym stylu — zwarta lista', () => {
  it('renderuje jeden kontener z wierszami: zakres dat + 4 wartości inline', () => {
    renderWeekly();

    expect(screen.getByTestId('weekly-list')).toBeInTheDocument();
    const rows = screen.getAllByTestId('weekly-row');
    expect(rows).toHaveLength(2);
    // 4 wartości inline: treningi · tonaż · km · PR.
    expect(rows[0].textContent).toContain('km');
    expect(rows[0].textContent).toContain('PR');
    expect(rows[0].textContent).toMatch(/trening/i);
  });

  it('chipy PR pojawiają się dopiero po kliku wiersza (expand/collapse)', () => {
    renderWeekly();

    // PR z fixtury: dziś cięższe serie niż tydzień temu.
    expect(screen.queryAllByText(/Przysiad ze sztangą/)).toHaveLength(0);

    const rows = screen.getAllByTestId('weekly-row');
    const toggle = within(rows[0]).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText(/Przysiad ze sztangą/).length).toBeGreaterThan(0);

    fireEvent.click(toggle);
    expect(screen.queryAllByText(/Przysiad ze sztangą/)).toHaveLength(0);
  });

  it('bieżący tydzień wyróżniony accent-ring', () => {
    renderWeekly();

    const rows = screen.getAllByTestId('weekly-row');
    expect(rows[0].className).toContain('accent-ring');
    expect(rows[1].className).not.toContain('accent-ring');
  });
});
