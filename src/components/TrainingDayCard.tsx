import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Dumbbell, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { TrainingDay } from '@/data/trainingPlan';
import { WorkoutSession } from '@/hooks/useFirebaseWorkouts';
import { cn } from '@/lib/utils';

interface TrainingDayCardProps {
  day: TrainingDay;
  latestWorkout?: WorkoutSession;
  trainingDate?: Date; // Data zaplanowanego treningu
  onClick: () => void;
}

// Funkcja pomocnicza do formatowania daty lokalnej (bez problemu ze strefą czasową)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TrainingDayCard = ({ day, latestWorkout, trainingDate, onClick }: TrainingDayCardProps) => {
  const todayStr = formatLocalDate(new Date());
  const trainingDateStr = trainingDate ? formatLocalDate(trainingDate) : undefined;

  // Sprawdź status treningu
  const isCompleted = latestWorkout?.completed === true;
  const isCompletedToday = isCompleted && latestWorkout?.date === todayStr;

  // Trening jest "pominięty" TYLKO jeśli:
  // 1. Data treningu jest WCZEŚNIEJSZA niż dzisiaj (stricte <, nie <=)
  // 2. I nie ma ukończonego workoutu dla tej daty
  // Dzisiejszy trening NIGDY nie jest pominięty - masz czas do końca dnia!
  const isPastDate = trainingDateStr && trainingDateStr < todayStr;
  const isMissed = isPastDate && !isCompleted;

  // Określ styl karty
  const getCardStyle = () => {
    if (isCompleted) return "ring-2 ring-fitness-success bg-fitness-success/5";
    if (isMissed) return "ring-2 ring-destructive bg-destructive/5";
    return "";
  };

  // Określ styl ikony
  const getIconStyle = () => {
    if (isCompleted) return "bg-fitness-success text-white";
    if (isMissed) return "bg-destructive text-white";
    return "bg-gradient-to-br from-primary to-secondary text-white";
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
        getCardStyle()
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-14 w-14 rounded-xl flex flex-col items-center justify-center font-bold",
              getIconStyle()
            )}>
              {isCompleted ? (
                <CheckCircle className="h-6 w-6" />
              ) : isMissed ? (
                <XCircle className="h-6 w-6" />
              ) : (
                <>
                  <span className="text-xs uppercase tracking-wide opacity-80">
                    {day.dayName.slice(0, 3)}
                  </span>
                  <Dumbbell className="h-5 w-5" />
                </>
              )}
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
            {isCompletedToday && (
              <Badge className="bg-fitness-success text-white">Ukończone dziś</Badge>
            )}
            {isCompleted && !isCompletedToday && (
              <Badge variant="secondary" className="text-fitness-success">Ukończone</Badge>
            )}
            {isMissed && (
              <Badge variant="destructive">Pominięte</Badge>
            )}
          </div>
          {latestWorkout && isCompleted && (
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
