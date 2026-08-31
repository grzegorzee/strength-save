// X50: Postępy mają jeden główny poziom Podsumowanie / Wykresy / Rekordy.
// Rekordy renderują pełną treść bez kafla pośredniego; odznaki i tygodnie
// pozostają w menu wtórnym. Stare deep linki nadal działają.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('niezmienniki treści Postępów', () => {
  it('Rekordy pokazują trzy metryki i obie listy bez kafla pośredniego', () => {
    renderPage('/achievements?view=records');

    expect(screen.getByText('Ukończone treningi')).toBeInTheDocument();
    expect(screen.getByText('Tonaż całkowity')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczeń z rekordem')).toBeInTheDocument();
    expect(screen.getByText('Rekordy wszystkich ćwiczeń')).toBeInTheDocument();
    expect(screen.getByText('Rekordy osobiste (szacowane 1RM)')).toBeInTheDocument();
    expect(screen.queryAllByTestId('progress-section-tile')).toHaveLength(0);
  });

  it('stary deep link ?section=records nadal pokazuje komplet rekordów', () => {
    renderPage('/achievements?view=records&section=records');
    expect(screen.getByText('Rekordy wszystkich ćwiczeń')).toBeInTheDocument();
    expect(screen.getByText('Rekordy osobiste (szacowane 1RM)')).toBeInTheDocument();
  });

  it('?section=badges nadal pokazuje kamienie milowe i odznaki specjalne', () => {
    renderPage('/achievements?section=badges');
    expect(screen.getByRole('heading', { level: 1, name: 'Odznaki' })).toBeInTheDocument();
    expect(screen.getByText('Odznaki specjalne')).toBeInTheDocument();
  });

  it('pusty widok Rekordów zachowuje zaproszenie do pierwszego treningu', () => {
    fixtures.state = buildCanonicalState('empty-history', TODAY);
    renderPage('/achievements?view=records');
    expect(screen.getByText('Rekordy pojawią się po pierwszych treningach.')).toBeInTheDocument();
  });

  it('/achievements domyślnie renderuje osadzone Podsumowanie', async () => {
    renderPage('/achievements');
    await waitFor(() => expect(screen.getByTestId('analytics-embed')).toBeInTheDocument());
    expect(screen.getByTestId('progress-view-summary')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('X50: płaska nawigacja mobilnych Postępów', () => {
  it('ma jeden główny poziom: Podsumowanie, Wykresy i Rekordy', () => {
    renderPage('/achievements');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Wyniki', 'Wykresy', 'Rekordy']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('Wykresy ustawiają bezpośredni deep link, a Rekordy pokazują listy bez kafla pośredniego', () => {
    renderPage('/achievements');

    fireEvent.click(screen.getByRole('tab', { name: 'Wykresy' }));
    expect(screen.getByTestId('loc').textContent).toContain('tab=charts');

    fireEvent.click(screen.getByRole('tab', { name: 'Rekordy' }));
    expect(screen.getByText('Rekordy wszystkich ćwiczeń')).toBeInTheDocument();
    expect(screen.queryAllByTestId('progress-section-tile')).toHaveLength(0);
  });

  it('funkcje poboczne zostają osiągalne z menu Więcej', () => {
    renderPage('/achievements');

    const trigger = screen.getByTestId('progress-more-trigger');
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(trigger);

    expect(screen.queryByRole('menuitem', { name: 'Szczegóły' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Tygodnie' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Odznaki' })).toBeInTheDocument();
  });

  it('stary deep link Szczegółów nie przywraca usuniętej zakładki w shellu', async () => {
    renderPage('/achievements?view=analytics&tab=details');

    await waitFor(() => expect(screen.getByTestId('analytics-embed')).toBeInTheDocument());
    expect(screen.getByTestId('progress-view-summary')).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('menuitem', { name: 'Szczegóły' })).not.toBeInTheDocument();
  });
});
