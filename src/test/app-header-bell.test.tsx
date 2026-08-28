import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { MAIN_DESTINATIONS } from '@/lib/main-navigation';

// Spójny nagłówek głównych zakładek: dzwonek i klikalny licznik all-time są
// dostępne wszędzie w bottom nav (+ /analytics), bez zależnego od ekranu dopisku.

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

const ROOT_TABS = MAIN_DESTINATIONS.map((item) => item.path);

describe('AppHeader: dzwonek na zakładkach głównych (X35c)', () => {
  it('avatar zachowuje wizualne 36 px wewnątrz celu dotykowego 44 px', () => {
    const avatar = renderAt('/').getByTestId('header-avatar');
    expect(avatar).toHaveClass('h-11', 'w-11');

    const visual = avatar.firstElementChild;
    expect(visual).not.toBeNull();
    expect(visual).toHaveClass('h-9', 'w-9');
  });

  it.each(ROOT_TABS)('%s: dzwonek widoczny', (path) => {
    const { getByTestId } = renderAt(path);
    expect(getByTestId('notification-bell').textContent).toBe('u1');
  });

  it.each(['/exercises', '/measurements', '/cycles', '/plan/edit', '/admin'])('%s: bez dzwonka (trasa poza nav)', (path) => {
    const { queryByTestId } = renderAt(path, () => {});
    expect(queryByTestId('notification-bell')).toBeNull();
  });

  it.each(ROOT_TABS)('%s: pokazuje ten sam klikalny licznik bez dopisku', (path) => {
    const pill = (path: string) => renderAt(path).container.querySelector('[data-testid="header-workout-count"]');
    const node = pill(path);
    expect(node).not.toBeNull();
    expect(node?.tagName).toBe('BUTTON');
    expect(node?.textContent).toBe('0');
    expect(node?.className).toContain('min-h-11');
  });

  it('/analytics zachowuje dotychczasowy dzwonek i licznik mimo braku w bottom navie', () => {
    const view = renderAt('/analytics');
    expect(view.getByTestId('notification-bell')).toBeTruthy();
    expect(view.getByTestId('header-workout-count')).toBeTruthy();
  });

  it('nie dubluje licznika na trasach poza główną nawigacją', () => {
    expect(renderAt('/exercises', () => {}).queryByTestId('header-workout-count')).toBeNull();
  });
});
