import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BatteryLow, Check, X } from 'lucide-react';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import {
  isDeloadWeek,
  suggestEarlyDeload,
  type DeloadDecision,
  type ProgressionConfig,
} from '@/lib/progression-engine';
import { useTranslation } from '@/contexts/LanguageContext';

// Z121: banner decyzji deload na Dashboardzie. Pokazuje się w programowanym tygodniu
// deload (co N tygodni) albo przy propozycji wcześniejszego (plateau / powtarzalny ból).
// Decyzja usera ląduje w progression.deloadDecisions — silnik NIGDY nie decyduje sam.
interface DeloadBannerProps {
  planDays: TrainingDay[];
  workouts: WorkoutSession[];
  currentWeek: number;
  progression: ProgressionConfig | null;
  onDecision: (weekIndex: number, decision: DeloadDecision) => Promise<{ success: boolean }>;
}

export const DeloadBanner = ({ planDays, workouts, currentWeek, progression, onDecision }: DeloadBannerProps) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  if (!progression?.enabled || currentWeek < 1) return null;

  const decision = progression.deloadDecisions?.[String(currentWeek)];
  if (decision === 'skipped') return null;

  if (decision === 'applied') {
    return (
      <div
        data-testid="deload-active-badge"
        className="flex items-center gap-2 rounded-lg border border-fitness-cyan/30 bg-fitness-cyan/10 px-3 py-2 text-sm text-fitness-cyan"
      >
        <BatteryLow className="h-4 w-4 shrink-0" />
        {t('progression.deload.activeBadge')}
      </div>
    );
  }

  const scheduled = isDeloadWeek(currentWeek, progression);
  const early = scheduled
    ? { suggest: false, reason: null, exercises: [] }
    : suggestEarlyDeload(planDays, workouts, currentWeek, progression);
  if (!scheduled && !early.suggest) return null;

  const description = scheduled
    ? t('progression.deload.scheduledDesc', { n: progression.deloadEveryWeeks })
    : early.reason === 'pain'
      ? t('progression.deload.earlyPain', { list: early.exercises.slice(0, 3).join(', ') })
      : t('progression.deload.earlyPlateau', { list: early.exercises.slice(0, 3).join(', ') });

  const decide = async (value: DeloadDecision) => {
    setSaving(true);
    await onDecision(currentWeek, value);
    setSaving(false);
  };

  return (
    <Card data-testid="deload-banner" className="border-fitness-cyan/30 bg-fitness-cyan/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <BatteryLow className="h-5 w-5 shrink-0 text-fitness-cyan mt-0.5" />
          <div>
            <p className="font-semibold text-sm">
              {scheduled ? t('progression.deload.title') : t('progression.deload.earlyTitle')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            data-testid="deload-apply"
            disabled={saving}
            onClick={() => decide('applied')}
            className="bg-fitness-cyan/90 hover:bg-fitness-cyan text-background"
          >
            <Check className="h-4 w-4 mr-1" />
            {t('progression.deload.apply')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            data-testid="deload-skip"
            disabled={saving}
            onClick={() => decide('skipped')}
          >
            <X className="h-4 w-4 mr-1" />
            {t('progression.deload.skip')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
