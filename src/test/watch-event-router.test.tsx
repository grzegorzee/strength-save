// Router eventów z Apple Watch: startWorkout(dzisiaj) → nawigacja do WorkoutDay
// z autostart=true; eventy nie-dzisiejsze i inne typy ignorowane; brak podwójnej
// nawigacji dla tego samego eventu (dedup po `at`).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { formatLocalDate } from '@/lib/utils';
import type { WatchEvent } from '@/lib/watch-bridge';

const listeners: Array<(e: WatchEvent) => void> = [];
let peekedEvents: WatchEvent[] = [];

vi.mock('@/lib/watch-bridge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/watch-bridge')>();
  return {
    ...original,
    isWatchBridgeSupported: () => true,
    addWatchEventListener: vi.fn(async (cb: (e: WatchEvent) => void) => {
      listeners.push(cb);
      return { remove: async () => {} };
    }),
    peekWatchEvents: vi.fn(async () => peekedEvents),
  };
});

import { WatchEventRouter } from '@/components/WatchEventRouter';

const LocationProbe = ({ onLocation }: { onLocation: (path: string) => void }) => {
  const location = useLocation();
  onLocation(location.pathname + location.search);
  return null;
};

const renderRouter = (onLocation: (path: string) => void) =>
  render(
    <MemoryRouter
      initialEntries={['/']}
      useTransitions={false}
    >
      <WatchEventRouter />
      <Routes>
        <Route path="*" element={<LocationProbe onLocation={onLocation} />} />
      </Routes>
    </MemoryRouter>
  );

describe('WatchEventRouter', () => {
  beforeEach(() => {
    listeners.length = 0;
    peekedEvents = [];
  });

  const today = formatLocalDate(new Date());

  it('startWorkout na dzisiaj nawiguje do WorkoutDay z autostartem', async () => {
    let path = '';
    renderRouter((p) => { path = p; });
    await waitFor(() => expect(listeners.length).toBe(1));

    await act(async () => {
      listeners[0]({ type: 'startWorkout', date: today, dayId: 'day-2', at: 111 });
    });

    await waitFor(() =>
      expect(path).toBe(`/workout/day-2?date=${today}&autostart=true&watchEventId=legacy-startWorkout-111`)
    );
  });

  it('startWorkout z kolejki (peek) też nawiguje', async () => {
    peekedEvents = [{ type: 'startWorkout', date: today, dayId: 'day-1', at: 222 }];
    let path = '';
    renderRouter((p) => { path = p; });

    await waitFor(() =>
      expect(path).toBe(`/workout/day-1?date=${today}&autostart=true&watchEventId=legacy-startWorkout-222`)
    );
  });

  it('ignoruje startWorkout z inną datą oraz eventy serii', async () => {
    peekedEvents = [
      { type: 'startWorkout', date: '2020-01-01', dayId: 'day-1', at: 333 },
      { type: 'setLogged', date: today, dayId: 'day-1', exerciseId: 'x', setIndex: 0, reps: 5, weight: 50, completed: true, at: 334 },
    ];
    let path = '';
    renderRouter((p) => { path = p; });
    await waitFor(() => expect(listeners.length).toBe(1));

    expect(path).toBe('/');
  });

  it('ten sam event (at) nie nawiguje dwa razy', async () => {
    let path = '';
    let navCount = 0;
    renderRouter((p) => {
      if (p !== path) navCount += 1;
      path = p;
    });
    await waitFor(() => expect(listeners.length).toBe(1));

    const event: WatchEvent = { type: 'startWorkout', date: today, dayId: 'day-3', at: 555 };
    await act(async () => {
      listeners[0](event);
    });
    await waitFor(() => expect(path).toContain('/workout/day-3'));
    const countAfterFirst = navCount;

    await act(async () => {
      listeners[0](event);
    });
    expect(navCount).toBe(countAfterFirst);
  });

  it('quick-start otwiera istniejącą ścieżkę ad-hoc z bezpiecznie zakodowanym ćwiczeniem', async () => {
    let path = '';
    renderRouter((p) => { path = p; });
    await waitFor(() => expect(listeners.length).toBe(1));

    await act(async () => {
      listeners[0]({
        type: 'startQuickWorkout', date: today,
        dayId: `adhoc-${today}-1786359000000`, at: 1786359000000,
        exerciseId: 'bench-1', exerciseName: 'Wyciskanie / skos',
        setCount: 3, reps: 8, weight: 72.5,
      });
    });

    await waitFor(() => expect(path).toContain(`/workout/adhoc-${today}-1786359000000?`));
    const query = new URLSearchParams(path.split('?')[1]);
    expect(query.get('autostart')).toBe('true');
    expect(query.get('quickExerciseName')).toBe('Wyciskanie / skos');
    expect(query.get('quickWeight')).toBe('72.5');
    expect(query.get('watchEventId')).toBe('legacy-startQuickWorkout-1786359000000');
  });
});
