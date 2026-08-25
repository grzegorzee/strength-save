import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// WP-B (X27): dialog usunięcia konta — word gate + copy o nieodwracalności.
// Wymogi: (a) przycisk potwierdzenia zablokowany do wpisania słowa PL "USUŃ"
// (EN "DELETE"), (b) copy mówi wprost, że operacji nie można cofnąć, oraz
// o 30-dniowej karencji z anulowaniem przez kontakt.

// Vite define nie działa w vitest bez wpisu w configu — stub lokalny.
vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  updateDoc: vi.fn(async () => {}),
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => {}),
  getDownloadURL: vi.fn(async () => ''),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, storage: {} }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
  }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: { displayName: 'Tester', email: 'tester@example.com', photoURL: null },
    isAdmin: false,
  }),
}));
const authFixture = vi.hoisted(() => ({
  logoutAfterAccountDeletion: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    logoutAfterAccountDeletion: authFixture.logoutAfterAccountDeletion,
    resetPassword: vi.fn(async () => true),
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [] }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
// deleteOwnAccount ma w E2E mode short-circuity (registration-api.ts) — w vitest
// mockujemy cały moduł, żeby test nie dotykał Firebase.
const registrationFixture = vi.hoisted(() => ({
  deleteOwnAccount: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/lib/registration-api', () => ({
  deleteOwnAccount: registrationFixture.deleteOwnAccount,
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: false, tier: 'none', startedAt: null, expiresAt: null, subscription: null,
  }),
  isPaywallPlatform: () => false,
}));
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
vi.mock('@/lib/push-notifications', () => ({
  getPushPermission: vi.fn(async () => 'granted'),
}));

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
vi.mock('@/hooks/useSyncCenterEntries', () => ({ useSyncCenterEntries: () => ({ listedEntries: [] }) }));

import Profile from '@/pages/Profile';

const renderProfile = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Profile />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

const openDeleteDialog = async () => {
  const view = renderProfile();
  fireEvent.click(view.getByText('Usuń konto i wszystkie dane'));
  const confirmButton = (await view.findByText('Usuń trwale')).closest('button') as HTMLButtonElement;
  const input = view.getByLabelText(/Wpisz USUŃ, aby potwierdzić/) as HTMLInputElement;
  return { view, confirmButton, input };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  registrationFixture.deleteOwnAccount.mockClear();
});

describe('WP-B: dialog usunięcia konta (word gate + nieodwracalność)', () => {
  it('przycisk zablokowany przy pustym polu i przy złym słowie', async () => {
    const { view, confirmButton, input } = await openDeleteDialog();
    expect(confirmButton.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'KASUJ' } });
    expect(confirmButton.disabled).toBe(true);

    fireEvent.click(confirmButton);
    expect(registrationFixture.deleteOwnAccount).not.toHaveBeenCalled();
    view.unmount();
  });

  it('poprawne słowo (niezależnie od wielkości liter) odblokowuje przycisk', async () => {
    const { view, confirmButton, input } = await openDeleteDialog();
    fireEvent.change(input, { target: { value: 'usuń' } });
    expect(confirmButton.disabled).toBe(false);

    fireEvent.click(confirmButton);
    await waitFor(() => expect(registrationFixture.deleteOwnAccount).toHaveBeenCalledTimes(1));
    view.unmount();
  });

  it('copy dialogu: nieodwracalność wprost + 30 dni + kontakt do anulowania', async () => {
    const { view } = await openDeleteDialog();
    expect(view.getByText(/nie można cofnąć/)).toBeTruthy();
    expect(view.getByText(/30 dni/)).toBeTruthy();
    expect(view.getByText(/contact@strengthsave\.app/)).toBeTruthy();
    view.unmount();
  });
});
