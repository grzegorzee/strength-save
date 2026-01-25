import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { Trophy, Dumbbell, Target, Calendar } from 'lucide-react';
import { trainingPlan } from '@/data/trainingPlan';

const Achievements = () => {
  const { workouts, getTotalWeight, getCompletedWorkoutsCount } = useWorkoutProgress();

  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  // Calculate best exercises
  const getBestExercise = () => {
    let bestWeight = 0;
    let bestExerciseName = '';

    workouts.forEach(workout => {
      const day = trainingPlan.find(d => d.id === workout.dayId);
      workout.exercises.forEach(ex => {
        const exercise = day?.exercises.find(e => e.id === ex.exerciseId);
        ex.sets.forEach(set => {
          if (set.completed && set.weight > bestWeight) {
            bestWeight = set.weight;
            bestExerciseName = exercise?.name || 'Nieznane';
          }
        });
      });
    });

    return { name: bestExerciseName, weight: bestWeight };
  };

  const bestExercise = getBestExercise();

  // Calculate training streak
  const getTrainingStreak = () => {
    const completedDates = workouts
      .filter(w => w.completed)
      .map(w => w.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (completedDates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (completedDates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats */}
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
          title="Seria treningowa"
          value={`${getTrainingStreak()} dni`}
          icon={Calendar}
          variant="warning"
        />
        <StatsCard
          title="Plan treningowy"
          value={`${Math.round((completedWorkouts / 12) * 100)}%`}
          subtitle="Postęp miesięczny"
          icon={Target}
          variant="default"
        />
      </div>

      {/* Tonnage Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tonaż</CardTitle>
          <CardDescription>Zobacz sumę podniesionych kilogramów</CardDescription>
        </CardHeader>
        <CardContent>
          {totalWeight > 0 ? (
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-primary">
                {totalWeight.toLocaleString('pl-PL')} kg
              </p>
              <p className="text-muted-foreground mt-2">
                To równowartość {(totalWeight / 1000).toFixed(1)} ton!
              </p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Brak wyników do wyświetlenia
            </p>
          )}
        </CardContent>
      </Card>

      {/* Records Section */}
      <Card>
        <CardHeader>
          <CardTitle>Rekordy</CardTitle>
          <CardDescription>Zobacz największy podniesiony ciężar</CardDescription>
        </CardHeader>
        <CardContent>
          {bestExercise.weight > 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-fitness-success">
                {bestExercise.weight} kg
              </p>
              <p className="text-muted-foreground mt-2">
                {bestExercise.name}
              </p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Brak wyników do wyświetlenia
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Achievements;
