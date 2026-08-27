import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: {}, isAdmin: false, canUseStrava: true }),
}));

const connectStravaSpy = vi.hoisted(() => vi.fn<() => Promise<void>>());
const stravaState = vi.hoisted(() => ({
  connected: false,
  activities: [] as unknown[],
}));

vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({
    activities: stravaState.activities,
    isLoaded: true,
    connection: stravaState.connected
      ? { connected: true, athleteName: 'Test Athlete' }
      : { connected: false },
    isSyncing: false,
    error: null,
    connectStrava: connectStravaSpy,
    syncActivities: vi.fn(),
    saveMaxHR: vi.fn(),
    disconnectStrava: vi.fn(),
    nextSyncAvailableAt: null,
  }),
}));
vi.mock('@/hooks/useManualActivities', () => ({
  useManualActivities: () => ({ activities: [], isLoaded: true }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], isLoaded: true }),
}));

// Te wykresy nie są przedmiotem kontraktu CTA. Mock zapobiega też temu, by
// atrybucja z komponentu potomnego fałszywie spełniła test stopki StravaTab.
vi.mock('@/components/strava/SeasonFilter', () => ({ SeasonFilter: () => null }));
vi.mock('@/components/strava/StravaSummaryStats', () => ({ StravaSummaryStats: () => null }));
vi.mock('@/components/strava/WeeklyKmChart', () => ({ WeeklyKmChart: () => null }));
vi.mock('@/components/strava/PaceTrendChart', () => ({ PaceTrendChart: () => null }));
vi.mock('@/components/strava/ElevationChart', () => ({ ElevationChart: () => null }));
vi.mock('@/components/strava/CaloriesChart', () => ({ CaloriesChart: () => null }));
vi.mock('@/components/strava/CardioPersonalBests', () => ({ CardioPersonalBests: () => null }));
vi.mock('@/components/strava/HRZoneDistribution', () => ({ HRZoneDistribution: () => null }));
vi.mock('@/components/strava/RacePredictor', () => ({ RacePredictor: () => null }));
vi.mock('@/components/strava/TrainingLoadChart', () => ({ TrainingLoadChart: () => null }));
vi.mock('@/components/strava/MonthlyActivities', () => ({ MonthlyActivities: () => null }));

import { StravaConnectionCard } from '@/components/StravaConnectionCard';
import { StravaTab } from '@/components/strava/StravaTab';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>,
  );

const expectOfficialConnectButton = (button: HTMLElement) => {
  const accessibleLabel = button.getAttribute('aria-label') ?? '';
  expect(accessibleLabel).toMatch(/Strav/i);
  const image = within(button).getByRole('img');
  expect(image.getAttribute('src')).toMatch(/strava/i);
  // Oficjalny asset zawiera już copy; aplikacja nie dubluje własnego tekstu.
  expect(button.textContent?.trim()).toBe('');
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  stravaState.connected = false;
  stravaState.activities = [];
  connectStravaSpy.mockReset();
  connectStravaSpy.mockResolvedValue(undefined);
});

describe('oficjalny przycisk Connect with Strava', () => {
  it.each([
    ['Profil → Połączenia', <StravaConnectionCard />],
    ['Analityka → Strava', <StravaTab />],
  ])('%s używa obrazka Stravy, ma nazwę dostępną i zachowuje handler', async (_name, ui) => {
    renderWithProviders(ui);

    const button = screen.getByRole('button', { name: /Strav/i });
    expectOfficialConnectButton(button);
    fireEvent.click(button);

    expect(connectStravaSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it.each([
    ['Profil → Połączenia', <StravaConnectionCard />],
    ['Analityka → Strava', <StravaTab />],
  ])('%s blokuje ponowne kliknięcie podczas rozpoczętego OAuth', async (_name, ui) => {
    let finishConnect!: () => void;
    connectStravaSpy.mockReturnValue(new Promise<void>((resolve) => { finishConnect = resolve; }));
    renderWithProviders(ui);

    const button = screen.getByRole('button', { name: /Strav/i }) as HTMLButtonElement;
    fireEvent.click(button);

    await waitFor(() => expect(button.disabled).toBe(true));
    fireEvent.click(button);
    expect(connectStravaSpy).toHaveBeenCalledTimes(1);

    finishConnect();
    await waitFor(() => expect(button.disabled).toBe(false));
  });
});

describe('atrybucja połączonego ekranu Strava', () => {
  it('StravaTab ma własne oficjalne Powered by Strava, niezależne od dzieci', () => {
    stravaState.connected = true;
    renderWithProviders(<StravaTab />);

    const attribution = screen.getByRole('img', { name: /Powered by Strava/i });
    expect(attribution.getAttribute('src')).toMatch(/strava/i);
  });
});
