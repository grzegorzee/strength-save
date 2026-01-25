import { useNavigate } from 'react-router-dom';
import { Dumbbell, Weight, Trophy, Target } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { trainingPlan } from '@/data/trainingPlan';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    getLatestWorkout, 
    getTotalWeight, 
    getCompletedWorkoutsCount,
    getLatestMeasurement,
    isLoaded 
  } = useWorkoutProgress();

  const latestMeasurement = getLatestMeasurement();
  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

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
          title="Plan treningowy"
          value={`${Math.round((completedWorkouts / (trainingPlan.length * 4)) * 100)}%`}
          subtitle="Postęp miesięczny"
          icon={Target}
          variant="warning"
        />
      </div>

      {/* Training Days */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Plan tygodnia</h2>
        <div className="grid gap-4">
          {trainingPlan.map((day) => (
            <TrainingDayCard
              key={day.id}
              day={day}
              latestWorkout={getLatestWorkout(day.id)}
              onClick={() => navigate(`/workout/${day.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
