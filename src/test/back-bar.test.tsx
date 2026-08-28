import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';

// WP-C (X35b): "nie mam jak wrócić z dołu strony". Trasy spoza dolnej nawigacji
// (Profil, Pomiary, Cykle, szczegóły ćwiczenia, edytor planu, admin) dostają
// sticky pasek "Wstecz" NAD dolnym navem. Trasy główne (bottom nav) i sesja
// treningowa (/workout/*, własny pasek RestBar/CTA w tym samym slocie) — bez paska.

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ profile: { displayName: 'Test' }, isAdmin: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('@/components/AppHeader', () => ({
  AppHeader: ({ onBack }: { onBack?: () => void }) => (
    <header data-testid="app-header" data-has-back={onBack ? 'yes' : 'no'} />
  ),
}));

vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

const Probe = ({ label }: { label: string }) => {
  const location = useLocation();
  return <div data-testid="probe">{label}:{location.pathname}</div>;
};

const renderAt = (entries: string[]) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Probe label="dashboard" />} />
          <Route path="/plan" element={<Probe label="plan" />} />
          <Route path="/history" element={<Probe label="history" />} />
          <Route path="/achievements" element={<Probe label="achievements" />} />
          <Route path="/exercises" element={<Probe label="exercises" />} />
          <Route path="/profile" element={<Probe label="profile" />} />
          <Route path="/measurements" element={<Probe label="measurements" />} />
          <Route path="/cycles" element={<Probe label="cycles" />} />
          <Route path="/plan/edit" element={<Probe label="planEdit" />} />
          <Route path="/admin" element={<Probe label="admin" />} />
          <Route path="/exercise/:slug" element={<Probe label="exercise" />} />
          <Route path="/workout/:dayId" element={<Probe label="workout" />} />
          <Route path="/new-plan" element={<Probe label="newPlan" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('BackBar: pasek "Wstecz" nad dolną nawigacją (WP-C)', () => {
  it.each(['/exercises', '/measurements', '/cycles', '/plan/edit', '/admin', '/exercise/x'])(
    'trasa spoza bottom nav %s: pasek widoczny z etykietą nav.back',
    (path) => {
      renderAt([path]);
      const bar = screen.getByTestId('back-bar');
      expect(bar).toBeTruthy();
      expect(screen.getByRole('button', { name: 'nav.back' })).toBeTruthy();
    },
  );

  it.each(['/', '/plan', '/history', '/achievements', '/profile'])(
    'trasa główna %s: bez paska',
    (path) => {
      renderAt([path]);
      expect(screen.queryByTestId('back-bar')).toBeNull();
    },
  );

  it('/profile: główna zakładka bez paska i bez strzałki w nagłówku', () => {
    renderAt(['/profile']);
    expect(screen.queryByTestId('back-bar')).toBeNull();
    expect(screen.getByTestId('app-header').getAttribute('data-has-back')).toBe('no');
    expect(screen.getByRole('main').className).toContain('7.5rem');
  });

  it('sesja treningowa (/workout/day-1): bez paska (slot 6rem zajmuje RestBar / CTA startu)', () => {
    renderAt(['/workout/day-1']);
    expect(screen.queryByTestId('back-bar')).toBeNull();
  });

  it('pełny ekran (/new-plan): bez paska', () => {
    renderAt(['/new-plan']);
    expect(screen.queryByTestId('back-bar')).toBeNull();
  });

  it('tytuł trasy na pasku dla tras z tytułem; szczegóły ćwiczenia bez tytułu (własny nagłówek strony)', () => {
    const { unmount } = renderAt(['/measurements']);
    expect(screen.getByTestId('back-bar').textContent).toContain('layout.title.measurements');
    unmount();
    renderAt(['/exercise/x']);
    expect(screen.getByTestId('back-bar').textContent).not.toContain('layout.title');
  });

  it('klik = navigate(-1), gdy jest historia (idx > 0)', () => {
    window.history.replaceState({ idx: 1 }, '');
    renderAt(['/plan', '/measurements']);
    expect(screen.getByTestId('probe').textContent).toBe('measurements:/measurements');
    fireEvent.click(screen.getByRole('button', { name: 'nav.back' }));
    expect(screen.getByTestId('probe').textContent).toBe('plan:/plan');
  });

  it('klik z deep linka (idx 0) = fallback na Dashboard', () => {
    window.history.replaceState({ idx: 0 }, '');
    renderAt(['/plan', '/measurements']);
    fireEvent.click(screen.getByRole('button', { name: 'nav.back' }));
    expect(screen.getByTestId('probe').textContent).toBe('dashboard:/');
  });

  it('gdy pasek widoczny, main ma większą rezerwę dolną (treść nie chowa się pod paskiem)', () => {
    const { unmount } = renderAt(['/measurements']);
    const withBar = screen.getByRole('main').className;
    unmount();
    renderAt(['/plan']);
    const withoutBar = screen.getByRole('main').className;
    expect(withBar).toContain('10.75rem');
    expect(withoutBar).toContain('7.5rem');
    expect(withoutBar).not.toContain('10.75rem');
  });
});

describe('Layout: sticky nagłówek na mobile (WP-C, weryfikacja Playwright 2026-08-25)', () => {
  // Przyczyna: `overflow-x: hidden` na przodku robi z niego scrollport dla
  // `position: sticky` (overflow-y liczy się wtedy jako auto), a przewija się
  // window — nagłówek jechał z treścią. `overflow-x: clip` nie tworzy scrollportu.
  it('żaden przodek nagłówka nie ma overflow-x-hidden (mobile)', () => {
    renderAt(['/profile']);
    let node: HTMLElement | null = screen.getByTestId('app-header').parentElement;
    while (node && node !== document.body) {
      expect(node.className).not.toMatch(/(^|\s)overflow-x-hidden(\s|$)/);
      node = node.parentElement;
    }
  });
});
