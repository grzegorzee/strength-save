import { useNavigate } from 'react-router-dom';
import { getTrainingRules } from '@/data/trainingPlan';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { useState, useMemo, useCallback } from 'react';
import { CalendarDays, Dumbbell, Pencil, CheckCircle } from 'lucide-react';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { buildTrainingSchedule, getStartOfPlanWeek, startOfLocalDay } from '@/lib/plan-schedule';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { buildWorkoutRoute, findWorkoutForRoute } from '@/lib/workout-lookup';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';
import type { LanguageCode } from '@/i18n';

// ── Custom grid calendar matching mockup ──
const JS_DAY_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

interface PlanCalendarProps {
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  completedDates: Date[];
  trainingDates: Date[];
  stravaDates: Date[];
  lang: LanguageCode;
}

const PlanCalendar = ({ selectedDate, onSelectDate, completedDates, trainingDates, stravaDates, lang }: PlanCalendarProps) => {
  const [viewMonth, setViewMonth] = useState(() => selectedDate || new Date());

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const todayStr = formatLocalDate(new Date());

  const completedSet = useMemo(() => new Set(completedDates.map(formatLocalDate)), [completedDates]);
  const trainingSet = useMemo(() => new Set(trainingDates.map(formatLocalDate)), [trainingDates]);
  const stravaSet = useMemo(() => new Set(stravaDates.map(formatLocalDate)), [stravaDates]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0, Sunday = 6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, dateStr: formatLocalDate(d), isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      cells.push({ date, dateStr: formatLocalDate(date), isCurrentMonth: true });
    }
    // Next month fill (to complete grid)
    while (cells.length % 7 !== 0) {
      const d = new Date(year, month + 1, cells.length - startOffset - lastDay.getDate() + 1);
      cells.push({ date: d, dateStr: formatLocalDate(d), isCurrentMonth: false });
    }
    return cells;
  }, [year, month]);

  const weekdayLabels = useMemo(() => {
    // 2024-01-01 to poniedziałek; generujemy 7 krótkich nazw dni w bieżącym locale.
    return Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale(lang), { weekday: 'short' }),
    );
  }, [lang]);

  const prevMonth = useCallback(() => setViewMonth(new Date(year, month - 1, 1)), [year, month]);
  const nextMonth = useCallback(() => setViewMonth(new Date(year, month + 1, 1)), [year, month]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold capitalize">{viewMonth.toLocaleDateString(dateLocale(lang), { month: 'long' })} {year}</span>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-md bg-surface-low text-muted-foreground flex items-center justify-center hover:text-primary transition-colors text-sm">‹</button>
          <button onClick={nextMonth} className="w-7 h-7 rounded-md bg-surface-low text-muted-foreground flex items-center justify-center hover:text-primary transition-colors text-sm">›</button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 py-1">{label}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, dateStr, isCurrentMonth }) => {
          const isToday = dateStr === todayStr;
          const isSelected = selectedDate && formatLocalDate(selectedDate) === dateStr;
          const isCompleted = completedSet.has(dateStr);
          const isTraining = trainingSet.has(dateStr);
          const isStrava = stravaSet.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              className={cn(
                "w-full aspect-square rounded-[10px] flex items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer",
                !isCurrentMonth && "text-muted-foreground/25",
                isCurrentMonth && !isCompleted && !isTraining && !isStrava && "text-muted-foreground/80 hover:bg-surface-high",
                isCompleted && "bg-fitness-success/15 text-fitness-success font-bold",
                !isCompleted && isTraining && "ring-2 ring-inset ring-primary/40 text-primary",
                !isCompleted && !isTraining && isStrava && "ring-2 ring-inset ring-orange-500/40 text-orange-500",
                isToday && !isCompleted && "text-primary font-extrabold",
                isSelected && "bg-primary/20 ring-2 ring-primary"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const trainingRules = getTrainingRules(lang);
  const { uid, canUseStrava } = useCurrentUser();
  const { getLatestWorkout, workouts } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, planStartDate, currentWeek: hookCurrentWeek, planDurationWeeks } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const { activities: stravaActivities } = useStrava(uid, canUseStrava);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

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

  // Plan not started yet (start date in the future) → week 0, no progress.
  const planStarted = getStartOfPlanWeek(today).getTime() >= startDate.getTime();
  const actualCurrentWeek = planStarted ? Math.max(1, Math.min(planDurationWeeks, hookCurrentWeek)) : 0;
  const selectedOrToday = selectedDate || today;
  const selectedWeekNumber = Math.floor((startOfLocalDay(selectedOrToday).getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const isHistoricalWeek = selectedWeekNumber < 1;
  const displayWeek = isHistoricalWeek ? 0 : Math.max(1, Math.min(planDurationWeeks, selectedWeekNumber));

  const { selectedWeekStart, selectedWeekEnd } = useMemo(() => {
    if (isHistoricalWeek) {
      const weekStart = getStartOfPlanWeek(selectedOrToday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { selectedWeekStart: weekStart, selectedWeekEnd: weekEnd };
    }

    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (displayWeek - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return { selectedWeekStart: weekStart, selectedWeekEnd: weekEnd };
  }, [displayWeek, isHistoricalWeek, selectedOrToday, startDate]);
  const selectedWeekStartMs = selectedWeekStart.getTime();
  const selectedWeekEndMs = selectedWeekEnd.getTime();

  const selectedWeekTrainingDates = useMemo(() => {
    if (isHistoricalWeek) return [];
    return schedule.filter(s => {
      const dateMs = s.date.getTime();
      return dateMs >= selectedWeekStartMs && dateMs <= selectedWeekEndMs;
    });
  }, [isHistoricalWeek, schedule, selectedWeekEndMs, selectedWeekStartMs]);

  const getWorkoutForDate = (date: Date, dayId?: string) => {
    const dateStr = formatLocalDate(date);
    return findWorkoutForRoute(workouts, {
      dayId,
      date: dateStr,
      allowDateFallback: true,
    });
  };

  const workoutToDay = useCallback((workout: typeof workouts[number]): TrainingDay => {
    const label = resolver.resolveDayLabel(workout);
    const date = parseLocalDate(workout.date);
    return {
      id: workout.dayId,
      dayName: label.dayName,
      weekday: JS_DAY_TO_WEEKDAY[date.getDay()],
      focus: label.focus,
      exercises: workout.exercises.map(exercise => ({
        id: exercise.exerciseId,
        name: resolver.resolveExerciseName(workout, exercise.exerciseId),
        sets: t('card.setsCount', { n: exercise.sets.filter(set => !set.isWarmup).length }),
        instructions: [],
      })),
    };
  }, [resolver, t]);

  const getDayOfWeekName = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const long = d.toLocaleDateString(dateLocale(lang), { weekday: 'long' });
    const short = d.toLocaleDateString(dateLocale(lang), { weekday: 'short' });
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
              <h1 className="text-xl font-heading font-bold uppercase italic tracking-tight">{t('trainingplan.title')}</h1>
              <p className="text-[13px] text-muted-foreground mt-1 font-medium">
                {t('trainingplan.programSummary', { weeks: planDurationWeeks, days: trainingPlan.map(d => localizeDayName(d.dayName, lang)).join(', ') })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/plan/edit')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-0 bg-surface-low text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('trainingplan.edit')}
              </button>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-[#f4ffc9] to-primary text-[13px] font-heading font-bold uppercase tracking-tight text-background whitespace-nowrap">
                {isHistoricalWeek ? t('trainingplan.history') : t('trainingplan.weekOf', { current: displayWeek, total: planDurationWeeks })}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-5">
          <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f4ffc9] to-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-semibold uppercase tracking-wide">
            <span className="text-muted-foreground">{t('trainingplan.start')}</span>
            <span className="text-primary">{t('trainingplan.percentDone', { percent: progressPercent })}</span>
            <span className="text-muted-foreground">{t('trainingplan.end')}</span>
          </div>
        </div>

        <div className="exercise-card-divider mx-6" />

        {/* Rules tip */}
        <div className="mx-6 mt-5 mb-5 py-3 px-4 rounded-xl bg-primary/[0.04] border-l-[3px] border-primary/30 text-xs text-muted-foreground leading-relaxed">
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
              className="w-8 h-8 rounded-lg border-0 bg-surface-low text-muted-foreground flex items-center justify-center hover:border-primary/30 hover:text-primary transition-colors text-sm"
            >
              ‹
            </button>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface-low text-[13px] font-semibold text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {selectedWeekStart.toLocaleDateString(dateLocale(lang), { day: '2-digit', month: '2-digit' })} – {selectedWeekEnd.toLocaleDateString(dateLocale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <button
              onClick={() => {
                const next = new Date(selectedWeekStart);
                next.setDate(next.getDate() + 7);
                setSelectedDate(next);
              }}
              className="w-8 h-8 rounded-lg border-0 bg-surface-low text-muted-foreground flex items-center justify-center hover:border-primary/30 hover:text-primary transition-colors text-sm"
            >
              ›
            </button>
          </div>
          {displayWeek !== actualCurrentWeek && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              {t('trainingplan.currentWeek')}
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
                | { type: 'workout'; workout: typeof workouts[number]; dateStr: string }
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
              workouts
                .filter(w => w.completed && w.date >= weekStartStr && w.date <= weekEndStr)
                .filter(w => !items.some(item => item.type === 'training' && item.dateStr === w.date))
                .forEach(workout => {
                  items.push({ type: 'workout', workout, dateStr: workout.date });
                });

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
                const dateLabel = dateObj.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' });
                const dayName = getDayOfWeekName(dateStr);
                const trainingItem = dayItems.find(i => i.type === 'training') as Extract<TimelineItem, { type: 'training' }> | undefined;
                const workoutItem = dayItems.find(i => i.type === 'workout') as Extract<TimelineItem, { type: 'workout' }> | undefined;
                const stravaItems = dayItems.filter(i => i.type === 'strava') as Extract<TimelineItem, { type: 'strava' }>[];

                return (
                  <div key={dateStr} className="mb-4">
                    {/* Day label */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        <span className="capitalize sm:hidden">{dayName.short}</span>
                        <span className="capitalize hidden sm:inline">{dayName.long}</span>, {dateLabel}
                      </span>
                      {trainingItem && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/plan/edit'); }}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-primary transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          {t('trainingplan.edit')}
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
                      const workoutForDate = getWorkoutForDate(trainingItem.scheduleItem.date, dayPlan.id);
                      const trainingDateStr = formatLocalDate(trainingItem.scheduleItem.date);
                      return (
                        <TrainingDayCard
                          day={dayPlan}
                          latestWorkout={workoutForDate}
                          trainingDate={trainingItem.scheduleItem.date}
                          onClick={() => navigate(workoutForDate?.completed
                            ? buildWorkoutRoute(workoutForDate, dayPlan.id)
                            : `/workout/${dayPlan.id}?date=${trainingDateStr}`
                          )}
                        />
                      );
                    })()}

                    {!trainingItem && workoutItem && (
                      <TrainingDayCard
                        day={workoutToDay(workoutItem.workout)}
                        latestWorkout={workoutItem.workout}
                        trainingDate={parseLocalDate(workoutItem.workout.date)}
                        onClick={() => navigate(buildWorkoutRoute(workoutItem.workout))}
                      />
                    )}
                  </div>
                );
              });
            })()}

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl p-4 border-0 bg-surface-low text-center">
                <p className="text-3xl font-black text-primary tracking-tight">{actualCurrentWeek}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mt-1">{t('trainingplan.statWeek')}</p>
              </div>
              <div className="rounded-2xl p-4 border-0 bg-surface-low text-center">
                <p className="text-3xl font-black text-primary tracking-tight">
                  {workouts.filter(w => w.completed && (!planStartDate || w.date >= planStartDate)).length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mt-1">{t('trainingplan.statCompleted')}</p>
              </div>
              <div className="rounded-2xl p-4 border-0 bg-surface-low text-center">
                <p className="text-3xl font-black text-primary tracking-tight">
                  {Math.max(0, planDurationWeeks - actualCurrentWeek)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mt-1">{t('trainingplan.statRemaining')}</p>
              </div>
            </div>
          </div>

          {/* ── Right: Calendar ── */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-2xl p-5 border-0 bg-surface-low">
              <PlanCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                completedDates={completedDates}
                trainingDates={trainingDates}
                stravaDates={stravaDates}
                lang={lang}
              />

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-[10px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-fitness-success" />
                  <span className="text-muted-foreground/70">{t('trainingplan.legendCompleted')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full ring-2 ring-primary/60 ring-inset" />
                  <span className="text-muted-foreground/70">{t('trainingplan.legendPlanned')}</span>
                </div>
                {canUseStrava && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full ring-2 ring-orange-500/60 ring-inset" />
                    <span className="text-muted-foreground/70">Strava</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected date info */}
            {selectedDate && (() => {
              const selectedDateStr = formatLocalDate(selectedDate);
              const scheduleEntry = schedule.find(s => formatLocalDate(s.date) === selectedDateStr);
              const stravaOnDate = stravaActivities.filter(a => a.date === selectedDateStr);
              const workoutForDate = getWorkoutForDate(selectedDate, scheduleEntry?.dayId);
              if (!scheduleEntry && !workoutForDate && stravaOnDate.length === 0) return null;

              const dayPlan = scheduleEntry ? trainingPlan.find(d => d.id === scheduleEntry.dayId) : null;
              const displayDay = dayPlan ?? (workoutForDate ? workoutToDay(workoutForDate) : null);

              return (
                <div className="rounded-2xl p-4 border border-primary/10 bg-primary/[0.04] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="capitalize">
                      {selectedDate.toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>

                  {displayDay && (
                    <>
                      <p className="text-sm text-muted-foreground">{localizeDayName(displayDay.dayName, lang)}: {localizeFocus(displayDay.focus, lang)}</p>
                      <div className="flex items-center gap-2">
                        {workoutForDate?.completed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-0 bg-fitness-success/15 text-fitness-success">
                            <CheckCircle className="h-3 w-3" /> {t('trainingplan.statusCompleted')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border-0 bg-surface-high text-muted-foreground">
                            <Dumbbell className="h-3 w-3" /> {t('trainingplan.statusPlanned')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(workoutForDate
                          ? buildWorkoutRoute(workoutForDate, scheduleEntry?.dayId)
                          : `/workout/${scheduleEntry!.dayId}?date=${selectedDateStr}`
                        )}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {t('trainingplan.goToWorkout')}
                      </button>
                    </>
                  )}

                  {stravaOnDate.length > 0 && (
                    <div className="space-y-1.5">
                      {displayDay && <div className="exercise-card-divider" />}
                      {stravaOnDate.map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                          <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                          <span className="text-muted-foreground truncate">{a.name}</span>
                          {a.distance && (
                            <span className="text-muted-foreground/70 shrink-0">
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
