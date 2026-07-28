import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { formatLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

// Z156: test sekwencji "przełącz język" — trening z kanoniczną nazwą PL w bazie,
// UI w EN pokazuje nazwę EN (analityka Tygodnie + Twoje liczby), w PL kanoniczną.

const fixtures = vi.hoisted(() => ({ workouts: [] as unknown[] }));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', canUseStrava: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: fixtures.workouts }),
}));
vi.mock('@/hooks/useActivities', () => ({
  useActivities: () => ({ activities: [] }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [] }),
}));

import AnalyticsWeeklyTab from '@/components/analytics/AnalyticsWeeklyTab';
import { AllTimeStatsSheet } from '@/components/AllTimeStatsSheet';

const squatWorkout = (id: string, date: string, weight: number): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{
    exerciseId: 'ex-squat',
    name: 'Przysiad ze sztangą',
    sets: [{ reps: 5, weight, completed: true }],
  }],
} as unknown as WorkoutSession);

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatLocalDate(d);
};

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

describe('exercise name localization sequence (Z156)', () => {
  beforeEach(() => {
    localStorage.clear();
    // PR w bieżącym tygodniu: 80 kg dziś vs 60 kg ponad tydzień temu.
    fixtures.workouts = [squatWorkout('w1', daysAgo(8), 60), squatWorkout('w2', daysAgo(0), 80)];
  });

  it('AnalyticsWeeklyTab: PL pokazuje nazwę kanoniczną, po przełączeniu na EN nazwę EN', () => {
    localStorage.setItem('app-language', 'pl');
    const pl = render(withProviders(<AnalyticsWeeklyTab />));
    expect(pl.getAllByText(/Przysiad ze sztangą/).length).toBeGreaterThan(0);
    pl.unmount();

    localStorage.setItem('app-language', 'en');
    const en = render(withProviders(<AnalyticsWeeklyTab />));
    expect(en.getAllByText(/Barbell Squat/).length).toBeGreaterThan(0);
    expect(en.queryByText(/Przysiad ze sztangą/)).toBeNull();
  });

  it('AllTimeStatsSheet: ulubione ćwiczenie w EN bez polskiej nazwy', () => {
    localStorage.setItem('app-language', 'en');
    const view = render(withProviders(
      <AllTimeStatsSheet open onOpenChange={() => {}} workouts={fixtures.workouts as WorkoutSession[]} />,
    ));

    expect(view.getAllByText(/Barbell Squat/).length).toBeGreaterThan(0);
    expect(view.queryByText(/Przysiad ze sztangą/)).toBeNull();
  });
});
