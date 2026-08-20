import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';

// T7: ręczny sync zniknął z Analityki→Strava (dało się go spamować i palić
// limit API), ale ZOSTAJE w Ustawieniach (niezmiennik reguły 5 — nowa zmiana
// nie zabiera istniejącego przepływu zaawansowanego).

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
vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({
    activities: [],
    isLoaded: true,
    connection: { connected: true, athleteName: 'Test Athlete' },
    isSyncing: false,
    error: null,
    connectStrava: vi.fn(),
    syncActivities: syncActivitiesSpy,
    saveMaxHR: vi.fn(),
    disconnectStrava: vi.fn(),
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
    exportData: vi.fn(),
    importData: vi.fn(),
    cleanupEmptyWorkouts: vi.fn(),
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ cycles: [], mergeContinuousCycles: vi.fn() }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], isCustom: false, planDurationWeeks: 12, planStartDate: null }),
}));
vi.mock('@/hooks/useSyncCenterEntries', () => ({
  useSyncCenterEntries: () => ({ listedEntries: [] }),
}));

// Ciężkie sekcje Ustawień nieistotne dla inwariantu — wycięte.
vi.mock('@/components/NotificationSettings', () => ({ NotificationSettings: () => null }));
vi.mock('@/components/ConsentSettings', () => ({ ConsentSettings: () => null }));
vi.mock('@/components/PlateCalculatorSheet', () => ({ PlateInventorySettings: () => null }));
vi.mock('@/components/RestSettingsCard', () => ({ RestSettingsCard: () => null }));
vi.mock('@/components/WorkoutImportWizard', () => ({ WorkoutImportWizard: () => null }));
vi.mock('@/components/HealthSettings', () => ({ HealthSettings: () => null }));
vi.mock('@/components/GarminSettings', () => ({ GarminSettings: () => null }));
vi.mock('@/components/SyncCenterCard', () => ({ SyncCenterCard: () => null }));
vi.mock('@/components/DataManagement', () => ({ DataManagement: () => null, DataRepairTools: () => null }));
vi.mock('@/components/ExportWorkoutsDialog', () => ({ ExportWorkoutsDialog: () => null }));

import { StravaTab } from '@/components/strava/StravaTab';
import Settings from '@/pages/Settings';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('ręczny sync Stravy (T7)', () => {
  it('StravaTab (Analityka) NIE renderuje przycisku synchronizacji, Rozłącz zostaje', () => {
    renderWithProviders(<StravaTab />);

    expect(screen.queryByRole('button', { name: /Synchronizuj/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Rozłącz/ })).toBeTruthy();
  });

  it('Ustawienia NADAL mają przycisk synchronizacji (niezmiennik reguły 5)', () => {
    renderWithProviders(<Settings />);

    expect(screen.getByRole('button', { name: /Synchronizuj/ })).toBeTruthy();
  });

  // Fala 2 (redesign Profilu): deep-linki ?section=connections / ?section=strava
  // z grupy Połączenia w Profilu potrzebują kotwic w Ustawieniach.
  it('kotwice sekcji połączeń: settings-connections i settings-strava istnieją', () => {
    const { container } = renderWithProviders(<Settings />);

    expect(container.querySelector('#settings-connections')).toBeTruthy();
    expect(container.querySelector('#settings-strava')).toBeTruthy();
  });
});
