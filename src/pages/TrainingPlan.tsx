import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { getTrainingSchedule, trainingRules } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { useCurrentUser } from '@/contexts/UserContext';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { useState, useMemo } from 'react';
import { pl } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CalendarDays, CheckCircle, Dumbbell, Settings, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { uid, isAdmin } = useCurrentUser();
  const { getLatestWorkout, workouts } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, planStartDate, currentWeek: hookCurrentWeek, planDurationWeeks } = useTrainingPlan(uid);
  const { activities: stravaActivities } = useStrava(uid, isAdmin);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get dates with completed workouts
  const completedDates = workouts
    .filter(w => w.completed)
    .map(w => new Date(w.date));

  // Get dates with Strava activities
  const stravaDates = useMemo(() =>
    stravaActivities.map(a => new Date(a.date)),
    [stravaActivities]
  );

  // Get all scheduled training dates for 12 weeks
  const schedule = useMemo(() => getTrainingSchedule(), []);
  const trainingDates = useMemo(() => schedule.map(s => s.date), [schedule]);

  // Use planStartDate from hook (Firebase) if available, fallback to schedule
  const today = new Date();
  const startDate = planStartDate ? new Date(planStartDate) : (schedule[0]?.date || today);

  // Use currentWeek from hook (calculated from planStartDate)
  const actualCurrentWeek = Math.max(1, Math.min(planDurationWeeks, hookCurrentWeek));

  // Calculate week for SELECTED DATE (for display)
  const selectedOrToday = selectedDate || today;
  const selectedWeekNumber = Math.floor((selectedOrToday.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const displayWeek = Math.max(1, Math.min(planDurationWeeks, selectedWeekNumber));

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

  // Day of week name — short for mobile, long for desktop
  const getDayOfWeekName = (dateStr: string) => {
    const d = new Date(dateStr);
    const long = d.toLocaleDateString('pl-PL', { weekday: 'long' });
    const short = d.toLocaleDateString('pl-PL', { weekday: 'short' });
    return { long, short };
  };

  return (
    <div className="space-y-6">
      {/* Week Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="font-heading tracking-tight">Plan treningowy</CardTitle>
              <CardDescription>{planDurationWeeks}-tygodniowy program: Poniedziałek, Środa, Piątek</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/plan/edit')}>
                <Settings className="h-4 w-4 mr-1" />
                Edytuj
              </Button>
              <Badge className="bg-primary text-primary-foreground py-2 px-4 text-sm">
                Tydzień {displayWeek} z {planDurationWeeks}
              {displayWeek !== actualCurrentWeek && (
                <span className="ml-1 opacity-70">(aktualny: {actualCurrentWeek})</span>
              )}
            </Badge>
            </div>
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

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
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

              {/* Merged timeline: training + Strava */}
              <div className="space-y-3">
                {(() => {
                  type TimelineItem =
                    | { type: 'training'; scheduleItem: typeof selectedWeekTrainingDates[number]; dateStr: string }
                    | { type: 'strava'; activity: typeof stravaActivities[number]; dateStr: string };

                  const items: TimelineItem[] = [];

                  selectedWeekTrainingDates.forEach(scheduleItem => {
                    const dayPlan = trainingPlan.find(d => d.id === scheduleItem.dayId);
                    if (dayPlan) {
                      items.push({ type: 'training', scheduleItem, dateStr: formatLocalDate(scheduleItem.date) });
                    }
                  });

                  const weekStartStr = formatLocalDate(selectedWeekStart);
                  const weekEndStr = formatLocalDate(selectedWeekEnd);
                  stravaActivities
                    .filter(a => a.date >= weekStartStr && a.date <= weekEndStr)
                    .forEach(activity => {
                      items.push({ type: 'strava', activity, dateStr: activity.date });
                    });

                  // Group items by date
                  items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

                  const groupedByDate = new Map<string, TimelineItem[]>();
                  items.forEach(item => {
                    const existing = groupedByDate.get(item.dateStr) || [];
                    existing.push(item);
                    groupedByDate.set(item.dateStr, existing);
                  });

                  return Array.from(groupedByDate.entries()).map(([dateStr, dayItems]) => {
                    const dateObj = new Date(dateStr);
                    const dateLabel = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
                    const dayName = getDayOfWeekName(dateStr);
                    const trainingItem = dayItems.find(i => i.type === 'training') as Extract<TimelineItem, { type: 'training' }> | undefined;
                    const stravaItems = dayItems.filter(i => i.type === 'strava') as Extract<TimelineItem, { type: 'strava' }>[];

                    return (
                      <div key={dateStr}>
                        <div className="flex items-center justify-between mb-1 ml-1">
                          <p className="text-xs text-muted-foreground">
                            <span className="capitalize"><span className="sm:hidden">{dayName.short}</span><span className="hidden sm:inline">{dayName.long}</span></span>, {dateLabel}
                          </p>
                          {trainingItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground hover:text-primary gap-1"
                              onClick={() => navigate('/plan/edit')}
                            >
                              <Pencil className="h-3 w-3" />
                              Edytuj
                            </Button>
                          )}
                        </div>

                        {/* Strava activities — full cards (same as DayPlan/Analytics) */}
                        {stravaItems.map(({ activity }) => (
                          <div key={`strava-${activity.id}`} className="mb-1">
                            <StravaActivityCard activity={activity} />
                          </div>
                        ))}

                        {/* Training card */}
                        {trainingItem && (() => {
                          const dayPlan = trainingPlan.find(d => d.id === trainingItem.scheduleItem.dayId)!;
                          const workoutForDate = getWorkoutForDate(trainingItem.scheduleItem.date);
                          const trainingDateStr = formatLocalDate(trainingItem.scheduleItem.date);
                          return (
                            <TrainingDayCard
                              day={dayPlan}
                              latestWorkout={workoutForDate}
                              trainingDate={trainingItem.scheduleItem.date}
                              onClick={() => navigate(`/workout/${dayPlan.id}?date=${trainingDateStr}`)}
                            />
                          );
                        })()}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Progress Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-heading font-bold text-primary">{actualCurrentWeek}</p>
                      <p className="text-xs text-muted-foreground">Aktualny tydzień</p>
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold text-primary">
                        {workouts.filter(w => w.completed).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Ukończone treningi</p>
                    </div>
                    <div>
                      <p className="text-2xl font-heading font-bold text-primary">
                        {Math.max(0, planDurationWeeks - actualCurrentWeek)}
                      </p>
                      <p className="text-xs text-muted-foreground">Tygodni pozostało</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar — redesigned */}
            <div className="hidden lg:block space-y-4">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={pl}
                    modifiers={{
                      completed: completedDates,
                      training: trainingDates,
                      strava: stravaDates,
                    }}
                    modifiersClassNames={{
                      completed: 'calendar-completed',
                      training: 'calendar-training',
                      strava: 'calendar-strava',
                    }}
                    className="p-4 w-full [&_.calendar-completed]:bg-emerald-500 [&_.calendar-completed]:text-white [&_.calendar-completed]:font-semibold [&_.calendar-completed]:hover:bg-emerald-600 [&_.calendar-training]:ring-2 [&_.calendar-training]:ring-primary [&_.calendar-training]:ring-inset [&_.calendar-strava]:ring-2 [&_.calendar-strava]:ring-orange-500 [&_.calendar-strava]:ring-inset"
                  />
                </CardContent>
              </Card>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Ukończone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full ring-2 ring-primary ring-inset" />
                  <span className="text-muted-foreground">Zaplanowane</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full ring-2 ring-orange-500 ring-inset" />
                    <span className="text-muted-foreground">Strava</span>
                  </div>
                )}
              </div>

              {/* Selected date info */}
              {selectedDate && (() => {
                const selectedDateStr = formatLocalDate(selectedDate);
                const scheduleEntry = schedule.find(s =>
                  formatLocalDate(s.date) === selectedDateStr
                );

                // Check for Strava activity on this date too
                const stravaOnDate = stravaActivities.filter(a => a.date === selectedDateStr);

                if (!scheduleEntry && stravaOnDate.length === 0) return null;

                const dayPlan = scheduleEntry ? trainingPlan.find(d => d.id === scheduleEntry.dayId) : null;
                const workoutForDate = workouts.find(w => w.date === selectedDateStr);

                return (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm capitalize">
                          {selectedDate.toLocaleDateString('pl-PL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </span>
                      </div>

                      {dayPlan && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {dayPlan.dayName}: {dayPlan.focus}
                          </p>
                          <div className="flex items-center gap-2">
                            {workoutForDate?.completed ? (
                              <Badge className="bg-emerald-500 text-white">
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
                            onClick={() => navigate(`/workout/${scheduleEntry!.dayId}?date=${selectedDateStr}`)}
                            className="text-sm text-primary hover:underline"
                          >
                            Przejdź do treningu →
                          </button>
                        </>
                      )}

                      {stravaOnDate.length > 0 && (
                        <div className="space-y-2">
                          {dayPlan && <div className="border-t border-border pt-2" />}
                          {stravaOnDate.map(a => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <span className="text-orange-500">●</span>
                              <span className="truncate">{a.name}</span>
                              {a.distance && (
                                <span className="text-muted-foreground text-xs shrink-0">
                                  {(a.distance / 1000).toFixed(1)} km
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
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
