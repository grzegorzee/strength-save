import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { trainingRules } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { useCurrentUser } from '@/contexts/UserContext';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { useState, useMemo } from 'react';
import { pl } from 'date-fns/locale';
import { CalendarDays, Dumbbell, Pencil, CheckCircle } from 'lucide-react';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { buildTrainingSchedule, getStartOfPlanWeek, startOfLocalDay } from '@/lib/plan-schedule';

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { uid, canUseStrava } = useCurrentUser();
  const { getLatestWorkout, workouts } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, planStartDate, currentWeek: hookCurrentWeek, planDurationWeeks } = useTrainingPlan(uid);
  const { activities: stravaActivities } = useStrava(uid, canUseStrava);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const completedDates = workouts
    .filter(w => w.completed)
    .map(w => parseLocalDate(w.date));

  const stravaDates = useMemo(() =>
    stravaActivities.map(a => parseLocalDate(a.date)),
    [stravaActivities]
  );

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(
    () => getStartOfPlanWeek(planStartDate ? parseLocalDate(planStartDate) : today),
    [planStartDate, today],
  );
  const schedule = useMemo(
    () => buildTrainingSchedule(trainingPlan, startDate, planDurationWeeks),
    [trainingPlan, startDate, planDurationWeeks],
  );
  const trainingDates = useMemo(() => schedule.map(s => s.date), [schedule]);

  const actualCurrentWeek = Math.max(1, Math.min(planDurationWeeks, hookCurrentWeek));
  const selectedOrToday = selectedDate || today;
  const selectedWeekNumber = Math.floor((startOfLocalDay(selectedOrToday).getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const displayWeek = Math.max(1, Math.min(planDurationWeeks, selectedWeekNumber));

  const { selectedWeekStart, selectedWeekEnd } = useMemo(() => {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (displayWeek - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return { selectedWeekStart: weekStart, selectedWeekEnd: weekEnd };
  }, [displayWeek, startDate]);
  const selectedWeekStartMs = selectedWeekStart.getTime();
  const selectedWeekEndMs = selectedWeekEnd.getTime();

  const selectedWeekTrainingDates = useMemo(() => {
    return schedule.filter(s => {
      const dateMs = s.date.getTime();
      return dateMs >= selectedWeekStartMs && dateMs <= selectedWeekEndMs;
    });
  }, [schedule, selectedWeekEndMs, selectedWeekStartMs]);

  const getWorkoutForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return workouts.find(w => w.date === dateStr);
  };

  const getDayOfWeekName = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const long = d.toLocaleDateString('pl-PL', { weekday: 'long' });
    const short = d.toLocaleDateString('pl-PL', { weekday: 'short' });
    return { long, short };
  };

  const progressPercent = Math.min(100, Math.round((actualCurrentWeek / planDurationWeeks) * 100));

  return (
    <div className="space-y-6">
      {/* ══ Main glass card ══ */}
      <div className="exercise-card">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Plan treningowy</h1>
              <p className="text-[13px] text-muted-foreground mt-1 font-medium">
                {planDurationWeeks}-tygodniowy program: {trainingPlan.map(d => d.dayName).join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/plan/edit')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edytuj
              </button>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 text-[13px] font-bold text-white whitespace-nowrap">
                Tydzień {displayWeek}/{planDurationWeeks}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-5">
          <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-semibold">
            <span className="text-[#3a3f52]">Start</span>
            <span className="text-primary">{progressPercent}% ukończone</span>
            <span className="text-[#3a3f52]">Koniec</span>
          </div>
        </div>

        <div className="exercise-card-divider mx-6" />

        {/* Rules tip */}
        <div className="mx-6 mt-5 mb-5 py-3 px-4 rounded-xl bg-primary/[0.04] border-l-[3px] border-primary/30 text-xs text-[#7a7f94] leading-relaxed">
          <strong className="text-muted-foreground">⚡ {trainingRules.weight}</strong><br />
          ⏱️ {trainingRules.restMain} • {trainingRules.restIsolation}
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between px-6 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const prev = new Date(selectedWeekStart);
                prev.setDate(prev.getDate() - 7);
                setSelectedDate(prev);
              }}
              className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.03] text-muted-foreground flex items-center justify-center hover:border-primary/30 hover:text-primary transition-colors text-sm"
            >
              ‹
            </button>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] font-semibold text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {selectedWeekStart.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })} – {selectedWeekEnd.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <button
              onClick={() => {
                const next = new Date(selectedWeekStart);
                next.setDate(next.getDate() + 7);
                setSelectedDate(next);
              }}
              className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.03] text-muted-foreground flex items-center justify-center hover:border-primary/30 hover:text-primary transition-colors text-sm"
            >
              ›
            </button>
          </div>
          {displayWeek !== actualCurrentWeek && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              ← Bieżący tydzień
            </button>
          )}
        </div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 px-6 pb-6">
          {/* ── Left: Timeline ── */}
          <div className="space-y-1 min-w-0">
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

              items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

              const groupedByDate = new Map<string, TimelineItem[]>();
              items.forEach(item => {
                const existing = groupedByDate.get(item.dateStr) || [];
                existing.push(item);
                groupedByDate.set(item.dateStr, existing);
              });

              return Array.from(groupedByDate.entries()).map(([dateStr, dayItems]) => {
                const dateObj = parseLocalDate(dateStr);
                const dateLabel = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
                const dayName = getDayOfWeekName(dateStr);
                const trainingItem = dayItems.find(i => i.type === 'training') as Extract<TimelineItem, { type: 'training' }> | undefined;
                const stravaItems = dayItems.filter(i => i.type === 'strava') as Extract<TimelineItem, { type: 'strava' }>[];

                return (
                  <div key={dateStr} className="mb-4">
                    {/* Day label */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#3a3f52]">
                        <span className="capitalize sm:hidden">{dayName.short}</span>
                        <span className="capitalize hidden sm:inline">{dayName.long}</span>, {dateLabel}
                      </span>
                      {trainingItem && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/plan/edit'); }}
                          className="flex items-center gap-1 text-[11px] text-[#2e3348] hover:text-primary transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Edytuj
                        </button>
                      )}
                    </div>

                    {/* Strava activities */}
                    {stravaItems.map(({ activity }) => (
                      <div key={`strava-${activity.id}`} className="mb-2">
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

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl p-4 border border-white/[0.04] bg-white/[0.02] text-center">
                <p className="text-3xl font-black text-primary tracking-tight">{actualCurrentWeek}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3f52] mt-1">Tydzień</p>
              </div>
              <div className="rounded-2xl p-4 border border-white/[0.04] bg-white/[0.02] text-center">
                <p className="text-3xl font-black text-primary tracking-tight">
                  {workouts.filter(w => w.completed).length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3f52] mt-1">Ukończone</p>
              </div>
              <div className="rounded-2xl p-4 border border-white/[0.04] bg-white/[0.02] text-center">
                <p className="text-3xl font-black text-primary tracking-tight">
                  {Math.max(0, planDurationWeeks - actualCurrentWeek)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a3f52] mt-1">Pozostało</p>
              </div>
            </div>
          </div>

          {/* ── Right: Calendar ── */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-2xl p-5 border border-white/[0.04] bg-white/[0.02]">
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
                className="w-full [&_.calendar-completed]:bg-emerald-500/15 [&_.calendar-completed]:text-emerald-400 [&_.calendar-completed]:font-bold [&_.calendar-completed]:hover:bg-emerald-500/25 [&_.calendar-training]:ring-2 [&_.calendar-training]:ring-primary/40 [&_.calendar-training]:ring-inset [&_.calendar-training]:text-primary [&_.calendar-strava]:ring-2 [&_.calendar-strava]:ring-orange-500/40 [&_.calendar-strava]:ring-inset [&_.calendar-strava]:text-orange-500"
              />

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-[10px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[#3a3f52]">Ukończone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full ring-2 ring-primary/60 ring-inset" />
                  <span className="text-[#3a3f52]">Zaplanowane</span>
                </div>
                {canUseStrava && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full ring-2 ring-orange-500/60 ring-inset" />
                    <span className="text-[#3a3f52]">Strava</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected date info */}
            {selectedDate && (() => {
              const selectedDateStr = formatLocalDate(selectedDate);
              const scheduleEntry = schedule.find(s => formatLocalDate(s.date) === selectedDateStr);
              const stravaOnDate = stravaActivities.filter(a => a.date === selectedDateStr);
              if (!scheduleEntry && stravaOnDate.length === 0) return null;

              const dayPlan = scheduleEntry ? trainingPlan.find(d => d.id === scheduleEntry.dayId) : null;
              const workoutForDate = workouts.find(w => w.date === selectedDateStr);

              return (
                <div className="rounded-2xl p-4 border border-primary/10 bg-primary/[0.04] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="capitalize">
                      {selectedDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>

                  {dayPlan && (
                    <>
                      <p className="text-sm text-[#7a7f94]">{dayPlan.dayName}: {dayPlan.focus}</p>
                      <div className="flex items-center gap-2">
                        {workoutForDate?.completed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> Ukończony
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 bg-white/[0.03] text-muted-foreground">
                            <Dumbbell className="h-3 w-3" /> Zaplanowany
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/workout/${scheduleEntry!.dayId}?date=${selectedDateStr}`)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Przejdź do treningu →
                      </button>
                    </>
                  )}

                  {stravaOnDate.length > 0 && (
                    <div className="space-y-1.5">
                      {dayPlan && <div className="exercise-card-divider" />}
                      {stravaOnDate.map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                          <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                          <span className="text-muted-foreground truncate">{a.name}</span>
                          {a.distance && (
                            <span className="text-[#3a3f52] shrink-0">
                              {(a.distance / 1000).toFixed(1)} km
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPlan;
