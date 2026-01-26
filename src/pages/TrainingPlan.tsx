import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { trainingPlan, getTrainingSchedule, trainingRules } from '@/data/trainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { useState, useMemo } from 'react';
import { pl } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CalendarDays, CheckCircle, Dumbbell } from 'lucide-react';

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { getLatestWorkout, workouts } = useFirebaseWorkouts();
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

  // Calculate week for TODAY (actual progress)
  const todayWeekNumber = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const actualCurrentWeek = Math.max(1, Math.min(12, todayWeekNumber));

  // Calculate week for SELECTED DATE (for display)
  const selectedOrToday = selectedDate || today;
  const selectedWeekNumber = Math.floor((selectedOrToday.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const displayWeek = Math.max(1, Math.min(12, selectedWeekNumber));

  // Get selected week's dates
  const selectedWeekStart = new Date(startDate);
  selectedWeekStart.setDate(startDate.getDate() + (displayWeek - 1) * 7);
  const selectedWeekEnd = new Date(selectedWeekStart);
  selectedWeekEnd.setDate(selectedWeekStart.getDate() + 6);

  // Get training dates for selected week
  const selectedWeekTrainingDates = useMemo(() => {
    const weekStart = new Date(selectedWeekStart);
    const weekEnd = new Date(selectedWeekEnd);
    return schedule.filter(s =>
      s.date >= weekStart && s.date <= weekEnd
    );
  }, [selectedWeekStart.getTime(), selectedWeekEnd.getTime(), schedule]);

  // Funkcja pomocnicza do formatowania daty lokalnej (bez problemu ze strefą czasową)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get workouts for selected week
  const getWorkoutForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return workouts.find(w => w.date === dateStr);
  };

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
              Tydzień {displayWeek} z 12
              {displayWeek !== actualCurrentWeek && (
                <span className="ml-1 opacity-70">(aktualny: {actualCurrentWeek})</span>
              )}
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
                  {selectedWeekStart.toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit'
                  })} - {selectedWeekEnd.toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </Badge>
                {displayWeek !== actualCurrentWeek && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-xs text-primary hover:underline"
                  >
                    ← Wróć do bieżącego tygodnia
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {selectedWeekTrainingDates.map((scheduleItem) => {
                  const dayPlan = trainingPlan.find(d => d.id === scheduleItem.dayId);
                  if (!dayPlan) return null;

                  const workoutForDate = getWorkoutForDate(scheduleItem.date);
                  const dateStr = scheduleItem.date.toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'short'
                  });

                  return (
                    <div key={`${scheduleItem.dayId}-${scheduleItem.date.toISOString()}`}>
                      <p className="text-xs text-muted-foreground mb-1 ml-1">{dateStr}</p>
                      <TrainingDayCard
                        day={dayPlan}
                        latestWorkout={workoutForDate}
                        trainingDate={scheduleItem.date}
                        onClick={() => navigate(`/workout/${dayPlan.id}`)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Progress Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{actualCurrentWeek}</p>
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
                        {Math.max(0, 12 - actualCurrentWeek)}
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

              {/* Selected date info */}
              {selectedDate && (() => {
                const selectedDateStr = selectedDate.toISOString().split('T')[0];
                const scheduleEntry = schedule.find(s =>
                  s.date.toISOString().split('T')[0] === selectedDateStr
                );

                if (!scheduleEntry) return null;

                const dayPlan = trainingPlan.find(d => d.id === scheduleEntry.dayId);
                const workoutForDate = workouts.find(w => w.date === selectedDateStr);

                return (
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">
                          {selectedDate.toLocaleDateString('pl-PL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </span>
                      </div>
                      {dayPlan && (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            {dayPlan.dayName}: {dayPlan.focus}
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            {workoutForDate?.completed ? (
                              <Badge className="bg-fitness-success text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ukończony
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                Zaplanowany
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => navigate(`/workout/${scheduleEntry.dayId}`)}
                            className="text-sm text-primary hover:underline"
                          >
                            Przejdź do treningu →
                          </button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPlan;
