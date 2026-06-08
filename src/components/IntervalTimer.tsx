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
    <div className={cn(
      'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-2xl shadow-2xl p-4 w-72 transition-all',
      isFinished && 'border-fitness-success ring-2 ring-fitness-success/40',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4 text-primary shrink-0" />
            {spec.label}
          </div>
          {exerciseLabel && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 ml-6">{exerciseLabel}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Numer rundy (EMOM) */}
        {!isAmrap && (
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t('interval.round')} {round} / {spec.rounds}
          </span>
        )}

        {/* Progress ring + czas rundy */}
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
              className={cn('transition-all duration-1000', isFinished ? 'text-fitness-success' : 'text-primary')}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-2xl font-bold tabular-nums', isFinished && 'text-fitness-success')}>
              {isFinished ? t('interval.done') : fmt(leftInUnit)}
            </span>
          </div>
        </div>

        {/* Łączny czas */}
        <span className="text-xs tabular-nums text-muted-foreground">
          {fmt(elapsed)} / {fmt(spec.totalSec)}
        </span>

        {/* Sterowanie */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsRunning(p => !p)} disabled={isFinished}>
            {isRunning ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            {isRunning ? t('resttimer.pause') : t('resttimer.resume')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            {t('resttimer.reset')}
          </Button>
        </div>
      </div>
    </div>
  );
};
