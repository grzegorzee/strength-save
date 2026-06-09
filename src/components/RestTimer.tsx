import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, X, RotateCcw } from 'lucide-react';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';

// Wibracja końca odpoczynku: natywnie przez Capacitor Haptics (iOS/Android),
// w przeglądarce fallback do Vibration API (navigator.vibrate jest no-op na iOS WKWebView).
async function triggerEndHaptic() {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch {
    // Haptics niedostępne — pomijamy.
  }
}

interface RestTimerProps {
  defaultSeconds?: number;
  exerciseLabel?: string;
  onClose: () => void;
}

const PRESETS = [15, 30, 45, 60, 90, 120];

export const RestTimer = ({ defaultSeconds = 30, exerciseLabel, onClose }: RestTimerProps) => {
  const { t } = useTranslation();
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [deadline, setDeadline] = useState(() => Date.now() + defaultSeconds * 1000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const secondsLeftRef = useRef(defaultSeconds);
  const finishFiredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Odblokuj audio na starcie (montaż = efekt gestu odhaczenia serii) — by końcowy beep zagrał na iOS.
  useEffect(() => { unlockTimerSound(); }, []);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  const finishTimer = useCallback(() => {
    if (finishFiredRef.current) return;
    finishFiredRef.current = true;
    clearTimer();
    setIsRunning(false);
    setSecondsLeft(0);
    // Wibracja (haptic) + krótki dźwięk na koniec odpoczynku.
    triggerEndHaptic();
    playTimerSound('finish');
  }, [clearTimer]);

  useEffect(() => {
    if (!isRunning || secondsLeftRef.current <= 0) return clearTimer;

    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (next <= 0) {
        finishTimer();
        return;
      }
      setSecondsLeft(next);
    };

    tick();
    intervalRef.current = setInterval(tick, 250);

    return clearTimer;
  }, [isRunning, deadline, finishTimer, clearTimer]);

  const handleReset = (seconds?: number) => {
    clearTimer();
    const newTotal = seconds || totalSeconds;
    finishFiredRef.current = false;
    setTotalSeconds(newTotal);
    setSecondsLeft(newTotal);
    setDeadline(Date.now() + newTotal * 1000);
    setIsRunning(true);
  };

  const togglePause = () => {
    if (secondsLeftRef.current <= 0) return;
    if (isRunning) {
      clearTimer();
      setIsRunning(false);
    } else {
      setDeadline(Date.now() + secondsLeftRef.current * 1000);
      setIsRunning(true);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;
  const isFinished = secondsLeft === 0;

  return (
    <div className={cn(
      "fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[70] bg-card border rounded-2xl shadow-2xl p-4 w-[calc(100%-1.5rem)] max-w-80 transition-colors",
      isFinished && "border-fitness-success ring-2 ring-fitness-success/40"
    )} data-testid="rest-timer">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4 text-primary shrink-0" />
            {t('resttimer.title')}
          </div>
          {exerciseLabel && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 ml-6">{exerciseLabel}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label={t('workout.close')}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
              className={cn(
                "transition-all duration-1000",
                isFinished ? "text-fitness-success" : "text-primary"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              isFinished && "text-fitness-success"
            )}>
              {isFinished ? t('resttimer.go') : `${minutes}:${String(secs).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            disabled={isFinished}
          >
            {isRunning ? t('resttimer.pause') : t('resttimer.resume')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReset()}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {t('resttimer.reset')}
          </Button>
        </div>

        {/* Presets */}
        <div className="flex gap-1.5">
          {PRESETS.map(s => (
            <button
              key={s}
              onClick={() => handleReset(s)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                totalSeconds === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {s >= 60 ? `${s / 60}min` : `${s}s`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
