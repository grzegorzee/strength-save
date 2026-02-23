import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import {
  getWeekBounds,
  getMonthBounds,
  calculateTonnage,
  calculateStreak,
  filterWorkoutsByPeriod,
} from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { BarChart3, Trophy, Dumbbell, Flame, Copy, Check, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Period = 'week' | 'month';

const Summary = () => {
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts();
  const { plan: trainingPlan } = useTrainingPlan();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('week');
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const bounds = period === 'week' ? getWeekBounds(now) : getMonthBounds(now);
  const previousBounds = period === 'week'
    ? getWeekBounds(new Date(bounds.start.getTime() - 7 * 24 * 60 * 60 * 1000))
    : getMonthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const currentWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, bounds),
    [workouts, bounds.start.getTime(), bounds.end.getTime()],
  );

  const previousWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, previousBounds),
    [workouts, previousBounds.start.getTime(), previousBounds.end.getTime()],
  );

  const expectedWorkouts = period === 'week' ? 3 : 12;
  const frequency = currentWorkouts.length;

  const currentTonnage = calculateTonnage(currentWorkouts);
  const previousTonnage = calculateTonnage(previousWorkouts);
  const tonnageChange = previousTonnage > 0
    ? Math.round(((currentTonnage - previousTonnage) / previousTonnage) * 100)
    : 0;

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);

  // Detect PRs in current period
  const periodPRs = useMemo(() => {
    const allNames = new Map(trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name])));
    const allPRs: Array<{ exerciseName: string; type: string }> = [];
    const historicalWorkouts = workouts.filter(w =>
      w.completed && new Date(w.date) < bounds.start,
    );

    currentWorkouts.forEach(cw => {
      const prs = detectNewPRs(cw, historicalWorkouts, allNames);
      prs.forEach(pr => allPRs.push({ exerciseName: pr.exerciseName, type: pr.type }));
    });

    return allPRs;
  }, [currentWorkouts, workouts, bounds.start.getTime()]);

  // Body weight trend
  const periodMeasurements = measurements.filter(m => {
    const d = new Date(m.date);
    return d >= bounds.start && d <= bounds.end && m.weight;
  });
  const latestWeight = periodMeasurements[0]?.weight;

  const handleCopy = async () => {
    const periodLabel = period === 'week' ? 'Tydzień' : 'Miesiąc';
    const dateRange = `${bounds.start.toLocaleDateString('pl-PL')} - ${bounds.end.toLocaleDateString('pl-PL')}`;
    const lines = [
      `📊 Podsumowanie: ${periodLabel}`,
      `📅 ${dateRange}`,
      ``,
      `🏋️ Frekwencja: ${frequency}/${expectedWorkouts} treningów`,
      `💪 Tonaż: ${currentTonnage.toLocaleString('pl-PL')} kg${tonnageChange !== 0 ? ` (${tonnageChange > 0 ? '+' : ''}${tonnageChange}%)` : ''}`,
      `🔥 Seria treningowa: ${streak} tyg.`,
    ];

    if (periodPRs.length > 0) {
      lines.push(`🏆 Nowe PRy: ${periodPRs.map(p => p.exerciseName).join(', ')}`);
    }
    if (latestWeight) {
      lines.push(`⚖️ Waga: ${latestWeight} kg`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({ title: 'Skopiowano!', description: 'Podsumowanie w schowku.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Tydzień
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Miesiąc
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Skopiowano' : 'Kopiuj'}
        </Button>
      </div>

      {/* Date range */}
      <p className="text-sm text-muted-foreground">
        {bounds.start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {bounds.end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Frequency */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{frequency}/{expectedWorkouts}</p>
                <p className="text-xs text-muted-foreground">Frekwencja</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tonnage */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(currentTonnage / 1000).toFixed(1)}t</p>
                <p className="text-xs text-muted-foreground">
                  Tonaż
                  {tonnageChange !== 0 && (
                    <span className={tonnageChange > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                      {tonnageChange > 0 ? '+' : ''}{tonnageChange}%
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{streak}</p>
                <p className="text-xs text-muted-foreground">Seria (tyg.)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{latestWeight ? `${latestWeight} kg` : '--'}</p>
                <p className="text-xs text-muted-foreground">Waga ciała</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New PRs */}
      {periodPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Nowe rekordy w tym {period === 'week' ? 'tygodniu' : 'miesiącu'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {periodPRs.map((pr, i) => (
                <Badge key={i} className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                  🏆 {pr.exerciseName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout list */}
      {currentWorkouts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ukończone treningi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentWorkouts.map(w => {
              const day = trainingPlan.find(d => d.id === w.dayId);
              return (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{day?.dayName || w.dayId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {w.exercises.length} ćw.
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {currentWorkouts.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Brak ukończonych treningów w tym {period === 'week' ? 'tygodniu' : 'miesiącu'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Summary;
