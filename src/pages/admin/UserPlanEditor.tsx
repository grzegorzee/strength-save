import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { PlanDaysEditor } from '@/components/PlanDaysEditor';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import type { TrainingDay } from '@/data/trainingPlan';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { nextExerciseIdForDay, defaultSetsForType } from '@/lib/plan-cycle-utils';
import { RefreshCcw } from 'lucide-react';

const UserPlanEditor = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const [userName, setUserName] = useState('');

  // Fetch user name
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        setUserName(snap.data().displayName || snap.data().email || userId);
      }
    });
    return () => unsubscribe();
  }, [userId]);

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
  } = useTrainingPlan(userId || '');

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const reportError = (error?: string) => {
    toast({ title: t('admin.error'), description: error, variant: 'destructive' });
  };

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
      toast({ title: t('admin.added'), description: localizeExerciseName(ex.name, lang) });
    } else {
      reportError(result.error);
    }
  };

  const handleSwap = async (dayId: string, exerciseId: string, ex: LibraryExercise) => {
    const result = await swapExercise(dayId, exerciseId, ex.name);
    if (result.success) {
      toast({ title: t('admin.swapped'), description: t('admin.newExercise', { name: localizeExerciseName(ex.name, lang) }) });
    } else {
      reportError(result.error);
    }
  };

  const handleRemove = async (dayId: string, exerciseId: string) => {
    const name = plan.find(d => d.id === dayId)?.exercises.find(e => e.id === exerciseId)?.name ?? '';
    const result = await removeExercise(dayId, exerciseId);
    if (result.success) {
      toast({ title: t('admin.removed'), description: localizeExerciseName(name, lang) });
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
    const result = await resetToDefault();
    if (result.success) {
      toast({ title: t('admin.resetDone'), description: t('admin.resetDoneDesc') });
    } else {
      reportError(result.error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('admin.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.planEditTitle', { name: userName })}</h1>
          {isCustom && (
            <p className="text-xs text-muted-foreground">{t('admin.planModified')}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t('admin.reset')}
        </Button>
        <ConfirmDialog
          open={resetConfirmOpen}
          onOpenChange={setResetConfirmOpen}
          title={t('admin.resetConfirmTitle')}
          description={t('admin.resetConfirmDesc')}
          confirmLabel={t('admin.reset')}
          destructive
          onConfirm={() => void handleReset()}
        />
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
    </div>
  );
};

export default UserPlanEditor;
