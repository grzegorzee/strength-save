import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { cn } from '@/lib/utils';

interface TrainingDayCardProps {
  day: TrainingDay;
  latestWorkout?: WorkoutSession;
  trainingDate?: Date;
  onClick: () => void;
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TrainingDayCard = ({ day, latestWorkout, trainingDate, onClick }: TrainingDayCardProps) => {
  const todayStr = formatLocalDate(new Date());
  const trainingDateStr = trainingDate ? formatLocalDate(trainingDate) : undefined;

  const isCompleted = latestWorkout?.completed === true;
  const isCompletedToday = isCompleted && latestWorkout?.date === todayStr;
  const isPastDate = trainingDateStr && trainingDateStr < todayStr;
  const isMissed = isPastDate && !isCompleted;

  const getCardStyle = () => {
    if (isCompleted) return "ring-1 ring-fitness-success/50 bg-fitness-success/5";
    if (isMissed) return "ring-1 ring-destructive/50 bg-destructive/5";
    return "";
  };

  const getIconStyle = () => {
    if (isCompleted) return "bg-fitness-success/15 text-fitness-success";
    if (isMissed) return "bg-destructive/15 text-destructive";
    return "bg-primary/15 text-primary";
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-md overflow-hidden",
        getCardStyle()
      )}
      onClick={onClick}
    >
      <CardContent className="py-3 px-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            getIconStyle()
          )}>
            {isCompleted ? (
              <CheckCircle className="h-5 w-5" />
            ) : isMissed ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <Dumbbell className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{day.dayName}</p>
              {isCompletedToday && (
                <Badge className="bg-fitness-success text-white text-[10px] h-5">Dziś</Badge>
              )}
              {isCompleted && !isCompletedToday && (
                <Badge variant="secondary" className="text-fitness-success text-[10px] h-5">Ukończone</Badge>
              )}
              {isMissed && (
                <Badge variant="destructive" className="text-[10px] h-5">Pominięte</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{day.focus}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {day.exercises.length}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
