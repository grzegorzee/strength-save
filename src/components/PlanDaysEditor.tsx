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
import { MAX_PLAN_WEEKS, MIN_PLAN_WEEKS } from '@/lib/training-plan-save';
import { ArrowUp, ArrowDown, Copy, Trash2, Replace, Plus, Minus, Pencil, Check, X } from 'lucide-react';
import type { TranslationKey } from '@/i18n';

// FIX-C: edycja serii bez wpisywania "×" z klawiatury — format "N × reps"
// rozbijany na stepper liczby serii + pole powtórzeń; inne formaty (np. "AMRAP")
// dostają dotychczasowe surowe pole tekstowe.
const parseSetsString = (sets: string): { count: number; reps: string } | null => {
  const match = sets.match(/^(\d+)\s*[x×]\s*(.+)$/i);
  if (!match) return null;
  return { count: parseInt(match[1], 10), reps: match[2].trim() };
};

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

const exerciseCountKey = (count: number): TranslationKey => (
  count === 1
    ? 'planbuilder.exerciseCountOne'
    : (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20))
      ? 'planbuilder.exerciseCountFew'
      : 'planbuilder.exerciseCountMany'
);

const revealField = (element: HTMLElement) => {
  element.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

/**
 * WP-PLANS-1 (X27, Task P5): chipsy [8,10,12,16] + własna liczba tygodni 2-36.
 * Wartość spoza zakresu = komunikat walidacji i BRAK zapisu (clamp dopiero na
 * save w training-plan-save). Wspólny dla PlanDaysEditor i kroku potwierdzenia
 * szablonu w PlanWizard.
 */
export const PlanDurationPicker = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (weeks: number) => void;
}) => {
  const { t } = useTranslation();
  const [customText, setCustomText] = useState('');
  const [customError, setCustomError] = useState(false);

  const handleCustomChange = (raw: string) => {
    setCustomText(raw);
    if (raw.trim() === '') {
      setCustomError(false);
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_PLAN_WEEKS && parsed <= MAX_PLAN_WEEKS) {
      setCustomError(false);
      onChange(parsed);
    } else {
      setCustomError(true);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map(n => (
          <ChipButton
            key={n}
            variant={value === n ? 'default' : 'outline'}
            pressed={value === n}
            onClick={() => {
              setCustomText('');
              setCustomError(false);
              onChange(n);
            }}
          >
            {t('planbuilder.weeksShort', { n })}
          </ChipButton>
        ))}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="plan-duration-custom" className="block text-xs font-medium text-muted-foreground">
          {t('planbuilder.customWeeks')}
        </label>
        <Input
          id="plan-duration-custom"
          data-testid="duration-custom-input"
          inputMode="numeric"
          enterKeyHint="done"
          value={customText}
          placeholder={String(value)}
          onChange={(e) => handleCustomChange(e.target.value)}
          onFocus={(e) => revealField(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.currentTarget.blur();
          }}
          className="min-h-11 w-28"
        />
        {customError && (
          <p data-testid="duration-custom-error" className="text-sm text-destructive">
            {t('planbuilder.customWeeksError')}
          </p>
        )}
      </div>
    </div>
  );
};

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
  const [editingSets, setEditingSets] = useState<
    { dayId: string; exerciseId: string; count: number | null; reps: string; raw: string } | null
  >(null);

  const startEditingSets = (dayId: string, exerciseId: string, sets: string) => {
    const parsed = parseSetsString(sets);
    setEditingSets(parsed
      ? { dayId, exerciseId, count: parsed.count, reps: parsed.reps, raw: sets }
      : { dayId, exerciseId, count: null, reps: '', raw: sets });
  };

  const saveSets = () => {
    if (!editingSets) return;
    const value = editingSets.count !== null
      ? `${editingSets.count} × ${editingSets.reps.trim()}`
      : editingSets.raw;
    onUpdateSets(editingSets.dayId, editingSets.exerciseId, value);
    setEditingSets(null);
  };

  return (
    <div className="space-y-4">
      {days.map((day, i) => {
        const taken = new Set(days.filter(d => d.id !== day.id).map(d => d.weekday));
        return (
          <Card key={day.id} className="overflow-hidden border-outline-variant/50 bg-surface-container shadow-none">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="font-heading text-lg leading-tight">{t('planbuilder.day', { n: i + 1 })}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(exerciseCountKey(day.exercises.length), { n: day.exercises.length })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    disabled={days.length >= MAX_PLAN_DAYS}
                    aria-label={t('daysedit.duplicateDay')}
                    onClick={() => onDaysChange(duplicatePlanDay(days, day.id))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11 text-destructive"
                    aria-label={t('daysedit.removeDay')}
                    onClick={() => onDaysChange(removePlanDay(days, day.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
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
                enterKeyHint="done"
                onFocus={(e) => revealField(e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.currentTarget.blur();
                }}
                onBlur={e => {
                  if (e.target.value !== day.focus) onDaysChange(setPlanDayFocus(days, day.id, e.target.value));
                }}
                className="min-h-11"
              />

              <div className="space-y-2">
                {day.exercises.map((exercise, idx) => (
                  <div key={exercise.id} className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-low">
                    <div className="flex items-start gap-3 p-3">
                      <Badge variant="secondary" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs">
                        {idx + 1}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p
                          data-testid={`exercise-name-${exercise.id}`}
                          className="whitespace-normal break-words font-heading text-base font-semibold leading-snug"
                        >
                          {localizeExerciseName(exercise.name, lang)}
                        </p>
                        {editingSets?.dayId === day.id && editingSets?.exerciseId === exercise.id ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {editingSets.count !== null ? (
                            <>
                              <div className="flex items-center rounded-lg border border-input bg-background">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="min-h-11 min-w-11"
                                  data-testid="sets-count-dec"
                                  aria-label={t('daysedit.fewerSets')}
                                  onClick={() => setEditingSets({ ...editingSets, count: Math.max(1, editingSets.count! - 1) })}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                  {editingSets.count}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="min-h-11 min-w-11"
                                  data-testid="sets-count-inc"
                                  aria-label={t('daysedit.moreSets')}
                                  onClick={() => setEditingSets({ ...editingSets, count: Math.min(12, editingSets.count! + 1) })}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <span className="text-sm text-muted-foreground">×</span>
                              <Input
                                value={editingSets.reps}
                                data-testid="sets-reps-input"
                                enterKeyHint="done"
                                onChange={e => setEditingSets({ ...editingSets, reps: e.target.value })}
                                onFocus={(e) => revealField(e.currentTarget)}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className="min-h-11 w-20 text-sm"
                              />
                            </>
                          ) : (
                            <Input
                              value={editingSets.raw}
                              data-testid="sets-raw-input"
                              enterKeyHint="done"
                              onChange={e => setEditingSets({ ...editingSets, raw: e.target.value })}
                              onFocus={(e) => revealField(e.currentTarget)}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                e.currentTarget.blur();
                              }}
                              className="min-h-11 w-32 text-sm"
                            />
                          )}
                          <Button variant="ghost" size="icon" className="min-h-11 min-w-11 text-fitness-success" data-testid="sets-save" aria-label={t('common.save')} onClick={saveSets}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" data-testid="sets-cancel" aria-label={t('common.cancel')} onClick={() => setEditingSets(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-testid={`edit-sets-${exercise.id}`}
                            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-lowest px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={t('daysedit.editPrescription', { prescription: exercise.sets })}
                            onClick={() => startEditingSets(day.id, exercise.id, exercise.sets)}
                          >
                            <span className="tabular-nums">{exercise.sets}</span>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      data-testid={`exercise-actions-${exercise.id}`}
                      className="grid grid-cols-4 border-t border-outline-variant/40 bg-surface-lowest/60"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-11 w-full rounded-none"
                        disabled={idx === 0}
                        aria-label={t('daysedit.moveUp')}
                        onClick={() => onMoveExercise(day.id, exercise.id, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-11 w-full rounded-none"
                        disabled={idx === day.exercises.length - 1}
                        aria-label={t('daysedit.moveDown')}
                        onClick={() => onMoveExercise(day.id, exercise.id, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-11 w-full rounded-none"
                        aria-label={t('planeditor.swapExercise')}
                        onClick={() => setSwapDialog({ dayId: day.id, exerciseId: exercise.id, exerciseName: exercise.name })}
                      >
                        <Replace className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-11 w-full rounded-none text-destructive hover:text-destructive"
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
                  className="min-h-11 w-full"
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
        data-testid="add-plan-day"
        className="min-h-14 w-full rounded-xl border-primary/60 bg-primary/10 font-heading text-base font-semibold text-primary hover:bg-primary/15"
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
          <PlanDurationPicker value={durationWeeks} onChange={onDurationWeeksChange} />
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
