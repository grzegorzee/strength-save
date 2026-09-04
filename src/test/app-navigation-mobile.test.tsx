import { describe, expect, it, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNavigation } from '@/components/AppNavigation';
import { translate, type LanguageCode } from '@/i18n';
import { MAIN_DESTINATIONS } from '@/lib/main-navigation';

let activeLanguage: LanguageCode = 'pl';
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: Parameters<typeof translate>[1]) => translate(activeLanguage, key),
    lang: activeLanguage,
  }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ profile: { displayName: 'Test' }, isAdmin: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

// __APP_VERSION__ definiuje vite.config (define); vitest.config go nie ma.
vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

describe('AppNavigation mobile', () => {
  it.each([
    ['pl', ['Dzisiaj', 'Pomiary', 'Plan', 'Historia', 'Postępy', 'Profil']],
    ['en', ['Today', 'Body', 'Plan', 'History', 'Progress', 'Profile']],
  ] as const)('D-T1: %s renderuje pięć pełnych etykiet bez heurystycznego skracania', (lang, labels) => {
    activeLanguage = lang;
    const { container } = render(<MemoryRouter><AppNavigation /></MemoryRouter>);
    const mobileNav = container.querySelector(
      `nav[aria-label="${translate(lang, 'nav.ariaMobile')}"]`,
    ) as HTMLElement;
    const mobileLinks = Array.from(mobileNav.querySelectorAll('a'))
      .map((a) => a.getAttribute('href'));
    expect(mobileLinks).toEqual(MAIN_DESTINATIONS.map((item) => item.path));
    expect(mobileLinks).not.toContain('/exercises');
    for (const label of labels) {
      expect(within(mobileNav).getByText(label)).toBeTruthy();
    }
  });

  it('oznacza aktywną zakładkę i zachowuje co najmniej 44 px obszaru dotyku', () => {
    activeLanguage = 'pl';
    const { container } = render(
      <MemoryRouter initialEntries={['/history']}><AppNavigation /></MemoryRouter>,
    );
    const mobileNav = container.querySelector(
      `nav[aria-label="${translate('pl', 'nav.ariaMobile')}"]`,
    ) as HTMLElement;

    const active = within(mobileNav).getByRole('link', { name: /Historia/i });
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.className).toContain('min-h-11');
  });
});
