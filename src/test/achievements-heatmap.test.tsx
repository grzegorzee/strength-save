import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PRO-D T4: heatmapa konsekwencji osadzona na ekranie Postępów.

const completedWorkout = vi.hoisted(() => ({
  id: 'w1',
  date: '2026-08-10',
  dayId: 'day-1',
  dayName: 'Poniedziałek',
  completed: true,
  exercises: [{ exerciseId: 'e1', sets: [{ reps: 5, weight: 100, completed: true }] }],
}));

// Pułapka: transitive import @/lib/firebase wywraca jsdom (Auth internal assertion).
vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, auth: {} }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'T' }, isAdmin: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [completedWorkout],
    getTotalWeight: () => 500,
    getCompletedWorkoutsCount: () => 1,
    isLoaded: true,
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({ useTrainingPlan: () => ({ plan: [] }) }));
vi.mock('@/hooks/usePlanCycles', () => ({ usePlanCycles: () => ({ cycles: [] }) }));

import Achievements from '@/pages/Achievements';

describe('Achievements: heatmapa konsekwencji', () => {
  it('przy ukończonych treningach renderuje mapę treningową', () => {
    localStorage.setItem('app-language', 'pl');
    const { getByText } = render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <Achievements />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(getByText('Mapa treningowa')).toBeTruthy();
  });
});
