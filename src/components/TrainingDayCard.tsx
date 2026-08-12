import { CalendarClock, CheckCircle2, CircleSlash, Dumbbell, RotateCcw, XCircle } from 'lucide-react';
import { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { cn, formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';

interface TrainingDayCardProps {
  day: TrainingDay;
  latestWorkout?: WorkoutSession;
  trainingDate?: Date;
  onClick: () => void;
  /** Akcja "Przełóż trening" (spec 2026-08-11); brak = ikona ukryta (dzień ukończony/przeszły). */
  onReschedule?: () => void;
  /** Runna p.1 (spec C1): dzień jawnie pominięty — wygaszony, bez pretensji. */
  skipped?: boolean;
  /** Pomiń/Przywróć (odwracalne, reguła #6); brak = ikona ukryta. */
  onToggleSkip?: () => void;
}

export const TrainingDayCard = ({ day, latestWorkout, trainingDate, onClick, onReschedule, skipped, onToggleSkip }: TrainingDayCardProps) => {
  const { t, lang } = useTranslation();
  const todayStr = formatLocalDate(new Date());
  const trainingDateStr = trainingDate ? formatLocalDate(trainingDate) : undefined;

  const isCompleted = latestWorkout?.completed === true;
  const isCompletedToday = isCompleted && latestWorkout?.date === todayStr;
  const isPastDate = trainingDateStr && trainingDateStr < todayStr;
  // Świadomy skip ≠ zaległość: karta wyciszona, zero czerwonego długu.
  const isMissed = isPastDate && !isCompleted && !skipped;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200",
        "border-0 bg-surface-low",
        "hover:border-primary/20 hover:bg-primary/[0.03]",
        isCompleted && "border-fitness-success/20",
        isMissed && "border-destructive/15 opacity-60",
        skipped && !isCompleted && "opacity-50"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn(
        "h-[42px] w-[42px] rounded-xl flex items-center justify-center shrink-0",
        isCompleted ? "bg-fitness-success/10" : isMissed ? "bg-destructive/10" : "bg-primary/10"
      )}>
        {isCompleted
          ? <CheckCircle2 className="h-5 w-5 text-fitness-success" />
          : isMissed
            ? <XCircle className="h-5 w-5 text-destructive" />
            : <Dumbbell className="h-5 w-5 text-primary" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm">{localizeDayName(day.dayName, lang)}</p>
          {isCompletedToday && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-fitness-success/25 bg-fitness-success/10 text-fitness-success">
              {t('dayplan.badgeToday')}
            </span>
          )}
          {isCompleted && !isCompletedToday && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-fitness-success/25 bg-fitness-success/10 text-fitness-success">
              {t('dayplan.badgeCompleted')}
            </span>
          )}
          {isMissed && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border-0 bg-destructive/15 text-destructive">
              {t('dayplan.badgeMissed')}
            </span>
          )}
          {skipped && !isCompleted && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-dashed border-muted-foreground/40 text-muted-foreground">
              {t('dayplan.badgeSkipped')}
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1">
          {localizeFocus(day.focus, lang)}
          <span aria-hidden>·</span>
          <Dumbbell className="h-3 w-3" aria-hidden />
          {day.exercises.length}
        </p>
      </div>

      {/* Przełożenie treningu */}
      {onReschedule && (
        <button
          type="button"
          aria-label={t('reschedule.action')}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/10 shrink-0"
          onClick={(e) => { e.stopPropagation(); onReschedule(); }}
        >
          <CalendarClock className="h-4 w-4" />
        </button>
      )}

      {/* Runna p.1 (spec C1): Pomiń / Przywróć — odwracalne, ton neutralny */}
      {onToggleSkip && (
        <button
          type="button"
          aria-label={skipped ? t('skipday.restore') : t('skipday.action')}
          data-testid="day-skip-toggle"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/10 shrink-0"
          onClick={(e) => { e.stopPropagation(); onToggleSkip(); }}
        >
          {skipped ? <RotateCcw className="h-4 w-4" /> : <CircleSlash className="h-4 w-4" />}
        </button>
      )}

      {/* Chevron */}
      <span className="text-lg text-muted-foreground/40 shrink-0">›</span>
    </div>
  );
};
