import { useMemo, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import type { TrainingDay } from '@/data/trainingPlan';
import { resolvePlannedDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { findMissedWorkout } from '@/lib/missed-workout';
import { localizeDayName } from '@/lib/plan-i18n';
import { formatLocalDateLabel } from '@/lib/utils';

const DISMISS_KEY = 'fittracker_missed_dismissed';

const readDismissed = (): string[] => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
};

interface MissedWorkoutBannerProps {
  planDays: TrainingDay[];
  overrides: ScheduleOverrides;
  workouts: Array<{ date: string; completed: boolean }>;
  todayISO: string;
  planStartDate?: string | null;
  /** Runna p.1 (spec C1): daty jawnie pominięte nie są zaległością. */
  skippedDates?: string[];
  onDoToday: (fromDateISO: string) => void;
  onReschedule: (fromDateISO: string) => void;
}

/**
 * Pasek "trening niezrobiony" (spec 2026-08-11, punkt wejścia 2). Znika po
 * przeniesieniu, ukończeniu albo jawnym odrzuceniu — krzyżyk zapamiętuje
 * odrzucenie dla TEJ daty (reguła #6: każdy stan ma wyjście).
 * [Zrób dziś] tylko gdy dziś nie ma już treningu (inaczej swap wysłałby
 * dzisiejszy dzień w przeszłość) — wtedy zostaje [Przełóż].
 */
export const MissedWorkoutBanner = ({
  planDays,
  overrides,
  workouts,
  todayISO,
  planStartDate,
  skippedDates,
  onDoToday,
  onReschedule,
}: MissedWorkoutBannerProps) => {
  const { t, lang } = useTranslation();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const missed = useMemo(
    () => findMissedWorkout({ planDays, overrides, workouts, todayISO, planStartDate, dismissed, skippedDates }),
    [planDays, overrides, workouts, todayISO, planStartDate, dismissed, skippedDates],
  );
  const todayFree = useMemo(
    // WP-B (X28): start planu w resolverze — spójnie z findMissedWorkout.
    () => resolvePlannedDay(todayISO, planDays, overrides, planStartDate) === null,
    [todayISO, planDays, overrides, planStartDate],
  );

  if (!missed) return null;

  const dismiss = () => {
    const next = [...dismissed, missed.dateISO];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* nieistotne */ }
  };

  return (
    <div className="rounded-2xl border border-fitness-warning/25 bg-fitness-warning/10 p-3.5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-fitness-warning/10 flex items-center justify-center shrink-0">
          <CalendarClock className="h-4 w-4 text-fitness-warning" />
        </div>
        <p className="flex-1 min-w-0 text-sm font-medium pt-1">
          {t('reschedule.missedTitle', {
            name: localizeDayName(missed.day.dayName, lang),
            date: formatLocalDateLabel(missed.dateISO, dateLocale(lang), { day: 'numeric', month: 'short' }),
          })}
        </p>
        <button
          type="button"
          aria-label={t('reschedule.dismiss')}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2.5 flex gap-2">
        {todayFree && (
          <Button size="sm" className="h-8" onClick={() => onDoToday(missed.dateISO)}>
            {t('reschedule.doToday')}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8" onClick={() => onReschedule(missed.dateISO)}>
          {t('reschedule.action')}
        </Button>
      </div>
    </div>
  );
};
