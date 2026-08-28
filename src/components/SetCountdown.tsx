import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { armSetCountdownNotification, cancelSetCountdownNotification } from '@/lib/rest-notification';
import {
  countdownElapsed,
  countdownRemaining,
  formatCountdown,
  isCountdownFinished,
  type SetCountdownRun,
} from '@/lib/set-countdown';

// WP-C (X37): odliczanie serii na czas (plank, hollow hold, farmer's hold).
//
// Wzorzec RestBar: komponent tyka SAM (setInterval tylko do odswiezania widoku),
// zrodlem prawdy jest DEADLINE od wlasciciela stanu (ExerciseCard). Po powrocie
// z tla (iOS wstrzymuje JS) reszta liczy sie z zegara, sygnal na deadline przy
// zgaszonym ekranie dostarcza system (armSetCountdownNotification, schedule
// dopiero w tle). Dane (zapis czasu, odhaczenie, przerwa) i sygnaly
// foregroundowe robi rodzic w onFinished / onStop.

// Prog jak w RestBar (bug 28, X30): koniec przekroczony o wiecej = JS byl
// wstrzymany, sygnal dostarczyla notyfikacja. Rodzic nie powtarza dzwieku.
const FINISH_SIGNAL_GRACE_MS = 3000;

interface SetCountdownProps {
  /** Biegnace odliczanie tej serii albo null (przycisk startu). */
  run: SetCountdownRun | null;
  /** Cel odliczania (sekundy) pokazywany w etykiecie startu. */
  targetSec: number;
  /** Start zablokowany (seria odhaczona, inne odliczanie w karcie, karta tylko do odczytu). Stop zawsze dostepny. */
  disabled?: boolean;
  /** inline = dwie komorki siatki (czas + przycisk); strip = pelna szerokosc pod wierszem (wdd). */
  variant?: 'inline' | 'strip';
  /** "Set 1" (kontrakt aria jak w polach serii). */
  setLabel: string;
  /** Tresc powiadomienia systemowego. */
  exerciseLabel: string;
  onStart: () => void;
  onStop: (elapsedSec: number) => void;
  onFinished: (result: { late: boolean }) => void;
  /** inline: pole czasu renderowane, gdy odliczanie nie biegnie. */
  children?: ReactNode;
}

export const SetCountdown = ({
  run,
  targetSec,
  disabled = false,
  variant = 'inline',
  setLabel,
  exerciseLabel,
  onStart,
  onStop,
  onFinished,
  children,
}: SetCountdownProps) => {
  const { t } = useTranslation();
  const [, forceTick] = useState(0);
  const finishedRef = useRef(false);

  // Callbacki i etykiety przez refy: zmiana identity (re-render karty) nie moze
  // restartowac efektow ani przeplanowywac notyfikacji.
  const onFinishedRef = useRef(onFinished);
  const tRef = useRef(t);
  const exerciseLabelRef = useRef(exerciseLabel);
  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);
  useEffect(() => { tRef.current = t; }, [t]);
  useEffect(() => { exerciseLabelRef.current = exerciseLabel; }, [exerciseLabel]);

  const deadlineAt = run?.deadlineAt ?? null;

  // Uzbrojenie sygnalu systemowego na czas biegu; stop / koniec / unmount rozbraja.
  useEffect(() => {
    if (deadlineAt === null) return;
    finishedRef.current = false;
    armSetCountdownNotification(deadlineAt, tRef.current('setCountdown.notificationTitle'), exerciseLabelRef.current);
    return () => { void cancelSetCountdownNotification(); };
  }, [deadlineAt]);

  // Odswiezanie widoku. Nie liczy czasu, tylko wymusza przeliczenie z deadline.
  useEffect(() => {
    if (deadlineAt === null) return;
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [deadlineAt]);

  const now = Date.now();
  const left = run ? countdownRemaining(run, now) : 0;

  // Koniec: raz na bieg. NAJPIERW rodzic (dane + sygnaly), zeby wyjatek sygnalu
  // nie zostawil odliczania na 0:00 (wzorzec Z189 z RestBar).
  useEffect(() => {
    if (!run || finishedRef.current || !isCountdownFinished(run, now)) return;
    finishedRef.current = true;
    onFinishedRef.current({ late: now - run.deadlineAt > FINISH_SIGNAL_GRACE_MS });
  });

  const timeLabel = run ? formatCountdown(left) : formatCountdown(targetSec);

  const button = (
    <button
      type="button"
      data-testid={run ? 'set-countdown-stop' : 'set-countdown-start'}
      onClick={() => {
        if (run) onStop(countdownElapsed(run));
        else onStart();
      }}
      disabled={!run && disabled}
      aria-label={run
        ? t('setCountdown.stop', { set: setLabel })
        : t('setCountdown.start', { set: setLabel, time: timeLabel })}
      className={cn(
        'flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors disabled:opacity-40',
        run
          ? 'bg-primary/10 text-primary'
          : 'bg-surface-low text-muted-foreground/70 hover:text-primary',
      )}
    >
      {run
        ? <Square className="h-4 w-4 fill-current" aria-hidden />
        : <Play className="h-4 w-4 fill-current" aria-hidden />}
    </button>
  );

  if (variant === 'strip') {
    return (
      <div
        data-testid="set-countdown-strip"
        className="mt-1 flex items-center gap-2 rounded-xl bg-surface-low py-0.5 pl-3 pr-1"
      >
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {t('setCountdown.label')}
        </span>
        <span
          role={run ? 'timer' : undefined}
          aria-label={run ? t('setCountdown.remaining', { time: timeLabel }) : undefined}
          className={cn('flex-1 text-right font-heading text-base font-bold tabular-nums', run ? 'text-primary' : 'text-muted-foreground')}
        >
          {timeLabel}
        </span>
        {button}
      </div>
    );
  }

  return (
    <>
      {run ? (
        <div
          role="timer"
          aria-label={t('setCountdown.remaining', { time: timeLabel })}
          className="exercise-card-input flex h-12 items-center justify-center px-1 text-base font-bold tabular-nums text-primary"
        >
          {timeLabel}
        </div>
      ) : children}
      <div className="flex justify-center">{button}</div>
    </>
  );
};
