import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { cn, parseLocalDate } from '@/lib/utils';
import { isReducedModeActive, type ReducedMode, type ReducedModeLevel } from '@/lib/reduced-mode';

// Dialog trybu "nie na 100%" (Runna pakiet 1, spec C3). Dwa stany: konfiguracja
// (poziom + okres) i tryb aktywny z wyłącznikiem — stan jawny i wyłączalny
// w każdej chwili (reguła #6). Ton neutralny, zero pretensji.

interface ReducedModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ReducedMode | null;
  todayISO: string;
  onEnable: (level: ReducedModeLevel, days: number) => void;
  onDisable: () => void;
}

const LEVEL_KEYS = {
  lighter: 'rmode.level.lighter',
  mains_only: 'rmode.level.mains',
  pause: 'rmode.level.pause',
} as const;

const DAY_OPTIONS = [3, 7, 14] as const;

export const ReducedModeDialog = ({ open, onOpenChange, mode, todayISO, onEnable, onDisable }: ReducedModeDialogProps) => {
  const { t, lang } = useTranslation();
  const [level, setLevel] = useState<ReducedModeLevel>('lighter');
  const [days, setDays] = useState<number>(7);

  const active = isReducedModeActive(mode, todayISO);
  const endLabel = mode
    ? parseLocalDate(mode.endDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-0 bg-surface-low" data-testid="rmode-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">{t('rmode.title')}</DialogTitle>
          <DialogDescription>{t('rmode.desc')}</DialogDescription>
        </DialogHeader>

        {active && mode ? (
          <>
            <div className="rounded-xl border border-fitness-warning bg-fitness-warning/10 px-4 py-3">
              <p className="text-sm font-semibold text-fitness-warning">
                {t('rmode.activeUntil', { date: endLabel })}
              </p>
              <p className="mt-0.5 text-xs text-fitness-warning">{t(LEVEL_KEYS[mode.level])}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" className="w-full" data-testid="rmode-disable" onClick={onDisable}>
                {t('rmode.disable')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                {(Object.keys(LEVEL_KEYS) as ReducedModeLevel[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    data-testid={`rmode-level-${option}`}
                    onClick={() => setLevel(option)}
                    aria-pressed={level === option}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                      level === option
                        ? 'border-fitness-success bg-fitness-success/10 text-fitness-success'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(LEVEL_KEYS[option])}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {DAY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    data-testid={`rmode-days-${option}`}
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
            </div>
            <DialogFooter>
              <Button
                className="kinetic-primary-button w-full"
                data-testid="rmode-enable"
                onClick={() => onEnable(level, days)}
              >
                {t('rmode.enable')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
