import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { trainingPlan, getTrainingSchedule, trainingRules } from '@/data/trainingPlan';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { useState, useMemo } from 'react';
import { pl } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { getLatestWorkout, workouts } = useWorkoutProgress();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get dates with completed workouts
  const completedDates = workouts
    .filter(w => w.completed)
    .map(w => new Date(w.date));

  // Get all scheduled training dates for 12 weeks
  const schedule = useMemo(() => getTrainingSchedule(), []);
  const trainingDates = useMemo(() => schedule.map(s => s.date), [schedule]);

  // Calculate week number and dates
  const today = new Date();
  const startDate = schedule[0]?.date || today;
  const weekNumber = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const currentWeek = Math.max(1, Math.min(12, weekNumber));

  // Get current week's dates
  const currentWeekStart = new Date(startDate);
  currentWeekStart.setDate(startDate.getDate() + (currentWeek - 1) * 7);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

  return (
    <div className="space-y-6">
      {/* Week Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Plan treningowy</CardTitle>
              <CardDescription>12-tygodniowy program: Poniedziałek, Środa, Piątek</CardDescription>
            </div>
            <Badge className="bg-primary text-primary-foreground py-2 px-4 text-sm">
              Tydzień {currentWeek} z 12
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm space-y-1">
              <p>⚡ {trainingRules.weight}</p>
              <p>⏱️ {trainingRules.restMain} • {trainingRules.restIsolation}</p>
            </AlertDescription>
          </Alert>

          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Training Days List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="py-2 px-4 text-sm">
                  {currentWeekStart.toLocaleDateString('pl-PL', { 
                    day: '2-digit', 
                    month: '2-digit'
                  })} - {currentWeekEnd.toLocaleDateString('pl-PL', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </Badge>
              </div>

              <div className="space-y-3">
                {trainingPlan.map((day) => (
                  <TrainingDayCard
                    key={day.id}
                    day={day}
                    latestWorkout={getLatestWorkout(day.id)}
                    onClick={() => navigate(`/workout/${day.id}`)}
                  />
                ))}
              </div>

              {/* Progress Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{currentWeek}</p>
                      <p className="text-xs text-muted-foreground">Aktualny tydzień</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {workouts.filter(w => w.completed).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Ukończone treningi</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {12 - currentWeek}
                      </p>
                      <p className="text-xs text-muted-foreground">Tygodni pozostało</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar */}
            <div className="hidden lg:block">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={pl}
                modifiers={{
                  completed: completedDates,
                  training: trainingDates,
                }}
                modifiersStyles={{
                  completed: {
                    backgroundColor: 'hsl(var(--fitness-success))',
                    color: 'white',
                    borderRadius: '50%',
                  },
                  training: {
                    border: '2px solid hsl(var(--primary))',
                    borderRadius: '50%',
                  },
                }}
                className="rounded-xl border p-3"
              />
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-fitness-success" />
                  <span className="text-muted-foreground">Ukończone treningi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-primary" />
                  <span className="text-muted-foreground">Zaplanowane treningi</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPlan;
