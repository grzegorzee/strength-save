import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { markPostPlanGuideSeen } from '@/lib/post-plan-guide';
import { cn } from '@/lib/utils';
import { trackTelemetryEvent } from '@/lib/app-telemetry';

type GuideMode = 'welcome' | 'replay';

interface PostPlanGuideProps {
  userId: string;
  mode: GuideMode;
  planName?: string | null;
  nextWorkoutName?: string | null;
  firstWorkoutPath?: string | null;
  onDismiss: (reason: 'skipped') => void;
  onNavigate: (path: string) => void;
}

export const PostPlanGuide = ({
  userId,
  mode,
  planName,
  nextWorkoutName,
  firstWorkoutPath,
  onDismiss,
  onNavigate,
}: PostPlanGuideProps) => {
  const { t } = useTranslation();
  const reduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    trackTelemetryEvent(userId, 'post_plan_guide_started');
  }, [userId]);

  const dismiss = () => {
    markPostPlanGuideSeen(userId);
    trackTelemetryEvent(userId, 'post_plan_guide_skipped');
    onDismiss('skipped');
  };
  const navigateTo = (path: string) => {
    markPostPlanGuideSeen(userId);
    trackTelemetryEvent(userId, 'post_plan_guide_completed');
    onNavigate(path);
  };

  const primaryPath = firstWorkoutPath || '/plan';

  return (
    <section
      data-testid="post-plan-guide"
      data-mode={mode}
      data-motion={reduceMotion ? 'reduced' : 'full'}
      aria-labelledby="post-plan-guide-title"
      className={cn(
        'overflow-hidden rounded-2xl border border-primary/20 bg-surface-container p-5',
        !reduceMotion && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="eyebrow-mono text-primary">{t('postPlanGuide.ready.kicker')}</p>
          <h2 id="post-plan-guide-title" className="font-heading text-2xl font-bold tracking-tight">
            {t('postPlanGuide.ready.title')}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {planName || t('postPlanGuide.ready.defaultPlan')}
          </p>
        </div>
      </div>

      {nextWorkoutName && (
        <div className="mt-5 border-l-2 border-primary/40 pl-3">
          <p className="text-xs text-muted-foreground">{t('postPlanGuide.nextWorkout')}</p>
          <p className="mt-0.5 font-heading font-bold">{nextWorkoutName}</p>
        </div>
      )}

      <Button
        data-testid="post-plan-primary-action"
        className="mt-5 min-h-12 w-full"
        onClick={() => navigateTo(primaryPath)}
      >
        {firstWorkoutPath
          ? t('postPlanGuide.startFirstWorkout')
          : t('postPlanGuide.ready.openPlan')}
      </Button>

      <button
        type="button"
        className="mx-auto mt-1 flex min-h-12 items-center rounded-lg px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={dismiss}
      >
        {t('postPlanGuide.skip')}
      </button>
    </section>
  );
};
