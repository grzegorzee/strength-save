import { useState, useCallback } from 'react';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { prepareCoachData, suggestPlanChanges, type PlanSuggestion } from '@/lib/ai-coach';

const CACHE_KEY = 'fittracker-ai-plan';
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CachedPlan {
  suggestion: PlanSuggestion;
  timestamp: number;
}

function loadCache(): CachedPlan | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedPlan = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

export const useAIPlan = () => {
  const { workouts, measurements, isLoaded: workoutsLoaded } = useFirebaseWorkouts();
  const { plan, isLoaded: planLoaded } = useTrainingPlan();

  const cached = loadCache();

  const [suggestion, setSuggestion] = useState<PlanSuggestion | null>(cached?.suggestion || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(cached?.timestamp || null);

  const analyze = useCallback(async (force = false) => {
    if (!force && cached) {
      setSuggestion(cached.suggestion);
      setLastAnalyzedAt(cached.timestamp);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = prepareCoachData(workouts, measurements, plan);
      const result = await suggestPlanChanges(data);

      setSuggestion(result);
      setLastAnalyzedAt(Date.now());
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        suggestion: result,
        timestamp: Date.now(),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setIsLoading(false);
    }
  }, [workouts, measurements, plan, cached]);

  const isReady = workoutsLoaded && planLoaded;

  return { suggestion, isLoading, error, analyze, lastAnalyzedAt, isReady };
};
