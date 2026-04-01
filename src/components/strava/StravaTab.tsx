import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useStrava } from '@/hooks/useStrava';
import { filterByMonthYear, getAvailableYears } from '@/lib/strava-utils';
import { SeasonFilter } from './SeasonFilter';
import { StravaSummaryStats } from './StravaSummaryStats';
import { WeeklyKmChart } from './WeeklyKmChart';
import { PaceTrendChart } from './PaceTrendChart';
import { ElevationChart } from './ElevationChart';
import { CaloriesChart } from './CaloriesChart';
import { CardioPersonalBests } from './CardioPersonalBests';
import { HRZoneDistribution } from './HRZoneDistribution';
import { RacePredictor } from './RacePredictor';
import { TrainingLoadChart } from './TrainingLoadChart';
import { MonthlyActivities } from './MonthlyActivities';

export const StravaTab = () => {
  const { uid, canUseStrava } = useCurrentUser();
  const { activities, connection, isSyncing, error, connectStrava, syncActivities, disconnectStrava } = useStrava(uid, canUseStrava);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);

  const nonStrengthActivities = useMemo(
    () => activities.filter((a) => a.type !== 'WeightTraining' && a.type !== 'Crossfit'),
    [activities],
  );

  const availableYears = useMemo(
    () => getAvailableYears(nonStrengthActivities),
    [nonStrengthActivities],
  );

  // Activities filtered by month+year — for stats, PRs, monthly list
  const filteredActivities = useMemo(
    () => filterByMonthYear(nonStrengthActivities, selectedYear, selectedMonth),
    [nonStrengthActivities, selectedYear, selectedMonth],
  );

  // Activities filtered by year only — for charts (charts have their own 12-week window)
  const yearActivities = useMemo(
    () => filterByMonthYear(nonStrengthActivities, selectedYear, 'all'),
    [nonStrengthActivities, selectedYear],
  );

  // Reference date for charts: end of selected month, or end of year, or today
  const referenceDate = useMemo(() => {
    const now = new Date();
    if (selectedMonth === 'all') {
      if (selectedYear === now.getFullYear()) return now;
      return new Date(selectedYear, 11, 31);
    }
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return now;
    return new Date(selectedYear, selectedMonth, 0);
  }, [selectedYear, selectedMonth]);

  if (!connection.connected) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center text-2xl">🏃</div>
            <p className="font-medium text-sm">Połącz ze Stravą</p>
            <p className="text-sm text-muted-foreground">Synchronizuj aktywności cardio, biegi, rowery i inne ze Stravą.</p>
            <Button onClick={connectStrava} className="mt-2 bg-orange-500 hover:bg-orange-600">Połącz Stravę</Button>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Strava połączona</p>
              {connection.athleteName && <p className="text-xs text-muted-foreground">{connection.athleteName}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={syncActivities} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sync
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={disconnectStrava}>Rozłącz</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Month/Year filter */}
      <SeasonFilter
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        availableYears={availableYears}
      />

      {/* Stats grid */}
      <StravaSummaryStats activities={filteredActivities} />

      {/* Cardio PRs */}
      <CardioPersonalBests activities={filteredActivities} />

      {/* Race Predictor */}
      <RacePredictor activities={filteredActivities} />

      {/* Charts — use year activities + referenceDate for 12-week window */}
      <WeeklyKmChart activities={yearActivities} referenceDate={referenceDate} />
      <PaceTrendChart activities={yearActivities} referenceDate={referenceDate} />
      <ElevationChart activities={yearActivities} referenceDate={referenceDate} />
      <CaloriesChart activities={yearActivities} referenceDate={referenceDate} />

      {/* Training Load */}
      <TrainingLoadChart
        activities={yearActivities}
        estimatedMaxHR={connection.estimatedMaxHR}
      />

      {/* HR zones */}
      <HRZoneDistribution
        activities={filteredActivities}
        estimatedMaxHR={connection.estimatedMaxHR}
      />

      {/* Monthly activities */}
      <MonthlyActivities
        activities={filteredActivities}
        estimatedMaxHR={connection.estimatedMaxHR}
      />
    </div>
  );
};
