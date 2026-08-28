import { useEffect, useState } from 'react';
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
  /** X34: "Wybierz inny plan" = powrót do kreatora na 5A z zachowanym stanem (host podaje resumeStep 5). */
  onChooseOther?: () => void;
  confirmLabel: string;
  isSaving?: boolean;
  error?: string | null;
}

// Podgląd planu przed zatwierdzeniem (Z73): jeden ekran dla NewPlan i Onboardingu.
// Lista dni/ćwiczeń + swap przez wspólny ExercisePicker.
export const PlanPreview = ({ days, onDaysChange, onBack, onConfirm, onChooseOther, confirmLabel, isSaving, error }: PlanPreviewProps) => {
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const { customExercises, addCustomExercise } = useCustomExercises(uid);
  const [swap, setSwap] = useState<{ open: boolean; dayId: string; exerciseId: string; exerciseName: string; sets: string; category: typeof exerciseLibrary[0]['category'] | null }>(
    { open: false, dayId: '', exerciseId: '', exerciseName: '', sets: '', category: null },
  );

  // X33 WP-5: podgląd otwiera się od góry (po długim kroku 5 strona była przewinięta w dół).
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  }, []);

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
    <div
      data-testid="plan-preview-screen"
      className="flex h-[calc(100dvh-var(--keyboard-inset,0px))] min-h-0 flex-col overflow-hidden bg-background"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-1 flex-col pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex shrink-0 items-center justify-between">
          <button onClick={onBack} aria-label={t('common.back')} className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
          <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
          <span className="h-11 w-11" aria-hidden="true" />
        </div>
        <div className="mb-5 mt-6 shrink-0">
          <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight uppercase">{t('newplan.preview.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('newplan.preview.desc')}</p>
        </div>
        <div data-testid="plan-preview-scroll" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
          {days.map((day) => (
            <div key={day.id} className="rounded-2xl bg-surface-low p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-heading font-bold">{localizeDayName(day.dayName, lang)}</p>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-surface-highest text-muted-foreground">{localizeFocus(day.focus, lang)}</span>
              </div>
              {day.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium truncate">{localizeExerciseName(ex.name, lang)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{ex.sets}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="min-h-11 shrink-0 text-xs text-primary" onClick={() => openSwap(day.id, ex.id, ex.name, ex.sets)}>
                    <RefreshCw className="h-3 w-3 mr-1" />{t('onboarding.swap')}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div data-testid="plan-preview-actions" className="shrink-0 space-y-2 bg-background pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button data-testid="plan-preview-confirm" onClick={onConfirm} disabled={isSaving} className="flex min-h-12 w-full touch-manipulation select-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary-light to-primary py-3 font-heading font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {confirmLabel}
          </button>
          {/* X34: drugi przycisk (secondary, pełna szerokość) pod zatwierdzeniem. */}
          {onChooseOther && (
            <button
              type="button"
              data-testid="plan-preview-choose-other"
              onClick={onChooseOther}
              disabled={isSaving}
              className="min-h-12 w-full touch-manipulation select-none rounded-2xl bg-surface-high py-3 text-sm font-medium disabled:opacity-50"
            >
              {t('ob.preview.chooseOther')}
            </button>
          )}
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
