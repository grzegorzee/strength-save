// Live PR (w trakcie serii) to rzadki moment — dostaje pełną celebrację
// (zgłoszenie 2026-08-13: toast był za mały na taki moment). Krótki overlay:
// confetti, wielka liczba, tap lub 2.2 s i wracasz do logowania serii.
import { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { useTranslation } from '@/contexts/LanguageContext';
import { useExclusiveOverlay } from '@/hooks/useExclusiveOverlay';

export interface LivePRCelebrationData {
  name: string;
  value: string;
  delta: string;
}

const AUTO_DISMISS_MS = 2200;

export const LivePRCelebration = ({
  data,
  onDone,
}: {
  data: LivePRCelebrationData | null;
  onDone: () => void;
}) => {
  const { t } = useTranslation();
  useExclusiveOverlay(!!data, onDone);

  useEffect(() => {
    if (!data) return;
    const id = window.setTimeout(onDone, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [data, onDone]);

  if (!data) return null;

  return (
    <div
      data-testid="live-pr-celebration"
      data-app-overlay
      data-state="open"
      onClick={onDone}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm"
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
      <ConfettiBurst durationMs={AUTO_DISMISS_MS} />
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
        <Trophy className="h-10 w-10 text-primary" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {t('workout.livePR.title')}
      </p>
      <p className="px-8 text-center font-heading text-3xl font-bold uppercase tracking-tight">{data.name}</p>
      <p className="font-heading text-5xl font-extrabold tabular-nums text-primary leading-none">
        {data.value}
      </p>
      <p className="text-lg font-semibold tabular-nums text-fitness-success">({data.delta})</p>
    </div>
  );
};
