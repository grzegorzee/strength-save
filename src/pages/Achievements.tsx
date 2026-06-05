import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { Trophy, Dumbbell, Target, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculate1RM, getExerciseBest1RM } from '@/lib/pr-utils';
import { ExerciseProgressionDialog } from '@/components/ExerciseProgressionDialog';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface ExerciseRecord {
  exerciseId: string;
  name: string;
  maxWeight: number;
  maxReps: number;
  history: { date: string; weight: number; reps: number }[];
}

const Achievements = () => {
  const { t } = useTranslation();
  const { uid } = useCurrentUser();
  const { workouts, getTotalWeight, getCompletedWorkoutsCount, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRecord | null>(null);
  const [progressionExercise, setProgressionExercise] = useState<{ id: string; name: string } | null>(null);

  const totalWeight = getTotalWeight();
  const completedWorkouts = getCompletedWorkoutsCount();

  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles), [trainingPlan, cycles]);

  // Rekordy budujemy z SAMYCH treningów (nie z aktualnego planu), żeby ćwiczenia ze starych
  // planów nie znikały po zmianie planu. Nazwy resolwuje resolver (snapshot → cykl → plan).
  const exerciseRecords = useMemo((): ExerciseRecord[] => {
    const exerciseMap = new Map<string, ExerciseRecord>();

    workouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        let record = exerciseMap.get(ex.exerciseId);
        if (!record) {
          record = {
            exerciseId: ex.exerciseId,
            name: resolver.resolveExerciseName(workout, ex.exerciseId),
            maxWeight: 0,
            maxReps: 0,
            history: [],
          };
          exerciseMap.set(ex.exerciseId, record);
        }

        ex.sets.forEach(set => {
          if (set.completed && set.weight > 0) {
            if (set.weight > record.maxWeight) record.maxWeight = set.weight;
            if (set.reps > record.maxReps) record.maxReps = set.reps;
            record.history.push({ date: workout.date, weight: set.weight, reps: set.reps });
          }
        });
      });
    });

    return Array.from(exerciseMap.values())
      .filter(r => r.maxWeight > 0)
      .sort((a, b) => b.maxWeight - a.maxWeight);
  }, [resolver, workouts]);

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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">{t('achievements.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('achievements.subtitle')}</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title={t('achievements.completedWorkouts')}
          value={completedWorkouts}
          icon={Trophy}
          variant="success"
        />
        <StatsCard
          title={t('achievements.totalTonnage')}
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          subtitle={t('achievements.totalTonnageSub')}
          icon={Dumbbell}
          variant="primary"
        />
        <StatsCard
          title={t('achievements.exercisesWithRecord')}
          value={exerciseRecords.length}
          icon={Target}
          variant="default"
        />
      </div>

      {/* Tonnage Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('achievements.tonnage')}</CardTitle>
          <CardDescription>{t('achievements.tonnageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {totalWeight > 0 ? (
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-primary">
                {totalWeight.toLocaleString('pl-PL')} kg
              </p>
              <p className="text-muted-foreground mt-2">
                {t('achievements.tonsEquivalent', { tons: (totalWeight / 1000).toFixed(1) })}
              </p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('achievements.noResults')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* All Exercise Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fitness-success" />
            {t('achievements.allRecords')}
          </CardTitle>
          <CardDescription>{t('achievements.allRecordsDesc')}</CardDescription>
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
                      {t('achievements.savedSets', { n: record.history.length })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-fitness-success">{record.maxWeight} kg</p>
                      <p className="text-xs text-muted-foreground">{t('achievements.maxWeight')}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('achievements.noResultsFirst')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estimated 1RM Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('achievements.personalRecords')}
          </CardTitle>
          <CardDescription>{t('achievements.epleyFormula')}</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            // Iterujemy po ćwiczeniach faktycznie wykonanych (z historii), a nie tylko z nowego planu.
            const seen = new Map<string, string>();
            workouts.forEach(w => w.exercises.forEach(ex => {
              if (!seen.has(ex.exerciseId)) seen.set(ex.exerciseId, resolver.resolveExerciseName(w, ex.exerciseId));
            }));
            const records = Array.from(seen.entries())
              .map(([id, name]) => ({ ...getExerciseBest1RM(workouts, id), name }))
              .filter(r => r.best1RM > 0)
              .sort((a, b) => b.best1RM - a.best1RM);

            if (records.length === 0) {
              return (
                <p className="text-center text-muted-foreground py-8">
                  {t('achievements.firstWorkoutFor1RM')}
                </p>
              );
            }

            return (
              <div className="space-y-2">
                {records.map(record => (
                  <div
                    key={record.exerciseId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{record.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.best1RMWeight}kg × {record.best1RMReps} {t('achievements.repsShort')}
                        {record.bestDate && (
                          <> · {new Date(record.bestDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{record.best1RM} kg</p>
                        <p className="text-xs text-muted-foreground">{t('achievements.est1RM')}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setProgressionExercise({ id: record.exerciseId, name: record.name })}
                      >
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Exercise Progression Dialog */}
      {progressionExercise && (
        <ExerciseProgressionDialog
          exerciseId={progressionExercise.id}
          exerciseName={progressionExercise.name}
          open={!!progressionExercise}
          onOpenChange={(open) => { if (!open) setProgressionExercise(null); }}
          isBodyweight={isBodyweightExercise(progressionExercise.name)}
        />
      )}

      {/* Exercise History Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExercise?.name}</DialogTitle>
            <DialogDescription>{t('achievements.dialogDesc')}</DialogDescription>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="space-y-4">
              {/* Max Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-fitness-success/10 text-center">
                  <p className="text-2xl font-bold text-fitness-success">{selectedExercise.maxWeight} kg</p>
                  <p className="text-xs text-muted-foreground">{t('achievements.weightRecord')}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedExercise.maxReps}</p>
                  <p className="text-xs text-muted-foreground">{t('achievements.maxReps')}</p>
                </div>
              </div>

              {/* History by date */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">{t('achievements.workoutHistory')}</h4>
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
