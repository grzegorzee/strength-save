import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { generateHeatmapData } from '@/lib/heatmap-utils';
import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';
import { cn } from '@/lib/utils';

interface Props {
  workouts: WorkoutSession[];
  stravaActivities: StravaActivity[];
}

const LEVEL_COLORS = [
  'bg-muted/40',
  'bg-emerald-900/40',
  'bg-emerald-700/60',
  'bg-emerald-500/80',
  'bg-emerald-400',
] as const;

const MONTHS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

export const TrainingHeatmap = ({ workouts, stravaActivities }: Props) => {
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    workouts.forEach(w => years.add(parseInt(w.date.substring(0, 4))));
    stravaActivities.forEach(a => years.add(parseInt(a.date.substring(0, 4))));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [workouts, stravaActivities, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const heatmapData = useMemo(
    () => generateHeatmapData(workouts, stravaActivities, selectedYear),
    [workouts, stravaActivities, selectedYear],
  );

  // Build weeks grid (columns): 53 weeks × 7 days, Monday = row 0
  const weeks = useMemo(() => {
    const grid: (typeof heatmapData[number] | null)[][] = [];
    let currentWeek: (typeof heatmapData[number] | null)[] = [];

    // Pad first week with nulls if year doesn't start on Monday
    const firstDay = new Date(selectedYear, 0, 1).getDay();
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1; // 0=Mon, 6=Sun
    for (let i = 0; i < mondayOffset; i++) currentWeek.push(null);

    heatmapData.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      grid.push(currentWeek);
    }

    return grid;
  }, [heatmapData, selectedYear]);

  // Month labels positions
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIdx) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = parseInt(firstDay.date.substring(5, 7)) - 1;
        if (month !== lastMonth) {
          labels.push({ label: MONTHS[month], col: weekIdx });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  const activeDays = heatmapData.filter(d => d.level > 0).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-emerald-500" />
              Mapa treningowa
            </CardTitle>
            <CardDescription>{activeDays} aktywnych dni w {selectedYear}</CardDescription>
          </div>
        </div>
        {availableYears.length > 1 && (
          <div className="flex gap-1.5 pt-2 flex-wrap">
            {availableYears.map(y => (
              <Badge
                key={y}
                variant={selectedYear === y ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Month labels */}
        <div className="flex gap-[3px] mb-1 ml-6">
          {monthLabels.map(({ label, col }) => (
            <div
              key={`${label}-${col}`}
              className="text-[9px] text-muted-foreground absolute"
              style={{ left: `${col * 15 + 24}px` }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-[3px] relative pt-4">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] shrink-0">
              {['Pn', '', 'Śr', '', 'Pt', '', ''].map((label, i) => (
                <div key={i} className="h-3 w-5 flex items-center">
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={cn(
                      'h-3 w-3 rounded-sm',
                      day ? LEVEL_COLORS[day.level] : 'bg-transparent',
                    )}
                    title={day ? `${new Date(day.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}${day.hasWorkout ? ` — ${(day.strengthTonnage / 1000).toFixed(1)}t tonaż` : ''}${day.hasCardio ? ` — ${day.cardioKm}km` : ''}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>Mniej</span>
          {LEVEL_COLORS.map((color, i) => (
            <div key={i} className={cn('h-3 w-3 rounded-sm', color)} />
          ))}
          <span>Więcej</span>
        </div>
      </CardContent>
    </Card>
  );
};
