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
import { warmupExercises, getStretchingForFocus } from '@/data/warmupStretching';
import { cn } from '@/lib/utils';

interface Props {
  focus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WarmupRoutineDialog = ({ focus, open, onOpenChange }: Props) => {
  const stretches = getStretchingForFocus(focus);
  const allItems = [
    ...warmupExercises.map(e => ({ ...e, section: 'warmup' as const })),
    ...stretches.map(e => ({ ...e, section: 'stretch' as const })),
  ];

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = allItems.length > 0 ? Math.round((checked.size / allItems.length) * 100) : 0;

  const toggle = (idx: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const startTimer = useCallback(() => {
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
      setChecked(new Set());
      setTimerActive(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Rozgrzewka
          </DialogTitle>
          <DialogDescription>
            {focus} — {checked.size}/{allItems.length} ukończone
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        {/* Timer */}
        {timerActive && (
          <div className="flex items-center justify-center gap-3 py-3 bg-muted/30 rounded-lg">
            <Timer className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-2xl font-bold tabular-nums">{timerSeconds}s</span>
            <Button size="sm" variant="ghost" onClick={() => setTimerActive(false)}>Stop</Button>
          </div>
        )}

        {/* Warmup section */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Rozgrzewka dynamiczna</h4>
          {warmupExercises.map((ex, idx) => (
            <button
              key={idx}
              className={cn(
                'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
                checked.has(idx) ? 'bg-fitness-success/10' : 'bg-muted/30 hover:bg-muted/50',
              )}
              onClick={() => toggle(idx)}
            >
              <div className={cn(
                'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                checked.has(idx) ? 'bg-fitness-success border-fitness-success' : 'border-muted-foreground/30',
              )}>
                {checked.has(idx) && <Check className="h-4 w-4 text-white" />}
              </div>
              <span className={cn('flex-1 text-sm', checked.has(idx) && 'line-through text-muted-foreground')}>{ex.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{ex.duration}</Badge>
            </button>
          ))}
        </div>

        {/* Stretching section */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Stretching</h4>
          {stretches.map((ex, sIdx) => {
            const idx = warmupExercises.length + sIdx;
            return (
              <button
                key={idx}
                className={cn(
                  'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
                  checked.has(idx) ? 'bg-fitness-success/10' : 'bg-muted/30 hover:bg-muted/50',
                )}
                onClick={() => toggle(idx)}
              >
                <div className={cn(
                  'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  checked.has(idx) ? 'bg-fitness-success border-fitness-success' : 'border-muted-foreground/30',
                )}>
                  {checked.has(idx) && <Check className="h-4 w-4 text-white" />}
                </div>
                <span className={cn('flex-1 text-sm', checked.has(idx) && 'line-through text-muted-foreground')}>{ex.name}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{ex.duration}</Badge>
              </button>
            );
          })}
        </div>

        {/* Timer button */}
        {!timerActive && (
          <Button variant="outline" size="sm" className="w-full" onClick={startTimer}>
            <Timer className="h-4 w-4 mr-2" /> Timer 30s
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
