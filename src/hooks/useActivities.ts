import { useMemo } from 'react';
import { useStrava } from '@/hooks/useStrava';
import { useManualActivities } from '@/hooks/useManualActivities';
import { mergeActivities } from '@/lib/manual-activity';
import type { UnifiedActivity } from '@/types/strava';

/**
 * Warstwa scalająca aktywności (Z111): Strava + ręczne wpisy cardio w jednym
 * strumieniu (malejąco po dacie). Konsumenci listujący cardio używają TEGO hooka;
 * komponenty czysto-Stravowe (Race Predictor, HR Zones itd.) zostają na useStrava.
 */
export const useActivities = (userId: string, stravaEnabled: boolean = true) => {
  const { activities: stravaActivities, connection, isLoaded: stravaLoaded } = useStrava(userId, stravaEnabled);
  const {
    activities: manualActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    isLoaded: manualLoaded,
  } = useManualActivities(userId);

  const activities: UnifiedActivity[] = useMemo(
    () => mergeActivities(stravaActivities, manualActivities),
    [stravaActivities, manualActivities],
  );

  return {
    activities,
    stravaActivities,
    manualActivities,
    connection,
    addActivity,
    updateActivity,
    deleteActivity,
    isLoaded: stravaLoaded && manualLoaded,
  };
};
