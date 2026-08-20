import { CalendarClock, Check, CircleSlash, Play, RotateCcw, XCircle } from 'lucide-react';
import { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { cn, formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';

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
  /** Fala 2: pierwszy nieukończony dzień >= dziś (badge NASTĘPNY, najwyżej jeden w tygodniu). */
  isNext?: boolean;
  /** Fala 2: obciążenie dnia względem max tygodnia (0-100); undefined = brak paska. */
  loadPercent?: number;
}

export const TrainingDayCard = ({ day, latestWorkout, trainingDate, onClick, onReschedule, skipped, onToggleSkip, isNext, loadPercent }: TrainingDayCardProps) => {
  const { t, lang } = useTranslation();
  const todayStr = formatLocalDate(new Date());
  const trainingDateStr = trainingDate ? formatLocalDate(trainingDate) : undefined;

  const isCompleted = latestWorkout?.completed === true;
  const isCompletedToday = isCompleted && latestWorkout?.date === todayStr;
  const isPastDate = trainingDateStr && trainingDateStr < todayStr;
  // Świadomy skip ≠ zaległość: karta wyciszona, zero czerwonego długu.
  const isMissed = isPastDate && !isCompleted && !skipped;
  // Badge NASTĘPNY tylko dla dnia bez innego statusu (zasada 5: stany
  // completed/missed/skipped renderują dokładnie te badge co przed zmianą).
  const showNext = Boolean(isNext) && !isCompleted && !isMissed && !skipped;

  // Meta w języku mockupu: "PON 17 · Góra A · 6 ćwiczeń" (data opcjonalna).
  const dateChip = trainingDate
    ? `${trainingDate.toLocaleDateString(dateLocale(lang), { weekday: 'short' }).replace(/\.$/, '').toUpperCase()} ${trainingDate.getDate()}`
    : null;
  const metaParts = [dateChip, localizeFocus(day.focus, lang), t('dash.exercisesCount', { n: day.exercises.length })]
    .filter(Boolean);

  return (
    <div
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-2.5 cursor-pointer transition-colors duration-200",
        showNext ? "bg-primary/10" : "bg-surface-container hover:bg-surface-high",
        isMissed && "opacity-60",
        skipped && !isCompleted && "opacity-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="font-heading font-semibold text-base leading-tight truncate">{localizeDayName(day.dayName, lang)}</p>
          {/* Bez truncate/clamp: przy długich polskich nazwach focusu ucinanie
              gubiło liczbę ćwiczeń (utrata informacji vs stan sprzed redesignu);
              meta zawija się naturalnie, karta rośnie o linię. */}
          <p className="text-xs text-muted-foreground">{metaParts.join(' · ')}</p>
        </div>

        {/* Badge statusu (mockup: DONE przygaszony akcent, NEXT wypełniony akcent) */}
        {isCompletedToday && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary shrink-0">
            {t('dayplan.badgeToday')}
          </span>
        )}
        {isCompleted && !isCompletedToday && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary shrink-0">
            {t('dayplan.badgeCompleted')}
          </span>
        )}
        {isMissed && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive shrink-0">
            {t('dayplan.badgeMissed')}
          </span>
        )}
        {skipped && !isCompleted && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-dashed border-muted-foreground/40 text-muted-foreground shrink-0">
            {t('dayplan.badgeSkipped')}
          </span>
        )}
        {showNext && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shrink-0">
            {t('dayplan.badgeNext')}
          </span>
        )}

        {/* Ikona statusu (mockup: check neutralny / play akcentowy) */}
        {isCompleted && <Check className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />}
        {isMissed && <XCircle className="h-4 w-4 text-destructive shrink-0" aria-hidden />}
        {showNext && <Play className="h-4 w-4 text-primary fill-current shrink-0" aria-hidden />}

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
      </div>

      {/* Fala 2: pasek obciążenia dnia (tylko realne dane; brak tonażu = brak paska) */}
      {typeof loadPercent === 'number' && (
        <div
          aria-label={t('trainingplan.dayLoadAria')}
          className="h-1 rounded-full bg-surface-highest overflow-hidden"
        >
          <div
            className={cn("h-full rounded-full", (showNext || isCompletedToday) ? "bg-primary" : "bg-primary/40")}
            style={{ width: `${Math.max(0, Math.min(100, loadPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
};
