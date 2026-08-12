import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { cn, parseLocalDate } from '@/lib/utils';
import { type VacationActivity, type VacationMode } from '@/lib/vacation-mode';

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
  const [startISO, setStartISO] = useState(todayISO);
  const [days, setDays] = useState<number>(7);
  const [activity, setActivity] = useState<VacationActivity>('none');

  const fmt = (iso: string) =>
    parseLocalDate(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-0 bg-surface-low" data-testid="vac-dialog">
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
            <div className="rounded-xl border border-fitness-cyan/40 bg-fitness-cyan/10 px-4 py-3">
              <p className="text-sm font-semibold text-fitness-cyan">
                {t('vac.range', { from: fmt(vacation.startDate), to: fmt(vacation.endDate) })}
              </p>
              <p className="mt-0.5 text-xs text-fitness-cyan">{t(ACTIVITY_KEYS[vacation.activity])}</p>
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
              <div className="space-y-1">
                <label htmlFor="vac-start" className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {t('vac.start')}
                </label>
                <Input
                  id="vac-start"
                  data-testid="vac-start"
                  type="date"
                  min={todayISO}
                  value={startISO}
                  onChange={(e) => setStartISO(e.target.value || todayISO)}
                />
              </div>
              <div className="flex gap-2">
                {DAY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    data-testid={`vac-days-${option}`}
                    onClick={() => setDays(option)}
                    aria-pressed={days === option}
                    className={cn(
                      'flex-1 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      days === option
                        ? 'border-fitness-success bg-fitness-success/10 text-fitness-success'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t('rmode.days', { n: option })}
                  </button>
                ))}
              </div>
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
                        ? 'border-fitness-success bg-fitness-success/10 text-fitness-success'
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
                onClick={() => onEnable(startISO, days, activity)}
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
