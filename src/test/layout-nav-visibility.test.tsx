import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';

// WP-D (X29): dolna nawigacja ma być widoczna na WSZYSTKICH trasach w Layout,
// także w focused flow (/workout/*, /exercise/*). Header w focused flow pozostaje
// ukryty (fokus na treningu, ekran ma własny przycisk wstecz). Pełnoekranowe
// trasy (/new-plan, /paywall) nie mają ani nav, ani headera (early return).

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ profile: { displayName: 'Test' }, isAdmin: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
// AppHeader ciągnie hooki Firestore (workouts, agregaty, dzwonek) — testujemy
// DECYZJĘ Layoutu o jego renderowaniu, nie wnętrze headera.
vi.mock('@/components/AppHeader', () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>dashboard</div>} />
          <Route path="/plan" element={<div>plan</div>} />
          <Route path="/workout/:dayId" element={<div>workout content</div>} />
          <Route path="/exercise/:exerciseId" element={<div>exercise content</div>} />
          <Route path="/new-plan" element={<div>new plan</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const mobileNav = (container: HTMLElement) =>
  container.querySelector('nav[aria-label="nav.ariaMobile"]');

describe('Layout: widoczność bottom nav i headera (WP-D)', () => {
  it('sesja treningowa (/workout/day-1): nav obecny, header ukryty', () => {
    const { container, queryByTestId } = renderAt('/workout/day-1');
    expect(mobileNav(container)).not.toBeNull();
    expect(queryByTestId('app-header')).toBeNull();
  });

  it('szczegół ćwiczenia (/exercise/ex-1): nav obecny, header ukryty', () => {
    const { container, queryByTestId } = renderAt('/exercise/ex-1');
    expect(mobileNav(container)).not.toBeNull();
    expect(queryByTestId('app-header')).toBeNull();
  });

  it('zwykła trasa (/plan): nav i header obecne', () => {
    const { container, queryByTestId } = renderAt('/plan');
    expect(mobileNav(container)).not.toBeNull();
    expect(queryByTestId('app-header')).not.toBeNull();
  });

  it('pełny ekran (/new-plan): bez nav i bez headera', () => {
    const { container, queryByTestId } = renderAt('/new-plan');
    expect(mobileNav(container)).toBeNull();
    expect(queryByTestId('app-header')).toBeNull();
  });
});
