import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  remainingSeconds,
  isFinished,
  restProgress,
  type RestTimerState,
} from '@/lib/rest-timer';
import { armRestEndNotification, cancelRestEndNotification } from '@/lib/rest-notification';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';
import { hapticRestEnd } from '@/lib/haptics';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';
import { useExclusiveOverlay } from '@/hooks/useExclusiveOverlay';

interface RestBarProps {
  /** Z188: deadline przychodzi z kontrolera (WorkoutDay) — RestBar nic nie liczy sam. */
  deadlineAt: number;
  /** Pełna długość przerwy w sekundach — do paska postępu. */
  totalSeconds: number;
  /** Zmiana wartości = START NOWEJ przerwy (wzorzec runId z IntervalTimer). */
  runId: number;
  exerciseLabel: string;
  /** Runna p.1 (spec B3): "Następne: 80 kg × 8" przy odliczaniu. */
  nextSetLabel?: string;
  onSkip: () => void;
  /** Z188: korekta ±15 s idzie do właściciela stanu (kontroler persystuje deadline). */
  onAdjust: (deltaSeconds: number) => void;
  /** Z143: koniec przerwy w foregroundzie — rodzic (właściciel stanu) zeruje przerwę. */
  onFinished?: () => void;
  /** Fala 2 (2026-08-20, wymóg właściciela): tap w korpus paska otwiera ustawienia
      timera (długość, dźwięk, auto-start). Sheet renderuje WŁAŚCICIEL (WorkoutDay),
      NIEZALEŻNIE od restState — koniec przerwy przy otwartym sheecie nie może go
      unmountować (lekcja Radix b.92). */
  onOpenSettings: () => void;
}

// Bug 28 (X30): próg spójny z watchdogiem Z189 (useRestTimerController, 3 s).
// Koniec przekroczony o więcej = JS był wstrzymany w tle, a sygnał o deadline
// dostarczyła notyfikacja systemowa — po powrocie tylko sprzątamy, bez replayu
// gongu i potrójnej ciężkiej haptyki wiele minut po fakcie.
const FINISH_SIGNAL_GRACE_MS = 3000;

const mmss = (total: number): string => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * X17C Z136 → Fala 2 (2026-08-20): STICKY pasek przerwy na dole ekranu sesji
 * (mockup exercise-card 2a: REST · czas · pasek postępu · SKIP), renderowany
 * przez WorkoutDay zamiast inline w karcie ćwiczenia. -15/+15 mieszkają
 * w widoku pełnoekranowym (ikona expand).
 *
 * Komponent tyka SAM (własny setInterval), żeby rodzic nie re-renderował się
 * cztery razy na sekundę — to byłby powrót re-render bomby R2-07.
 *
 * Źródłem prawdy jest DEADLINE z kontrolera (Z188), nie odliczane ticki: po powrocie
 * z tła (iOS wstrzymuje JS w WKWebView) pasek natychmiast pokazuje realny stan.
 * `setInterval` służy WYŁĄCZNIE do odświeżania widoku, gdy apka jest na wierzchu.
 * Sygnał końca przy zgaszonym ekranie dostarcza system (local notification).
 */
export const RestBar = ({ deadlineAt, totalSeconds, runId, exerciseLabel, nextSetLabel, onSkip, onAdjust, onFinished, onOpenSettings }: RestBarProps) => {
  const { t } = useTranslation();
  const [, forceTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const finishedRef = useRef(false);
  useExclusiveOverlay(expanded, () => setExpanded(false));

  // Z188: t i exerciseLabel czytane z refów — ich zmiana (język, nazwa ćwiczenia)
  // nie może restartować przerwy ani przeplanowywać notyfikacji (dzisiejszy dep na
  // identity scheduleFor robił dokładnie to).
  const tRef = useRef(t);
  const exerciseLabelRef = useRef(exerciseLabel);
  useEffect(() => { tRef.current = t; }, [t]);
  useEffect(() => { exerciseLabelRef.current = exerciseLabel; }, [exerciseLabel]);

  // Uzbrojenie notyfikacji systemowej: przy starcie (nowy runId) i przy każdej
  // KOREKCIE deadline (±15 z kontrolera). deadlineAt zmienia się wyłącznie w tych
  // dwóch momentach — nigdy od tykania.
  // Bug 8 (X30): w foregroundzie NIE planujemy — koniec sygnalizuje apka sama,
  // a schedule leci dopiero przy przejściu w tło (rest-notification słucha
  // appStateChange). Natychmiastowy schedule dawał podwójny dźwięk + banner
  // nad UI sesji przy każdej przerwie odliczonej do zera przy włączonym ekranie.
  useEffect(() => {
    finishedRef.current = false;
    unlockTimerSound();
    armRestEndNotification(deadlineAt, tRef.current('rest.bar.done'), exerciseLabelRef.current);
  }, [runId, deadlineAt]);

  // Odświeżanie widoku. Nie liczy czasu — tylko wymusza przeliczenie z deadline.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Sprzątanie: wyjście z ekranu nie może zostawić zaplanowanego powiadomienia.
  useEffect(() => () => { void cancelRestEndNotification(); }, []);

  const state: RestTimerState = { deadlineAt, totalSeconds };
  const now = Date.now();
  const left = remainingSeconds(state, now);
  const done = isFinished(state, now);
  const progress = restProgress(state, now);

  // Koniec w foregroundzie: JS żyje, więc sygnał gramy sami, a systemowy anulujemy
  // (inaczej user dostałby go drugi raz, już po fakcie).
  // Z189: NAJPIERW stan (onFinished), POTEM sygnały — wyjątek dźwięku/haptyki nie
  // ma prawa zostawić paska "Koniec przerwy" wiszącego na zawsze.
  useEffect(() => {
    if (!done || finishedRef.current) return;
    finishedRef.current = true;
    // Z143: właścicielem stanu jest rodzic — koniec przerwy zeruje stan (karta
    // może się przygasić, Z145; pasek znika zamiast wisieć jako „Koniec przerwy").
    onFinished?.();
    void cancelRestEndNotification();
    // Bug 28 (X30): ciepły resume po deadline — sprzątanie bez sygnałów.
    if (Date.now() - deadlineAt > FINISH_SIGNAL_GRACE_MS) return;
    try {
      playTimerSound('finish');
      // MOCNY sygnał, nie lekki impuls: user zgłosił po treningu „cicha wibracja,
      // nic więcej". Telefon leży obok ławki albo w kieszeni.
      void hapticRestEnd();
    } catch (error) {
      reportClientErrorWithCurrentUid({
        code: 'rest-finish-signal-failed',
        phase: 'other',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [done, onFinished, deadlineAt]);

  const handleSkip = () => {
    void cancelRestEndNotification();
    onSkip();
  };

  const label = done ? t('rest.bar.done') : mmss(left);

  // Przyciski korekt w OSOBNYM rzędzie (fullscreen), każdy flex-1 — szerokość
  // tekstu nie ma jak rozwalić układu (zgłoszenie z treningu na iPhone).
  const controls = (
    <div className="mt-2 flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={() => onAdjust(-15)}
        className="flex-1 rounded-lg bg-surface-highest px-2 py-2 text-xs font-bold tabular-nums transition-colors hover:bg-surface-high"
      >
        -15
      </button>
      <button
        type="button"
        onClick={() => onAdjust(15)}
        className="flex-1 rounded-lg bg-surface-highest px-2 py-2 text-xs font-bold tabular-nums transition-colors hover:bg-surface-high"
      >
        +15
      </button>
      <button
        type="button"
        onClick={handleSkip}
        className="flex-1 rounded-lg bg-surface-highest px-2 py-2 text-xs font-bold transition-colors hover:bg-surface-high"
      >
        {t('rest.bar.skip')}
      </button>
    </div>
  );

  return (
    <>
      <div
        // WP-D (X29): na mobile pasek pływa NAD bottom navem (nav widoczny też
        // w sesji): inset-x-3 + pełne zaokrąglenie jak nav, safe-area zbędna
        // (nie dotyka krawędzi). Rezerwę wyznacza zmierzona wysokość paska
        // nawigacji (--mobile-nav-clearance), bo etykiety przy skali 200%
        // przerastają stałą wartość; 6rem zostaje jako fallback. Na md wraca
        // do krawędzi ekranu jak dotąd.
        className="fixed inset-x-3 bottom-[var(--mobile-nav-clearance,calc(6rem+env(safe-area-inset-bottom)))] z-50 rounded-2xl bg-surface-low px-4 pt-3 pb-3 md:inset-x-0 md:bottom-0 md:rounded-b-none md:rounded-t-2xl md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        data-testid="rest-bar"
      >
        <div className="flex items-center gap-3">
          {/* Korpus paska = tap-obszar ustawień timera (wymóg właściciela). */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t('rest.bar.openSettings')}
            data-testid="rest-bar-settings"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {t('rest.bar.title')}
            </span>
            <span className="shrink-0" data-testid="rest-bar-hero">
              <span className={cn('block font-heading text-base font-bold leading-none tabular-nums', done ? 'text-fitness-success' : 'text-primary')}>
                {label}
              </span>
              {/* Runna p.1 (B3): "Następne: X kg × N" — pierwsza nieodhaczona
                  seria robocza ćwiczenia przerwy (liczy WorkoutDay). */}
              {!done && nextSetLabel && (
                <span className="mt-1 block max-w-[140px] truncate text-[11px] leading-none text-muted-foreground">
                  {t('rest.bar.next', { value: nextSetLabel })}
                </span>
              )}
            </span>
            <span className="h-1 min-w-3 flex-1 overflow-hidden rounded-full bg-surface-highest" aria-hidden="true">
              <span
                className={cn('block h-full rounded-full transition-[width] duration-200', done ? 'bg-fitness-success' : 'bg-primary')}
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t('rest.bar.expand')}
            data-testid="rest-bar-expand"
            className="shrink-0 rounded-full bg-surface-highest p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="chip-mono shrink-0 font-bold text-foreground"
          >
            {t('rest.bar.skip')}
          </button>
        </div>
      </div>

      {/* Widok pełnoekranowy — duże odliczanie + korekty -15/+15, gdy telefon leży obok. */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm"
          data-testid="rest-fullscreen"
          data-app-overlay
          data-state="open"
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
