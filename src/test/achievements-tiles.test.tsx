// X28 WP-D: zakładka Postępy kafelkowo — poziom 1 = staty + Life PRs + heatmapa
// + 4 kafle (Rekordy / Odznaki i sezony / Analityka / Tygodnie), poziom 2
// (?section=records|badges) = przeniesione sekcje. Scaffolding mocków wzorem
// achievements-heatmap.test.tsx, fixtury dokumentów przez canonical-states.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getProgressTileImageUrl } from '@/lib/progress-media';
import { buildCanonicalState, type CanonicalState } from '@/test/canonical-states';

const TODAY = '2026-08-21';

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
// Embed analityki (lazy) — stub, bo test sprawdza mechanizm ?view=, nie Analitykę.
vi.mock('@/pages/Analytics', () => ({
  default: () => <div data-testid="analytics-embed" />,
}));

import Achievements from '@/pages/Achievements';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="loc">{location.search}</div>;
};

const renderPage = (initialEntry = '/achievements') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <LanguageProvider>
      <UnitProvider>
        <Achievements />
        <LocationProbe />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const tiles = () => screen.getAllByTestId('exercise-group-tile');
const tileByLabel = (label: string) => tiles().find((tile) => within(tile).queryByText(label));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  fixtures.state = buildCanonicalState('active-plan', TODAY);
});

describe('D1: helper obrazów kafli postępów', () => {
  it('getProgressTileImageUrl mapuje sekcję na medalion webp w /badges/', () => {
    expect(getProgressTileImageUrl('records')).toBe('/badges/pr.webp');
    expect(getProgressTileImageUrl('badges')).toBe('/badges/season-gold.webp');
    expect(getProgressTileImageUrl('analytics')).toBe('/badges/tonnage-100t.webp');
    expect(getProgressTileImageUrl('weeks')).toBe('/badges/streak-4.webp');
  });
});

describe('D2: poziom 1 — kafle sekcji', () => {
  it('renderuje 4 kafle z licznikami, bez listy rekordów i siatki odznak; heatmapa zostaje', () => {
    renderPage();

    expect(tiles()).toHaveLength(4);
    const recordsTile = tileByLabel('Rekordy');
    expect(recordsTile, 'kafel Rekordy').toBeTruthy();
    // active-plan: 2 dni x 2 ćwiczenia = 4 exerciseId z rekordem.
    expect(within(recordsTile!).getByText('4')).toBeInTheDocument();
    expect(tileByLabel('Odznaki i sezony'), 'kafel Odznaki i sezony').toBeTruthy();
    expect(within(tileByLabel('Odznaki i sezony')!).getByText(/^\d+\/\d+$/)).toBeInTheDocument();
    expect(tileByLabel('Analityka'), 'kafel Analityka').toBeTruthy();
    expect(tileByLabel('Tygodnie'), 'kafel Tygodnie').toBeTruthy();

    // Sekcje poziomu 2 NIE renderują się na poziomie 1.
    expect(screen.queryByText('Rekordy wszystkich ćwiczeń')).toBeNull();
    expect(screen.queryByText('Rekordy osobiste (szacowane 1RM)')).toBeNull();
    expect(screen.queryByText('Odznaki specjalne')).toBeNull();
    // Trend 6 miesięcy przeniesiony do wykresów analityki (Edge 6).
    expect(screen.queryByText('Trend 6 miesięcy')).toBeNull();
    // Heatmapa konsekwencji zostaje na poziomie 1.
    expect(screen.getByText('Mapa treningowa')).toBeInTheDocument();
  });

  it('klik "Rekordy" wchodzi w ?section=records: sekcje rekordów widoczne, heatmapa nie', () => {
    renderPage();

    fireEvent.click(tileByLabel('Rekordy')!);

    expect(screen.getByTestId('loc').textContent).toContain('section=records');
    expect(screen.getByText('Rekordy wszystkich ćwiczeń')).toBeInTheDocument();
    expect(screen.getByText('Rekordy osobiste (szacowane 1RM)')).toBeInTheDocument();
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
    expect(screen.queryAllByTestId('exercise-group-tile')).toHaveLength(0);
  });

  it('back z sekcji wraca na poziom 1 (kafle + heatmapa)', () => {
    renderPage('/achievements?section=records');

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));

    expect(screen.getByTestId('loc').textContent).not.toContain('section=');
    expect(tiles()).toHaveLength(4);
    expect(screen.getByText('Mapa treningowa')).toBeInTheDocument();
  });

  it('?section=badges pokazuje kamienie milowe, odznaki specjalne i półkę sezonów', () => {
    renderPage('/achievements?section=badges');

    expect(screen.getByText('Odznaki')).toBeInTheDocument();
    expect(screen.getByText('Odznaki specjalne')).toBeInTheDocument();
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
    expect(screen.queryAllByTestId('exercise-group-tile')).toHaveLength(0);
  });

  it('nieznany ?section= renderuje poziom 1 (edge case 1)', () => {
    renderPage('/achievements?section=nie-ma-takiej');

    expect(tiles()).toHaveLength(4);
    expect(screen.getByText('Mapa treningowa')).toBeInTheDocument();
  });

  it('kafel "Analityka" ustawia ?view=analytics (istniejący embed)', async () => {
    renderPage();

    fireEvent.click(tileByLabel('Analityka')!);

    expect(screen.getByTestId('loc').textContent).toContain('view=analytics');
    await waitFor(() => expect(screen.getByTestId('analytics-embed')).toBeInTheDocument());
  });

  it('kafel "Tygodnie" ustawia ?view=analytics&tab=weekly', async () => {
    renderPage();

    fireEvent.click(tileByLabel('Tygodnie')!);

    const search = screen.getByTestId('loc').textContent ?? '';
    expect(search).toContain('view=analytics');
    expect(search).toContain('tab=weekly');
    await waitFor(() => expect(screen.getByTestId('analytics-embed')).toBeInTheDocument());
  });

  it('pusty stan (0 treningów) bez kafli — zaproszenie jak dotąd (edge case 2)', () => {
    fixtures.state = buildCanonicalState('empty-history', TODAY);
    renderPage();

    expect(screen.queryAllByTestId('exercise-group-tile')).toHaveLength(0);
    expect(screen.getByText('Rekordy pojawią się po pierwszych treningach.')).toBeInTheDocument();
  });
});
