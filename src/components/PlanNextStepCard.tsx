import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import { emitUserEvent, planEventKey } from '@/lib/user-events';
import type { PlanNextStepAction } from '@/lib/plan-next-step';

// C-T4: JEDNA karta decyzyjna końca planu/cyklu — wspólna dla Dashboardu,
// Planu i Cyklów. Stan liczy buildPlanNextStep (jedno źródło), karta tylko
// renderuje akcje: kontynuuj (primary/secondary path), powtórz (onRepeat),
// przygotuj kolejny (path new-plan). Koniec planu emituje idempotentne
// zdarzenie inboxa (klucz po startDate — dwa urządzenia = jeden wpis).

const TONE_CLASSES: Record<PlanNextStepAction['tone'], string> = {
  primary: 'border-primary/40 bg-primary/5',
  warning: 'border-fitness-warning/40 bg-fitness-warning/5',
  success: 'border-fitness-success/40 bg-fitness-success/5',
  info: 'border-fitness-cyan/40 bg-fitness-cyan/5',
};

interface PlanNextStepCardProps {
  step: PlanNextStepAction;
  uid: string;
  planStartDate: string | null;
  /** Pokazuje przycisk "Powtórz plan" (stan końcowy + jest co powtarzać). */
  canRepeat: boolean;
  isRepeating?: boolean;
  onRepeat?: () => void;
  /** Dashboard: karta znika per plan; Plan/Cykle renderują ją zawsze. */
  onDismiss?: () => void;
  testId?: string;
}

export const PlanNextStepCard = ({
  step, uid, planStartDate, canRepeat, isRepeating = false, onRepeat, onDismiss, testId,
}: PlanNextStepCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const planEnded = step.state === 'closeout' || step.state === 'ended';

  useEffect(() => {
    // B-T6/C-T4: zdarzenie "plan dobiegł końca" — emisja idempotentna
    // (deterministyczny klucz), więc mount na trzech ekranach i na dwóch
    // urządzeniach daje dokładnie jeden wpis inboxa.
    if (planEnded && planStartDate && uid) {
      void emitUserEvent(uid, {
        type: 'plan',
        key: planEventKey('ended', planStartDate),
        payload: { action: 'ended', startDate: planStartDate },
        deepLink: '/plan',
      });
    }
  }, [planEnded, planStartDate, uid]);

  return (
    <Card data-testid={testId ?? 'plan-next-step'} className={TONE_CLASSES[step.tone]}>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t('dash.whatNext')}
            </p>
            <h2 className="font-heading text-lg font-bold uppercase tracking-tight">{step.title}</h2>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap gap-2">
              {step.badges.map((badge) => (
                <Badge key={badge} variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold">
                  {badge}
                </Badge>
              ))}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                aria-label={t('dash.dismissHint')}
                className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => navigate(step.primaryPath)}>
            {step.primaryLabel}
          </Button>
          {step.secondaryPath && step.secondaryLabel ? (
            <Button variant="outline" onClick={() => navigate(step.secondaryPath!)}>
              {step.secondaryLabel}
            </Button>
          ) : null}
          {planEnded && canRepeat && onRepeat ? (
            <Button variant="outline" data-testid="plan-next-repeat" onClick={onRepeat} disabled={isRepeating}>
              {isRepeating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {t('cycles.repeatPlan')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
