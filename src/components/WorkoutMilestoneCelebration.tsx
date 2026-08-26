// WP-F (X37): celebracja pierwszego treningu i kamieni milowych (1, 10, 25, 50,
// 100...). Wzorzec LivePRCelebration (B-T3): overlay z konfetti, deadline
// ŚCIENNY 2,5 s (JS w tle stoi, zegar płynie), X zamyka, tap zamyka.
// Zwykły trening nie renderuje tego komponentu (świętujemy rzadko).
import { useEffect, useRef } from 'react';
import { Check, Trophy, X } from 'lucide-react';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { useTranslation } from '@/contexts/LanguageContext';
import type { WorkoutMilestone } from '@/lib/workout-milestones';

const AUTO_DISMISS_MS = 2500;
const CONFETTI_MS = 2200;

export const WorkoutMilestoneCelebration = ({
  milestone,
  onDone,
}: {
  milestone: WorkoutMilestone;
  onDone: () => void;
}) => {
  const { t } = useTranslation();
  // Bez useExclusiveOverlay: komponent żyje WEWNĄTRZ etapu celebracji
  // WorkoutCompletionSequence, który już ogłasza wyłączność. Drugie ogłoszenie
  // zamknęłoby rodzica (listener rodzica reaguje na obce id).

  // Rerender rodzica (nowa tożsamość onDone) nie może resetować deadline'u.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const deadline = Date.now() + AUTO_DISMISS_MS;
    let closed = false;
    let id = 0;
    const close = () => {
      if (closed) return;
      closed = true;
      onDoneRef.current();
    };
    const tick = () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        close();
        return;
      }
      id = window.setTimeout(tick, Math.min(left, 1000));
    };
    tick();
    const onVisibility = () => {
      if (Date.now() >= deadline) close();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const bannerText = milestone.kind === 'first'
    ? t('workout.milestone.first')
    : t('workout.milestone.nth', { n: milestone.n });

  return (
    <div
      data-testid="workout-milestone-celebration"
      data-app-overlay
      data-state="open"
      onClick={onDone}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label={t('a11y.close')}
        onClick={(event) => {
          event.stopPropagation();
          onDone();
        }}
        className="absolute right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.5rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="h-5 w-5" />
      </button>
      <ConfettiBurst durationMs={CONFETTI_MS} />
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fitness-success/15">
        <Check className="h-11 w-11 text-fitness-success" />
      </div>
      <p className="font-heading text-3xl font-bold">{t('workout.completedTitle')}</p>
      <div
        data-testid="workout-milestone-banner"
        role="status"
        aria-live="polite"
        className="mx-6 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4"
      >
        <Trophy className="h-6 w-6 shrink-0 text-primary" />
        <p className="font-heading text-xl font-bold text-primary">{bannerText}</p>
      </div>
    </div>
  );
};
