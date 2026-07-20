import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  startRest,
  adjustRest,
  remainingSeconds,
  isFinished,
  restProgress,
  type RestTimerState,
} from '@/lib/rest-timer';
import { scheduleRestEndNotification, cancelRestEndNotification } from '@/lib/rest-notification';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';
import { hapticRestEnd } from '@/lib/haptics';

interface RestBarProps {
  /** Długość przerwy w sekundach. */
  seconds: number;
  /** Zmiana wartości = START NOWEJ przerwy (wzorzec runId z IntervalTimer). */
  runId: number;
  exerciseLabel: string;
  onSkip: () => void;
}

const mmss = (total: number): string => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * X17C Z136: pasek przerwy INLINE w karcie ćwiczenia.
 *
 * Komponent tyka SAM (własny setInterval), żeby karta ćwiczenia nie re-renderowała
 * się cztery razy na sekundę — to byłby powrót re-render bomby R2-07.
 *
 * Źródłem prawdy jest DEADLINE z `rest-timer.ts`, nie odliczane ticki: po powrocie
 * z tła (iOS wstrzymuje JS w WKWebView) pasek natychmiast pokazuje realny stan.
 * `setInterval` służy WYŁĄCZNIE do odświeżania widoku, gdy apka jest na wierzchu.
 * Sygnał końca przy zgaszonym ekranie dostarcza system (local notification).
 */
export const RestBar = ({ seconds, runId, exerciseLabel, onSkip }: RestBarProps) => {
  const { t } = useTranslation();
  const [state, setState] = useState<RestTimerState>(() => startRest(Date.now(), seconds));
  const [, forceTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const finishedRef = useRef(false);

  // Zaplanowanie powiadomienia na deadline. Wołane przy starcie i przy KAŻDEJ
  // zmianie czasu — inaczej sygnał przyszedłby na nieaktualny moment.
  const scheduleFor = useCallback((next: RestTimerState) => {
    if (next.deadlineAt === null) return;
    const left = Math.max(1, Math.round((next.deadlineAt - Date.now()) / 1000) + 1);
    void scheduleRestEndNotification(left, t('rest.bar.done'), exerciseLabel);
  }, [t, exerciseLabel]);

  // Nowy runId => nowa przerwa (odhaczona kolejna seria).
  useEffect(() => {
    finishedRef.current = false;
    const next = startRest(Date.now(), seconds);
    setState(next);
    unlockTimerSound();
    scheduleFor(next);
  }, [runId, seconds, scheduleFor]);

  // Odświeżanie widoku. Nie liczy czasu — tylko wymusza przeliczenie z deadline.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Sprzątanie: wyjście z ekranu nie może zostawić zaplanowanego powiadomienia.
  useEffect(() => () => { void cancelRestEndNotification(); }, []);

  const now = Date.now();
  const left = remainingSeconds(state, now);
  const done = isFinished(state, now);
  const progress = restProgress(state, now);

  // Koniec w foregroundzie: JS żyje, więc sygnał gramy sami, a systemowy anulujemy
  // (inaczej user dostałby go drugi raz, już po fakcie).
  useEffect(() => {
    if (!done || finishedRef.current || state.deadlineAt === null) return;
    finishedRef.current = true;
    void cancelRestEndNotification();
    playTimerSound('finish');
    // MOCNY sygnał, nie lekki impuls: user zgłosił po treningu „cicha wibracja,
    // nic więcej". Telefon leży obok ławki albo w kieszeni.
    void hapticRestEnd();
  }, [done, state.deadlineAt]);

  const handleAdjust = (delta: number) => {
    const next = adjustRest(state, delta, Date.now());
    setState(next);
    finishedRef.current = false;
    void cancelRestEndNotification();
    scheduleFor(next);
  };

  const handleSkip = () => {
    void cancelRestEndNotification();
    onSkip();
  };

  const label = done ? t('rest.bar.done') : mmss(left);

  // Przyciski w OSOBNYM rzędzie, każdy flex-1. Wcześniej wszystko było w jednej
  // linii z etykietą i czasem — na iPhone „Pomiń" wychodził poza kartę (zgłoszone
  // ze zrzutu z treningu). Teraz szerokość tekstu nie ma jak rozwalić układu.
  const controls = (
    <div className="mt-2 flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={() => handleAdjust(-15)}
        className="flex-1 rounded-lg bg-background/60 px-2 py-2 text-xs font-bold tabular-nums transition-colors hover:bg-background"
      >
        -15
      </button>
      <button
        type="button"
        onClick={() => handleAdjust(15)}
        className="flex-1 rounded-lg bg-background/60 px-2 py-2 text-xs font-bold tabular-nums transition-colors hover:bg-background"
      >
        +15
      </button>
      <button
        type="button"
        onClick={handleSkip}
        className="flex-1 rounded-lg bg-background/60 px-2 py-2 text-xs font-bold transition-colors hover:bg-background"
      >
        {t('rest.bar.skip')}
      </button>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          'relative mt-2 overflow-hidden rounded-xl px-3 py-2.5 transition-colors',
          done ? 'bg-fitness-success/15' : 'bg-primary/10',
        )}
        data-testid="rest-bar"
      >
        {/* Wypełnienie postępu — granica przez tło, zero ramek (No-Line Rule). */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
          aria-hidden="true"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t('rest.bar.expand')}
            data-testid="rest-bar-expand"
            className="flex w-full items-center gap-2 text-left"
          >
            <Timer className={cn('h-4 w-4 shrink-0', done ? 'text-fitness-success' : 'text-primary')} />
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('rest.bar.title')}
            </span>
            <span className={cn('truncate text-xl font-bold tabular-nums', done && 'text-fitness-success')}>{label}</span>
          </button>
          {controls}
        </div>
      </div>

      {/* Widok pełnoekranowy — duże odliczanie, gdy telefon leży obok. */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm"
          data-testid="rest-fullscreen"
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label={t('rest.bar.collapse')}
            className="absolute right-5 top-[calc(1.25rem+env(safe-area-inset-top))] rounded-full bg-muted/60 p-2.5"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t('rest.bar.title')} · {exerciseLabel}
          </span>
          <span className={cn('text-7xl font-bold tabular-nums', done && 'text-fitness-success')}>{label}</span>
          {controls}
        </div>
      )}
    </>
  );
};
