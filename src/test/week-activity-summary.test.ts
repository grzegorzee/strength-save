import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AllTimeActivityHistory } from '@/lib/activity-read-store';

const fetchWeek = vi.hoisted(() => vi.fn());
vi.mock('@/lib/activity-read-store', () => ({ fetchWeekActivityHistory: fetchWeek }));
import { useWeekActivitySummary } from '@/hooks/useWeekActivitySummary';

const history = (uid: string, count: number): AllTimeActivityHistory => ({
  workouts: [],
  activities: Array.from({ length: count }, (_, i) => ({
    id: `${uid}-${i}`, userId: uid, source: 'manual', type: 'Swim', movingTime: 2400,
  })),
});
beforeEach(() => fetchWeek.mockReset().mockResolvedValue(history('u1', 1)));

it('discards the previous week or owner completion without flashing an old total', async () => {
  let finish!: (value: AllTimeActivityHistory) => void;
  fetchWeek.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = renderHook(({ uid, from }) => useWeekActivitySummary(uid, from, '2026-09-13', false, 'unchanged'), {
    initialProps: { uid: 'u1', from: '2026-09-07' },
  });
  const oldSignal = fetchWeek.mock.calls[0][1].signal as AbortSignal;
  fetchWeek.mockResolvedValue(history('u2', 2));
  view.rerender({ uid: 'u2', from: '2026-08-31' });
  expect(oldSignal.aborted).toBe(true);
  expect(view.result.current.summary).toBeUndefined();
  await waitFor(() => expect(view.result.current.summary?.totalSessions).toBe(2));
  await act(async () => { finish(history('u1', 10)); });
  expect(view.result.current.summary?.totalSessions).toBe(2);
});

it('refreshes the bounded summary after a saved activity changes and keeps foreign rows out', async () => {
  const view = renderHook(({ token }) => useWeekActivitySummary('u1', '2026-09-07', '2026-09-13', false, token), {
    initialProps: { token: 'before-save' },
  });
  await waitFor(() => expect(view.result.current.summary?.cardioSessions).toBe(1));
  fetchWeek.mockResolvedValue({ workouts: [], activities: [...history('u1', 2).activities, ...history('u2', 7).activities] });
  view.rerender({ token: 'after-save' });
  expect(view.result.current.summary).toBeUndefined();
  await waitFor(() => expect(view.result.current.summary?.cardioSessions).toBe(2));
  expect(fetchWeek).toHaveBeenLastCalledWith('u1', expect.objectContaining({ fromDate: '2026-09-07', toDate: '2026-09-13' }));
});

it('does not read before the plan and owner are ready', () => {
  const view = renderHook(() => useWeekActivitySummary('', '2026-09-07', '2026-09-13', false, ''));
  expect(fetchWeek).not.toHaveBeenCalled();
  expect(view.result.current.summary).toBeUndefined();
});
