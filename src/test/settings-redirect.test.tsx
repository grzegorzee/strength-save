import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsRedirect } from '@/components/SettingsRedirect';
import { legacySettingsPath } from '@/lib/settings-redirect';

// X35b (WP-B): strona /settings zniknęła. Stare deep linki (powiadomienia,
// karty Pomiarów, StravaCallback) muszą lądować na kotwicach Profilu.

const Probe = () => {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}{location.search}</div>;
};

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/settings" element={<SettingsRedirect />} />
        <Route path="/profile" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('legacySettingsPath: mapa starych sekcji Ustawień na kotwice Profilu', () => {
  it.each([
    ['notifications', '/profile?section=notifications'],
    ['connections', '/profile?section=devices'],
    ['strava', '/profile?section=devices'],
    ['consents', '/profile?section=consents'],
    ['data', '/profile?section=backup'],
    ['account', '/profile?section=account'],
  ])('%s → %s', (section, expected) => {
    expect(legacySettingsPath(section)).toBe(expected);
  });

  it('bez sekcji i dla nieznanej sekcji → sam Profil', () => {
    expect(legacySettingsPath(null)).toBe('/profile');
    expect(legacySettingsPath('nie-ma-takiej')).toBe('/profile');
  });
});

describe('trasa /settings → redirect do Profilu', () => {
  it('/settings?section=notifications ląduje na /profile?section=notifications (deep link z powiadomienia)', () => {
    renderAt('/settings?section=notifications');
    expect(screen.getByTestId('path').textContent).toBe('/profile?section=notifications');
  });

  it('/settings?section=data (Pomiary → Backup) ląduje na kotwicy backup', () => {
    renderAt('/settings?section=data');
    expect(screen.getByTestId('path').textContent).toBe('/profile?section=backup');
  });

  it('gołe /settings ląduje na /profile', () => {
    renderAt('/settings');
    expect(screen.getByTestId('path').textContent).toBe('/profile');
  });
});
