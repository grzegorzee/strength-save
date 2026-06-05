import { useState, useCallback } from 'react';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { getSwapSuggestions, type SwapSuggestion } from '@/lib/ai-coach';
import { useTranslation } from '@/contexts/LanguageContext';

export const useAISwap = (userId: string) => {
  const { plan } = useTrainingPlan(userId);
  const { t, lang } = useTranslation();

  const [result, setResult] = useState<SwapSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findSwap = useCallback(async (exerciseName: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getSwapSuggestions(exerciseName, reason, plan, lang);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setIsLoading(false);
    }
  }, [plan, lang, t]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, findSwap, reset };
};
