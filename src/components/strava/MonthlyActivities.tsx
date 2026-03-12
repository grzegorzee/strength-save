import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import { Calendar } from 'lucide-react';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { computeMonthlySummaries, formatPaceFromSeconds } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';

interface MonthlyActivitiesProps {
  activities: StravaActivity[];
  estimatedMaxHR?: number;
}

export const MonthlyActivities = ({ activities, estimatedMaxHR }: MonthlyActivitiesProps) => {
  const summaries = useMemo(() => computeMonthlySummaries(activities), [activities]);

  if (summaries.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Brak aktywności Strava</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Aktywności wg miesiąca
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          {summaries.map((month) => (
            <AccordionItem key={month.key} value={month.key}>
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <span className="font-medium">{month.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {month.totalKm} km · {month.activityCount} akt.
                    {month.avgPace && ` · ${formatPaceFromSeconds(month.avgPace)} /km`}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-sm font-bold">{month.totalKm} km</p>
                    <p className="text-[10px] text-muted-foreground">Dystans</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-sm font-bold">{month.activityCount}</p>
                    <p className="text-[10px] text-muted-foreground">Aktywności</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-sm font-bold">{Math.round(month.totalElevation)} m</p>
                    <p className="text-[10px] text-muted-foreground">Przewyższenie</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-sm font-bold">{Math.round(month.totalCalories)} kcal</p>
                    <p className="text-[10px] text-muted-foreground">Kalorie</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {month.activities.map((activity) => (
                    <StravaActivityCard
                      key={activity.id}
                      activity={activity}
                      maxHR={estimatedMaxHR}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
