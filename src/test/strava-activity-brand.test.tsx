import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { StravaActivity, UnifiedActivity } from '@/types/strava';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { StravaActivityDetail } from '@/components/StravaActivityDetail';
import { StravaSummaryStats } from '@/components/strava/StravaSummaryStats';

const activity: StravaActivity = {
  id: 'local-doc-id',
  userId: 'u1',
  stravaId: 987654321,
  name: 'Poranny bieg',
  type: 'Run',
  date: '2026-08-27',
  distance: 5000,
  movingTime: 1500,
  elapsedTime: 1600,
  averageSpeed: 3.33,
  calories: 350,
  stravaUrl: 'https://example.invalid/stale-or-untrusted-url',
  syncedAt: '2026-08-27T08:00:00Z',
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>,
  );

const expectPoweredByStrava = (root: HTMLElement) => {
  const image = within(root).getByRole('img', { name: /Powered by Strava/i });
  expect(image.getAttribute('src')).toMatch(/strava/i);
};

beforeAll(() => {
  // Radix Sheet korzysta z tych API w jsdom.
  Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  });
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('Powered by Strava przy danych dostawcy', () => {
  it('StravaSummaryStats zawiera oficjalną atrybucję', () => {
    const { container } = renderWithProviders(<StravaSummaryStats activities={[activity]} />);
    expectPoweredByStrava(container);
  });

  it('StravaActivityCard zawiera oficjalną atrybucję', () => {
    const { container } = renderWithProviders(<StravaActivityCard activity={activity} />);
    expectPoweredByStrava(container);
  });

  it('StravaActivityDetail zawiera oficjalną atrybucję', () => {
    renderWithProviders(
      <StravaActivityDetail activity={activity} open onOpenChange={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog');
    expectPoweredByStrava(dialog);
  });

  it('manualna aktywność nie podszywa się pod Stravę i nie ma jej atrybucji', () => {
    const manualActivity: UnifiedActivity = {
      ...activity,
      id: 'manual-1',
      stravaId: 0,
      source: 'manual',
      name: 'Ręczny spacer',
      stravaUrl: '',
    };
    renderWithProviders(<StravaActivityCard activity={manualActivity} onEdit={vi.fn()} />);

    const card = screen.getByTestId('manual-activity-card');
    expect(within(card).queryByRole('img', { name: /Powered by Strava/i })).toBeNull();
    expect(within(card).queryByText(/^Strava$/i)).toBeNull();
  });
});

describe('kanoniczny link View on Strava', () => {
  it('buduje URL ze stravaId i otwiera go poza WebView z ochroną opener', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithProviders(
      <StravaActivityDetail activity={activity} open onOpenChange={vi.fn()} />,
    );

    const link = screen.getByRole('link', { name: /View on Strava|Zobacz w Strava/i });
    expect(link.getAttribute('href')).toBe('https://www.strava.com/activities/987654321');
    fireEvent.click(link);

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.strava.com/activities/987654321',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });
});
