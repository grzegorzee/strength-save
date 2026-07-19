import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target } from 'lucide-react';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import {
  computeWeeklyTargets,
  computeWeekReport,
  type ProgressionConfig,
} from '@/lib/progression-engine';
import { getTrackingType, formatDurationSec, type TrackingType } from '@/lib/set-tracking';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { localizeExerciseName } from '@/data/exercise-i18n';

// Z121: raport target vs actual za OSTATNI ZAKOŃCZONY tydzień planu.
// Cele liczone z historii sprzed tamtego tygodnia (bez zaglądania w przyszłość),
// realizacja z treningów w jego zakresie dat.
interface WeekReportCardProps {
  planDays: TrainingDay[];
  workouts: WorkoutSession[];
  currentWeek: number;
  planStartDate: string | null;
  progression: ProgressionConfig | null;
}

export const WeekReportCard = ({ planDays, workouts, currentWeek, planStartDate, progression }: WeekReportCardProps) => {
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();

  const report = useMemo(() => {
    const reportWeek = currentWeek - 1;
    if (!progression?.enabled || !planStartDate || reportWeek < 1) return null;

    const planStart = getStartOfPlanWeek(parseLocalDate(planStartDate));
    const weekStartDate = new Date(planStart);
    weekStartDate.setDate(weekStartDate.getDate() + (reportWeek - 1) * 7);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekStart = formatLocalDate(weekStartDate);
    const weekEnd = formatLocalDate(weekEndDate);

    const hasWorkoutsInWeek = workouts.some((w) => w.completed && w.date >= weekStart && w.date <= weekEnd);
    if (!hasWorkoutsInWeek) return null;

    // Typ śledzenia z biblioteki (custom ćwiczenia trafiają w heurystykę bodyweight —
    // świadome uproszczenie: Dashboard nie ciągnie custom_exercises).
    const trackingByName: Record<string, TrackingType> = {};
    planDays.forEach((d) => d.exercises.forEach((e) => {
      const lib = exerciseLibrary.find((x) => x.name === e.name);
      trackingByName[e.name] = lib
        ? getTrackingType(lib)
        : getTrackingType({ isBodyweight: isBodyweightExercise(e.name) });
    }));

    const historyBefore = workouts.filter((w) => w.date < weekStart);
    const targets = computeWeeklyTargets(planDays, historyBefore, reportWeek, progression, {
      deloadApplied: progression.deloadDecisions?.[String(reportWeek)] === 'applied',
      trackingByName,
    });
    const result = computeWeekReport(targets, workouts, weekStart, weekEnd);
    if (result.total === 0) return null;
    return { ...result, reportWeek };
  }, [progression, planStartDate, currentWeek, planDays, workouts]);

  if (!report) return null;

  const disp = (kg: number) => `${Math.round(toDisplay(kg) * 10) / 10} ${unit}`;
  const targetLabel = (m: (typeof report.misses)[number]) => {
    if (m.targetDurationSec != null) return formatDurationSec(m.targetDurationSec);
    const parts = [m.targetWeight != null && m.targetWeight > 0 ? disp(m.targetWeight) : null, m.targetReps != null ? `×${m.targetReps}` : null];
    return parts.filter(Boolean).join(' ');
  };
  const actualLabel = (m: (typeof report.misses)[number]) => {
    if (m.actualWeight == null && m.actualReps == null && m.actualDurationSec == null) {
      return t('progression.report.missSkipped');
    }
    if (m.targetDurationSec != null) return formatDurationSec(m.actualDurationSec ?? 0);
    const parts = [m.actualWeight != null && m.actualWeight > 0 ? disp(m.actualWeight) : null, m.actualReps != null ? `×${m.actualReps}` : null];
    return parts.filter(Boolean).join(' ') || t('progression.report.missSkipped');
  };

  return (
    <Card data-testid="week-report-card">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-fitness-cyan" />
          <p className="font-semibold text-sm">{t('progression.report.title', { n: report.reportWeek })}</p>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="week-report-summary">
          {t('progression.report.summary', { percent: report.percent, achieved: report.achieved, total: report.total })}
        </p>
        {report.misses.slice(0, 3).map((m) => (
          <p key={`${m.dayId}-${m.exerciseId}`} className="text-xs text-muted-foreground/80">
            {localizeExerciseName(m.exerciseName, lang)}: {t('progression.report.missLine', { target: targetLabel(m), actual: actualLabel(m) })}
          </p>
        ))}
      </CardContent>
    </Card>
  );
};
