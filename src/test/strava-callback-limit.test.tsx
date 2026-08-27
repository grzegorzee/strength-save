import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));

import StravaCallback from '@/pages/StravaCallback';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

const renderCallback = (query: string) => render(
  <MemoryRouter initialEntries={[`/strava/callback?${query}`]}>
    <LanguageProvider>
      <Routes>
        <Route path="/strava/callback" element={<StravaCallback />} />
        <Route path="/profile" element={<LocationProbe />} />
      </Routes>
    </LanguageProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('recovery po odmowie OAuth Strava', () => {
  it('limit atletów wyjaśnia problem integracji i potwierdza, że apka działa bez Stravy', () => {
    renderCallback('error=athlete_limit_exceeded');

    expect(screen.getByText(/limit.*(?:integracji|podłączonych kont)/i)).toBeTruthy();
    expect(screen.getByText(/(?:aplikacja|Strength Save).*działa.*bez Strav/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /wróć|powrót/i }));
    expect(screen.getByTestId('location').textContent).toBe('/profile?section=connections');
  });

  it('zwykłe access_denied zachowuje ogólny komunikat i tę samą ścieżkę wyjścia', () => {
    renderCallback('error=access_denied');

    expect(screen.getByText(/Autoryzacja została odrzucona/i)).toBeTruthy();
    expect(screen.queryByText(/limit.*(?:integracji|podłączonych kont)/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /wróć|powrót/i }));
    expect(screen.getByTestId('location').textContent).toBe('/profile?section=connections');
  });
});
