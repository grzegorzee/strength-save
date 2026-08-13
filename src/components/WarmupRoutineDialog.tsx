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
import { Check, Timer, Flame } from 'lucide-react';
import { warmupExercises, getStretchingForFocus, localizeWarmup } from '@/data/warmupStretching';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeFocus } from '@/lib/plan-i18n';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

interface Props {
  focus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Odhaczone pozycje po nameKey (Z162) — stan mieszka w drafcie sesji, nie w dialogu. */
  checked: ReadonlySet<string>;
  onToggle: (nameKey: string) => void;
}

export const WarmupRoutineDialog = ({ focus, open, onOpenChange, checked, onToggle }: Props) => {
  const { t, lang } = useTranslation();
  const stretches = getStretchingForFocus(focus);
  const allItems = [
    ...warmupExercises.map(e => ({ ...e, section: 'warmup' as const })),
    ...stretches.map(e => ({ ...e, section: 'stretch' as const })),
  ];

  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Licznik po bieżącej liście: klucze zapamiętane dla innego focusu nie zawyżają postępu.
  const done = allItems.filter(item => checked.has(item.nameKey)).length;
  const progress = allItems.length > 0 ? Math.round((done / allItems.length) * 100) : 0;

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
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('comp.warmup.title')}
          </DialogTitle>
          <DialogDescription>
            {t('comp.warmup.progress', { focus: localizeFocus(focus, lang), done, total: allItems.length })}
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

        {/* Warmup section */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('comp.warmup.dynamicWarmup')}</h4>
          {warmupExercises.map(ex => (
            <button
              key={ex.nameKey}
              className={cn(
                'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
                checked.has(ex.nameKey) ? 'bg-fitness-success/10' : 'bg-muted/30 hover:bg-muted/50',
              )}
              onClick={() => onToggle(ex.nameKey)}
            >
              <div className={cn(
                'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                checked.has(ex.nameKey) ? 'bg-fitness-success border-fitness-success' : 'border-muted-foreground/30',
              )}>
                {checked.has(ex.nameKey) && <Check className="h-4 w-4 text-white" />}
              </div>
              <span className={cn('flex-1 text-sm', checked.has(ex.nameKey) && 'line-through text-muted-foreground')}>{localizeWarmup(ex, lang).name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{localizeWarmup(ex, lang).duration}</Badge>
            </button>
          ))}
        </div>

        {/* Stretching section */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('comp.warmup.stretching')}</h4>
          {stretches.map(ex => (
            <button
              key={ex.nameKey}
              className={cn(
                'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
                checked.has(ex.nameKey) ? 'bg-fitness-success/10' : 'bg-muted/30 hover:bg-muted/50',
              )}
              onClick={() => onToggle(ex.nameKey)}
            >
              <div className={cn(
                'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                checked.has(ex.nameKey) ? 'bg-fitness-success border-fitness-success' : 'border-muted-foreground/30',
              )}>
                {checked.has(ex.nameKey) && <Check className="h-4 w-4 text-white" />}
              </div>
              <span className={cn('flex-1 text-sm', checked.has(ex.nameKey) && 'line-through text-muted-foreground')}>{localizeWarmup(ex, lang).name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{localizeWarmup(ex, lang).duration}</Badge>
            </button>
          ))}
        </div>

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
