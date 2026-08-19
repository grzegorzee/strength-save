import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { markAllUserEventsRead, subscribeUserEvents, type UserEvent } from '@/lib/user-events';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: (k: string, params?: Record<string, string | number>) =>
      params ? `${k}:${Object.values(params).join(',')}` : k,
    lang: 'pl',
  }),
}));
vi.mock('@/contexts/UnitContext', () => ({
  useUnit: () => ({ toDisplay: (kg: number) => kg, unit: 'kg' }),
}));
vi.mock('@/data/exercise-i18n', () => ({
  localizeExerciseName: (name: string) => name,
}));
// B-T6: dzwonek czyta serwerowe user_events — moduł mockujemy w całości
// (bez importOriginal: realny moduł ciągnie inicjalizację Firebase w jsdom).
vi.mock('@/lib/user-events', () => ({
  subscribeUserEvents: vi.fn(() => () => {}),
  markAllUserEventsRead: vi.fn(async () => undefined),
  countUnreadUserEvents: (events: Array<{ readAt: number | null }>) =>
    events.filter((e) => e.readAt === null).length,
}));

const event = (over: Partial<UserEvent> = {}): UserEvent => ({
  v: 1,
  userId: 'u1',
  type: 'pr',
  key: 'pr-day-1-2026-08-19-bench-weight',
  payload: { name: 'Przysiad', prType: 'weight', newValue: 100 },
  deepLink: null,
  createdAt: Date.now(),
  readAt: null,
  ...over,
});

const emitEvents = (events: UserEvent[]) => {
  const subscriber = vi.mocked(subscribeUserEvents).mock.calls.at(-1)?.[1];
  act(() => subscriber?.(events));
};

const renderBell = () => render(
  <MemoryRouter>
    <NotificationBell uid="u1" />
  </MemoryRouter>,
);

describe('NotificationBell (B-T6: serwerowe user_events)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bez nieprzeczytanych: brak kropki', () => {
    renderBell();
    emitEvents([]);
    expect(screen.queryByTestId('inbox-unread-dot')).toBeNull();
  });

  it('nieprzeczytane zdarzenie pokazuje kropkę, otwarcie oznacza przeczytane', () => {
    renderBell();
    const item = event();
    emitEvents([item]);
    expect(screen.getByTestId('inbox-unread-dot')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('inbox.open'));
    expect(screen.getByText('inbox.pr.title:Przysiad')).toBeTruthy();
    expect(markAllUserEventsRead).toHaveBeenCalledWith('u1', [item]);
  });

  it('kropka znika, gdy wszystkie zdarzenia mają readAt', () => {
    renderBell();
    emitEvents([event({ readAt: 123 })]);
    expect(screen.queryByTestId('inbox-unread-dot')).toBeNull();
  });

  it('pusty inbox po otwarciu pokazuje empty state', () => {
    renderBell();
    emitEvents([]);
    fireEvent.click(screen.getByLabelText('inbox.open'));
    expect(screen.getByText('inbox.empty.title')).toBeTruthy();
  });

  it('renderuje zdarzenia week i plan z semantycznego payloadu', () => {
    renderBell();
    emitEvents([
      event({ type: 'week', key: 'week-2026-08-10', payload: { weekStart: '2026-08-10', workouts: 3, tonnageKg: 4200 } }),
      event({ type: 'plan', key: 'plan-started-2026-08-17', payload: { action: 'started', days: 3, weeks: 12 } }),
    ]);
    fireEvent.click(screen.getByLabelText('inbox.open'));
    expect(screen.getByText('inbox.week.title')).toBeTruthy();
    expect(screen.getByText('inbox.week.body:3,4200 kg')).toBeTruthy();
    expect(screen.getByText('inbox.plan.started:3,12')).toBeTruthy();
  });
});
