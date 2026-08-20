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

const renderProfile = () => {
  localStorage.setItem('app-language', 'pl');
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Profile />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
};

describe('Profil: sekcja dumy (PRO-D T6 + kafle fali 2)', () => {
  it('przy zdobytych odznakach renderuje rząd odznak i link Wszystkie', () => {
    const { getByText, getAllByTestId } = renderProfile();
    expect(getByText('Wszystkie')).toBeTruthy();
    expect(getAllByTestId('badge-hex').length).toBeGreaterThan(0);
  });

  // Fala 2: kafle liczą z okna recent gdy aggregate=null (dzisiejsza semantyka
  // fallbacku completedCount) — zera i wartości są prawdziwe, nie zmyślone.
  it('kafle: treningi/seria/tonaż/serie z okna recent (fallback bez agregatu)', () => {
    const { getByText, getAllByText } = renderProfile();
    ['Treningi', 'Seria', 'Tonaż', 'Serie'].forEach((l) => expect(getByText(l)).toBeTruthy());
    // 10 treningów, każdy 1 seria robocza 10x50 kg.
    expect(getAllByText('10').length).toBeGreaterThanOrEqual(2); // kafle Treningi + Serie
    expect(getByText('5.0 t')).toBeTruthy(); // 10 x 500 kg
    expect(getByText('0 tyg.')).toBeTruthy(); // stare daty = streak 0 (prawda)
  });
});
