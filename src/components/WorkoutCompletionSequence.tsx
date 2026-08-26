import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Pencil, ThumbsDown, ThumbsUp, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import { SESSION_RATING_REASONS } from '@/lib/workout-session-rating';
import type { CompletionSummary } from '@/lib/workout-completion-summary';
import { formatPRDelta, formatPRValue, type PRComparison } from '@/lib/pr-utils';
import type { WorkoutSessionRating, WorkoutSessionRatingReason } from '@/types';
import { useExclusiveOverlay } from '@/hooks/useExclusiveOverlay';
import { WorkoutMilestoneCelebration } from '@/components/WorkoutMilestoneCelebration';
import type { WorkoutMilestone } from '@/lib/workout-milestones';

// Sekwencja completion (Runna pakiet 1, spec A1): celebracja → ocena 1 tapem
// (pomijalna) → dopiero potem podsumowanie (rating-gate). Wejście w ukończony
// trening z historii (justCompleted=false) pokazuje podsumowanie od razu —
// zero celebracji i oceny (niezmiennik: stara ścieżka nietknięta).
// Children = dotychczasowe bloki widoku completed (nic nie zabieramy).

interface WorkoutCompletionSequenceProps {
  justCompleted: boolean;
  summary: CompletionSummary;
  durationSec: number | null;
  fmtTonnage: (kg: number) => string;
  fmtWeight: (kg: number) => string;
  fmtDuration: (sec: number) => string;
  prs: PRComparison[];
  onRate: (rating: WorkoutSessionRating, reasons: WorkoutSessionRatingReason[]) => void;
  /** Edycja serii z podsumowania (spec A3). Brak = edycja niedostępna (np. final sync pending). */
  onEditSets?: () => void;
  celebrationMs?: number;
  /** Confetti tylko dla rzadkich momentów: PR albo kamień milowy (PRO-C T3). */
  bigMoment?: boolean;
  /** WP-F (X37): kamień milowy tego zakończenia (1, 10, 25...). null = zwykła celebracja. */
  milestone?: WorkoutMilestone | null;
  /** WP-F (X37): numer porządkowy treningu w podsumowaniu ("Trening nr 12"). */
  workoutNumber?: number | null;
  children?: ReactNode;
}

const AutoAdvance = ({ ms, onDone }: { ms: number; onDone: () => void }) => {
  // Bug 31 (X30, wzorzec B-T3): rodzic re-renderuje się w oknie celebracji
  // (onSnapshot po zapisie i acku, autoSaveStatus) z nową tożsamością inline
  // onDone — timeout NIE może startować od nowa. Callback czytany z refa.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return null;
};

const REASON_KEYS = {
  too_heavy: 'workout.completion.reasonTooHeavy',
  too_long: 'workout.completion.reasonTooLong',
  weak_day: 'workout.completion.reasonWeakDay',
} as const;

export const WorkoutCompletionSequence = ({
  justCompleted,
  summary,
  durationSec,
  fmtTonnage,
  fmtWeight,
  fmtDuration,
  prs,
  onRate,
  onEditSets,
  celebrationMs = 2200,
  bigMoment,
  milestone = null,
  workoutNumber = null,
  children,
}: WorkoutCompletionSequenceProps) => {
  const { t, lang } = useTranslation();
  const [stage, setStage] = useState<'celebration' | 'rating' | 'done'>(
    justCompleted ? 'celebration' : 'done',
  );
  const [thanked, setThanked] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<WorkoutSessionRatingReason[]>([]);
  useExclusiveOverlay(stage === 'celebration', () => setStage('rating'));

  const toggleReason = (reason: WorkoutSessionRatingReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  };

  const finishRating = (rating: WorkoutSessionRating, reasons: WorkoutSessionRatingReason[]) => {
    onRate(rating, reasons);
    setThanked(true);
    setStage('done');
  };

  const prValue = (pr: PRComparison): string => formatPRValue(pr, {
    prReps: (n) => t('workout.completion.prReps', { n }),
    weight: fmtWeight,
    duration: fmtDuration,
    // B-T2: PR z Epleya jest podpisany jako estymacja, nie fakt.
    est1RM: (kg) => t('pr.est1rmValue', { value: fmtWeight(kg) }),
  });

  const deltaText = summary.volumeDeltaPct !== null
    ? `${summary.volumeDeltaPct >= 0 ? '+' : ''}${summary.volumeDeltaPct}%`
    : null;

  // PRO-C T3: confetti zarezerwowane dla rzadkich momentów (PR / kamień milowy).
  const showConfetti = bigMoment ?? prs.length > 0;

  if (stage === 'celebration' && milestone) {
    // WP-F (X37): kamień milowy = baner z konfetti zamiast zwykłej celebracji
    // (własny deadline ścienny 2,5 s; X i tap przechodzą do oceny).
    return <WorkoutMilestoneCelebration milestone={milestone} onDone={() => setStage('rating')} />;
  }

  if (stage === 'celebration') {
    return (
      <div
        className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm"
        data-app-overlay
        data-state="open"
      >
        <button
          type="button"
          aria-label={t('a11y.close')}
          onClick={() => setStage('rating')}
          className="absolute right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.5rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        {showConfetti
          ? <ConfettiBurst durationMs={celebrationMs} onDone={() => setStage('rating')} />
          : <AutoAdvance ms={Math.min(celebrationMs, 1200)} onDone={() => setStage('rating')} />}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fitness-success/15">
          <Check className="h-11 w-11 text-fitness-success" />
        </div>
        <p className="font-heading text-3xl font-bold">{t('workout.completedTitle')}</p>
      </div>
    );
  }

  if (stage === 'rating') {
    return (
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold">{t('workout.completion.rateTitle')}</p>
            <button
              type="button"
              aria-label={t('workout.completion.rateSkip')}
              onClick={() => setStage('done')}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!showReasons ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-16 flex-col gap-1 border-fitness-success/50 text-fitness-success hover:bg-fitness-success/10"
                onClick={() => finishRating('up', [])}
              >
                <ThumbsUp className="h-5 w-5" />
                {t('workout.completion.rateUp')}
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1"
                onClick={() => setShowReasons(true)}
              >
                <ThumbsDown className="h-5 w-5" />
                {t('workout.completion.rateDown')}
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {SESSION_RATING_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => toggleReason(reason)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                      selectedReasons.includes(reason)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(REASON_KEYS[reason])}
                  </button>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={() => finishRating('down', selectedReasons)}>
                {t('workout.completion.saveRating')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fala 2 (2026-08-20, plan/summary.md par. 2.2): hero dzieli wynik fmtTonnage
  // po PIERWSZEJ spacji (lbs daje "12.3 k lbs" — split po ostatniej by zawiódł).
  const tonnageText = fmtTonnage(summary.volumeKg);
  const tonnageSpace = tonnageText.indexOf(' ');
  const tonnageValue = tonnageSpace > 0 ? tonnageText.slice(0, tonnageSpace) : tonnageText;
  const tonnageUnit = tonnageSpace > 0 ? tonnageText.slice(tonnageSpace + 1) : '';
  const prevDateLabel = summary.prevDate
    ? formatLocalDateLabel(summary.prevDate, dateLocale(lang), { day: 'numeric', month: 'short' })
    : null;
  const compareMaxKg = summary.prevVolumeKg !== null
    ? Math.max(summary.volumeKg, summary.prevVolumeKg)
    : summary.volumeKg;
  const barPct = (kg: number) => (compareMaxKg > 0 ? (kg / compareMaxKg) * 100 : 0);

  return (
    <>
      {thanked && (
        <p className="text-sm text-muted-foreground">{t('workout.completion.rateThanks')}</p>
      )}
      {/* Hero karta (mockup 1a): OGROMNY tonaż w akcencie + delta vs poprzednia
          sesja tego dnia + paski porównania + rząd statów z pigułką Popraw serie. */}
      <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-5">
        {/* WP-F (X37): numer porządkowy treningu (Hevy pokazuje go w podsumowaniu). */}
        {workoutNumber !== null && workoutNumber > 0 && (
          <span className="eyebrow-mono text-muted-foreground" data-testid="workout-ordinal">
            {t('workout.summary.workoutNumber', { n: workoutNumber })}
          </span>
        )}
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-display-lg font-bold tabular-nums leading-[0.85] text-primary">
              {tonnageValue}
            </span>
            {tonnageUnit && (
              <span className="font-heading text-2xl font-semibold text-primary">{tonnageUnit}</span>
            )}
          </div>
          {deltaText && (
            <div className="flex flex-col items-end gap-1 pb-1 text-right">
              <span className="font-mono text-[15px] font-bold tabular-nums text-foreground/80">
                {deltaText}
              </span>
              {prevDateLabel && (
                <span className="eyebrow-mono text-muted-foreground">
                  {t('workout.summary.vsPrev', { date: prevDateLabel })}
                </span>
              )}
            </div>
          )}
        </div>
        {summary.prevVolumeKg !== null && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="eyebrow-mono w-12 shrink-0 text-foreground/80">
                {t('workout.summary.today')}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-highest">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${barPct(summary.volumeKg)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-foreground/80">
                {tonnageText}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="eyebrow-mono w-12 shrink-0 truncate text-muted-foreground">
                {prevDateLabel ?? ''}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-highest">
                <div
                  className="h-full rounded-full bg-outline-variant"
                  style={{ width: `${barPct(summary.prevVolumeKg)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {fmtTonnage(summary.prevVolumeKg)}
              </span>
            </div>
          </div>
        )}
        {/* flex-wrap: przy ciasnych labelach PL pigułka Popraw serie schodzi do
            nowej linii zamiast wypychać rząd poza kartę (390px). */}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div className="flex flex-col gap-1">
            <span className="font-heading text-[17px] font-bold tabular-nums leading-none">
              {durationSec != null ? fmtDuration(durationSec) : '-'}
            </span>
            <span className="eyebrow-mono whitespace-nowrap text-muted-foreground">{t('workout.statTime')}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-heading text-[17px] font-bold tabular-nums leading-none">
              {summary.plannedSets !== null
                ? `${summary.completedSets}/${summary.plannedSets}`
                : summary.completedSets}
            </span>
            <span className="eyebrow-mono whitespace-nowrap text-muted-foreground">{t('workout.statSets')}</span>
          </div>
          {summary.planPct !== null && (
            <div className="flex flex-col gap-1">
              <span className="font-heading text-[17px] font-bold tabular-nums leading-none">
                {summary.planPct}%
              </span>
              <span className="eyebrow-mono whitespace-nowrap text-muted-foreground">
                {t('workout.summary.statPlanned')}
              </span>
            </div>
          )}
          {onEditSets && (
            <button type="button" className="chip-mono ml-auto shrink-0" onClick={onEditSets}>
              <Pencil className="h-3 w-3" />
              {t('workout.completion.editSets')}
            </button>
          )}
        </div>
      </div>
      {/* Sekcja rekordów: kafle na accent-wash, wartości w akcencie (par. 2.3). */}
      {prs.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="eyebrow-mono text-primary">
              {t('workout.summary.recordsTitle', { n: prs.length })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {prs.map((pr) => {
              const delta = formatPRDelta(pr, fmtWeight);
              return (
                <div
                  key={`${pr.exerciseId}-${pr.type}`}
                  className="accent-wash flex flex-col gap-1.5 rounded-xl p-4"
                >
                  <span className="min-w-0 truncate text-xs text-foreground/80">
                    {pr.exerciseName}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span
                      className={cn(
                        'font-heading font-bold leading-none tabular-nums text-primary',
                        pr.type === '1rm' ? 'text-lg' : 'text-2xl',
                      )}
                    >
                      {prValue(pr)}
                    </span>
                    {delta && (
                      <span className="font-mono text-[11px] font-bold text-primary">{delta}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {children}
    </>
  );
};
