import { useState, useEffect, useMemo } from 'react';
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
import { Check, ChevronDown, ChevronRight, Timer, Flame, Dumbbell } from 'lucide-react';
import { getStretchingForFocus, localizeWarmup } from '@/data/warmupStretching';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { localizeFocus } from '@/lib/plan-i18n';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import type { PreStartWarmupPlan, WarmupItem, WarmupPhase } from '@/lib/prestart-warmup';
import type { TranslationKey } from '@/i18n';

interface Props {
  focus: string;
  /** C-T2 + X37: plan pod PIERWSZE ćwiczenie dnia (tętno -> mobilność -> aktywacja + ramp). */
  plan: PreStartWarmupPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Odhaczone pozycje po nameKey (Z162): stan mieszka w drafcie sesji, nie w dialogu. */
  checked: ReadonlySet<string>;
  onToggle: (nameKey: string) => void;
}

const PHASES: WarmupPhase[] = ['pulse', 'mobility', 'activation'];
const PHASE_LABEL: Record<WarmupPhase, TranslationKey> = {
  pulse: 'warmup.v3.phasePulse',
  mobility: 'warmup.v3.phaseMobility',
  activation: 'warmup.v3.phaseActivation',
};

export const WarmupRoutineDialog = ({ focus, plan, open, onOpenChange, checked, onToggle }: Props) => {
  const { t, lang } = useTranslation();
  const { toDisplay, unit } = useUnit();
  // C-T2: statyczny stretching NIE jest domyślną połową rozgrzewki: schowany
  // za jawnym rozwinięciem, odhaczenia działają jak dotąd.
  const [showStretch, setShowStretch] = useState(false);
  const stretches = getStretchingForFocus(focus);

  // Postęp liczony po pozycjach szablonu (bez stretchingu i rampy).
  const done = plan.items.filter((item) => checked.has(item.key)).length;
  const total = plan.items.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  // X37: aktywna pozycja = pierwsza nieodhaczona; "Dalej" ją odhacza.
  const active = useMemo(() => plan.items.find((item) => !checked.has(item.key)) ?? null, [plan.items, checked]);

  // X37: odliczanie pozycji czasowej TYLKO za flagą intervalTimers (default
  // OFF: setInterval milknie przy zgaszonym ekranie, dług Z10). Deadline
  // zamiast licznika tików, więc po powrocie z tła reszta jest prawdziwa.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const countdownEnabled = FEATURE_FLAGS.intervalTimers;

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (deadline === null || remaining > 0 || !active || Date.now() < deadline) return;
    // Zero: pozycja zrobiona, przejście do następnej.
    setDeadline(null);
    onToggle(active.key);
  }, [deadline, remaining, active, onToggle]);

  const startCountdown = (durationSec: number) => {
    // remaining razem z deadline (jeden render), żeby efekt zera nie odpalił na starym 0.
    setRemaining(durationSec);
    setDeadline(Date.now() + durationSec * 1000);
  };

  useEffect(() => {
    if (!open) {
      setDeadline(null);
      setShowStretch(false);
    }
  }, [open]);

  // Zmiana aktywnej pozycji (ręczne odhaczenie) przerywa odliczanie.
  const activeKey = active?.key ?? null;
  useEffect(() => { setDeadline(null); }, [activeKey]);

  const itemBadge = (item: WarmupItem): string => {
    if (typeof item.durationSec === 'number') return t('warmup.v3.seconds', { n: item.durationSec });
    return item.perSide
      ? t('warmup.v3.repsPerSide', { n: item.reps ?? 0 })
      : t('warmup.v3.reps', { n: item.reps ?? 0 });
  };

  const renderCheckItem = (nameKey: string, label: string, badge?: string, isActive = false) => (
    <button
      key={nameKey}
      data-testid="warmup-item"
      data-active={isActive ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
        checked.has(nameKey)
          ? 'bg-fitness-success/10'
          : isActive ? 'bg-primary/[0.08] ring-1 ring-primary/70' : 'bg-muted/30 hover:bg-muted/50',
      )}
      onClick={() => onToggle(nameKey)}
    >
      <div className={cn(
        'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        checked.has(nameKey) ? 'bg-fitness-success border-fitness-success' : isActive ? 'border-primary' : 'border-muted-foreground/30',
      )}>
        {checked.has(nameKey) && <Check className="h-4 w-4 text-white" />}
      </div>
      <span className={cn('flex-1 text-sm', checked.has(nameKey) && 'line-through text-muted-foreground')}>{label}</span>
      {badge && <Badge variant="outline" className="text-[10px] shrink-0 tabular-nums">{badge}</Badge>}
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
            {t('comp.warmup.progress', { focus: localizeFocus(focus, lang), done, total })}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        {/* Odliczanie aktywnej pozycji czasowej (za flagą intervalTimers). */}
        {countdownEnabled && deadline !== null && (
          <div className="flex items-center justify-center gap-3 py-3 bg-muted/30 rounded-lg" data-testid="warmup-countdown">
            <Timer className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-2xl font-bold tabular-nums">{remaining}s</span>
            <Button size="sm" variant="ghost" onClick={() => setDeadline(null)}>{t('comp.warmup.stop')}</Button>
          </div>
        )}

        {/* Szablon: tętno -> mobilność -> aktywacja (X37). */}
        {PHASES.map((phase) => {
          const items = plan.items.filter((item) => item.phase === phase);
          if (items.length === 0) return null;
          return (
            <div className="space-y-1" key={phase} data-testid={`warmup-phase-${phase}`}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">{t(PHASE_LABEL[phase])}</h4>
              {items.map((item) => renderCheckItem(item.key, t(item.key), itemBadge(item), active?.key === item.key))}
            </div>
          );
        })}

        {/* Serie rampujące: robisz je już w pierwszym ćwiczeniu, stąd bez checkboxów. */}
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

        {/* Jawne wyjście z rozgrzewki (zgłoszenie 2026-08-13: sam X nie wystarcza).
            Sticky: widoczny też przy przescrollowanej liście. X37: "Dalej"
            odhacza aktywną pozycję; przy pozycji czasowej z włączoną flagą
            najpierw odliczanie. */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 flex flex-col gap-2 border-t border-border/50 bg-background/95 p-4 backdrop-blur">
          {active && countdownEnabled && deadline === null && typeof active.durationSec === 'number' && (
            <Button
              variant="outline"
              className="w-full"
              data-testid="warmup-countdown-start"
              onClick={() => startCountdown(active.durationSec ?? 0)}
            >
              <Timer className="h-4 w-4 mr-2" /> {t('warmup.v3.startCountdown', { n: active.durationSec })}
            </Button>
          )}
          {active ? (
            <Button className="w-full" data-testid="warmup-next" onClick={() => onToggle(active.key)}>
              {t('warmup.v3.next')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <p className="text-center text-sm text-fitness-success">{t('warmup.v3.allDone')}</p>
          )}
          <Button variant={active ? 'outline' : 'default'} className="w-full" data-testid="warmup-finish" onClick={() => onOpenChange(false)}>
            <Check className="h-4 w-4 mr-2" />
            {t('comp.warmup.finish')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
