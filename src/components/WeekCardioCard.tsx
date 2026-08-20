import { useMemo } from 'react';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { currentWeekCardio } from '@/lib/activity-window';
import { unifiedToManual, type ManualActivity } from '@/lib/manual-activity';
import type { UnifiedActivity } from '@/types/strava';
import { useTranslation } from '@/contexts/LanguageContext';

interface WeekCardioCardProps {
  activities: UnifiedActivity[];
  stravaConnected: boolean;
  weekStartStr: string;
  weekEndStr: string;
  maxHR?: number;
  onEditManual: (activity: ManualActivity) => void;
}

/**
 * T5: cardio bieżącego tygodnia na Dashboardzie — widoczne także PRZED startem
 * planu (feedback 2026-08-20: biegi ze Stravy nie pojawiały się, gdy cykl
 * startował w przyszłym tygodniu). Filtr = istniejący currentWeekCardio
 * (manual zawsze, Strava gdy połączona, bez WeightTraining/Crossfit).
 * To NIE jest powrót zdjętej sekcji km ('dash-strava-km') — to lista aktywności.
 */
export const WeekCardioCard = ({
  activities,
  stravaConnected,
  weekStartStr,
  weekEndStr,
  maxHR,
  onEditManual,
}: WeekCardioCardProps) => {
  const { t } = useTranslation();
  const weekCardio = useMemo(
    () => currentWeekCardio(activities, stravaConnected, weekStartStr, weekEndStr),
    [activities, stravaConnected, weekStartStr, weekEndStr],
  );

  if (weekCardio.length === 0) return null;

  return (
    <div data-testid="dash-week-cardio" className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground px-1">
        {t('dash.weekCardio.title')}
      </h3>
      {weekCardio.map((activity) => (
        <StravaActivityCard
          key={activity.id}
          activity={activity}
          maxHR={maxHR}
          onEdit={activity.source === 'manual'
            ? () => onEditManual(unifiedToManual(activity))
            : undefined}
        />
      ))}
    </div>
  );
};
