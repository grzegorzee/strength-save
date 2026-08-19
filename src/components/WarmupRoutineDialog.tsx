import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronDown, Timer, Flame, Dumbbell } from 'lucide-react';
import { getStretchingForFocus, localizeWarmup } from '@/data/warmupStretching';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { localizeFocus } from '@/lib/plan-i18n';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import type { PreStartWarmupPlan } from '@/lib/prestart-warmup';
import type { TranslationKey } from '@/i18n';

interface Props {
  focus: string;
  /** C-T2: plan pod PIERWSZE ćwiczenie dnia (cardio + dynamiczne + ramp). */
  plan: PreStartWarmupPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Odhaczone pozycje po nameKey (Z162) — stan mieszka w drafcie sesji, nie w dialogu. */
  checked: ReadonlySet<string>;
  onToggle: (nameKey: string) => void;
}

export const WarmupRoutineDialog = ({ focus, plan, open, onOpenChange, checked, onToggle }: Props) => {
  const { t, lang } = useTranslation();
  const { toDisplay, unit } = useUnit();
  // C-T2: statyczny stretching NIE jest domyślną połową rozgrzewki — schowany
  // za jawnym rozwinięciem, odhaczenia działają jak dotąd.
  const [showStretch, setShowStretch] = useState(false);
  const stretches = getStretchingForFocus(focus);

  // Postęp liczony po pozycjach DOMYŚLNYCH (cardio + dynamiczne).
  const defaultKeys = [plan.cardioKey, ...plan.dynamicKeys];
  const done = defaultKeys.filter((key) => checked.has(key)).length;
  const progress = defaultKeys.length > 0 ? Math.round((done / defaultKeys.length) * 100) : 0;

  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (!FEATURE_FLAGS.intervalTimers) return;
    setTimerSeconds(30);
    setTimerActive(true);
  }, []);

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      intervalRef.current = setTimeout(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    if (!open) {
      setTimerActive(false);
      setShowStretch(false);
    }
  }, [open]);

  const renderCheckItem = (nameKey: string, label: string, badge?: string) => (
    <button
      key={nameKey}
      data-testid="warmup-item"
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
        checked.has(nameKey) ? 'bg-fitness-success/10' : 'bg-muted/30 hover:bg-muted/50',
      )}
      onClick={() => onToggle(nameKey)}
    >
      <div className={cn(
        'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        checked.has(nameKey) ? 'bg-fitness-success border-fitness-success' : 'border-muted-foreground/30',
      )}>
        {checked.has(nameKey) && <Check className="h-4 w-4 text-white" />}
      </div>
      <span className={cn('flex-1 text-sm', checked.has(nameKey) && 'line-through text-muted-foreground')}>{label}</span>
      {badge && <Badge variant="outline" className="text-[10px] shrink-0">{badge}</Badge>}
    </button>
  );

  const rampSetLabel = (setIndex: number): string => {
    const set = plan.ramp[setIndex];
    if (set.pctOfWorking === 0) return t('warmup.v2.rampBar');
    return set.weightKg !== null
      ? t('warmup.v2.rampSetKg', {
        weight: Math.round(toDisplay(set.weightKg) * 2) / 2,
        unit,
        pct: set.pctOfWorking,
        reps: set.reps,
      })
      : t('warmup.v2.rampSetPct', { pct: set.pctOfWorking, reps: set.reps });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('comp.warmup.title')}
          </DialogTitle>
          <DialogDescription>
            {t('comp.warmup.progress', { focus: localizeFocus(focus, lang), done, total: defaultKeys.length })}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        {/* Timer */}
        {FEATURE_FLAGS.intervalTimers && timerActive && (
          <div className="flex items-center justify-center gap-3 py-3 bg-muted/30 rounded-lg">
            <Timer className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-2xl font-bold tabular-nums">{timerSeconds}s</span>
            <Button size="sm" variant="ghost" onClick={() => setTimerActive(false)}>{t('comp.warmup.stop')}</Button>
          </div>
        )}

        {/* Opcjonalne cardio (C-T2) */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('warmup.v2.cardioTitle')}</h4>
          {renderCheckItem(plan.cardioKey, t(plan.cardioKey))}
        </div>

        {/* Ruchy dynamiczne pod pierwsze ćwiczenie */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('warmup.v2.dynamicTitle')}</h4>
          {plan.dynamicKeys.map((key) => renderCheckItem(key, t(key as TranslationKey)))}
        </div>

        {/* Serie rampujące — robisz je już w pierwszym ćwiczeniu, stąd bez checkboxów. */}
        {plan.ramp.length > 0 && (
          <div className="space-y-1" data-testid="warmup-ramp">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Dumbbell className="h-4 w-4" aria-hidden />
              {t('warmup.v2.rampTitle')}
            </h4>
            {plan.rampNoteKey && plan.rampNoteKey !== 'warmup.v2.rampBar' && (
              <p className="px-3 pb-1 text-xs text-muted-foreground">{t(plan.rampNoteKey)}</p>
            )}
            <ol className="space-y-1">
              {plan.ramp.map((set, index) => (
                <li key={index} className="rounded-lg bg-muted/30 px-3 py-2 text-sm tabular-nums">
                  {rampSetLabel(index)}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Stretching: opcjonalny, zwinięty (nie jest domyślną połową rozgrzewki). */}
        {stretches.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              data-testid="warmup-stretch-toggle"
              onClick={() => setShowStretch((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
            >
              {t('warmup.v2.stretchToggle')}
              <ChevronDown className={cn('h-4 w-4 transition-transform', showStretch && 'rotate-180')} aria-hidden />
            </button>
            {showStretch && stretches.map(ex =>
              renderCheckItem(ex.nameKey, localizeWarmup(ex, lang).name, localizeWarmup(ex, lang).duration),
            )}
          </div>
        )}

        {/* Timer button */}
        {FEATURE_FLAGS.intervalTimers && !timerActive && (
          <Button variant="outline" size="sm" className="w-full" onClick={startTimer}>
            <Timer className="h-4 w-4 mr-2" /> {t('comp.warmup.timer30')}
          </Button>
        )}

        {/* Jawne wyjście z rozgrzewki (zgłoszenie 2026-08-13: sam X nie wystarcza).
            Sticky: widoczny też przy przescrollowanej liście. */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-border/50 bg-background/95 p-4 backdrop-blur">
          <Button className="w-full" data-testid="warmup-finish" onClick={() => onOpenChange(false)}>
            <Check className="h-4 w-4 mr-2" />
            {t('comp.warmup.finish')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
