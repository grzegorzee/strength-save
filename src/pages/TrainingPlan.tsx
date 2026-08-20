import { useNavigate } from 'react-router-dom';
import { getTrainingRules } from '@/data/trainingPlan';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useActivities } from '@/hooks/useActivities';
import { AddCardioDialog } from '@/components/AddCardioDialog';
import { unifiedToManual, type ManualActivity } from '@/lib/manual-activity';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useCurrentUser } from '@/contexts/UserContext';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { useState, useMemo, useCallback } from 'react';
import { CalendarDays, Dumbbell, History, Pencil, CheckCircle, HeartPulse, Zap, Timer, Plane } from 'lucide-react';
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { buildTrainingSchedule, countRemainingWorkouts, getStartOfPlanWeek, startOfLocalDay } from '@/lib/plan-schedule';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { buildWorkoutRoute, findWorkoutForRoute } from '@/lib/workout-lookup';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { VacationDialog } from '@/components/VacationDialog';
import { buildVacationMode, isVacationActive, type VacationActivity } from '@/lib/vacation-mode';
import { buildReducedMode, isReducedModeActive, type ReducedModeLevel } from '@/lib/reduced-mode';
import { ReducedModeDialog } from '@/components/ReducedModeDialog';
import { PlanNextStepCard } from '@/components/PlanNextStepCard';
import { HybridWeekStrip } from '@/components/HybridWeekStrip';
import { DeloadBanner } from '@/components/DeloadBanner';
import { RescheduleSheet } from '@/components/RescheduleSheet';
import { weekdayOfDate } from '@/lib/plan-schedule';
import { buildPlanNextStep } from '@/lib/plan-next-step';
import { buildActiveCyclePreview } from '@/lib/cycle-insights';
import { repeatPlanSource, startCycleWithPlan } from '@/lib/cycle-actions';
import { buildPlanEventEmitter } from '@/lib/user-events';
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
  const { getLatestWorkout, workouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid, { measurements: 'none', workouts: 'recent' });
  const { plan: trainingPlan, planStartDate, currentWeek: hookCurrentWeek, planDurationWeeks, weeksRemaining, isPlanExpired, savePlan, reducedMode, setReducedMode, vacation, setVacation, scheduleOverrides, moveScheduledDay, skippedDates, setDaySkipped, progression, saveDeloadDecision } = useTrainingPlan(uid);
  const { toast } = useToast();
  // C-T1: wejście w tryb urlopu z ekranu Planu (dotąd dialog istniał tylko na
  // Dashboardzie i to wyłącznie jako badge JUŻ aktywnego urlopu).
  const todayISOForVacation = formatLocalDate(new Date());
  const [vacationOpen, setVacationOpen] = useState(false);
  const handleVacationEnable = (startISO: string, days: number, activity: VacationActivity) => {
    setVacationOpen(false);
    const mode = buildVacationMode(startISO, days, activity);
    void (async () => {
      const result = await setVacation(mode);
      if (result.success) {
        const fmtDate = (iso: string) => parseLocalDate(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });
        toast({ title: t('vac.toastOn', { from: fmtDate(mode.startDate), to: fmtDate(mode.endDate), weeks: mode.extendedWeeks }) });
      }
    })();
  };
  const handleVacationCancel = () => {
    setVacationOpen(false);
    void (async () => {
      const result = await setVacation(null);
      if (result.success) toast({ title: t('vac.toastOff') });
    })();
  };
  // C-T3: tryb "nie na 100%" dostępny z Planu (dotąd Dashboard/Profil).
  const [reducedOpen, setReducedOpen] = useState(false);
  const handleReducedEnable = (level: ReducedModeLevel, days: number) => {
    setReducedOpen(false);
    const mode = buildReducedMode(level, days, todayISOForVacation);
    void (async () => {
      const result = await setReducedMode(mode);
      if (result.success) {
        const endLabel = parseLocalDate(mode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });
        toast({ title: t('rmode.toastOn', { date: endLabel }) });
      }
    })();
  };
  const handleReducedDisable = () => {
    setReducedOpen(false);
    void (async () => {
      const result = await setReducedMode(null);
      if (result.success) toast({ title: t('rmode.toastOff') });
    })();
  };

  const { cycles, createActiveCycle, archiveCurrentPlan } = usePlanCycles(uid);

  // C-T4: jedna karta decyzyjna końca planu — to samo źródło co Dashboard/Cykle.
  const activeCycleRaw = cycles.find((cycle) => cycle.status === 'active') || null;
  const liveActiveCycle = buildActiveCyclePreview(activeCycleRaw, workouts);
  const previousCompletedCycle = cycles.find((cycle) => cycle.status === 'completed') || null;
  const planNextStep = useMemo(() => buildPlanNextStep({
    hasPlan: trainingPlan.length > 0,
    isPlanExpired,
    weeksRemaining,
    currentWeek: hookCurrentWeek,
    planDurationWeeks,
    activeCycle: liveActiveCycle,
    previousCompletedCycle,
    lang,
  }), [trainingPlan.length, isPlanExpired, weeksRemaining, hookCurrentWeek, planDurationWeeks, liveActiveCycle, previousCompletedCycle, lang]);
  const [isRepeating, setIsRepeating] = useState(false);
  const handleRepeatPlan = async () => {
    const source = repeatPlanSource(trainingPlan, planDurationWeeks, activeCycleRaw);
    if (source.days.length === 0) return;
    setIsRepeating(true);
    const res = await startCycleWithPlan(source.days, source.durationWeeks, {
      lang,
      uid, currentPlan: trainingPlan, planStartDate, planDurationWeeks, workouts,
      archiveCurrentPlan, savePlan, createActiveCycle, backfillHistoricalWorkouts,
      emitPlanEvent: buildPlanEventEmitter(uid),
    });
    setIsRepeating(false);
    toast(res.success
      ? { title: t('cycles.repeatStarted') }
      : { title: t('cycles.repeatFailed'), variant: 'destructive' });
  };

  // D-T3: Plan przejmuje przełożenia i pomijanie dni (dotąd tylko timeline
  // Dashboardu, który zszedł w D-T2). Sheet domykamy PRZED mutacją (lekcja b.92).
  const [rescheduleFrom, setRescheduleFrom] = useState<string | null>(null);
  const handleRescheduleSelect = async (toDateISO: string) => {
    const fromDateISO = rescheduleFrom;
    if (!fromDateISO) return;
    setRescheduleFrom(null);
    const result = await moveScheduledDay(fromDateISO, toDateISO);
    toast(result.success
      ? { title: t(result.swapped ? 'reschedule.swapped' : 'reschedule.moved') }
      : { title: t('reschedule.failed'), variant: 'destructive' });
  };
  const handleToggleSkip = async (dateISO: string) => {
    const skipped = skippedDates.includes(dateISO);
    const result = await setDaySkipped(dateISO, !skipped);
    if (result.success) {
      toast({ title: skipped ? t('skipday.toastRestored') : t('skipday.toastSkipped') });
    }
  };
  // Z112: zunifikowane cardio (Strava + wpisy manualne) w kalendarzu.
  const {
    activities: unifiedActivities,
    connection: stravaConnection,
    addActivity,
    updateActivity,
    deleteActivity,
  } = useActivities(uid, canUseStrava);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [cardioDialog, setCardioDialog] = useState<{ open: boolean; edit: ManualActivity | null; defaultDate?: string }>({ open: false, edit: null });
  const visibleActivities = useMemo(
    () => unifiedActivities.filter(a => a.source === 'manual' || stravaConnection.connected),
    [unifiedActivities, stravaConnection.connected],
  );
  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const completedDates = workouts
    .filter(w => w.completed)
    .map(w => parseLocalDate(w.date));

  const stravaDates = useMemo(() =>
    visibleActivities.map(a => parseLocalDate(a.date)),
    [visibleActivities]
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
              {/* FIX-B T5: stałe wejście do Cykli (na mobile żyło tylko na
                  usuniętej karcie planu Dashboardu). */}
              <button
                onClick={() => navigate('/cycles')}
                data-testid="plan-cycles-link"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-0 bg-surface-low text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                {t('dash.cycles')}
              </button>
              <button
                onClick={() => navigate('/plan/edit')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-0 bg-surface-low text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('trainingplan.edit')}
              </button>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-light to-primary text-[13px] font-heading font-bold uppercase tracking-tight text-background whitespace-nowrap">
                {isHistoricalWeek ? t('trainingplan.history') : t('trainingplan.weekOf', { current: displayWeek, total: planDurationWeeks })}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-5">
          <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary transition-all duration-500"
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
        <div className="mx-6 mt-5 mb-5 py-3 px-4 rounded-xl bg-primary/[0.04] border-l-[3px] border-primary/30 text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 shrink-0" aria-hidden /><strong className="text-muted-foreground">{trainingRules.weight}</strong></p>
          <p className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 shrink-0" aria-hidden />{trainingRules.restMain} • {trainingRules.restIsolation}</p>
        </div>

        {/* C-T4: jedna karta decyzyjna końca planu (wspólna z Dashboardem/Cyklami) */}
        {planNextStep && (
          <div className="mx-6 mb-5">
            <PlanNextStepCard
              step={planNextStep}
              uid={uid}
              planStartDate={planStartDate}
              canRepeat={trainingPlan.length > 0}
              isRepeating={isRepeating}
              onRepeat={handleRepeatPlan}
              testId="plan-next-step"
            />
          </div>
        )}

        {/* D-T3: pasek obciążenia hybrydowego tygodnia (dom: Plan, nie Dashboard) */}
        {!isHistoricalWeek && (
          <div className="mx-6 mb-5">
            <HybridWeekStrip
              workouts={workouts}
              activities={visibleActivities}
              weekStart={getStartOfPlanWeek(new Date())}
              maxHR={stravaConnection.estimatedMaxHR}
              plannedWeekdays={selectedWeekTrainingDates.map((s) => weekdayOfDate(s.date))}
            />
          </div>
        )}

        {/* D-T3: decyzja deload mieszka na Planie (tydzień planu = dom Planu) */}
        {planStarted && (
          <div className="mx-6 mb-5">
            <DeloadBanner
              planDays={trainingPlan}
              workouts={workouts}
              currentWeek={hookCurrentWeek}
              progression={progression}
              onDecision={saveDeloadDecision}
            />
          </div>
        )}

        {/* C-T1/C-T3: tryby (urlop + nie na 100%) z poziomu Planu */}
        <div className="mx-6 mb-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            data-testid="plan-reduced-open"
            onClick={() => setReducedOpen(true)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-colors',
              reducedMode && isReducedModeActive(reducedMode, todayISOForVacation)
                ? 'border-fitness-warning bg-fitness-warning/10 text-fitness-warning'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <span className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" aria-hidden />
              {reducedMode && isReducedModeActive(reducedMode, todayISOForVacation)
                ? t('rmode.badge', { date: parseLocalDate(reducedMode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' }) })
                : t('rmode.title')}
            </span>
            <span className="text-xs font-normal underline underline-offset-2">
              {reducedMode && isReducedModeActive(reducedMode, todayISOForVacation) ? t('rmode.disable') : t('vac.planEntry')}
            </span>
          </button>
          <button
            type="button"
            data-testid="plan-vacation-open"
            onClick={() => setVacationOpen(true)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-colors',
              vacation && isVacationActive(vacation, todayISOForVacation)
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <span className="flex items-center gap-2">
              <Plane className="h-4 w-4" aria-hidden />
              {vacation && isVacationActive(vacation, todayISOForVacation)
                ? t('vac.badge', { date: parseLocalDate(vacation.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' }) })
                : t('vac.title')}
            </span>
            <span className="text-xs font-normal underline underline-offset-2">
              {vacation && isVacationActive(vacation, todayISOForVacation) ? t('vac.cancel') : t('vac.planEntry')}
            </span>
          </button>
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
                | { type: 'strava'; activity: typeof visibleActivities[number]; dateStr: string };

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

              visibleActivities
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
                      <div className="flex items-center gap-3">
                        {/* Z112: wpis cardio na wybranym dniu (także wstecz) */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setCardioDialog({ open: true, edit: null, defaultDate: dateStr }); }}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-primary transition-colors"
                          data-testid={`add-cardio-day-${dateStr}`}
                        >
                          <HeartPulse className="h-3 w-3" />
                          {t('cardio.addShort')}
                        </button>
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
                    </div>

                    {/* Cardio: Strava + wpisy manualne (Z112) */}
                    {stravaItems.map(({ activity }) => (
                      <div key={`activity-${activity.id}`} className="mb-2">
                        <StravaActivityCard
                          activity={activity}
                          onEdit={activity.source === 'manual'
                            ? () => setCardioDialog({ open: true, edit: unifiedToManual(activity) })
                            : undefined}
                        />
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
                          onReschedule={!workoutForDate?.completed && trainingDateStr >= formatLocalDate(new Date())
                            ? () => setRescheduleFrom(trainingDateStr)
                            : undefined}
                          skipped={skippedDates.includes(trainingDateStr)}
                          onToggleSkip={!workoutForDate?.completed
                            ? () => { void handleToggleSkip(trainingDateStr); }
                            : undefined}
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
                  {/* E-T4: pozostałe TRENINGI (nie tygodnie) — spójna jednostka z kaflem Ukończone. */}
                  {planStartDate ? countRemainingWorkouts({
                    planDays: trainingPlan,
                    today: new Date(),
                    planStartDate: parseLocalDate(planStartDate),
                    durationWeeks: planDurationWeeks,
                    completedDates: new Set(workouts.filter(w => w.completed).map(w => w.date)),
                    skippedDates,
                    isDateBlocked: vacation ? (key) => isVacationActive(vacation, key) : undefined,
                    overrides: scheduleOverrides,
                  }) : 0}
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
              const stravaOnDate = visibleActivities.filter(a => a.date === selectedDateStr);
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

      {/* Z112: dialog wpisu cardio (nowy z defaultDate albo edycja) */}
      <AddCardioDialog
        open={cardioDialog.open}
        onOpenChange={(open) => setCardioDialog((prev) => ({ ...prev, open }))}
        defaultDate={cardioDialog.defaultDate}
        editActivity={cardioDialog.edit}
        onAdd={addActivity}
        onUpdate={updateActivity}
        onDelete={deleteActivity}
      />

      {/* C-T1: tryb urlopu dostępny z Planu (spec C4 + audyt 2026-08-19) */}
      <VacationDialog
        open={vacationOpen}
        onOpenChange={setVacationOpen}
        vacation={vacation}
        reducedModeActive={isReducedModeActive(reducedMode, todayISOForVacation)}
        todayISO={todayISOForVacation}
        onEnable={handleVacationEnable}
        onCancel={handleVacationCancel}
      />

      {/* D-T3: przełożenie dnia planu (sheet wspólny z Dashboardem/MissedBanner) */}
      <RescheduleSheet
        open={rescheduleFrom !== null}
        onOpenChange={(open) => { if (!open) setRescheduleFrom(null); }}
        fromDateISO={rescheduleFrom}
        planDays={trainingPlan}
        overrides={scheduleOverrides}
        onSelect={handleRescheduleSelect}
        todayISO={formatLocalDate(new Date())}
      />

      {/* C-T3: tryb "nie na 100%" dostępny z Planu (kolizja z urlopem jak na Dashboardzie) */}
      <ReducedModeDialog
        open={reducedOpen}
        onOpenChange={setReducedOpen}
        mode={reducedMode}
        todayISO={todayISOForVacation}
        onEnable={handleReducedEnable}
        onDisable={handleReducedDisable}
        blockedLabel={vacation && isVacationActive(vacation, todayISOForVacation) ? t('rmode.blockedByVacation') : undefined}
      />
    </div>
  );
};

export default TrainingPlan;
