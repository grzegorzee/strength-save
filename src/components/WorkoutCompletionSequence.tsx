import { useState, type ReactNode } from 'react';
import { Check, ThumbsDown, ThumbsUp, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { SESSION_RATING_REASONS } from '@/lib/workout-session-rating';
import type { CompletionSummary } from '@/lib/workout-completion-summary';
import type { PRComparison } from '@/lib/pr-utils';
import type { WorkoutSessionRating, WorkoutSessionRatingReason } from '@/types';

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
  celebrationMs?: number;
  children?: ReactNode;
}

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
  celebrationMs = 2200,
  children,
}: WorkoutCompletionSequenceProps) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'celebration' | 'rating' | 'done'>(
    justCompleted ? 'celebration' : 'done',
  );
  const [thanked, setThanked] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<WorkoutSessionRatingReason[]>([]);

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

  const prValue = (pr: PRComparison): string => {
    if (pr.type === 'reps') return t('workout.completion.prReps', { n: pr.newValue });
    if (pr.type === 'duration') return fmtDuration(pr.newValue);
    return fmtWeight(pr.newValue);
  };

  const deltaText = summary.volumeDeltaPct !== null
    ? `${summary.volumeDeltaPct >= 0 ? '+' : ''}${summary.volumeDeltaPct}%`
    : null;

  if (stage === 'celebration') {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm">
        <ConfettiBurst durationMs={celebrationMs} onDone={() => setStage('rating')} />
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
                        ? 'border-fitness-success bg-fitness-success/10 text-fitness-success'
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

  return (
    <>
      {thanked && (
        <p className="text-sm text-muted-foreground">{t('workout.completion.rateThanks')}</p>
      )}
      <Card>
        <CardContent className="py-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-heading text-2xl font-extrabold tabular-nums text-fitness-success">
                {fmtTonnage(summary.volumeKg)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('workout.completion.statTonnage')}</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold tabular-nums">
                {durationSec != null ? fmtDuration(durationSec) : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('workout.statTime')}</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold tabular-nums">{summary.completedSets}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('workout.statSets')}</p>
            </div>
          </div>
          {(summary.planPct !== null || deltaText) && (
            <div className="mt-4 space-y-1 text-center text-sm text-muted-foreground">
              {summary.planPct !== null && summary.plannedSets !== null && (
                <p>
                  {t('workout.completion.planSets', {
                    done: summary.completedSets,
                    planned: summary.plannedSets,
                  })} ({summary.planPct}%)
                </p>
              )}
              {deltaText && <p>{t('workout.completion.volumeVsPrev', { delta: deltaText })}</p>}
            </div>
          )}
        </CardContent>
      </Card>
      {prs.length > 0 && (
        <Card className="border-fitness-success bg-fitness-success/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 font-semibold text-fitness-success">
              <Trophy className="h-5 w-5" />
              {t('workout.completion.prTitle')}
            </div>
            <div className="mt-3 space-y-2">
              {prs.map((pr) => (
                <div
                  key={`${pr.exerciseId}-${pr.type}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate">{pr.exerciseName}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-fitness-success">
                    {prValue(pr)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {children}
    </>
  );
};
