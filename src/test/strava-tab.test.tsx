import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// T7: ręczny sync zniknął z Analityki→Strava (dało się go spamować i palić
// limit API), ale ZOSTAJE w panelu Strava (niezmiennik reguły 5 — nowa zmiana
// nie zabiera istniejącego przepływu zaawansowanego). X35b: panel mieszka w
// Profilu (sekcja Połączenia) jako StravaConnectionCard, dawniej /settings.

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

const syncActivitiesSpy = vi.hoisted(() => vi.fn(async () => ({ ok: true, synced: 0, totalFetched: 0, alreadyExisted: 0, lookbackDays: 7 })));
// X27/WP-C: mutowalny stan mocka — testy cooldownu i filtra typów podstawiają
// własne aktywności / nextSyncAvailableAt bez dublowania całego mocka.
const stravaMockState = vi.hoisted(() => ({
  activities: [] as unknown[],
  nextSyncAvailableAt: null as Date | null,
  connection: { connected: true, athleteName: 'Test Athlete' } as Record<string, unknown>,
}));
const connectStravaSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({
    activities: stravaMockState.activities,
    isLoaded: true,
    connection: stravaMockState.connection,
    isSyncing: false,
    error: null,
    connectStrava: connectStravaSpy,
    syncActivities: syncActivitiesSpy,
    saveMaxHR: vi.fn(),
    disconnectStrava: vi.fn(),
    nextSyncAvailableAt: stravaMockState.nextSyncAvailableAt,
  }),
}));
vi.mock('@/hooks/useManualActivities', () => ({
  useManualActivities: () => ({
    activities: [],
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
    isLoaded: true,
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [],
    isLoaded: true,
  }),
}));

import { StravaTab } from '@/components/strava/StravaTab';
import { StravaConnectionCard } from '@/components/StravaConnectionCard';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>,
  );

// X27: recharts ResponsiveContainer wymaga ResizeObserver, którego jsdom nie ma —
// stub lokalny dla testów renderujących StravaTab z aktywnościami (wykresy montują się).
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  stravaMockState.activities = [];
  stravaMockState.nextSyncAvailableAt = null;
  stravaMockState.connection = { connected: true, athleteName: 'Test Athlete' };
  connectStravaSpy.mockReset();
  syncActivitiesSpy.mockClear();
});

// F5b (2026-09-29): sync stał od 22.08 (403 Application Inactive, job
// wstrzymany), a panel mówił tylko „Połączono". Każdy stan błędu ma wyjście.
describe('stan synchronizacji Stravy (F5b)', () => {
  const recent = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

  it('aplikacja zablokowana przez Stravę: komunikat, data ostatniego syncu i „Sprawdź teraz"', () => {
    stravaMockState.connection = {
      connected: true, athleteName: 'Test Athlete', lastSync: '2026-08-22T08:00:08.263Z',
      syncError: { kind: 'app_inactive', at: '2026-08-31T08:00:06.014Z' },
    };
    renderWithProviders(<StravaConnectionCard />);
    const notice = screen.getByTestId('strava-sync-notice');
    expect(notice).toHaveTextContent('Synchronizacja Stravy nie działa');
    expect(notice).toHaveTextContent('Strava zablokowała dostęp');
    expect(notice).toHaveTextContent('22 sie 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź teraz' }));
    expect(syncActivitiesSpy).toHaveBeenCalledTimes(1);
  });

  it('cofnięty dostęp: przycisk „Połącz ponownie Stravę" w panelu i w zakładce Strava', () => {
    stravaMockState.connection = {
      connected: true, lastSync: recent(), syncError: { kind: 'reauth_required', at: new Date().toISOString() },
    };
    const view = renderWithProviders(<StravaConnectionCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Połącz ponownie Stravę' }));
    expect(connectStravaSpy).toHaveBeenCalledTimes(1);
    view.unmount();
    renderWithProviders(<StravaTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Połącz ponownie Stravę' }));
    expect(connectStravaSpy).toHaveBeenCalledTimes(2);
    // Niezmiennik T7: zakładka nadal bez ręcznego syncu.
    expect(screen.queryByRole('button', { name: /Synchronizuj|Sprawdź teraz/ })).toBeNull();
  });

  it('zastój bez zapisanego błędu (job nie odpala) też jest widoczny', () => {
    stravaMockState.connection = { connected: true, lastSync: new Date(Date.now() - 5 * 24 * 3600_000).toISOString() };
    renderWithProviders(<StravaConnectionCard />);
    expect(screen.getByTestId('strava-sync-notice')).toHaveTextContent('Nowe aktywności nie spłynęły od 5 dni');
    expect((screen.getByRole('button', { name: 'Sprawdź teraz' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('w zakładce Strava błąd bez akcji usera wskazuje, gdzie ponowić', () => {
    stravaMockState.connection = {
      connected: true, lastSync: '2026-08-22T08:00:08.263Z', syncError: { kind: 'app_inactive', at: '2026-08-31T08:00:06.014Z' },
    };
    renderWithProviders(<StravaTab />);
    expect(screen.getByTestId('strava-sync-notice')).toHaveTextContent('Profil → Urządzenia i połączenia');
  });

  it('zdrowy sync: brak komunikatu', () => {
    stravaMockState.connection = { connected: true, lastSync: recent() };
    renderWithProviders(<StravaConnectionCard />);
    expect(screen.queryByTestId('strava-sync-notice')).toBeNull();
  });
});

describe('ręczny sync Stravy (T7)', () => {
  it('StravaTab (Analityka) NIE renderuje przycisku synchronizacji, Rozłącz zostaje', () => {
    renderWithProviders(<StravaTab />);

    expect(screen.queryByRole('button', { name: /Synchronizuj/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Rozłącz/ })).toBeTruthy();
  });

  it('panel Strava (Profil → Połączenia) NADAL ma przycisk synchronizacji (niezmiennik reguły 5)', () => {
    renderWithProviders(<StravaConnectionCard />);

    expect(screen.getByRole('button', { name: /Synchronizuj/ })).toBeTruthy();
  });
});

// X27/WP-C: ręczny sync maks. raz na dobę — UI odzwierciedla serwerowy cooldown
// (users/{uid}.stravaLastSync + 24 h) zamiast pozwalać klikać w pustkę.
describe('cooldown 24 h ręcznego syncu w panelu Strava (X27/WP-C)', () => {
  it('przycisk disabled + podpis z godziną odblokowania, gdy cooldown aktywny', () => {
    stravaMockState.nextSyncAvailableAt = new Date(Date.now() + 3600_000);
    renderWithProviders(<StravaConnectionCard />);

    const btn = screen.getByRole('button', { name: /Synchronizuj/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/Sync dostępny/)).toBeTruthy();
  });

  it('przycisk enabled bez podpisu, gdy cooldown minął', () => {
    renderWithProviders(<StravaConnectionCard />);

    const btn = screen.getByRole('button', { name: /Synchronizuj/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.queryByText(/Sync dostępny/)).toBeNull();
  });
});

// X27/WP-C: chipsy filtra typu nad listą aktywności — spacery odróżnialne od
// biegów. Filtr dotyczy LISTY (statystyki nad nią zostają liczone z całości).
describe('filtr typów w widoku Strava (X27/WP-C)', () => {
  const makeStravaActivity = (over: Record<string, unknown>) => ({
    id: 'a1',
    userId: 'u1',
    stravaId: 1,
    name: 'Act',
    type: 'Run',
    date: '2026-08-10',
    distance: 5000,
    movingTime: 1500,
    averageSpeed: 3.33,
    stravaUrl: 'https://strava.com/1',
    syncedAt: '2026-08-10T10:00:00Z',
    ...over,
  });

  beforeEach(() => {
    const now = new Date();
    const ymd = (day: number) =>
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    stravaMockState.activities = [
      makeStravaActivity({ id: 'r1', stravaId: 1, name: 'Bieg testowy', type: 'Run', date: ymd(2) }),
      makeStravaActivity({ id: 'w1', stravaId: 2, name: 'Spacer testowy', type: 'Walk', date: ymd(3), movingTime: 3600 }),
    ];
  });

  it('renderuje chipsy Wszystko/Biegi/Spacery/Rower/Inne', () => {
    renderWithProviders(<StravaTab />);

    for (const label of ['Wszystko', 'Biegi', 'Spacery', 'Rower', 'Inne']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('po wyborze "Biegi" lista miesiąca zawiera tylko run-like', () => {
    renderWithProviders(<StravaTab />);

    expect(screen.getByText(/2 akt\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Biegi' }));
    expect(screen.getByText(/1 akt\./)).toBeTruthy();
    expect(screen.queryByText(/2 akt\./)).toBeNull();

    // otwarcie akordeonu miesiąca: bieg jest, spaceru nie ma
    fireEvent.click(screen.getByText(/1 akt\./));
    expect(screen.getByText('Bieg testowy')).toBeTruthy();
    expect(screen.queryByText('Spacer testowy')).toBeNull();
  });
});
