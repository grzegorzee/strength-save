import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';

// X35c (WP-E, pkt 3): dzwonek na WSZYSTKICH zakładkach głównych (bottom nav +
// /analytics), nie tylko na Dashboardzie. Pigułka licznika treningów zostaje
// wyłącznie na Dashboardzie (zasada 5: nic nie zabieramy istniejącemu układowi).

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Test User' } }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkoutReads: () => ({ workouts: [], isLoaded: true }),
}));
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => ({ isOnline: true, pendingOps: 0 }) }));
vi.mock('@/lib/workout-celebration', () => ({ consumeCelebration: () => 0 }));
vi.mock('@/components/AllTimeStatsSheet', () => ({ AllTimeStatsSheet: () => null }));
vi.mock('@/components/HeaderActions', () => ({ HeaderActionsOutlet: () => null }));
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: ({ uid }: { uid: string }) => <button type="button" data-testid="notification-bell">{uid}</button>,
}));

const renderAt = (path: string, onBack?: () => void) => render(
  <MemoryRouter initialEntries={[path]}>
    <AppHeader title="Tytuł" onBack={onBack} />
  </MemoryRouter>,
);

const ROOT_TABS = ['/', '/plan', '/history', '/achievements', '/exercises', '/analytics'];

describe('AppHeader: dzwonek na zakładkach głównych (X35c)', () => {
  it.each(ROOT_TABS)('%s: dzwonek widoczny', (path) => {
    const { getByTestId } = renderAt(path);
    expect(getByTestId('notification-bell').textContent).toBe('u1');
  });

  it.each(['/profile', '/measurements', '/cycles', '/plan/edit', '/admin'])('%s: bez dzwonka (trasa poza nav)', (path) => {
    const { queryByTestId } = renderAt(path, () => {});
    expect(queryByTestId('notification-bell')).toBeNull();
  });

  it('pigułka licznika treningów zostaje tylko na Dashboardzie', () => {
    const pill = (path: string) => renderAt(path).container.querySelector('[data-testid="header-workout-count"]');
    expect(pill('/')).not.toBeNull();
    expect(pill('/plan')).toBeNull();
    expect(pill('/history')).toBeNull();
  });
});
