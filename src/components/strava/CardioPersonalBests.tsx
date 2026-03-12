import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { detectCardioPRs } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';

interface CardioPersonalBestsProps {
  activities: StravaActivity[];
}

export const CardioPersonalBests = ({ activities }: CardioPersonalBestsProps) => {
  const prs = useMemo(() => detectCardioPRs(activities), [activities]);

  if (prs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Rekordy Cardio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {prs.map((pr) => (
            <div
              key={pr.category}
              className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{pr.emoji}</span>
                <span className="text-xs text-muted-foreground">{pr.label}</span>
              </div>
              <p className="text-lg font-bold">{pr.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {new Date(pr.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {pr.activityName}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
