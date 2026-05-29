import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, Dumbbell, Check, RefreshCw, Calendar } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { ExerciseSwapDialog } from '@/components/ExerciseSwapDialog';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { planTemplates, type PlanTemplate } from '@/data/planTemplates';
import type { TrainingDay } from '@/data/trainingPlan';
import type { ExerciseReplacement } from '@/types';
import { formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

// Lekki typ podglądu planu (AI usunięte w v6.10.0 — plan z gotowego szablonu).
interface GeneratedPlan { days: TrainingDay[]; planDurationWeeks: number; }

const weekMondayStr = (date: Date): string => formatLocalDate(getStartOfPlanWeek(date));

const levelLabels: Record<PlanTemplate['level'], string> = {
  beginner: 'Początkujący',
  intermediate: 'Średniozaawansowany',
  advanced: 'Zaawansowany',
};

const Onboarding = () => {
  const { uid, profile } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);
  const { createActiveCycle } = usePlanCycles(uid);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()));

  // Review state
  const [reviewPlan, setReviewPlan] = useState<GeneratedPlan | null>(null);

  // Swap dialog state
  const [swapDialog, setSwapDialog] = useState<{
    open: boolean;
    dayId: string;
    exerciseId: string;
    exerciseName: string;
    sets: string;
    category: typeof exerciseLibrary[0]['category'] | null;
  }>({ open: false, dayId: '', exerciseId: '', exerciseName: '', sets: '', category: null });

  const handlePickTemplate = (template: PlanTemplate) => {
    setError(null);
    setReviewPlan({ days: template.days, planDurationWeeks: template.durationWeeks });
  };

  const handleApprovePlan = async () => {
    if (!reviewPlan) return;
    setIsSaving(true);
    setError(null);

    try {
      const planStartDate = weekMondayStr(new Date(`${startDate}T00:00:00`));

      const saveResult = await savePlan(reviewPlan.days, {
        durationWeeks: reviewPlan.planDurationWeeks,
        startDate: planStartDate,
      });

      if (!saveResult.success) {
        setError(saveResult.error || 'Nie udało się zapisać planu');
        setIsSaving(false);
        return;
      }

      // Create first active cycle
      await createActiveCycle(reviewPlan.days, reviewPlan.planDurationWeeks, planStartDate);

      await updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
        onboarding: {
          state: 'completed',
          version: 1,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać planu');
      setIsSaving(false);
    }
  };

  const handleSwapExercise = (dayId: string, exerciseId: string, exerciseName: string, sets: string) => {
    const libExercise = exerciseLibrary.find(e => e.name === exerciseName);
    setSwapDialog({
      open: true,
      dayId,
      exerciseId,
      exerciseName,
      sets,
      category: libExercise?.category || null,
    });
  };

  const handleSwapConfirm = (replacement: ExerciseReplacement) => {
    if (!reviewPlan) return;
    const newDays = reviewPlan.days.map(day => {
      if (day.id !== swapDialog.dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== swapDialog.exerciseId) return ex;
          return {
            ...ex,
            name: replacement.name,
            sets: replacement.sets || ex.sets,
            videoUrl: replacement.videoUrl,
            instructions: [],
          };
        }),
      };
    });
    setReviewPlan({ ...reviewPlan, days: newDays });
  };


  const displayName = profile?.displayName?.split(' ')[0] || 'Trener';
  const onboardingVariant = profile?.registrationSource?.startsWith('invite')
    ? 'invite'
    : profile?.primaryProvider === 'password'
      ? 'email'
      : 'google';
  const onboardingIntro = onboardingVariant === 'invite'
    ? 'Wchodzisz z invite. Wybierz gotowy plan treningowy, a ustawimy Ci dobry start.'
    : onboardingVariant === 'email'
      ? 'Dzięki za potwierdzenie maila. Wybierz gotowy plan treningowy na start.'
      : 'Wybierz gotowy plan treningowy na start. Później ułożysz też własny.';

  // Used exercise names for swap dialog filtering
  const getUsedExerciseNames = (plan: TrainingDay[]) =>
    plan.flatMap(d => d.exercises.map(e => e.name));

  // Review state — show generated plan for approval
  if (reviewPlan) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-primary">FitTracker</span>
            </div>
            <h2 className="text-xl font-bold">Twój plan treningowy</h2>
            <p className="text-sm text-muted-foreground">
              {reviewPlan.planDurationWeeks} tygodni • {reviewPlan.days.length} dni/tydzień
            </p>
          </div>

          {reviewPlan.days.map(day => (
            <Card key={day.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{day.dayName}</span>
                  <Badge variant="outline" className="text-xs font-normal">{day.focus}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">{ex.sets}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => handleSwapExercise(day.id, ex.id, ex.name, ex.sets)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />Zamień
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Data rozpoczęcia
              </CardTitle>
              <CardDescription>
                Wybierz dzień, od którego ma ruszyć nowy plan. Aplikacja zapisze start od poniedziałku tego tygodnia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setReviewPlan(null)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Wróć
            </Button>
            <Button
              className="flex-1"
              onClick={handleApprovePlan}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Zatwierdzam plan
            </Button>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>

        <ExerciseSwapDialog
          open={swapDialog.open}
          onOpenChange={(open) => setSwapDialog(prev => ({ ...prev, open }))}
          category={swapDialog.category}
          currentExerciseName={swapDialog.exerciseName}
          usedExerciseNames={getUsedExerciseNames(reviewPlan.days)}
          originalSets={swapDialog.sets}
          onSwap={handleSwapConfirm}
        />
      </div>
    );
  }

  // Template picker — pierwszy plan nowego użytkownika (bez AI)
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-primary">FitTracker</span>
          </div>
          <h2 className="text-xl font-bold">Cześć, {displayName}!</h2>
          <CardDescription>{onboardingIntro}</CardDescription>
        </div>

        {planTemplates.map(template => (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{template.daysPerWeek} dni/tydzień</Badge>
                <Badge variant="secondary">{template.durationWeeks} tygodni</Badge>
                <Badge variant="outline">{levelLabels[template.level]}</Badge>
              </div>
              <div className="space-y-1">
                {template.days.map(day => (
                  <div key={day.id} className="text-sm">
                    <span className="font-medium">{day.dayName}:</span>{' '}
                    <span className="text-muted-foreground">{day.focus}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => handlePickTemplate(template)}>
                <Check className="h-4 w-4 mr-2" />
                Wybierz ten plan
              </Button>
            </CardContent>
          </Card>
        ))}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
};

export default Onboarding;
