// Przewodnik nowego konta (2026-09-29, przebudowa WP-E X37 FirstWorkoutTour).
// Overlay fixed z przyciemnieniem i wycięciem wokół celu (cztery panele wokół
// prostokąta z getBoundingClientRect, pomiar w pętli rAF), dymek z JEDNYM
// zdaniem, Pomiń zawsze widoczne. Kroki-akcje (tap w cel, realne odhaczenie
// serii) nie mają "Dalej": uczą przez wykonanie (docs/ONBOARDING-RESEARCH-2026-09-29.md).
//
// Kontrakty bezpieczeństwa:
// - Obcy overlay (dialog, arkusz, menu, celebracja) CHOWA przewodnik do czasu
//   zamknięcia; nie zużywa go (X37 kończył tour jako "widziany").
// - Brak celu = nic nie renderujemy (żadnych paneli bez wyjścia); krok czeka.
// - Przewodnik nie blokuje scrolla body (nic do sprzątania przy unmount);
//   portal nie jest Radixem, więc unmount w dowolnym momencie jest bezpieczny.
// z-[70]: nad RestBar (z-50) i BackBar (z-40), pod LivePRCelebration (z-[80])
// i toasterem (z-[100]).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ScrollText, Trophy, User } from 'lucide-react';
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
}

const CUTOUT_PADDING = 6;
const BUBBLE_GAP = 12;
/** Szacunek wysokości dymka: decyduje, czy dymek idzie pod cel, czy nad niego. */
const BUBBLE_ESTIMATE = 170;
/** Opcjonalny cel (pasek przerwy) dostaje tyle klatek na pojawienie się. */
const OPTIONAL_TARGET_FRAMES = 36;

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
  const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? all[0] ?? null;
};

/** Prostokąt celu: unia inputów wewnątrz (krok wpisu) albo sam element. */
const measureTourTarget = (step: AppTourStep): TourRect | null => {
  const el = findTarget(step.target);
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
  /** Ostatni krok zamknięty przyciskiem "Gotowe". */
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
  // Zamknięty przewodnik nic nie renderuje, zanim rodzic go odmontuje
  // (np. start sesji po tapnięciu, który się nie powiódł: zero pułapki).
  const [closed, setClosed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  const bubbleRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const callbacks = useRef({ onStepChange, onAction, onFirstSet, onComplete, onSkip });
  callbacks.current = { onStepChange, onAction, onFirstSet, onComplete, onSkip };

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (step) callbacks.current.onStepChange?.(step.id);
  }, [step]);

  const skip = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosed(true);
    callbacks.current.onSkip();
  }, []);

  const next = useCallback(() => {
    if (closedRef.current) return;
    if (isLast) {
      closedRef.current = true;
      setClosed(true);
      callbacks.current.onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast]);

  const visible = !closed && !paused && (!!rect || centered);
  // Android Back = Pomiń; obcy overlay nie zamyka przewodnika (chowa go pętla rAF).
  useExclusiveOverlay(visible, skip, { announce: false, closeOnOtherOpen: false });

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      setViewportHeight(visualViewport?.height ?? window.innerHeight);
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
  // Działa także, gdy user odhaczy serię już w kroku wpisu (nie czyta, działa).
  const baselineSetsRef = useRef(checkedSets ?? 0);
  const firstSetFiredRef = useRef(false);
  useEffect(() => {
    if (checkedSets === undefined || firstSetFiredRef.current || closedRef.current) return;
    if (checkedSets <= baselineSetsRef.current) return;
    const checkIndex = steps.findIndex((s) => s.action === 'complete-set');
    if (checkIndex < 0 || stepIndex > checkIndex) return;
    firstSetFiredRef.current = true;
    callbacks.current.onFirstSet?.();
    if (checkIndex + 1 >= steps.length) {
      closedRef.current = true;
      setClosed(true);
      callbacks.current.onComplete();
    } else {
      setStepIndex(checkIndex + 1);
    }
  }, [checkedSets, stepIndex, steps]);

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
    setCentered(false);

    const sameRect = (a: TourRect | null, b: TourRect) =>
      !!a && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
      && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

    const tick = () => {
      if (cancelled || closedRef.current) return;
      const foreign = hasForeignOverlay();
      if (foreign !== lastPaused) {
        lastPaused = foreign;
        setPaused(foreign);
      }
      if (!foreign) {
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
      if (step.action !== 'tap') return;
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
  const chunkSteps = step.chunk ? steps.filter((s) => s.chunk === step.chunk) : steps;
  const chunkIndex = chunkSteps.indexOf(step);
  const isCelebration = step.id === 'first-set-done';
  const text = !rect && step.fallbackTextKey ? t(step.fallbackTextKey) : t(step.textKey);

  let cut: TourRect | null = null;
  let bubbleStyle: CSSProperties;
  if (rect) {
    cut = {
      top: Math.max(0, rect.top - CUTOUT_PADDING),
      left: Math.max(0, rect.left - CUTOUT_PADDING),
      width: rect.width + CUTOUT_PADDING * 2,
      height: rect.height + CUTOUT_PADDING * 2,
    };
    const cutBottom = cut.top + cut.height;
    const availableBelow = viewportHeight - cutBottom - BUBBLE_GAP;
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
          bottom: Math.max(BUBBLE_GAP, viewportHeight - cut.top + BUBBLE_GAP),
          maxHeight: `calc(${Math.max(96, availableAbove)}px - max(1rem, env(safe-area-inset-top)))`,
        };
  } else {
    bubbleStyle = {
      top: '50%',
      transform: 'translateY(-50%)',
      maxHeight: 'calc(100% - max(2rem, env(safe-area-inset-top)) - max(2rem, env(safe-area-inset-bottom)))',
    };
  }

  const panel = 'absolute bg-background/75 pointer-events-auto';
  const legend = [
    { icon: Calendar, key: 'tour.app.legendPlan' as const },
    { icon: ScrollText, key: 'tour.app.legendHistory' as const },
    { icon: Trophy, key: 'tour.app.legendProgress' as const },
    { icon: User, key: 'tour.app.legendProfile' as const },
  ];

  // Portal do body: współrzędne z getBoundingClientRect są viewportowe, a
  // fixed wewnątrz drzewa strony dostawał containing block przodka (X37).
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
          {/* Cztery panele przyciemnienia wokół wycięcia: cel zostaje klikalny. */}
          <div className={panel} style={{ top: 0, left: 0, right: 0, height: cut.top }} />
          <div className={panel} style={{ top: cut.top + cut.height, left: 0, right: 0, bottom: 0 }} />
          <div className={panel} style={{ top: cut.top, left: 0, width: cut.left, height: cut.height }} />
          <div className={panel} style={{ top: cut.top, left: cut.left + cut.width, right: 0, height: cut.height }} />
          {step.blockTarget && (
            <div
              data-testid="tour-target-block"
              className="pointer-events-auto absolute"
              style={{ top: cut.top, left: cut.left, width: cut.width, height: cut.height }}
            />
          )}
          <div
            className={cn(
              'pointer-events-none absolute rounded-xl ring-2 ring-primary',
              step.action && !reduceMotion && 'tour-target-pulse',
            )}
            style={{ top: cut.top, left: cut.left, width: cut.width, height: cut.height }}
          />
        </>
      ) : (
        <div className={cn(panel, 'inset-0')} />
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
          'pointer-events-auto absolute left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-surface-container p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] outline-none',
          !reduceMotion && 'animate-in fade-in duration-200',
        )}
        style={bubbleStyle}
      >
        {chunkSteps.length > 1 && chunkIndex >= 0 && (
          <div className="mb-2 flex gap-1" data-testid="tour-progress" aria-hidden>
            {chunkSteps.map((s, i) => (
              <span
                key={s.id}
                className={cn('h-1 flex-1 rounded-full', i <= chunkIndex ? 'bg-primary' : 'bg-primary/20')}
              />
            ))}
          </div>
        )}

        {isCelebration && (
          <div className="mb-2 flex items-center gap-3" data-testid="tour-celebration">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
                !reduceMotion && 'tour-check-pop',
              )}
            >
              <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
            </span>
            {step.titleKey && (
              <p className="font-heading text-lg font-bold leading-tight text-foreground">{t(step.titleKey)}</p>
            )}
          </div>
        )}
        {!isCelebration && step.titleKey && (
          <p className="font-heading text-base font-bold leading-tight text-foreground">{t(step.titleKey)}</p>
        )}

        {step.legend ? (
          <ul className="mt-2 space-y-2" data-testid="tour-legend" aria-label={text}>
            {legend.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-2.5 text-[15px] leading-snug text-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">{t(key)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] font-semibold leading-snug text-foreground">{text}</p>
        )}

        <div
          data-testid="tour-actions"
          className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-x-2 bg-surface-container pt-2"
        >
          <button
            type="button"
            data-testid="tour-skip"
            onClick={skip}
            className="min-h-12 min-w-12 touch-manipulation px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t('tour.first.skip')}
          </button>
          {step.action ? (
            <span className="ml-auto text-right text-xs font-semibold uppercase tracking-[0.08em] text-primary" data-testid="tour-action-hint">
              {step.action === 'complete-set' ? t('tour.app.hintCheck') : t('tour.app.hintTap')}
            </span>
          ) : (
            <Button
              type="button"
              data-testid="tour-next"
              onClick={next}
              className="kinetic-primary-button ml-auto h-auto min-h-12 min-w-12 touch-manipulation whitespace-normal px-5"
            >
              {isLast ? t('tour.first.done') : t('tour.first.next')}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
