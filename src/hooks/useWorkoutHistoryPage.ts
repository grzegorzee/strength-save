import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorkoutSession } from '@/types';
import {
  fetchWorkoutHistoryPage,
  fetchWorkoutRange,
  type WorkoutHistoryCursor,
} from '@/lib/workout-read-store';

export const useWorkoutHistoryPage = (
  userId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    completed?: boolean;
    pageSize?: number;
  },
) => {
  const fromDate = options.fromDate;
  const toDate = options.toDate;
  const completed = options.completed;
  const pageSize = options.pageSize;
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [nextCursor, setNextCursor] = useState<WorkoutHistoryCursor | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(
    () => JSON.stringify({
      userId,
      fromDate: fromDate ?? '',
      toDate: toDate ?? '',
      completed,
      pageSize,
    }),
    [completed, fromDate, pageSize, toDate, userId],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    setError(null);
    setWorkouts([]);
    setNextCursor(null);

    void fetchWorkoutHistoryPage(userId, { fromDate, toDate, completed, pageSize })
      .then((page) => {
        if (cancelled) return;
        setWorkouts(page.workouts);
        setNextCursor(page.nextCursor);
        setIsLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'WORKOUT_HISTORY_LOAD_FAILED');
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [completed, fromDate, key, pageSize, toDate, userId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchWorkoutHistoryPage(userId, { fromDate, toDate, completed, pageSize, cursor: nextCursor });
      setWorkouts(prev => [...prev, ...page.workouts]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WORKOUT_HISTORY_LOAD_MORE_FAILED');
    } finally {
      setIsLoadingMore(false);
    }
  }, [completed, fromDate, isLoadingMore, nextCursor, pageSize, toDate, userId]);

  return {
    workouts,
    isLoaded,
    isLoadingMore,
    hasMore: nextCursor !== null,
    loadMore,
    error,
  };
};

export const useWorkoutRange = (
  userId: string,
  options: {
    fromDate: string;
    toDate: string;
    completed?: boolean;
    pageSize?: number;
    maxPages?: number;
  },
) => {
  const fromDate = options.fromDate;
  const toDate = options.toDate;
  const completed = options.completed;
  const pageSize = options.pageSize;
  const maxPages = options.maxPages;
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(
    () => JSON.stringify({
      userId,
      fromDate,
      toDate,
      completed,
      pageSize,
      maxPages,
    }),
    [completed, fromDate, maxPages, pageSize, toDate, userId],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    setError(null);

    void fetchWorkoutRange(userId, { fromDate, toDate, completed, pageSize, maxPages })
      .then((items) => {
        if (cancelled) return;
        setWorkouts(items);
        setIsLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'WORKOUT_RANGE_LOAD_FAILED');
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [completed, fromDate, key, maxPages, pageSize, toDate, userId]);

  return { workouts, isLoaded, error };
};
