// WP-E (X37): tour pierwszego treningu. Overlay fixed z przyciemnieniem
// i wycięciem wokół celu (cztery panele wokół prostokąta z getBoundingClientRect,
// aktualizacja na scroll/resize/orientationchange), dymek z JEDNYM zdaniem,
// Dalej / Pomiń zawsze widoczne. Cel zostaje interaktywny (krok 1: wpisz,
// krok 2: odhacz), a klik w checkmark sam przechodzi do kroku 3.
// Zamknięcie (Pomiń, Gotowe, Escape, inny pełnoekranowy overlay) zapisuje seen.
// z-[70]: nad RestBar (z-50) i BackBar (z-40), pod LivePRCelebration (z-[80])
// i toasterem (z-[100]).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useExclusiveOverlay } from '@/hooks/useExclusiveOverlay';
import { FIRST_WORKOUT_TOUR_STEPS, markFirstWorkoutTourSeen, type FirstWorkoutTourStep } from '@/lib/first-workout-tour';

interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CUTOUT_PADDING = 6;
const BUBBLE_GAP = 12;
/** Szacunek wysokości dymka: decyduje, czy dymek idzie pod cel, czy nad niego. */
const BUBBLE_ESTIMATE = 170;
/** Cel może pojawić się klatkę po starcie sesji: kilka prób pomiaru, potem krok pomijany. */
const MEASURE_ATTEMPTS = 12;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Prostokąt celu: unia inputów wewnątrz (krok 1) albo sam element. */
const measureTourTarget = (step: FirstWorkoutTourStep): TourRect | null => {
  const el = document.querySelector<HTMLElement>(step.target);
  if (!el) return null;
  const parts = step.highlightInner
    ? Array.from(el.querySelectorAll<HTMLElement>(step.highlightInner))
    : [];
  const rects = (parts.length > 0 ? parts : [el]).map((p) => p.getBoundingClientRect());
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { top, left, width: right - left, height: bottom - top };
};

export const FirstWorkoutTour = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const step = FIRST_WORKOUT_TOUR_STEPS[stepIndex];
  const isLast = stepIndex === FIRST_WORKOUT_TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    markFirstWorkoutTourSeen();
    onCloseRef.current();
  }, []);

  const next = useCallback(() => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  }, [isLast, finish]);

  // Pełnoekranowy overlay (celebracja PR, dialog) prosi o zamknięcie: tour
  // nie ogłasza własnego otwarcia (nie eksmituje niczego), tylko słucha.
  useExclusiveOverlay(true, finish, { announce: false });

  // Pomiar celu w pętli rAF przez cały czas trwania kroku: scroll, resize,
  // orientationchange, klawiatura I przesunięcia layoutu bez zdarzenia (karta
  // sesji dochodzi tuż po starcie, toast, smooth scroll do Zakończ) nie mogą
  // zostawić wycięcia obok celu. setState tylko gdy prostokąt się zmienił.
  useLayoutEffect(() => {
    let raf = 0;
    let missing = 0;
    let cancelled = false;
    let last: TourRect | null = null;
    setRect(null);

    if (step.scrollIntoView) {
      document.querySelector<HTMLElement>(step.target)?.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }

    const sameRect = (a: TourRect | null, b: TourRect) =>
      !!a && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
      && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

    const tick = () => {
      if (cancelled) return;
      const measured = measureTourTarget(step);
      if (measured) {
        missing = 0;
        if (!sameRect(last, measured)) {
          last = measured;
          setRect(measured);
        }
      } else {
        missing += 1;
        if (missing >= MEASURE_ATTEMPTS) {
          // Celu nie ma (np. wszystkie serie odhaczone, potwierdzenie Zakończ):
          // pusty overlay bez wyjścia to pułapka, przeskakujemy dalej albo zamykamy.
          if (stepIndex + 1 >= FIRST_WORKOUT_TOUR_STEPS.length) finish();
          else setStepIndex(stepIndex + 1);
          return;
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [step, stepIndex, finish]);

  // Krok 2: odhaczenie serii (klik w cel) samo prowadzi do kroku 3. Escape zamyka.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (step.id !== 'set-check') return;
      const target = event.target as Element | null;
      if (target?.closest(step.target)) next();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [step, next, finish]);

  // Fokus na dymku raz per krok (czytniki ekranu), bez przewijania strony.
  const focusedStepRef = useRef(-1);
  useEffect(() => {
    if (!rect || focusedStepRef.current === stepIndex) return;
    focusedStepRef.current = stepIndex;
    bubbleRef.current?.focus({ preventScroll: true });
  }, [rect, stepIndex]);

  if (!rect) return null;

  const viewportHeight = window.innerHeight;
  const cut = {
    top: Math.max(0, rect.top - CUTOUT_PADDING),
    left: Math.max(0, rect.left - CUTOUT_PADDING),
    width: rect.width + CUTOUT_PADDING * 2,
    height: rect.height + CUTOUT_PADDING * 2,
  };
  const cutBottom = cut.top + cut.height;
  const bubbleBelow = cutBottom + BUBBLE_GAP + BUBBLE_ESTIMATE <= viewportHeight;
  const bubbleStyle = bubbleBelow
    ? { top: cutBottom + BUBBLE_GAP }
    : { bottom: Math.max(BUBBLE_GAP, viewportHeight - cut.top + BUBBLE_GAP) };

  // Bez przejść CSS na pozycji: podczas smooth scrollu do Zakończ (krok 3)
  // transition opóźniała wycięcie o kilkadziesiąt px względem celu. Pozycja
  // podąża za pętlą rAF 1:1, prefers-reduced-motion spełnione z natury.
  const panel = 'absolute bg-background/75 pointer-events-auto';

  // Portal do body: wewnątrz drzewa WorkoutDay fixed inset-0 dostawał containing
  // block przodka (root overlayu zaczynał się 24 px niżej niż viewport, wycięcie
  // lądowało obok celu). Współrzędne z getBoundingClientRect są viewportowe,
  // więc overlay musi wisieć bezpośrednio pod body (jak portale Radixa).
  return createPortal(
    <div
      data-testid="first-workout-tour"
      data-app-overlay
      data-state="open"
      className="pointer-events-none fixed inset-0 z-[70] select-none overflow-hidden"
    >
      {/* Cztery panele przyciemnienia wokół wycięcia: cel zostaje klikalny. */}
      <div className={panel} style={{ top: 0, left: 0, right: 0, height: cut.top }} />
      <div className={panel} style={{ top: cutBottom, left: 0, right: 0, bottom: 0 }} />
      <div className={panel} style={{ top: cut.top, left: 0, width: cut.left, height: cut.height }} />
      <div className={panel} style={{ top: cut.top, left: cut.left + cut.width, right: 0, height: cut.height }} />
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-primary"
        style={{ top: cut.top, left: cut.left, width: cut.width, height: cut.height }}
      />

      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.first.aria')}
        tabIndex={-1}
        data-testid={`tour-step-${stepIndex + 1}`}
        className="pointer-events-auto absolute left-4 right-4 rounded-2xl bg-surface-container p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] outline-none"
        style={bubbleStyle}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {stepIndex + 1}/{FIRST_WORKOUT_TOUR_STEPS.length}
        </p>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">{t(step.textKey)}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="tour-skip"
            onClick={finish}
            className="h-11 min-w-11 touch-manipulation px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t('tour.first.skip')}
          </button>
          <Button
            type="button"
            data-testid="tour-next"
            onClick={next}
            className="kinetic-primary-button h-11 touch-manipulation px-5"
          >
            {isLast ? t('tour.first.done') : t('tour.first.next')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
