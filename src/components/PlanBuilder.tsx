import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChipButton } from '@/components/ui/chip-button';
import { Input } from '@/components/ui/input';
import { ExercisePicker } from '@/components/ExercisePicker';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { ChevronLeft, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeWeekdayShort } from '@/lib/plan-i18n';
import { WEEKDAYS, weekdayLong, defaultSetsForType } from '@/lib/plan-cycle-utils';

const DURATIONS = [8, 10, 12, 16];

let scratchCounter = 0;
const nextId = (prefix: string) => `${prefix}-${(scratchCounter += 1)}`;

interface PlanBuilderProps {
  initialDays?: TrainingDay[];
  initialDurationWeeks?: number;
  /** Klucz localStorage do autozapisu szkicu — refresh/crash nie kasuje ułożonego planu. */
  draftStorageKey?: string;
  onSubmit: (days: TrainingDay[], durationWeeks: number) => void;
  onCancel: () => void;
}

const readBuilderDraft = (key: string | undefined): { days: TrainingDay[]; durationWeeks: number } | null => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { days?: TrainingDay[]; durationWeeks?: number };
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    return { days: parsed.days, durationWeeks: typeof parsed.durationWeeks === 'number' ? parsed.durationWeeks : 12 };
  } catch {
    return null;
  }
};

// Ręczny kreator planu treningowego od zera (bez AI). Użytkownik definiuje dni
// (dzień tygodnia + focus), dodaje ćwiczenia z biblioteki i ustawia serie.
export const PlanBuilder = ({ initialDays, initialDurationWeeks = 12, draftStorageKey, onSubmit, onCancel }: PlanBuilderProps) => {
  const { t, lang } = useTranslation();
  // initialDays (powrót z preview) ma pierwszeństwo przed szkicem z localStorage.
  const [restoredDraft] = useState(() =>
    initialDays && initialDays.length > 0 ? null : readBuilderDraft(draftStorageKey));
  const [days, setDays] = useState<TrainingDay[]>(() =>
    initialDays && initialDays.length > 0
      ? initialDays.map(d => ({ ...d, id: nextId('scratch-d') }))
      : restoredDraft?.days ?? [],
  );
  const [durationWeeks, setDurationWeeks] = useState(restoredDraft?.durationWeeks ?? initialDurationWeeks);

  // Autozapis szkicu przy każdej zmianie; pusty plan czyści wpis.
  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      if (days.length === 0) localStorage.removeItem(draftStorageKey);
      else localStorage.setItem(draftStorageKey, JSON.stringify({ days, durationWeeks }));
    } catch {
      // Brak miejsca w localStorage — szkic to bonus, nie blokujemy buildera.
    }
  }, [draftStorageKey, days, durationWeeks]);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [editingSets, setEditingSets] = useState<{ dayId: string; exerciseId: string; value: string } | null>(null);

  const usedWeekdays = new Set(days.map(d => d.weekday));

  const firstFreeWeekday = (): Weekday =>
    WEEKDAYS.find(w => !usedWeekdays.has(w.value))?.value ?? 'monday';

  const addDay = () => {
    if (days.length >= 6) return;
    const weekday = firstFreeWeekday();
    setDays(prev => [...prev, {
      id: nextId('scratch-d'),
      dayName: weekdayLong(weekday),
      weekday,
      focus: '',
      exercises: [],
    }]);
  };

  const removeDay = (dayId: string) => setDays(prev => prev.filter(d => d.id !== dayId));

  const setWeekday = (dayId: string, weekday: Weekday) => {
    setDays(prev => {
      const clash = prev.find(d => d.id !== dayId && d.weekday === weekday);
      return prev.map(d => {
        if (d.id === dayId) return { ...d, weekday, dayName: weekdayLong(weekday) };
        // Zamiana, żeby nie było dwóch dni w tym samym dniu tygodnia.
        if (clash && d.id === clash.id) {
          const old = prev.find(x => x.id === dayId)!.weekday;
          return { ...d, weekday: old, dayName: weekdayLong(old) };
        }
        return d;
      });
    });
  };

  const setFocus = (dayId: string, focus: string) =>
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, focus } : d));

  const addExercise = (dayId: string, ex: LibraryExercise) => {
    setDays(prev => prev.map(d => d.id === dayId ? {
      ...d,
      exercises: [...d.exercises, {
        id: nextId('scratch-ex'),
        name: ex.name,
        sets: defaultSetsForType(ex.type),
        instructions: ex.instructions ?? [],
        ...(ex.videoUrl ? { videoUrl: ex.videoUrl } : {}),
      }],
    } : d));
    setPickerDayId(null);
  };

  const removeExercise = (dayId: string, exerciseId: string) =>
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
      : d));

  const saveSets = () => {
    if (!editingSets) return;
    setDays(prev => prev.map(d => d.id === editingSets.dayId ? {
      ...d,
      exercises: d.exercises.map(e => e.id === editingSets.exerciseId ? { ...e, sets: editingSets.value } : e),
    } : d));
    setEditingSets(null);
  };

  // Walidacja: min 1 dzień, każdy dzień ma min 1 ćwiczenie. Cel dnia jest opcjonalny
  // (uzupełniany domyślną nazwą przy zapisie) — wcześniej blokował przycisk przy pustym polu.
  const isValid = days.length > 0 && days.every(d => d.exercises.length > 0);

  const handleSubmit = () => {
    const finalized = days.map((d, i) => ({
      ...d,
      focus: d.focus.trim() || t('planbuilder.defaultFocus', { n: i + 1 }),
    }));
    if (draftStorageKey) {
      try { localStorage.removeItem(draftStorageKey); } catch { /* nieistotne */ }
    }
    onSubmit(finalized, durationWeeks);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('planbuilder.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('planbuilder.subtitle')}</p>
        </div>
      </div>

      {days.map((day, i) => {
        const taken = new Set(days.filter(d => d.id !== day.id).map(d => d.weekday));
        return (
          <Card key={day.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t('planbuilder.day', { n: i + 1 })}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDay(day.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                      onClick={() => setWeekday(day.id, w.value)}
                    >
                      {localizeWeekdayShort(w.short, lang)}
                    </ChipButton>
                  );
                })}
              </div>

              <Input
                placeholder={t('planbuilder.focusPlaceholderOptional')}
                value={day.focus}
                onChange={e => setFocus(day.id, e.target.value)}
                className="text-sm"
              />

              <div className="space-y-1">
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{localizeExerciseName(ex.name, lang)}</p>
                      {editingSets?.dayId === day.id && editingSets?.exerciseId === ex.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={editingSets.value}
                            onChange={e => setEditingSets({ ...editingSets, value: e.target.value })}
                            className="h-7 text-xs w-28"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveSets}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                          onClick={() => setEditingSets({ dayId: day.id, exerciseId: ex.id, value: ex.sets })}
                        >
                          {ex.sets}
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => removeExercise(day.id, ex.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

      <Button variant="outline" className="w-full" onClick={addDay} disabled={days.length >= 6}>
        <Plus className="h-4 w-4 mr-2" />
        {t('planbuilder.addDay')} {days.length >= 6 && t('planbuilder.maxDays')}
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
                onClick={() => setDurationWeeks(n)}
              >
                {t('planbuilder.weeksShort', { n })}
              </ChipButton>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />{t('planbuilder.back')}
        </Button>
        <Button className="flex-1" disabled={!isValid} onClick={handleSubmit}>
          <Check className="h-4 w-4 mr-1" />{t('planbuilder.nextToPreview')}
        </Button>
      </div>
      {!isValid && (
        <p className="text-xs text-muted-foreground text-center">
          {t('planbuilder.validationExercises')}
        </p>
      )}

      {/* Exercise picker */}
      <ExercisePicker
        open={!!pickerDayId}
        onOpenChange={(open) => { if (!open) setPickerDayId(null); }}
        onPick={(ex) => pickerDayId && addExercise(pickerDayId, ex)}
        title={t('planbuilder.addExercise')}
        description={t('planbuilder.pickFromLibrary')}
      />
    </div>
  );
};
