import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExercisePicker } from '@/components/ExercisePicker';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { nextExerciseIdForDay, defaultSetsForType } from '@/lib/plan-cycle-utils';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCcw,
  Replace,
  Plus,
  Pencil,
  Check,
  X,
} from 'lucide-react';

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
    swapExercise,
    updateExerciseSets,
    removeExercise,
    addExercise,
    moveExercise,
    resetToDefault,
  } = useTrainingPlan(userId || '');

  const [swapDialog, setSwapDialog] = useState<{
    dayId: string;
    exerciseId: string;
    exerciseName: string;
  } | null>(null);

  const [addDialog, setAddDialog] = useState<string | null>(null);

  const [editingSets, setEditingSets] = useState<{
    dayId: string;
    exerciseId: string;
    value: string;
  } | null>(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSwap = async (newName: string) => {
    if (!swapDialog) return;
    const result = await swapExercise(swapDialog.dayId, swapDialog.exerciseId, newName);
    if (result.success) {
      toast({ title: t('admin.swapped'), description: t('admin.newExercise', { name: localizeExerciseName(newName, lang) }) });
      setSwapDialog(null);
    } else {
      toast({ title: t('admin.error'), description: result.error, variant: 'destructive' });
    }
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
      setAddDialog(null);
    } else {
      toast({ title: t('admin.error'), description: result.error, variant: 'destructive' });
    }
  };

  const handleRemove = async (dayId: string, exerciseId: string, name: string) => {
    const result = await removeExercise(dayId, exerciseId);
    if (result.success) {
      toast({ title: t('admin.removed'), description: localizeExerciseName(name, lang) });
    } else {
      toast({ title: t('admin.error'), description: result.error, variant: 'destructive' });
    }
  };

  const handleMove = async (dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    await moveExercise(dayId, exerciseId, direction);
  };

  const handleSaveSets = async () => {
    if (!editingSets) return;
    const result = await updateExerciseSets(editingSets.dayId, editingSets.exerciseId, editingSets.value);
    if (result.success) {
      setEditingSets(null);
    } else {
      toast({ title: t('admin.error'), description: result.error, variant: 'destructive' });
    }
  };

  const handleReset = async () => {
    const result = await resetToDefault();
    if (result.success) {
      toast({ title: t('admin.resetDone'), description: t('admin.resetDoneDesc') });
    } else {
      toast({ title: t('admin.error'), description: result.error, variant: 'destructive' });
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

      {plan.map(day => (
        <Card key={day.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{localizeDayName(day.dayName, lang)} - {localizeFocus(day.focus, lang)}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialog(day.id)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('admin.add')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {day.exercises.map((exercise, idx) => (
              <div
                key={exercise.id}
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/30"
              >
                <Badge variant="secondary" className="h-7 w-7 rounded flex items-center justify-center text-xs shrink-0">
                  {idx + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{localizeExerciseName(exercise.name, lang)}</p>
                  {editingSets?.dayId === day.id && editingSets?.exerciseId === exercise.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        value={editingSets.value}
                        onChange={e => setEditingSets({ ...editingSets, value: e.target.value })}
                        className="h-7 text-xs w-24"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveSets}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSets(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                      onClick={() => setEditingSets({ dayId: day.id, exerciseId: exercise.id, value: exercise.sets })}
                    >
                      {exercise.sets}
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => handleMove(day.id, exercise.id, 'up')}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === day.exercises.length - 1} onClick={() => handleMove(day.id, exercise.id, 'down')}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSwapDialog({ dayId: day.id, exerciseId: exercise.id, exerciseName: exercise.name })}>
                    <Replace className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemove(day.id, exercise.id, exercise.name)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Swap/Add Dialog */}
      <ExercisePicker
        open={!!swapDialog || !!addDialog}
        onOpenChange={(open) => { if (!open) { setSwapDialog(null); setAddDialog(null); } }}
        onPick={(ex: LibraryExercise) => {
          if (swapDialog) handleSwap(ex.name);
          else if (addDialog) handleAdd(addDialog, ex);
        }}
        title={swapDialog ? t('admin.swapExercise') : t('admin.addExercise')}
        description={swapDialog
          ? t('admin.swapping', { name: localizeExerciseName(swapDialog.exerciseName, lang) })
          : t('admin.pickFromLibrary')}
      />
    </div>
  );
};

export default UserPlanEditor;
