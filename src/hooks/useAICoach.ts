import { useState, useCallback } from 'react';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { prepareCoachData, analyzeWithAI, type CoachInsight } from '@/lib/ai-coach';

const CACHE_KEY = 'fittracker-ai-coach';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CachedResult {
  insights: CoachInsight[];
  timestamp: number;
  workoutCount: number;
}

function loadCache(): CachedResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedResult = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveCache(insights: CoachInsight[], workoutCount: number) {
  const data: CachedResult = { insights, timestamp: Date.now(), workoutCount };
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export const useAICoach = (userId: string) => {
  const { workouts, measurements, isLoaded: workoutsLoaded } = useFirebaseWorkouts(userId);
  const { plan, isLoaded: planLoaded } = useTrainingPlan(userId);

  const cached = loadCache();
  const completedCount = workouts.filter(w => w.completed).length;

  // Invalidate cache if new completed workout since last analysis
  const cacheValid = cached && cached.workoutCount === completedCount;

  const [insights, setInsights] = useState<CoachInsight[]>(cacheValid ? cached.insights : []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(
    cacheValid ? cached.timestamp : null,
  );

  const analyze = useCallback(async (force = false) => {
    // Check cache unless forced
    if (!force && cacheValid && cached) {
      setInsights(cached.insights);
      setLastAnalyzedAt(cached.timestamp);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = prepareCoachData(workouts, measurements, plan);
      const result = await analyzeWithAI(data);

      setInsights(result);
      setLastAnalyzedAt(Date.now());
      saveCache(result, completedCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany błąd analizy';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [workouts, measurements, plan, completedCount, cacheValid, cached]);

  const isReady = workoutsLoaded && planLoaded;
  const hasCache = !!cacheValid;

  return { insights, isLoading, error, analyze, lastAnalyzedAt, isReady, hasCache };
};
