// Przewodnik nowego konta: spotlight (v2, 2026-09-30, po zrzutach z iOS 152).
//
// Wygląd (poprawki właściciela): wycięcie DOKŁADNIE w kształcie celu (promień
// z getComputedStyle celu + stały odstęp), przyciemnienie jednym cieniem
// (czarny, bez szarego nalotu), zamiast grubej obwódki delikatny pierścień
// akcentu z niską opacity (puls wyłączony przy reduced motion). Dymek na
// surface-highest ze strzałką do celu, auto góra/dół, safe-area, klawiatura
// (visualViewport). Licznik „2 z 4” zamiast gołych pasków. Jeden główny
// przycisk; krok czekający na akcję ma nieklikalną podpowiedź z ikoną dłoni.
// „Pomiń przewodnik” jako dyskretny link.
//
// Kontrakty bezpieczeństwa:
// - Obcy overlay (dialog, arkusz, menu, celebracja) CHOWA przewodnik do czasu
//   zamknięcia; nie zużywa go.
// - Brak celu = nic nie renderujemy (żadnych paneli bez wyjścia); krok czeka.
// - Zamknięty przewodnik renderuje null od razu.
// - Nie blokuje scrolla body (nic do sprzątania przy unmount); portal nie jest
//   Radixem, więc unmount w dowolnym momencie jest bezpieczny.
// z-[70]: nad RestBar (z-50) i BackBar (z-40), pod LivePRCelebration (z-[80])
// i toasterem (z-[100]).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, Dumbbell, Pointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useExclusiveOverlay } from '@/hooks/useExclusiveOverlay';
import { cn } from '@/lib/utils';
import type { AppTourStep, AppTourStepId } from '@/lib/first-workout-tour';

interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

/** Stały odstęp wycięcia od krawędzi celu. */
const CUTOUT_GAP = 6;
/** Odstęp dymka od wycięcia (mieści strzałkę). */
const BUBBLE_GAP = 14;
const ARROW = 10;
/** Szacunek wysokości dymka: decyduje, czy dymek idzie pod cel, czy nad niego. */
const BUBBLE_ESTIMATE = 180;
/** Opcjonalny cel (pasek przerwy) dostaje tyle klatek na pojawienie się. */
const OPTIONAL_TARGET_FRAMES = 36;
const SIDE_MARGIN = 16;

/** Warstwy, przy których przewodnik się chowa (poza nim samym). */
const FOREIGN_OVERLAY_SELECTOR = [
  '[data-app-overlay][data-state="open"]',
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
].join(', ');

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hasForeignOverlay = (): boolean =>
  Array.from(document.querySelectorAll(FOREIGN_OVERLAY_SELECTOR))
    .some((el) => !el.closest('[data-app-tour]'));

/** Pierwszy WIDOCZNY element celu; bez layoutu (jsdom) pierwszy w DOM. */
const findTarget = (selector: string): HTMLElement | null => {
  if (!selector) return null;
  const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? all[0] ?? null;
};

const radiusOf = (el: HTMLElement): number => {
  const value = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius);
  return Number.isFinite(value) ? value : 12;
};

/** Prostokąt i promień celu: unia elementów wewnątrz (inputy serii) albo sam cel. */
const measureTourTarget = (step: AppTourStep): TourRect | null => {
  const el = findTarget(step.target);
  if (!el) return null;
  const parts = step.highlightInner
    ? Array.from(el.querySelectorAll<HTMLElement>(step.highlightInner))
    : [];
  const shapes = parts.length > 0 ? parts : [el];
  const rects = shapes.map((p) => p.getBoundingClientRect());
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { top, left, width: right - left, height: bottom - top, radius: radiusOf(shapes[0]) };
};

const sameRect = (a: TourRect | null, b: TourRect) =>
  !!a && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
  && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
  && Math.abs(a.radius - b.radius) < 0.5;

export interface AppTourProps {
  steps: readonly AppTourStep[];
  initialStepId?: AppTourStepId;
  /** Liczba odhaczonych serii (krok "complete-set" czeka na jej WZROST). */
  checkedSets?: number;
  onStepChange?: (id: AppTourStepId) => void;
  /** Krok-akcja "tap": user tapnął cel (przycisk wykonuje własną akcję). */
  onAction?: (id: AppTourStepId) => void;
  /** Realne odhaczenie pierwszej serii (moment wow: haptyka po stronie rodzica). */
  onFirstSet?: () => void;
  /** Ostatni krok zamknięty głównym przyciskiem albo akcją. */
  onComplete: () => void;
  /** Pomiń / Escape / Android Back. */
  onSkip: () => void;
}

export const AppTour = ({
  steps,
  initialStepId,
  checkedSets,
  onStepChange,
  onAction,
  onFirstSet,
  onComplete,
  onSkip,
}: AppTourProps) => {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(() => {
    const idx = initialStepId ? steps.findIndex((s) => s.id === initialStepId) : -1;
    return idx >= 0 ? idx : 0;
  });
  const [rect, setRect] = useState<TourRect | null>(null);
  const [centered, setCentered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [closed, setClosed] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }));
  const bubbleRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const callbacks = useRef({ onStepChange, onAction, onFirstSet, onComplete, onSkip });
  callbacks.current = { onStepChange, onAction, onFirstSet, onComplete, onSkip };

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (step) callbacks.current.onStepChange?.(step.id);
  }, [step]);

  const close = useCallback((kind: 'skip' | 'complete') => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosed(true);
    if (kind === 'skip') callbacks.current.onSkip();
    else callbacks.current.onComplete();
  }, []);

  const skip = useCallback(() => close('skip'), [close]);

  const next = useCallback(() => {
    if (closedRef.current) return;
    if (isLast) close('complete');
    else setStepIndex((i) => i + 1);
  }, [isLast, close]);

  const visible = !closed && !paused && (!!rect || centered);
  // Android Back = Pomiń; obcy overlay nie zamyka przewodnika (chowa go pętla rAF).
  useExclusiveOverlay(visible, skip, { announce: false, closeOnOtherOpen: false });

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      setViewport({
        width: visualViewport?.width ?? window.innerWidth,
        height: visualViewport?.height ?? window.innerHeight,
      });
    };
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  // Realne odhaczenie serii: wzrost licznika względem wartości z montażu.
  // Działa także, gdy user odhaczy serię już w kroku wpisu (działa, nie czyta).
  const baselineSetsRef = useRef(checkedSets ?? 0);
  const firstSetFiredRef = useRef(false);
  useEffect(() => {
    if (checkedSets === undefined || firstSetFiredRef.current || closedRef.current) return;
    if (checkedSets <= baselineSetsRef.current) return;
    const checkIndex = steps.findIndex((s) => s.action === 'complete-set');
    if (checkIndex < 0 || stepIndex > checkIndex) return;
    firstSetFiredRef.current = true;
    callbacks.current.onFirstSet?.();
    if (checkIndex + 1 >= steps.length) close('complete');
    else setStepIndex(checkIndex + 1);
  }, [checkedSets, stepIndex, steps, close]);

  // Pomiar celu w pętli rAF przez cały krok (scroll, klawiatura, przesunięcia
  // layoutu bez zdarzenia). setState tylko przy zmianie. Obcy overlay = pauza.
  useLayoutEffect(() => {
    if (!step) return undefined;
    let raf = 0;
    let missing = 0;
    let cancelled = false;
    let scrolled = false;
    let last: TourRect | null = null;
    let lastPaused: boolean | null = null;
    setRect(null);
    setCentered(!step.target);

    const tick = () => {
      if (cancelled || closedRef.current) return;
      const foreign = hasForeignOverlay();
      if (foreign !== lastPaused) {
        lastPaused = foreign;
        setPaused(foreign);
      }
      if (!foreign && step.target) {
        if (step.scrollIntoView && !scrolled) {
          const el = findTarget(step.target);
          if (el) {
            scrolled = true;
            el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
          }
        }
        const measured = measureTourTarget(step);
        if (measured) {
          missing = 0;
          if (!sameRect(last, measured)) {
            last = measured;
            setRect(measured);
            setCentered(false);
          }
        } else {
          if (last) {
            last = null;
            setRect(null);
          }
          missing += 1;
          if (step.optionalTarget && missing === OPTIONAL_TARGET_FRAMES) setCentered(true);
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [step]);

  // Krok "tap": klik w cel = akcja usera (przycisk robi swoje, np. nawigację).
  // Escape = Pomiń. Zdarzenia z dispatchu, w którym przewodnik się zamontował,
  // są ignorowane (X37 QA: Escape zamykające dialog rozgrzewki nie może spalić
  // przewodnika). Uzbrojenie klatkę po montażu zamiast porównania timeStamp:
  // zegar zdarzeń i performance.now() bywają rozjechane (fałszywy zegar e2e).
  const armedRef = useRef(false);
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => { armedRef.current = true; });
    return () => window.cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!step) return undefined;
    const onClick = (event: MouseEvent) => {
      if (!armedRef.current || closedRef.current) return;
      if (step.action !== 'tap' || !step.target) return;
      const target = event.target as Element | null;
      if (!target?.closest(step.target)) return;
      callbacks.current.onAction?.(step.id);
      next();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!armedRef.current) return;
      if (event.key === 'Escape' && !hasForeignOverlay()) skip();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [step, next, skip]);

  // Fokus na dymku raz per krok (czytniki ekranu), bez przewijania strony.
  const focusedStepRef = useRef(-1);
  useEffect(() => {
    if (!visible || focusedStepRef.current === stepIndex) return;
    focusedStepRef.current = stepIndex;
    bubbleRef.current?.focus({ preventScroll: true });
  }, [visible, stepIndex]);

  if (!step || !visible) return null;

  const reduceMotion = prefersReducedMotion();
  const chunkSteps = step.chunk ? steps.filter((s) => s.chunk === step.chunk) : [];
  const chunkIndex = chunkSteps.indexOf(step);
  const isCelebration = step.id === 'first-set-done';
  const text = !rect && step.fallbackTextKey ? t(step.fallbackTextKey) : t(step.textKey);
  const primaryLabel = step.nextLabelKey ? t(step.nextLabelKey) : isLast ? t('tour.first.done') : t('tour.first.next');

  let cut: TourRect | null = null;
  let bubbleStyle: CSSProperties;
  let arrowStyle: CSSProperties | null = null;
  let arrowSide: 'top' | 'bottom' = 'top';
  if (rect) {
    cut = {
      top: rect.top - CUTOUT_GAP,
      left: rect.left - CUTOUT_GAP,
      width: rect.width + CUTOUT_GAP * 2,
      height: rect.height + CUTOUT_GAP * 2,
      radius: rect.radius + CUTOUT_GAP,
    };
    const cutBottom = cut.top + cut.height;
    const availableBelow = viewport.height - cutBottom - BUBBLE_GAP;
    const availableAbove = cut.top - BUBBLE_GAP;
    // Pełny dymek nie mieści się po żadnej stronie (landscape / duży tekst):
    // większa przestrzeń + przewijana treść dymka.
    const bubbleBelow = availableBelow >= BUBBLE_ESTIMATE || availableBelow >= availableAbove;
    bubbleStyle = bubbleBelow
      ? {
          top: cutBottom + BUBBLE_GAP,
          maxHeight: `calc(${Math.max(96, availableBelow)}px - max(1rem, env(safe-area-inset-bottom)))`,
        }
      : {
          bottom: Math.max(BUBBLE_GAP, viewport.height - cut.top + BUBBLE_GAP),
          maxHeight: `calc(${Math.max(96, availableAbove)}px - max(1rem, env(safe-area-inset-top)))`,
        };
    arrowSide = bubbleBelow ? 'top' : 'bottom';
    // Strzałka nad środkiem celu, w granicach zaokrąglenia dymka.
    const centerX = rect.left + rect.width / 2 - SIDE_MARGIN;
    const bubbleWidth = viewport.width - SIDE_MARGIN * 2;
    const arrowX = Math.min(Math.max(centerX, 28), bubbleWidth - 28);
    arrowStyle = { left: arrowX - ARROW / 2 - 1 };
  } else {
    bubbleStyle = {
      top: '50%',
      transform: 'translateY(-50%)',
      maxHeight: 'calc(100% - max(2rem, env(safe-area-inset-top)) - max(2rem, env(safe-area-inset-bottom)))',
    };
  }

  // Panele blokujące kliki poza wycięciem (przezroczyste; wygląd daje cień).
  const blocker = 'absolute pointer-events-auto';

  // Portal do body: współrzędne z getBoundingClientRect są viewportowe.
  return createPortal(
    <div
      data-testid="first-workout-tour"
      data-app-tour
      data-app-overlay
      data-state="open"
      data-step={step.id}
      className="pointer-events-none fixed inset-0 z-[70] select-none overflow-hidden"
    >
      {cut ? (
        <>
          <div className={blocker} style={{ top: 0, left: 0, right: 0, height: Math.max(0, cut.top) }} />
          <div className={blocker} style={{ top: cut.top + cut.height, left: 0, right: 0, bottom: 0 }} />
          <div className={blocker} style={{ top: cut.top, left: 0, width: Math.max(0, cut.left), height: cut.height }} />
          <div className={blocker} style={{ top: cut.top, left: cut.left + cut.width, right: 0, height: cut.height }} />
          {/* Wycięcie w kształcie celu: jeden cień robi przyciemnienie całej reszty. */}
          <div
            data-testid="tour-cutout"
            className="pointer-events-none absolute"
            style={{
              top: cut.top,
              left: cut.left,
              width: cut.width,
              height: cut.height,
              borderRadius: cut.radius,
              boxShadow: '0 0 0 200vmax rgba(0, 0, 0, 0.66)',
            }}
          />
          <div
            aria-hidden
            className={cn('pointer-events-none absolute', !reduceMotion && 'tour-ring-pulse')}
            style={{
              top: cut.top,
              left: cut.left,
              width: cut.width,
              height: cut.height,
              borderRadius: cut.radius,
              boxShadow: '0 0 0 1.5px hsl(var(--primary) / 0.55), 0 0 22px 2px hsl(var(--primary) / 0.22)',
            }}
          />
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-black/[0.66]" />
      )}

      <div
        ref={bubbleRef}
        role="dialog"
        // Coachmark celowo zostawia podświetlony cel interaktywny poza dymkiem.
        // aria-modal=true ukrywałoby ten input/przycisk przed VoiceOver.
        aria-modal="false"
        aria-label={t('tour.first.aria')}
        aria-live="polite"
        tabIndex={-1}
        data-testid={`tour-step-${step.id}`}
        className={cn(
          'pointer-events-auto absolute left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] rounded-3xl bg-surface-highest shadow-[0_20px_40px_rgba(0,0,0,0.5)] outline-none',
          !reduceMotion && 'animate-in fade-in duration-200',
        )}
        style={bubbleStyle}
      >
        {arrowStyle && (
          <span
            aria-hidden
            data-testid="tour-arrow"
            data-side={arrowSide}
            className={cn(
              'absolute h-[10px] w-[10px] rotate-45 bg-surface-highest',
              arrowSide === 'top' ? '-top-[5px]' : '-bottom-[5px]',
            )}
            style={arrowStyle}
          />
        )}
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain px-5 pb-4 pt-5" data-testid="tour-scroll">
          {chunkSteps.length > 1 && chunkIndex >= 0 && (
            <p className="mb-1.5 text-xs text-muted-foreground" data-testid="tour-progress">
              {t('tour.app.counter', { n: chunkIndex + 1, total: chunkSteps.length })}
            </p>
          )}

          {isCelebration && (
            <div className="mb-3 flex items-center gap-3" data-testid="tour-celebration">
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  !reduceMotion && 'tour-check-pop',
                )}
              >
                <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
              </span>
              {step.titleKey && (
                <p className="font-heading text-[19px] font-bold leading-tight text-foreground">{t(step.titleKey)}</p>
              )}
            </div>
          )}
          {step.id === 'welcome' && (
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <Dumbbell className="h-5 w-5" />
            </span>
          )}
          {!isCelebration && step.titleKey && (
            <p className="mb-1.5 font-heading text-[19px] font-bold leading-tight text-foreground">{t(step.titleKey)}</p>
          )}

          <p className="text-[15px] leading-snug text-foreground/90">{text}</p>

          {step.action && (
            <p
              className="mt-3 flex items-center gap-2 text-[13px] font-medium text-primary"
              data-testid="tour-action-hint"
            >
              <Pointer className={cn('h-4 w-4 shrink-0', !reduceMotion && 'tour-hint-nudge')} aria-hidden />
              {step.action === 'complete-set' ? t('tour.app.hintCheck') : t('tour.app.hintTap')}
            </p>
          )}

          {/* Hierarchia: jeden główny przycisk na całą szerokość, pod nim
              dyskretny link „Pomiń przewodnik”. Ostatni krok bez linku (Gotowe
              robi to samo). */}
          <div data-testid="tour-actions" className="sticky bottom-0 mt-4 flex flex-col gap-1 bg-surface-highest">
            {!step.action && (
              <Button
                type="button"
                data-testid="tour-next"
                onClick={next}
                className="kinetic-primary-button h-auto min-h-12 w-full touch-manipulation whitespace-normal rounded-2xl px-5"
              >
                {primaryLabel}
              </Button>
            )}
            {step.id !== 'tabs-done' && (
              <button
                type="button"
                data-testid="tour-skip"
                onClick={skip}
                className="min-h-11 self-center touch-manipulation px-3 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t('tour.first.skip')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
