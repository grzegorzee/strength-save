import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// Profil służy tożsamości i ustawieniom. Metryki oraz odznaki mają własny ekran.

vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

const workoutsFixture = vi.hoisted(() =>
  Array.from({ length: 10 }, (_, i) => ({
    id: `w${i}`,
    date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    dayId: 'day-1',
    dayName: 'Poniedziałek',
    completed: true,
    exercises: [{ exerciseId: 'e1', sets: [{ reps: 10, weight: 50, completed: true }] }],
  })),
);

vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc: vi.fn(async () => {}) }));
vi.mock('firebase/storage', () => ({ ref: vi.fn(() => ({})), uploadBytes: vi.fn(async () => {}), getDownloadURL: vi.fn(async () => '') }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
  }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester', email: 't@e.com', photoURL: null }, isAdmin: false }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn(), logoutAfterAccountDeletion: vi.fn(), resetPassword: vi.fn(async () => true) }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: workoutsFixture }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/registration-api', () => ({ deleteOwnAccount: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, tier: 'none', startedAt: null, expiresAt: null, subscription: null }),
  isPaywallPlatform: () => false,
}));
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
vi.mock('@/lib/push-notifications', () => ({ getPushPermission: vi.fn(async () => 'granted') }));

// X35b: karty z dawnych Ustawień w Profilu — poza zakresem tego testu, wycięte.
vi.mock('@/components/NotificationSettings', () => ({ NotificationSettings: () => null }));
vi.mock('@/components/HealthSettings', () => ({ HealthSettings: () => null }));
vi.mock('@/components/GarminSettings', () => ({ GarminSettings: () => null }));
vi.mock('@/components/RestSettingsCard', () => ({ RestSettingsCard: () => null }));
vi.mock('@/components/PlateCalculatorSheet', () => ({ PlateInventorySettings: () => null }));
vi.mock('@/components/StravaConnectionCard', () => ({ StravaConnectionCard: () => null }));
vi.mock('@/components/BackupSettings', () => ({ BackupSettings: () => null }));
vi.mock('@/components/ConsentSettings', () => ({ ConsentSettings: () => null }));
vi.mock('@/components/SyncCenterCard', () => ({ SyncCenterCard: () => null }));
vi.mock('@/hooks/useSyncCenterEntries', () => ({ useSyncCenterEntries: () => ({ listedEntries: [], attentionEntries: [] }) }));

import Profile from '@/pages/Profile';

const renderProfile = () => {
  localStorage.setItem('app-language', 'pl');
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Routes>
            <Route path="*" element={<><Profile /><LocationProbe /></>} />
          </Routes>
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
};

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="profile-location">{`${location.pathname}${location.search}`}</output>;
};

describe('Profil: tożsamość i ustawienia bez duplikowania postępów', () => {
  it('po tożsamości zaczynają się ustawienia, bez sekcji i kafli metryk', () => {
    const { container } = renderProfile();
    const sections = Array.from(container.querySelectorAll('section'));

    expect(sections[0]?.id).toBe('profile-identity');
    expect(sections[1]?.id).toBe('profile-training');
    expect(container.querySelector('#profile-pride')).toBeNull();
    ['workouts', 'streak', 'tonnage', 'sets'].forEach((key) => {
      expect(screen.queryByTestId(`profile-pride-${key}`)).toBeNull();
    });
    expect(screen.queryByTestId('chip-tier')).toBeNull();
    expect(screen.queryByTestId('tier-progress')).toBeNull();
    expect(screen.getByText('10 treningów')).toBeInTheDocument();
  });

  it('ustawienia danych nie dublują Historii ani Postępów z dolnej nawigacji', () => {
    renderProfile();
    fireEvent.click(screen.getByTestId('profile-toggle-data'));
    const dataSection = screen.getByTestId('profile-section-data');
    expect(within(dataSection).queryByText('Historia')).toBeNull();
    expect(within(dataSection).queryByText('Postępy')).toBeNull();
    expect(within(dataSection).getByText('Pomiary ciała')).toBeInTheDocument();
  });
});
