import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateZoneDistribution } from '@/lib/hr-zones';
import { HR_ZONES, type HRZone, type StravaActivity } from '@/types/strava';

interface HRZoneDistributionProps {
  activities: StravaActivity[];
  estimatedMaxHR?: number;
}

export const HRZoneDistribution = ({ activities, estimatedMaxHR }: HRZoneDistributionProps) => {
  const zoneDistribution = useMemo(() => {
    if (!estimatedMaxHR) return null;
    return calculateZoneDistribution(activities, estimatedMaxHR);
  }, [activities, estimatedMaxHR]);

  if (!zoneDistribution) return null;

  const maxZoneCount = Math.max(...Object.values(zoneDistribution), 1);
  const hrActivityCount = activities.filter((a) => a.averageHeartrate).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rozkład stref tętna</CardTitle>
        <CardDescription className="text-xs">
          Na podstawie {hrActivityCount} aktywności z danymi HR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {HR_ZONES.map((z) => {
          const count = zoneDistribution[z.zone as HRZone];
          const widthPercent = (count / maxZoneCount) * 100;
          return (
            <div key={z.zone} className="flex items-center gap-2">
              <span className="text-xs w-24 shrink-0">Z{z.zone} {z.name}</span>
              <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                <div
                  className={`h-full ${z.color} rounded transition-all duration-300 flex items-center justify-end pr-1`}
                  style={{ width: `${Math.max(widthPercent, count > 0 ? 8 : 0)}%` }}
                >
                  {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
