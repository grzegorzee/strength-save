import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, X, RotateCcw, Play, Pause } from 'lucide-react';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';
import type { IntervalSpec } from '@/lib/interval-timer';

// Haptyka: lekki impuls na starcie rundy, mocniejszy sukces na koniec bloku.
async function haptic(kind: 'round' | 'finish') {
  try {
    if (Capacitor.isNativePlatform()) {
      if (kind === 'finish') await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(kind === 'finish' ? [200, 100, 200, 100, 200] : 120);
    }
  } catch {
    // Haptyka niedostępna — pomijamy.
  }
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

interface IntervalTimerProps {
  spec: IntervalSpec;
  exerciseLabel?: string;
  onClose: () => void;
}

export const IntervalTimer = ({ spec, exerciseLabel, onClose }: IntervalTimerProps) => {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Odblokuj audio na starcie (montaż = efekt tapnięcia chipa timera) — by beep zagrał na iOS.
  useEffect(() => { unlockTimerSound(); }, []);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= spec.totalSec) {
          clearTimer();
          setIsRunning(false);
          playTimerSound('finish');
          haptic('finish');
          return spec.totalSec;
        }
        // Granica rundy (EMOM): krótki dźwięk + lekka haptyka na starcie nowej rundy.
        if (spec.kind === 'emom' && next % spec.intervalSec === 0) {
          playTimerSound('tick');
          haptic('round');
        }
        return next;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, spec, clearTimer]);

  const handleReset = () => {
    clearTimer();
    setElapsed(0);
    setIsRunning(true);
  };

  const isFinished = elapsed >= spec.totalSec;
  const isAmrap = spec.kind === 'amrap';

  // EMOM: odliczanie w obrębie rundy + numer rundy. AMRAP: odliczanie całego bloku.
  const round = Math.min(spec.rounds, Math.floor(elapsed / spec.intervalSec) + 1);
  const secInUnit = isAmrap ? elapsed : elapsed % spec.intervalSec;
  const unitLen = isAmrap ? spec.totalSec : spec.intervalSec;
  const leftInUnit = isFinished ? 0 : unitLen - secInUnit;
  const progress = unitLen > 0 ? (secInUnit / unitLen) * 100 : 0;

  return (
    // Kompaktowy pasek dokowany nad dolnym paskiem akcji. Cienki i waski — NIE zasłania pól serii
    // (KG/powt), więc można logować serie w trakcie interwału (E4MOM = seria co rundę). z-[60] > pasek akcji.
    <div className={cn(
      'fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md',
      'bg-card/95 backdrop-blur-md border rounded-2xl shadow-2xl px-3.5 py-2.5 transition-colors',
      isFinished && 'border-fitness-success ring-2 ring-fitness-success/40',
    )}>
      <div className="flex items-center gap-3">
        {/* Lewa: etykieta + ćwiczenie */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-none">
            <Timer className={cn('h-3.5 w-3.5 shrink-0', isFinished ? 'text-fitness-success' : 'text-primary')} />
            <span className="truncate">{spec.label}</span>
            {!isAmrap && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                · {t('interval.round')} {round}/{spec.rounds}
              </span>
            )}
          </div>
          {exerciseLabel && (
            <p className="text-[11px] text-muted-foreground truncate mt-1 ml-5">{exerciseLabel}</p>
          )}
        </div>

        {/* Środek: czas rundy + łączny */}
        <div className="text-right shrink-0 leading-none">
          <div className={cn('text-2xl font-bold tabular-nums', isFinished && 'text-fitness-success')}>
            {isFinished ? t('interval.done') : fmt(leftInUnit)}
          </div>
          <div className="text-[10px] tabular-nums text-muted-foreground mt-1">
            {fmt(elapsed)} / {fmt(spec.totalSec)}
          </div>
        </div>

        {/* Prawa: sterowanie ikonami (kompaktowo) */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsRunning(p => !p)} disabled={isFinished} aria-label={isRunning ? t('resttimer.pause') : t('resttimer.resume')}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} aria-label={t('resttimer.reset')}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label={t('workout.close')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Liniowy progress rundy (cienki, nie zabiera wysokości) */}
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', isFinished ? 'bg-fitness-success' : 'bg-primary')}
          style={{ width: `${isFinished ? 100 : progress}%` }}
        />
      </div>
    </div>
  );
};
