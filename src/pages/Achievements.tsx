import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { Trophy, Dumbbell, Target, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { trainingPlan } from '@/data/trainingPlan';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ExerciseRecord {
  exerciseId: string;
  name: string;
  maxWeight: number;
  maxReps: number;
  history: { date: string; weight: number; reps: number }[];
}

const Achievements = () => {
  const { workouts, getTotalWeight, getCompletedWorkoutsCount } = useWorkoutProgress();
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRecord | null>(null);

  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  // Get all exercise records with history
  const getAllExerciseRecords = (): ExerciseRecord[] => {
    const exerciseMap = new Map<string, ExerciseRecord>();

    // Get all exercises from training plan
    trainingPlan.forEach(day => {
      day.exercises.forEach(exercise => {
        if (!exerciseMap.has(exercise.id)) {
          exerciseMap.set(exercise.id, {
            exerciseId: exercise.id,
            name: exercise.name,
            maxWeight: 0,
            maxReps: 0,
            history: [],
          });
        }
      });
    });

    // Process all workouts
    workouts.forEach(workout => {
      const day = trainingPlan.find(d => d.id === workout.dayId);
      workout.exercises.forEach(ex => {
        const exercise = day?.exercises.find(e => e.id === ex.exerciseId);
        if (!exercise) return;

        const record = exerciseMap.get(ex.exerciseId);
        if (!record) return;

        ex.sets.forEach(set => {
          if (set.completed && set.weight > 0) {
            // Track max weight
            if (set.weight > record.maxWeight) {
              record.maxWeight = set.weight;
            }
            // Track max reps at any weight
            if (set.reps > record.maxReps) {
              record.maxReps = set.reps;
            }
            // Add to history
            record.history.push({
              date: workout.date,
              weight: set.weight,
              reps: set.reps,
            });
          }
        });
      });
    });

    // Filter only exercises with data and sort by max weight
    return Array.from(exerciseMap.values())
      .filter(r => r.maxWeight > 0)
      .sort((a, b) => b.maxWeight - a.maxWeight);
  };

  const exerciseRecords = getAllExerciseRecords();

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

  // Group history by date for the dialog
  const getGroupedHistory = (history: { date: string; weight: number; reps: number }[]) => {
    const grouped = new Map<string, { weight: number; reps: number }[]>();
    history.forEach(h => {
      const existing = grouped.get(h.date) || [];
      existing.push({ weight: h.weight, reps: h.reps });
      grouped.set(h.date, existing);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
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
          title="Ćwiczeń z rekordem"
          value={exerciseRecords.length}
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

      {/* All Exercise Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fitness-success" />
            Rekordy wszystkich ćwiczeń
          </CardTitle>
          <CardDescription>Kliknij ćwiczenie, aby zobaczyć historię ciężarów</CardDescription>
        </CardHeader>
        <CardContent>
          {exerciseRecords.length > 0 ? (
            <div className="space-y-2">
              {exerciseRecords.map((record) => (
                <div
                  key={record.exerciseId}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedExercise(record)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{record.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.history.length} zapisanych serii
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-fitness-success">{record.maxWeight} kg</p>
                      <p className="text-xs text-muted-foreground">max ciężar</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Brak wyników do wyświetlenia. Ukończ pierwszy trening!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exercise History Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExercise?.name}</DialogTitle>
            <DialogDescription>Historia ciężarów i powtórzeń</DialogDescription>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="space-y-4">
              {/* Max Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-fitness-success/10 text-center">
                  <p className="text-2xl font-bold text-fitness-success">{selectedExercise.maxWeight} kg</p>
                  <p className="text-xs text-muted-foreground">Rekord ciężaru</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedExercise.maxReps}</p>
                  <p className="text-xs text-muted-foreground">Max powtórzeń</p>
                </div>
              </div>

              {/* History by date */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Historia treningów</h4>
                {getGroupedHistory(selectedExercise.history).map(([date, sets]) => (
                  <div key={date} className="p-3 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">
                      {new Date(date).toLocaleDateString('pl-PL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sets.map((set, idx) => (
                        <Badge key={idx} variant="secondary">
                          {set.weight}kg × {set.reps}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Achievements;
