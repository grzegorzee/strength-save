import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlanDaysEditor } from '@/components/PlanDaysEditor';
import type { LibraryExercise } from '@/data/exerciseLibrary';
import type { TrainingDay } from '@/data/trainingPlan';
import { ChevronLeft, Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { defaultSetsForType } from '@/lib/plan-cycle-utils';

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

// Ręczny kreator planu treningowego od zera (bez AI). Dni i ćwiczenia edytuje
// wspólny PlanDaysEditor (Z70) na stanie lokalnym; zapis dopiero przy submit.
export const PlanBuilder = ({ initialDays, initialDurationWeeks = 12, draftStorageKey, onSubmit, onCancel }: PlanBuilderProps) => {
  const { t } = useTranslation();
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
  };

  const swapExercise = (dayId: string, exerciseId: string, ex: LibraryExercise) => {
    setDays(prev => prev.map(d => d.id === dayId ? {
      ...d,
      exercises: d.exercises.map(e => {
        if (e.id !== exerciseId) return e;
        // Bez klucza videoUrl gdy zamiennik go nie ma — undefined wywala setDoc w Firestore.
        const { videoUrl: _omit, ...rest } = e;
        void _omit;
        return {
          ...rest,
          name: ex.name,
          instructions: ex.instructions ?? [],
          ...(ex.videoUrl ? { videoUrl: ex.videoUrl } : {}),
        };
      }),
    } : d));
  };

  const removeExercise = (dayId: string, exerciseId: string) =>
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
      : d));

  const moveExercise = (dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const index = d.exercises.findIndex(e => e.id === exerciseId);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= d.exercises.length) return d;
      const exercises = [...d.exercises];
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return { ...d, exercises };
    }));
  };

  const updateSets = (dayId: string, exerciseId: string, sets: string) =>
    setDays(prev => prev.map(d => d.id === dayId ? {
      ...d,
      exercises: d.exercises.map(e => e.id === exerciseId ? { ...e, sets } : e),
    } : d));

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

      <PlanDaysEditor
        days={days}
        onDaysChange={setDays}
        onAddExercise={addExercise}
        onSwapExercise={swapExercise}
        onRemoveExercise={removeExercise}
        onMoveExercise={moveExercise}
        onUpdateSets={updateSets}
        durationWeeks={durationWeeks}
        onDurationWeeksChange={setDurationWeeks}
      />

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
    </div>
  );
};
