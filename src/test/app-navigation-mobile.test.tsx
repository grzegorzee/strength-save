import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNavigation } from '@/components/AppNavigation';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ profile: { displayName: 'Test' }, isAdmin: false }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

// __APP_VERSION__ definiuje vite.config (define); vitest.config go nie ma.
vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

describe('AppNavigation mobile', () => {
  it('D-T1: bottom nav = Dzisiaj/Plan/Historia/Postępy/Ćwiczenia, /profile poza navem', () => {
    const { container } = render(<MemoryRouter><AppNavigation /></MemoryRouter>);
    const mobileLinks = Array.from(
      container.querySelectorAll('nav[aria-label="nav.ariaMobile"] a'),
    ).map((a) => a.getAttribute('href'));
    expect(mobileLinks).toEqual(['/', '/plan', '/history', '/achievements', '/exercises']);
    expect(mobileLinks).not.toContain('/profile');
  });
});
