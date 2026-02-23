import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Weight, Trophy, Flame, ChevronRight, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/StatsCard';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { calculateStreak } from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getThisWeekDates = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return [
    { dayId: 'day-1', date: monday },
    { dayId: 'day-2', date: wednesday },
    { dayId: 'day-3', date: friday },
  ];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    workouts,
    getTotalWeight,
    getCompletedWorkoutsCount,
    getLatestMeasurement,
    isLoaded,
    error
  } = useFirebaseWorkouts();
  const { plan: trainingPlan } = useTrainingPlan();

  const latestMeasurement = getLatestMeasurement();
  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  const thisWeek = useMemo(() => getThisWeekDates(), []);

  // Streak calculation
  const streak = useMemo(() => calculateStreak(workouts), [workouts]);

  // Find most recent PR
  const latestPR = useMemo(() => {
    const allNames = new Map(trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name])));
    const completedSorted = workouts
      .filter(w => w.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const workout of completedSorted) {
      const olderWorkouts = completedSorted.filter(w => w.id !== workout.id && new Date(w.date) < new Date(workout.date));
      if (olderWorkouts.length === 0) continue;
      const prs = detectNewPRs(workout, olderWorkouts, allNames);
      if (prs.length > 0) {
        return {
          exerciseName: prs[0].exerciseName,
          value: prs[0].newValue,
          type: prs[0].type,
          date: workout.date,
        };
      }
    }
    return null;
  }, [workouts, trainingPlan]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Błąd: {error}</p>
      </div>
    );
  }

  const formatPRDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'dziś';
    if (diffDays === 1) return 'wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Ukończone treningi"
          value={completedWorkouts}
          icon={Trophy}
          variant="success"
        />
        <StatsCard
          title="Tonaż całkowity"
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          subtitle="Suma podniesionych kg"
          icon={Dumbbell}
          variant="primary"
        />
        <StatsCard
          title="Aktualna waga"
          value={latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : '--'}
          icon={Weight}
          variant="default"
        />
        <StatsCard
          title="Seria treningowa"
          value={`${streak} tyg.`}
          subtitle={streak > 0 ? 'Nie przerywaj!' : 'Zacznij serię'}
          icon={Flame}
          variant="warning"
        />
      </div>

      {/* Latest PR */}
      {latestPR && (
        <Card
          className="cursor-pointer hover:bg-muted/30 transition-colors border-yellow-500/30 bg-yellow-500/5"
          onClick={() => navigate('/achievements')}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-lg">🏆</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Ostatni rekord</p>
                  <p className="text-xs text-muted-foreground">
                    {latestPR.exerciseName} — <span className="font-semibold text-foreground">{latestPR.value} kg</span>
                    {' '}
                    <span className="text-muted-foreground">({formatPRDate(latestPR.date)})</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* This week's training */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Plan tygodnia</h2>
        <div className="grid gap-4">
          {thisWeek.map(({ dayId, date }) => {
            const day = trainingPlan.find(d => d.id === dayId);
            if (!day) return null;

            const dateStr = formatLocalDate(date);
            const workoutForDate = workouts.find(w => w.dayId === dayId && w.date === dateStr);

            return (
              <TrainingDayCard
                key={dayId}
                day={day}
                latestWorkout={workoutForDate}
                trainingDate={date}
                onClick={() => navigate(`/workout/${dayId}?date=${dateStr}`)}
              />
            );
          })}
        </div>
      </div>

      {/* Weekly summary link */}
      <Button
        variant="outline"
        className="w-full py-5"
        onClick={() => navigate('/summary')}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Zobacz podsumowanie tygodnia
      </Button>
    </div>
  );
};

export default Dashboard;
