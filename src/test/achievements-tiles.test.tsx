// X28 WP-D: zakładka Postępy kafelkowo — poziom 1 = staty + Life PRs
// + 4 kafle (Rekordy / Odznaki / Analityka / Tygodnie), poziom 2
// (?section=records|badges) = przeniesione sekcje. Fixtury dokumentów przez
// canonical-states. X35a W1: roczna heatmapa ("Mapa treningowa") usunięta
// decyzją właściciela, nie ma prawa wrócić na żaden poziom.
// Fix 2026-08-21 (zgłoszenie TestFlight): kafle poziomu 1 renderują ikony lucide
// zamiast medalionów webp (czarne kwadraty odcinały się od tła kafla); etykieta
// kafla odznak skrócona do "Odznaki". Medaliony webp zostają w hero sekcji
// poziomu 2 (GroupHeader), stąd helper progress-media nadal żyje.
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

// X36: Analityka domyślna — poziom 1 rekordów pod ?view=records.
const renderPage = (initialEntry = '/achievements?view=records') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <LanguageProvider>
      <UnitProvider>
        <Achievements />
        <LocationProbe />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const tiles = () => screen.getAllByTestId('progress-section-tile');
const tileByLabel = (label: string) => tiles().find((tile) => within(tile).queryByText(label));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  fixtures.state = buildCanonicalState('active-plan', TODAY);
});

describe('D1: helper obrazów sekcji postępów (hero poziomu 2)', () => {
  it('getProgressTileImageUrl mapuje sekcję na medalion webp w /badges/', () => {
    expect(getProgressTileImageUrl('records')).toBe('/badges/pr.webp');
    expect(getProgressTileImageUrl('badges')).toBe('/badges/season-gold.webp');
    expect(getProgressTileImageUrl('analytics')).toBe('/badges/tonnage-100t.webp');
    expect(getProgressTileImageUrl('weeks')).toBe('/badges/streak-4.webp');
  });
});

describe('D2: poziom 1 — kafle sekcji', () => {
  it('renderuje 4 kafle z licznikami, bez listy rekordów, siatki odznak i rocznej heatmapy', () => {
    renderPage();

    expect(tiles()).toHaveLength(4);
    const recordsTile = tileByLabel('Rekordy');
    expect(recordsTile, 'kafel Rekordy').toBeTruthy();
    // active-plan: 2 dni x 2 ćwiczenia = 4 exerciseId z rekordem.
    expect(within(recordsTile!).getByText('4')).toBeInTheDocument();
    expect(tileByLabel('Odznaki'), 'kafel Odznaki').toBeTruthy();
    expect(within(tileByLabel('Odznaki')!).getByText(/^\d+\/\d+$/)).toBeInTheDocument();
    expect(tileByLabel('Analityka'), 'kafel Analityka').toBeTruthy();
    expect(tileByLabel('Tygodnie'), 'kafel Tygodnie').toBeTruthy();

    // Fix 2026-08-21: kafel = ikona lucide (svg), zero <img> z medalionem webp.
    tiles().forEach((tile) => {
      expect(tile.querySelector('svg'), 'ikona lucide w kaflu').toBeTruthy();
      expect(tile.querySelector('img'), 'kafel bez obrazka webp').toBeNull();
    });
    // Stara długa etykieta nie występuje.
    expect(screen.queryByText('Odznaki i sezony')).toBeNull();

    // Sekcje poziomu 2 NIE renderują się na poziomie 1.
    expect(screen.queryByText('Rekordy wszystkich ćwiczeń')).toBeNull();
    expect(screen.queryByText('Rekordy osobiste (szacowane 1RM)')).toBeNull();
    expect(screen.queryByText('Odznaki specjalne')).toBeNull();
    // Trend 6 miesięcy przeniesiony do wykresów analityki (Edge 6).
    expect(screen.queryByText('Trend 6 miesięcy')).toBeNull();
    // X35a W1: roczna heatmapa usunięta (przewijanie w bok, nieczytelna na telefonie).
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
  });

  it('klik "Rekordy" wchodzi w ?section=records: sekcje rekordów widoczne, kafle nie', () => {
    renderPage();

    fireEvent.click(tileByLabel('Rekordy')!);

    expect(screen.getByTestId('loc').textContent).toContain('section=records');
    expect(screen.getByTestId('loc').textContent).toContain('view=records');
    expect(screen.getByText('Rekordy wszystkich ćwiczeń')).toBeInTheDocument();
    expect(screen.getByText('Rekordy osobiste (szacowane 1RM)')).toBeInTheDocument();
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
    expect(screen.queryAllByTestId('progress-section-tile')).toHaveLength(0);
  });

  it('back z sekcji wraca na poziom 1 (kafle), zostaje w widoku rekordów', () => {
    renderPage('/achievements?view=records&section=records');

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));

    expect(screen.getByTestId('loc').textContent).not.toContain('section=');
    expect(screen.getByTestId('loc').textContent).toContain('view=records');
    expect(tiles()).toHaveLength(4);
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
  });

  it('?section=badges (stary deep link bez view) pokazuje kamienie milowe, odznaki specjalne i półkę sezonów', () => {
    renderPage('/achievements?section=badges');

    // Tytuł sekcji w hero (h1); "Odznaki" występuje też jako CardTitle (h3).
    expect(screen.getByRole('heading', { level: 1, name: 'Odznaki' })).toBeInTheDocument();
    expect(screen.getByText('Odznaki specjalne')).toBeInTheDocument();
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
    expect(screen.queryAllByTestId('progress-section-tile')).toHaveLength(0);
  });

  it('nieznany ?section= renderuje poziom 1 (edge case 1)', () => {
    renderPage('/achievements?view=records&section=nie-ma-takiej');

    expect(tiles()).toHaveLength(4);
    expect(screen.queryByText('Mapa treningowa')).toBeNull();
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
    renderPage('/achievements?view=records');

    expect(screen.queryAllByTestId('progress-section-tile')).toHaveLength(0);
    expect(screen.getByText('Rekordy pojawią się po pierwszych treningach.')).toBeInTheDocument();
  });
});

// X36 (głosówka właściciela po buildzie 124): Analityka PIERWSZA w segmencie
// i DOMYŚLNA po wejściu w Postępy; rekordy i odznaki pod ?view=records.
describe('X36: Analityka domyślna w Postępach', () => {
  it('/achievements bez parametrów renderuje osadzoną Analitykę, nie kafle rekordów', async () => {
    renderPage('/achievements');

    await waitFor(() => expect(screen.getByTestId('analytics-embed')).toBeInTheDocument());
    expect(screen.queryAllByTestId('progress-section-tile')).toHaveLength(0);
    expect(screen.getByTestId('progress-view-analytics')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('progress-view-records')).toHaveAttribute('aria-selected', 'false');
  });

  it('segment: Analityka jest PIERWSZYM przyciskiem, Rekordy i odznaki drugim', () => {
    renderPage('/achievements');

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('data-testid', 'progress-view-analytics');
    expect(tabs[1]).toHaveAttribute('data-testid', 'progress-view-records');
  });

  it('klik "Rekordy i odznaki" przechodzi na ?view=records z kaflami', () => {
    renderPage('/achievements');

    fireEvent.click(screen.getByTestId('progress-view-records'));

    expect(screen.getByTestId('loc').textContent).toContain('view=records');
    expect(tiles()).toHaveLength(4);
  });

  it('pusty stan (0 treningów) bez ?view: Analityka (z własnym zaproszeniem), nie EmptyState rekordów', async () => {
    fixtures.state = buildCanonicalState('empty-history', TODAY);
    renderPage('/achievements');

    await waitFor(() => expect(screen.getByTestId('analytics-embed')).toBeInTheDocument());
    expect(screen.queryByText('Rekordy pojawią się po pierwszych treningach.')).toBeNull();
  });
});
