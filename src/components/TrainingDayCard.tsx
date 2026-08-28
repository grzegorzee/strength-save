import { CalendarClock, Check, CircleSlash, MoreHorizontal, Play, RotateCcw, XCircle } from 'lucide-react';
import { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { cn, formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { displayDayNameForDate, localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const dayLabel = trainingDate
    ? displayDayNameForDate(day.dayName, day.weekday, trainingDate, lang)
    : localizeDayName(day.dayName, lang);
  const hasSecondaryActions = Boolean(onReschedule || onToggleSkip);

  return (
    <div
      className={cn(
        "rounded-2xl flex items-stretch overflow-hidden transition-colors duration-200",
        showNext ? "bg-primary/10" : "bg-surface-container",
        isMissed && "opacity-60",
        skipped && !isCompleted && "opacity-50"
      )}
    >
      <button
        type="button"
        aria-label={dayLabel}
        className="min-h-11 min-w-0 flex-1 rounded-2xl p-4 text-left flex flex-col gap-2.5 transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={onClick}
      >
        <div className="flex items-center gap-2.5">
          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {/* WP-L (X30): domyslna nazwa weekday podaza za data przelozenia. */}
            <p className="font-heading font-semibold text-base leading-tight truncate">
              {dayLabel}
            </p>
            {/* Bez truncate/clamp: przy długich polskich nazwach focusu ucinanie
                gubiło liczbę ćwiczeń (utrata informacji vs stan sprzed redesignu);
                meta zawija się naturalnie, karta rośnie o linię. */}
            <p className="text-xs text-muted-foreground">{metaParts.join(' · ')}</p>
          </div>

          {/* Badge statusu (mockup: DONE przygaszony akcent, NEXT wypełniony akcent) */}
          {isCompletedToday && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary/15 text-primary shrink-0">
              {t('dayplan.badgeToday')}
            </span>
          )}
          {isCompleted && !isCompletedToday && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary/15 text-primary shrink-0">
              {t('dayplan.badgeCompleted')}
            </span>
          )}
          {isMissed && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-destructive/15 text-destructive shrink-0">
              {t('dayplan.badgeMissed')}
            </span>
          )}
          {skipped && !isCompleted && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border border-dashed border-muted-foreground/40 text-muted-foreground shrink-0">
              {t('dayplan.badgeSkipped')}
            </span>
          )}
          {/* Naprawa r1 (2026-08-21, sędzia funkcji): play WEWNĄTRZ badge NASTĘPNY
              (brief: "wypełniony akcent + play" w JEDNYM badge) — samodzielny glif
              między realnymi przyciskami ikon afordował nieistniejącą akcję. */}
          {showNext && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shrink-0">
              <Play className="h-3 w-3 fill-current" aria-hidden />
              {t('dayplan.badgeNext')}
            </span>
          )}

          {/* Ikona statusu (mockup: check neutralny) */}
          {isCompleted && <Check className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />}
          {isMissed && <XCircle className="h-4 w-4 text-destructive shrink-0" aria-hidden />}
        </div>

        {/* Fala 2: pasek obciążenia dnia (tylko realne dane; brak tonażu = brak paska).
            Naprawa r1 (2026-08-21): karta NASTĘPNY zawsze dostaje TOR paska
            (mockup: każda karta dnia kończy się paskiem — wspólna anatomia kart). */}
        {(typeof loadPercent === 'number' || showNext) && (
          <div
            aria-label={t('trainingplan.dayLoadAria')}
            className="h-1 rounded-full bg-surface-highest overflow-hidden"
          >
            <div
              className={cn("h-full rounded-full", (showNext || isCompletedToday) ? "bg-primary" : "bg-primary/40")}
              style={{ width: `${Math.max(0, Math.min(100, loadPercent ?? 0))}%` }}
            />
          </div>
        )}
      </button>

      {hasSecondaryActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('card.moreActions')}
              data-testid="day-actions-trigger"
              className="m-2 ml-0 min-h-11 min-w-11 h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/10 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onReschedule && (
              <DropdownMenuItem
                className="min-h-11 cursor-pointer gap-2"
                onSelect={() => onReschedule()}
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
                {t('reschedule.action')}
              </DropdownMenuItem>
            )}
            {onToggleSkip && (
              <DropdownMenuItem
                data-testid="day-skip-toggle"
                className="min-h-11 cursor-pointer gap-2"
                onSelect={() => onToggleSkip()}
              >
                {skipped
                  ? <RotateCcw className="h-4 w-4" aria-hidden />
                  : <CircleSlash className="h-4 w-4" aria-hidden />}
                {skipped ? t('skipday.restore') : t('skipday.action')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
