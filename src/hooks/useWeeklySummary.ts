import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useStrava } from '@/hooks/useStrava';
import {
  prepareWeeklyData,
  generateWeeklySummaryText,
  type WeeklySummary,
} from '@/lib/weekly-summary';
import { getWeekBounds } from '@/lib/summary-utils';

export const useWeeklySummary = (userId: string, isAdmin: boolean = false) => {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoGenRef = useRef(false);

  const { workouts, isLoaded: workoutsLoaded } = useFirebaseWorkouts(userId);
  const { plan: trainingPlan } = useTrainingPlan(userId);
  const { activities: stravaActivities } = useStrava(userId, isAdmin);

  // Listen to summaries
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'weekly_summaries'),
      where('userId', '==', userId),
      orderBy('weekStart', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WeeklySummary));
      setSummaries(docs);
    }, (err) => {
      console.error('Weekly summaries listener error:', err);
    });

    return unsubscribe;
  }, [userId]);

  // Generate summary for a given week
  const generateSummary = useCallback(async (weekDate?: Date) => {
    if (!userId || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const targetDate = weekDate || new Date();
      const { stats, weekStart, weekEnd, hasData } = prepareWeeklyData(
        targetDate,
        workouts,
        stravaActivities,
        trainingPlan,
      );

      if (!hasData) {
        setError('Brak danych treningowych w tym tygodniu.');
        setIsGenerating(false);
        return;
      }

      const summaryText = await generateWeeklySummaryText(stats);

      const summaryId = `${userId}_${weekStart}`;
      const summary: WeeklySummary = {
        id: summaryId,
        userId,
        weekStart,
        weekEnd,
        generatedAt: new Date().toISOString(),
        summary: summaryText,
        stats,
      };

      await setDoc(doc(db, 'weekly_summaries', summaryId), summary);
    } catch (err) {
      console.error('Failed to generate weekly summary:', err);
      setError(err instanceof Error ? err.message : 'Nie udało się wygenerować podsumowania.');
    } finally {
      setIsGenerating(false);
    }
  }, [userId, isGenerating, workouts, stravaActivities, trainingPlan]);

  // Auto-generate for last week if missing
  useEffect(() => {
    if (!workoutsLoaded || !userId || autoGenRef.current || summaries === undefined) return;
    // Wait until we have the initial summaries snapshot
    if (isGenerating) return;

    autoGenRef.current = true;

    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const { start } = getWeekBounds(lastWeekDate);
    const lastWeekStart = start.toISOString().split('T')[0];

    const exists = summaries.some(s => s.weekStart === lastWeekStart);
    if (exists) return;

    // Check if there was any activity last week
    const { hasData } = prepareWeeklyData(lastWeekDate, workouts, stravaActivities, trainingPlan);
    if (!hasData) return;

    generateSummary(lastWeekDate);
  }, [workoutsLoaded, userId, summaries, workouts, stravaActivities, trainingPlan]);

  return {
    summaries,
    isGenerating,
    error,
    generateSummary,
  };
};
