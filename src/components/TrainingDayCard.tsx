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
}

export const TrainingDayCard = ({ day, latestWorkout, trainingDate, onClick }: TrainingDayCardProps) => {
  const { t, lang } = useTranslation();
  const todayStr = formatLocalDate(new Date());
  const trainingDateStr = trainingDate ? formatLocalDate(trainingDate) : undefined;

  const isCompleted = latestWorkout?.completed === true;
  const isCompletedToday = isCompleted && latestWorkout?.date === todayStr;
  const isPastDate = trainingDateStr && trainingDateStr < todayStr;
  const isMissed = isPastDate && !isCompleted;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200",
        "border-0 bg-surface-low",
        "hover:border-primary/20 hover:bg-primary/[0.03]",
        isCompleted && "border-fitness-success/20",
        isMissed && "border-destructive/15 opacity-60"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn(
        "h-[42px] w-[42px] rounded-xl flex items-center justify-center shrink-0 text-xl",
        isCompleted ? "bg-fitness-success/10" : isMissed ? "bg-red-500/[0.08]" : "bg-primary/10"
      )}>
        {isCompleted ? '✅' : isMissed ? '❌' : '🏋️'}
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
        </div>
        <p className="text-[13px] text-muted-foreground mt-1">
          {localizeFocus(day.focus, lang)} · 🏋️ {day.exercises.length}
        </p>
      </div>

      {/* Chevron */}
      <span className="text-lg text-muted-foreground/40 shrink-0">›</span>
    </div>
  );
};
