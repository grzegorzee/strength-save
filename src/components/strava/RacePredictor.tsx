import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { getRacePredictions } from '@/lib/race-predictor';
import type { StravaActivity } from '@/types/strava';

interface Props {
  activities: StravaActivity[];
}

const DISTANCE_EMOJIS: Record<string, string> = {
  '5K': '🏃',
  '10K': '🏃',
  'Półmaraton': '🏃',
  'Maraton': '🏃',
};

export const RacePredictor = ({ activities }: Props) => {
  const predictions = useMemo(() => getRacePredictions(activities), [activities]);

  if (predictions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-yellow-500" />
          Predykcje wyścigowe
        </CardTitle>
        <CardDescription>Formuła Riegel — na podstawie: {predictions[0].basedOn}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {predictions.map(p => (
            <div key={p.distanceLabel} className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {DISTANCE_EMOJIS[p.distanceLabel] || '🏃'} {p.distanceLabel}
              </p>
              <p className="text-lg font-bold">{p.predictedTimeFormatted}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
