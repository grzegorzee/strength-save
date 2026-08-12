import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PRO-D T6: sekcja dumy w Profilu (3 najwyższe zdobyte odznaki) + brak sekcji przy zeru.

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

import Profile from '@/pages/Profile';

describe('Profil: sekcja dumy (PRO-D T6)', () => {
  it('przy zdobytych odznakach renderuje rząd odznak i link Wszystkie', () => {
    localStorage.setItem('app-language', 'pl');
    const { getByText, getAllByTestId } = render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <Profile />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(getByText('Wszystkie')).toBeTruthy();
    expect(getAllByTestId('badge-hex').length).toBeGreaterThan(0);
  });
});
