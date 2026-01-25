import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Dumbbell, ChevronRight } from 'lucide-react';
import { TrainingDay } from '@/data/trainingPlan';
import { WorkoutSession } from '@/hooks/useWorkoutProgress';
import { cn } from '@/lib/utils';

interface TrainingDayCardProps {
  day: TrainingDay;
  latestWorkout?: WorkoutSession;
  onClick: () => void;
}

export const TrainingDayCard = ({ day, latestWorkout, onClick }: TrainingDayCardProps) => {
  const isCompleted = latestWorkout?.completed;
  const today = new Date().toISOString().split('T')[0];
  const isToday = latestWorkout?.date === today;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
        isCompleted && isToday && "ring-2 ring-fitness-success"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-14 w-14 rounded-xl flex flex-col items-center justify-center text-white font-bold",
              "bg-gradient-to-br from-primary to-secondary"
            )}>
              <span className="text-xs uppercase tracking-wide opacity-80">
                {day.dayName.slice(0, 3)}
              </span>
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{day.dayName}</CardTitle>
              <p className="text-sm text-muted-foreground">{day.focus}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {day.exercises.length} ćwiczeń
            </Badge>
            {isCompleted && isToday && (
              <Badge className="bg-fitness-success">Ukończone</Badge>
            )}
          </div>
          {latestWorkout && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(latestWorkout.date).toLocaleDateString('pl-PL')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
