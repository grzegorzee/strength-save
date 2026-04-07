import { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { cn, formatLocalDate } from '@/lib/utils';

interface TrainingDayCardProps {
  day: TrainingDay;
  latestWorkout?: WorkoutSession;
  trainingDate?: Date;
  onClick: () => void;
}

export const TrainingDayCard = ({ day, latestWorkout, trainingDate, onClick }: TrainingDayCardProps) => {
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
        "border border-white/[0.04] bg-white/[0.02]",
        "hover:border-primary/20 hover:bg-primary/[0.03]",
        isCompleted && "border-emerald-500/20",
        isMissed && "border-red-500/15 opacity-60"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn(
        "h-[42px] w-[42px] rounded-xl flex items-center justify-center shrink-0 text-xl",
        isCompleted ? "bg-emerald-500/10" : isMissed ? "bg-red-500/[0.08]" : "bg-primary/10"
      )}>
        {isCompleted ? '✅' : isMissed ? '❌' : '🏋️'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm">{day.dayName}</p>
          {isCompletedToday && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
              Dziś
            </span>
          )}
          {isCompleted && !isCompletedToday && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
              Ukończone
            </span>
          )}
          {isMissed && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-red-500/25 bg-red-500/10 text-red-400">
              Pominięte
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#7a7f94] mt-1">
          {day.focus} · 🏋️ {day.exercises.length}
        </p>
      </div>

      {/* Chevron */}
      <span className="text-lg text-[#2e3348] shrink-0">›</span>
    </div>
  );
};
