import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// "Zakończ trening" przez przytrzymanie (Runna pakiet 1, spec B3): ochrona
// przed przypadkowym tapnięciem spoconym palcem. Tap = hint, klawiatura =
// fallback do istniejącego potwierdzenia (a11y: podwójny tap z potwierdzeniem).
// Timeout przytrzymania to gest UI przy włączonym ekranie — nie sygnał czasowy
// treningu (te pozostają systemowe).

interface HoldToFinishButtonProps {
  label: string;
  hint: string;
  onConfirm: () => void;
  /** Fallback a11y (Enter/spacja): istniejący przepływ potwierdzenia. */
  onFallback: () => void;
  holdMs?: number;
  disabled?: boolean;
}

const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const HoldToFinishButton = ({
  label,
  hint,
  onConfirm,
  onFallback,
  holdMs = 900,
  disabled,
}: HoldToFinishButtonProps) => {
  const [holding, setHolding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const clearHoldTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startHold = () => {
    if (disabled) return;
    firedRef.current = false;
    setShowHint(false);
    setHolding(true);
    clearHoldTimer();
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      timerRef.current = null;
      setHolding(false);
      onConfirm();
    }, holdMs);
  };

  const cancelHold = () => {
    const wasHolding = timerRef.current !== null;
    clearHoldTimer();
    if (!firedRef.current && wasHolding) setShowHint(true);
    setHolding(false);
  };

  useEffect(() => () => clearHoldTimer(), []);

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled}
        data-testid="hold-to-finish"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onFallback();
          }
        }}
        className={cn(
          'kinetic-primary-button flex w-full select-none items-center justify-center gap-2 rounded-md px-8 py-6 text-base font-medium transition-all hover:brightness-105 disabled:pointer-events-none disabled:opacity-50',
          holding && 'brightness-110',
        )}
        style={{ touchAction: 'manipulation' }}
      >
        <Check className="h-5 w-5" />
        {label}
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <circle cx="12" cy="12" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={holding ? 0 : RING_CIRCUMFERENCE}
            transform="rotate(-90 12 12)"
            style={{
              transitionProperty: 'stroke-dashoffset',
              transitionTimingFunction: 'linear',
              transitionDuration: holding ? `${holdMs}ms` : '0ms',
            }}
          />
        </svg>
      </button>
      {showHint && (
        <p className="mt-2 text-center text-xs text-muted-foreground" data-testid="hold-hint">{hint}</p>
      )}
    </div>
  );
};
