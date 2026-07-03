import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChipButton } from '@/components/ui/chip-button';
import { Input } from '@/components/ui/input';
import { ExercisePicker } from '@/components/ExercisePicker';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeWeekdayShort } from '@/lib/plan-i18n';
import { WEEKDAYS } from '@/lib/plan-cycle-utils';
import { addPlanDay, removePlanDay, duplicatePlanDay, setPlanDayWeekday, setPlanDayFocus, MAX_PLAN_DAYS } from '@/lib/plan-day-edit';
import { ArrowUp, ArrowDown, Copy, Trash2, Replace, Plus, Pencil, Check, X } from 'lucide-react';

export interface PlanDaysEditorProps {
  days: TrainingDay[];
  /** Mutacje struktury dni (add/remove/duplicate/weekday/focus) — host zapisuje jak chce (savePlan / stan lokalny). */
  onDaysChange: (days: TrainingDay[]) => void;
  onAddExercise: (dayId: string, exercise: LibraryExercise) => void;
  onSwapExercise: (dayId: string, exerciseId: string, exercise: LibraryExercise) => void;
  onRemoveExercise: (dayId: string, exerciseId: string) => void;
  onMoveExercise: (dayId: string, exerciseId: string, direction: 'up' | 'down') => void;
  onUpdateSets: (dayId: string, exerciseId: string, sets: string) => void;
  durationWeeks: number;
  onDurationWeeksChange: (weeks: number) => void;
}

const DURATIONS = [8, 10, 12, 16];

// Jeden edytor dni planu dla buildera, edytora planu i admina (Z70):
// zarządzanie dniami (add/remove/duplicate/weekday/focus) + ćwiczeniami (add/swap/remove/reorder/serie).
export const PlanDaysEditor = ({
  days,
  onDaysChange,
  onAddExercise,
  onSwapExercise,
  onRemoveExercise,
  onMoveExercise,
  onUpdateSets,
  durationWeeks,
  onDurationWeeksChange,
}: PlanDaysEditorProps) => {
  const { t, lang } = useTranslation();
  // Własne ćwiczenia zalogowanego usera (Z71) — jeden system we wszystkich edytorach.
  const { uid } = useCurrentUser();
  const { customExercises, addCustomExercise } = useCustomExercises(uid);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [swapDialog, setSwapDialog] = useState<{ dayId: string; exerciseId: string; exerciseName: string } | null>(null);
  const [editingSets, setEditingSets] = useState<{ dayId: string; exerciseId: string; value: string } | null>(null);

  const saveSets = () => {
    if (!editingSets) return;
    onUpdateSets(editingSets.dayId, editingSets.exerciseId, editingSets.value);
    setEditingSets(null);
  };

  return (
    <div className="space-y-4">
      {days.map((day, i) => {
        const taken = new Set(days.filter(d => d.id !== day.id).map(d => d.weekday));
        return (
          <Card key={day.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t('planbuilder.day', { n: i + 1 })}</CardTitle>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={days.length >= MAX_PLAN_DAYS}
                    aria-label={t('daysedit.duplicateDay')}
                    onClick={() => onDaysChange(duplicatePlanDay(days, day.id))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label={t('daysedit.removeDay')}
                    onClick={() => onDaysChange(removePlanDay(days, day.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(w => {
                  const selected = day.weekday === w.value;
                  return (
                    <ChipButton
                      key={w.value}
                      variant={selected ? 'default' : 'outline'}
                      pressed={selected}
                      className={cn(!selected && taken.has(w.value) && 'opacity-40')}
                      onClick={() => onDaysChange(setPlanDayWeekday(days, day.id, w.value as Weekday))}
                    >
                      {localizeWeekdayShort(w.short, lang)}
                    </ChipButton>
                  );
                })}
              </div>

              <Input
                placeholder={t('planbuilder.focusPlaceholderOptional')}
                defaultValue={day.focus}
                key={`${day.id}-focus-${day.focus}`}
                onBlur={e => {
                  if (e.target.value !== day.focus) onDaysChange(setPlanDayFocus(days, day.id, e.target.value));
                }}
                className="text-sm"
              />

              <div className="space-y-1">
                {day.exercises.map((exercise, idx) => (
                  <div key={exercise.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Badge variant="secondary" className="h-7 w-7 rounded flex items-center justify-center text-xs shrink-0">
                      {idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{localizeExerciseName(exercise.name, lang)}</p>
                      {editingSets?.dayId === day.id && editingSets?.exerciseId === exercise.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={editingSets.value}
                            onChange={e => setEditingSets({ ...editingSets, value: e.target.value })}
                            className="h-7 text-xs w-28"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveSets}>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        aria-label={t('daysedit.moveUp')}
                        onClick={() => onMoveExercise(day.id, exercise.id, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === day.exercises.length - 1}
                        aria-label={t('daysedit.moveDown')}
                        onClick={() => onMoveExercise(day.id, exercise.id, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t('planeditor.swapExercise')}
                        onClick={() => setSwapDialog({ dayId: day.id, exerciseId: exercise.id, exerciseName: exercise.name })}
                      >
                        <Replace className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={t('daysedit.removeExercise')}
                        onClick={() => onRemoveExercise(day.id, exercise.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setPickerDayId(day.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('planbuilder.addExercise')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => onDaysChange(addPlanDay(days))}
        disabled={days.length >= MAX_PLAN_DAYS}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('planbuilder.addDay')} {days.length >= MAX_PLAN_DAYS && t('planbuilder.maxDays')}
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('planbuilder.planDuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {DURATIONS.map(n => (
              <ChipButton
                key={n}
                variant={durationWeeks === n ? 'default' : 'outline'}
                pressed={durationWeeks === n}
                onClick={() => onDurationWeeksChange(n)}
              >
                {t('planbuilder.weeksShort', { n })}
              </ChipButton>
            ))}
          </div>
        </CardContent>
      </Card>

      <ExercisePicker
        open={!!pickerDayId || !!swapDialog}
        onOpenChange={(open) => { if (!open) { setPickerDayId(null); setSwapDialog(null); } }}
        onPick={(ex) => {
          if (swapDialog) onSwapExercise(swapDialog.dayId, swapDialog.exerciseId, ex);
          else if (pickerDayId) onAddExercise(pickerDayId, ex);
        }}
        title={swapDialog ? t('planeditor.swapExercise') : t('planbuilder.addExercise')}
        description={swapDialog
          ? t('planeditor.swappingExercise', { name: localizeExerciseName(swapDialog.exerciseName, lang) })
          : t('planeditor.pickFromLibrary')}
        customExercises={customExercises}
        onCreateCustomExercise={addCustomExercise}
      />
    </div>
  );
};
