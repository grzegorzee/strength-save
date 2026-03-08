import { useState, useCallback } from 'react';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { getSwapSuggestions, type SwapSuggestion } from '@/lib/ai-coach';

export const useAISwap = (userId: string) => {
  const { plan } = useTrainingPlan(userId);

  const [result, setResult] = useState<SwapSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findSwap = useCallback(async (exerciseName: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getSwapSuggestions(exerciseName, reason, plan);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setIsLoading(false);
    }
  }, [plan]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, findSwap, reset };
};
