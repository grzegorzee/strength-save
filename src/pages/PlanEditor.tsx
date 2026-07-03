import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlanDaysEditor } from '@/components/PlanDaysEditor';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useCurrentUser } from '@/contexts/UserContext';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import type { TrainingDay } from '@/data/trainingPlan';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { nextExerciseIdForDay, defaultSetsForType } from '@/lib/plan-cycle-utils';
import { RefreshCcw } from 'lucide-react';

const PlanEditor = () => {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const { uid } = useCurrentUser();
  const {
    plan,
    isLoaded,
    isCustom,
    planDurationWeeks,
    savePlan,
    swapExercise,
    updateExerciseSets,
    removeExercise,
    addExercise,
    moveExercise,
    resetToDefault,
  } = useTrainingPlan(uid);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const reportError = (error?: string) => {
    toast({ title: t('planeditor.error'), description: error, variant: 'destructive' });
  };

  // Zmiany struktury dni (add/remove/duplicate/weekday/focus) — ten sam savePlan
  // (transakcja z revision + sync aktywnego cyklu) co dotychczasowe edycje in-place.
  const handleDaysChange = async (nextDays: TrainingDay[]) => {
    const result = await savePlan(nextDays);
    if (!result.success) reportError(result.error);
  };

  const handleAdd = async (dayId: string, ex: LibraryExercise) => {
    const day = plan.find(d => d.id === dayId);
    if (!day) return;

    const result = await addExercise(dayId, {
      id: nextExerciseIdForDay(day),
      name: ex.name,
      sets: defaultSetsForType(ex.type),
      instructions: [],
    });

    if (result.success) {
      toast({ title: t('planeditor.addedTitle'), description: localizeExerciseName(ex.name, lang) });
    } else {
      reportError(result.error);
    }
  };

  const handleSwap = async (dayId: string, exerciseId: string, ex: LibraryExercise) => {
    const result = await swapExercise(dayId, exerciseId, ex.name);
    if (result.success) {
      toast({ title: t('planeditor.swappedTitle'), description: t('planeditor.swappedDesc', { name: ex.name }) });
    } else {
      reportError(result.error);
    }
  };

  const handleRemove = async (dayId: string, exerciseId: string) => {
    const name = plan.find(d => d.id === dayId)?.exercises.find(e => e.id === exerciseId)?.name ?? '';
    const result = await removeExercise(dayId, exerciseId);
    if (result.success) {
      toast({ title: t('planeditor.removedTitle'), description: localizeExerciseName(name, lang) });
    } else {
      reportError(result.error);
    }
  };

  const handleMove = async (dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    await moveExercise(dayId, exerciseId, direction);
  };

  const handleUpdateSets = async (dayId: string, exerciseId: string, sets: string) => {
    const result = await updateExerciseSets(dayId, exerciseId, sets);
    if (!result.success) reportError(result.error);
  };

  const handleDurationChange = async (weeks: number) => {
    const result = await savePlan(plan, { durationWeeks: weeks });
    if (!result.success) reportError(result.error);
  };

  const handleReset = async () => {
    setResetConfirmOpen(false);
    const result = await resetToDefault();
    if (result.success) {
      toast({ title: t('planeditor.resetTitle'), description: t('planeditor.resetDesc') });
    } else {
      reportError(result.error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('planeditor.title')}</h1>
          {isCustom && (
            <p className="text-xs text-muted-foreground">{t('planeditor.modified')}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t('planeditor.reset')}
        </Button>
      </div>

      <PlanDaysEditor
        days={plan}
        onDaysChange={handleDaysChange}
        onAddExercise={handleAdd}
        onSwapExercise={handleSwap}
        onRemoveExercise={handleRemove}
        onMoveExercise={handleMove}
        onUpdateSets={handleUpdateSets}
        durationWeeks={planDurationWeeks}
        onDurationWeeksChange={handleDurationChange}
      />

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planeditor.resetConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('planeditor.resetConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>{t('planeditor.reset')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanEditor;
