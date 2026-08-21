import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RangeCalendar } from '@/components/ui/range-calendar';
import type { DateRangeValue } from '@/lib/date-range-select';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { cn, addCalendarDays, formatLocalDateLabel } from '@/lib/utils';
import {
  VACATION_MAX_DAYS,
  VACATION_MIN_DAYS,
  vacationRangeDays,
  type VacationActivity,
  type VacationMode,
} from '@/lib/vacation-mode';

// Dialog urlopu (Runna pakiet 1, spec C4): przerwa deklarowana Z GÓRY.
// Kolizja z trybem "nie na 100%": jeden tryb naraz — komunikat zamiast
// formularza. Anulowanie działa przed startem i w trakcie (reguła #6).

interface VacationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacation: VacationMode | null;
  reducedModeActive: boolean;
  todayISO: string;
  onEnable: (startISO: string, days: number, activity: VacationActivity) => void;
  onCancel: () => void;
}

const DAY_OPTIONS = [7, 14, 21] as const;
const ACTIVITY_KEYS = {
  none: 'vac.activityNone',
  mains_only: 'vac.activityMains',
} as const;

export const VacationDialog = ({
  open, onOpenChange, vacation, reducedModeActive, todayISO, onEnable, onCancel,
}: VacationDialogProps) => {
  const { t, lang } = useTranslation();
  // T20.3: zakres Od-Do wybierany klikami w kalendarzu (booking-style);
  // presety 7/14/21 zostają skrótami ustawiającymi Do względem Od.
  // to=null = wybór w toku (drugi klik jeszcze nie padł) — wtedy bez
  // podsumowania i bez błędu, tylko podpowiedź (żadnego stale summary).
  const [range, setRange] = useState<DateRangeValue>(() => ({
    from: todayISO,
    to: addCalendarDays(todayISO, 6),
  }));
  const [activity, setActivity] = useState<VacationActivity>('none');

  const rangeDays = range.from && range.to ? vacationRangeDays(range.from, range.to) : null;
  const rangeError = range.from && range.to
    ? rangeDays === null
      ? t('vac.errRange')
      : rangeDays < VACATION_MIN_DAYS
        ? t('vac.errTooShort', { n: VACATION_MIN_DAYS })
        : rangeDays > VACATION_MAX_DAYS
          ? t('vac.errTooLong', { n: VACATION_MAX_DAYS })
          : null
    : null;
  const rangeValid = rangeDays !== null && rangeError === null;

  const fmt = (iso: string) =>
    formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'long' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* T20.3: kalendarz wydłuża treść — lokalny scroll zamiast wyjścia poza ekran (iPhone SE). */}
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl border-0 bg-surface-low" data-testid="vac-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">{t('vac.title')}</DialogTitle>
          <DialogDescription>{t('vac.desc')}</DialogDescription>
        </DialogHeader>

        {reducedModeActive ? (
          <p className="rounded-xl border border-fitness-warning bg-fitness-warning/10 px-4 py-3 text-sm text-fitness-warning">
            {t('vac.blockedByMode')}
          </p>
        ) : vacation ? (
          <>
            <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
              <p className="text-sm font-semibold text-primary">
                {t('vac.range', { from: fmt(vacation.startDate), to: fmt(vacation.endDate) })}
              </p>
              <p className="mt-0.5 text-xs text-primary">{t(ACTIVITY_KEYS[vacation.activity])}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" className="w-full" data-testid="vac-cancel" onClick={onCancel}>
                {t('vac.cancel')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              {/* T20.3: kalendarz inline zamiast dwóch inputów date (booking-style). */}
              <RangeCalendar
                value={range}
                onChange={setRange}
                minDate={todayISO}
                testId="vac-calendar"
              />
              <div className="flex gap-2">
                {DAY_OPTIONS.map((option) => {
                  const active = rangeDays === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      data-testid={`vac-days-${option}`}
                      onClick={() => setRange((prev) => {
                        const from = prev.from ?? todayISO;
                        return { from, to: addCalendarDays(from, option - 1) };
                      })}
                      aria-pressed={active}
                      className={cn(
                        'flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t('rmode.days', { n: option })}
                    </button>
                  );
                })}
              </div>
              {rangeValid && rangeDays !== null && range.from && range.to ? (
                <div
                  data-testid="vac-summary"
                  className="rounded-xl border border-primary bg-primary/10 px-4 py-3 text-sm text-primary"
                >
                  <p className="font-semibold">
                    {t('vac.summaryDays', { n: rangeDays, from: fmt(range.from), to: fmt(range.to) })}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {t('vac.summaryExtend', { weeks: Math.ceil(rangeDays / 7) })}
                  </p>
                </div>
              ) : rangeError ? (
                <p
                  data-testid="vac-range-error"
                  className="rounded-xl border border-fitness-warning bg-fitness-warning/10 px-4 py-3 text-sm text-fitness-warning"
                >
                  {rangeError}
                </p>
              ) : (
                <p
                  data-testid="vac-range-hint"
                  className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground"
                >
                  {t('range.pickEnd')}
                </p>
              )}
              <div className="flex flex-col gap-2">
                {(Object.keys(ACTIVITY_KEYS) as VacationActivity[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    data-testid={`vac-activity-${option}`}
                    onClick={() => setActivity(option)}
                    aria-pressed={activity === option}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                      activity === option
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(ACTIVITY_KEYS[option])}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                className="kinetic-primary-button w-full"
                data-testid="vac-enable"
                disabled={!rangeValid}
                onClick={() => {
                  if (!rangeValid || rangeDays === null || !range.from) return;
                  onEnable(range.from, rangeDays, activity);
                }}
              >
                {t('vac.enable')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
