import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWeekActivityHistory } from '@/lib/activity-read-store';
import { buildAllTimeActivityStats } from '@/lib/all-time-stats';

type WeekSummary = {
  totalSessions: number;
  strengthSessions: number;
  cardioSessions: number;
  cardioMinutes: number;
};

export const useWeekActivitySummary = (
  uid: string,
  fromDate: string,
  toDate: string,
  includeStrava: boolean,
  // Listener changes invalidate these seven days only, never the whole history.
  refreshToken: unknown,
) => {
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ uid, fromDate, toDate, includeStrava, refreshToken, attempt }),
    [uid, fromDate, toDate, includeStrava, refreshToken, attempt]);
  const [result, setResult] = useState<{
    request: typeof request;
    status: 'ready' | 'error';
    summary?: WeekSummary;
  } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const controller = new AbortController();
    fetchWeekActivityHistory(uid, { fromDate, toDate, includeStrava, signal: controller.signal })
      .then(history => {
        if (controller.signal.aborted) return;
        const stats = buildAllTimeActivityStats(
          history.workouts.filter(workout => workout.userId === uid),
          history.activities.filter(activity => activity.userId === uid && (includeStrava || activity.source === 'manual')),
        );
        setResult({ request, status: 'ready', summary: {
          totalSessions: stats.activityCount,
          strengthSessions: stats.strength.workoutCount,
          cardioSessions: stats.cardioCount,
          cardioMinutes: Math.round(stats.cardioDurationSec / 60),
        } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ request, status: 'error' });
      });
    return () => controller.abort();
  }, [uid, fromDate, toDate, includeStrava, request]);

  const owned = result?.request === request ? result : null;
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { summary: owned?.summary, status: owned?.status ?? 'loading', retry };
};
