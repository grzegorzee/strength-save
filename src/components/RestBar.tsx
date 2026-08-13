import { useEffect, useRef, useState } from 'react';
import { X, Timer, Settings } from 'lucide-react';
import { WorkoutSettingsSheet } from '@/components/WorkoutSettingsSheet';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  remainingSeconds,
  isFinished,
  restProgress,
  type RestTimerState,
} from '@/lib/rest-timer';
import { scheduleRestEndNotification, cancelRestEndNotification } from '@/lib/rest-notification';
import { playTimerSound, unlockTimerSound } from '@/lib/timer-sound';
import { hapticRestEnd } from '@/lib/haptics';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';

interface RestBarProps {
  /** Z188: deadline przychodzi z kontrolera (WorkoutDay) — RestBar nic nie liczy sam. */
  deadlineAt: number;
  /** Pełna długość przerwy w sekundach — do paska postępu. */
  totalSeconds: number;
  /** Zmiana wartości = START NOWEJ przerwy (wzorzec runId z IntervalTimer). */
  runId: number;
  exerciseLabel: string;
  /** Runna p.1 (spec B3): "Następne: 80 kg × 8" w stanie hero aktywnej przerwy. */
  nextSetLabel?: string;
  onSkip: () => void;
  /** Z188: korekta ±15 s idzie do właściciela stanu (kontroler persystuje deadline). */
  onAdjust: (deltaSeconds: number) => void;
  /** Z143: koniec przerwy w foregroundzie — rodzic (właściciel stanu) zeruje przerwę. */
  onFinished?: () => void;
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
 * Źródłem prawdy jest DEADLINE z kontrolera (Z188), nie odliczane ticki: po powrocie
 * z tła (iOS wstrzymuje JS w WKWebView) pasek natychmiast pokazuje realny stan.
 * `setInterval` służy WYŁĄCZNIE do odświeżania widoku, gdy apka jest na wierzchu.
 * Sygnał końca przy zgaszonym ekranie dostarcza system (local notification).
 */
export const RestBar = ({ deadlineAt, totalSeconds, runId, exerciseLabel, nextSetLabel, onSkip, onAdjust, onFinished }: RestBarProps) => {
  const { t } = useTranslation();
  const [, forceTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  // Krok 6 (spec 2026-08-11): skrót do ustawień treningowych przy pasku przerwy.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const finishedRef = useRef(false);

  // Z188: t i exerciseLabel czytane z refów — ich zmiana (język, nazwa ćwiczenia)
  // nie może restartować przerwy ani przeplanowywać notyfikacji (dzisiejszy dep na
  // identity scheduleFor robił dokładnie to).
  const tRef = useRef(t);
  const exerciseLabelRef = useRef(exerciseLabel);
  useEffect(() => { tRef.current = t; }, [t]);
  useEffect(() => { exerciseLabelRef.current = exerciseLabel; }, [exerciseLabel]);

  // Notyfikacja systemowa na deadline: przy starcie (nowy runId) i przy każdej
  // KOREKCIE deadline (±15 z kontrolera). deadlineAt zmienia się wyłącznie w tych
  // dwóch momentach — nigdy od tykania.
  useEffect(() => {
    finishedRef.current = false;
    unlockTimerSound();
    const left = Math.max(1, Math.round((deadlineAt - Date.now()) / 1000) + 1);
    void scheduleRestEndNotification(left, tRef.current('rest.bar.done'), exerciseLabelRef.current);
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
    try {
      void cancelRestEndNotification();
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
  }, [done, onFinished]);

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
        onClick={() => onAdjust(-15)}
        className="flex-1 rounded-lg bg-background/60 px-2 py-2 text-xs font-bold tabular-nums transition-colors hover:bg-background"
      >
        -15
      </button>
      <button
        type="button"
        onClick={() => onAdjust(15)}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t('rest.bar.expand')}
              data-testid="rest-bar-expand"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Timer className={cn('h-4 w-4 shrink-0', done ? 'text-fitness-success' : 'text-primary')} />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t('rest.bar.title')}
              </span>
              {/* Runna p.1 (B3): countdown w kompaktowym wierszu tylko po końcu —
                  aktywna przerwa pokazuje go w bloku hero niżej. */}
              {done && <span className="truncate text-xl font-bold tabular-nums text-fitness-success">{label}</span>}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t('workout.settingsSheet.title')}
              data-testid="rest-bar-settings"
              className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background/60"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          {/* Runna p.1 (spec B3): aktywna przerwa rośnie do hero — wielki
              countdown + jedna linia "Następne". Czysto prezentacyjne:
              deadline/notyfikacje/tick nietknięte; po końcu pasek wraca
              do zwykłego rozmiaru. */}
          {!done && (
            <div className="py-0.5 text-center" data-testid="rest-bar-hero">
              {/* 2026-08-13: text-5xl zabierał pół ekranu nad kartą — zostaje duże,
                  ale zwarte odliczanie + "Następne" w jednej, mniejszej linii. */}
              <span className="block text-3xl font-bold tabular-nums leading-none">{label}</span>
              {nextSetLabel && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t('rest.bar.next', { value: nextSetLabel })}
                </span>
              )}
            </div>
          )}
          {controls}
        </div>
      </div>

      <WorkoutSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

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
