import { useState } from 'react';
import { Loader2, Check, RefreshCw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePicker } from '@/components/ExercisePicker';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { swapExerciseIdentity } from '@/lib/exercise-swap';
import type { TrainingDay } from '@/data/trainingPlan';

interface PlanPreviewProps {
  days: TrainingDay[];
  onDaysChange: (days: TrainingDay[]) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  isSaving?: boolean;
  error?: string | null;
}

// Podgląd planu przed zatwierdzeniem (Z73): jeden ekran dla NewPlan i Onboardingu.
// Lista dni/ćwiczeń + swap przez wspólny ExercisePicker.
export const PlanPreview = ({ days, onDaysChange, onBack, onConfirm, confirmLabel, isSaving, error }: PlanPreviewProps) => {
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const { customExercises, addCustomExercise } = useCustomExercises(uid);
  const [swap, setSwap] = useState<{ open: boolean; dayId: string; exerciseId: string; exerciseName: string; sets: string; category: typeof exerciseLibrary[0]['category'] | null }>(
    { open: false, dayId: '', exerciseId: '', exerciseName: '', sets: '', category: null },
  );

  const usedNames = days.flatMap((d) => d.exercises.map((e) => e.name));

  const openSwap = (dayId: string, exerciseId: string, exerciseName: string, sets: string) => {
    const lib = exerciseLibrary.find((e) => e.name === exerciseName);
    setSwap({ open: true, dayId, exerciseId, exerciseName, sets, category: lib?.category ?? null });
  };

  const confirmSwap = (rep: { name: string; sets: string; videoUrl?: string; category?: string }) => {
    onDaysChange(days.map((day) => day.id !== swap.dayId ? day : {
      ...day,
      // swapExerciseIdentity pomija videoUrl gdy zamiennik go nie ma — undefined wywala setDoc w Firestore.
      exercises: day.exercises.map((ex) => ex.id !== swap.exerciseId ? ex : swapExerciseIdentity(ex, rep, day.exercises.map((e) => e.id))),
    }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
        <div className="flex items-center justify-between">
          <button onClick={onBack} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
          <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
          <span />
        </div>
        <div className="mt-8 mb-5">
          <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight uppercase">{t('newplan.preview.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('newplan.preview.desc')}</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {days.map((day) => (
            <div key={day.id} className="rounded-2xl bg-surface-low p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-heading font-bold">{localizeDayName(day.dayName, lang)}</p>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-surface-highest text-muted-foreground">{localizeFocus(day.focus, lang)}</span>
              </div>
              {day.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium truncate">{localizeExerciseName(ex.name, lang)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{ex.sets}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs shrink-0 text-fitness-cyan" onClick={() => openSwap(day.id, ex.id, ex.name, ex.sets)}>
                    <RefreshCw className="h-3 w-3 mr-1" />{t('onboarding.swap')}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="pt-5">
          <button onClick={onConfirm} disabled={isSaving} className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-[#f4ffc9] to-primary disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {confirmLabel}
          </button>
          {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
        </div>
      </div>

      <ExercisePicker
        open={swap.open}
        onOpenChange={(open) => setSwap((prev) => ({ ...prev, open }))}
        onPick={(ex) => confirmSwap({ name: ex.name, sets: swap.sets, videoUrl: ex.videoUrl, category: ex.category })}
        excludeNames={usedNames}
        title={t('comp.swap.title')}
        description={t('planeditor.swappingExercise', { name: localizeExerciseName(swap.exerciseName, lang) })}
        initialCategory={swap.category ?? undefined}
        customExercises={customExercises}
        onCreateCustomExercise={addCustomExercise}
      />
    </div>
  );
};
