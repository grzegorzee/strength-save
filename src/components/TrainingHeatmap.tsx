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
const DAY_LABELS = ['Pn', '', 'Śr', '', 'Pt', '', ''];

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

    const firstDay = new Date(selectedYear, 0, 1).getDay();
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
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

  // Month labels — find first week index where each month appears
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIdx) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = parseInt(firstDay.date.substring(5, 7)) - 1;
        if (month !== lastMonth) {
          labels.push({ label: MONTHS[month], weekIdx });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  const activeDays = heatmapData.filter(d => d.level > 0).length;
  const totalWeeks = weeks.length;

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
      <CardContent className="px-3 sm:px-6">
        <div className="overflow-x-auto -mx-1">
          {/* CSS Grid approach: day labels column + week columns */}
          <div
            className="inline-grid gap-[2px] sm:gap-[3px]"
            style={{
              gridTemplateColumns: `20px repeat(${totalWeeks}, 1fr)`,
              gridTemplateRows: `16px repeat(7, 1fr)`,
              minWidth: `${totalWeeks * 10 + 20}px`,
            }}
          >
            {/* Top-left empty corner */}
            <div />

            {/* Month labels row */}
            {weeks.map((_, weekIdx) => {
              const monthLabel = monthLabels.find(m => m.weekIdx === weekIdx);
              return (
                <div key={`month-${weekIdx}`} className="text-[8px] sm:text-[9px] text-muted-foreground leading-none flex items-end">
                  {monthLabel?.label || ''}
                </div>
              );
            })}

            {/* Day rows */}
            {DAY_LABELS.map((label, dayIdx) => (
              <>
                {/* Day label */}
                <div key={`label-${dayIdx}`} className="flex items-center">
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground">{label}</span>
                </div>

                {/* Cells for this day across all weeks */}
                {weeks.map((week, weekIdx) => {
                  const day = week[dayIdx];
                  return (
                    <div
                      key={`cell-${weekIdx}-${dayIdx}`}
                      className={cn(
                        'aspect-square rounded-[2px] sm:rounded-sm min-w-[6px]',
                        day ? LEVEL_COLORS[day.level] : 'bg-transparent',
                      )}
                      title={day ? `${new Date(day.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}${day.hasWorkout ? ` — ${(day.strengthTonnage / 1000).toFixed(1)}t` : ''}${day.hasCardio ? ` — ${day.cardioKm}km` : ''}` : ''}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>Mniej</span>
          {LEVEL_COLORS.map((color, i) => (
            <div key={i} className={cn('h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-[2px] sm:rounded-sm', color)} />
          ))}
          <span>Więcej</span>
        </div>
      </CardContent>
    </Card>
  );
};
