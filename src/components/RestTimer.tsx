import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  defaultSeconds?: number;
  exerciseLabel?: string;
  onClose: () => void;
}

const PRESETS = [15, 30, 45, 60, 90, 120];

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    // Three short beeps
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.65);
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio not available
  }
}

export const RestTimer = ({ defaultSeconds = 30, exerciseLabel, onClose }: RestTimerProps) => {
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            // Vibrate + beep
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return clearTimer;
  }, [isRunning, secondsLeft, clearTimer]);

  const handleReset = (seconds?: number) => {
    clearTimer();
    const newTotal = seconds || totalSeconds;
    setTotalSeconds(newTotal);
    setSecondsLeft(newTotal);
    setIsRunning(true);
  };

  const togglePause = () => {
    setIsRunning(prev => !prev);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;
  const isFinished = secondsLeft === 0;

  return (
    <div className={cn(
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-2xl shadow-2xl p-4 w-72 transition-all",
      isFinished && "border-fitness-success animate-pulse"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4 text-primary shrink-0" />
            Odpoczynek
          </div>
          {exerciseLabel && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 ml-6">{exerciseLabel}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
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
              {isFinished ? "GO!" : `${minutes}:${String(secs).padStart(2, '0')}`}
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
            {isRunning ? 'Pauza' : 'Wznów'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReset()}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
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
