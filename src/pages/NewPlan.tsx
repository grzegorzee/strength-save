import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Dumbbell, Check, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { generateTrainingPlan, generatePlanFromCycle, type OnboardingAnswers, type GeneratedPlan } from '@/lib/ai-onboarding';
import { ExerciseSwapDialog } from '@/components/ExerciseSwapDialog';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import type { TrainingDay } from '@/data/trainingPlan';
import type { ExerciseReplacement } from '@/types';
import { cn } from '@/lib/utils';

const goalOptions = [
  { id: 'strength', label: 'Siła' },
  { id: 'muscle', label: 'Masa mięśniowa' },
  { id: 'fat_loss', label: 'Redukcja' },
  { id: 'health', label: 'Zdrowie' },
];

import type { PlanCycle } from '@/types/cycles';

const NewPlan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCycleId = searchParams.get('fromCycle');
  const { uid } = useCurrentUser();
  const { plan: currentPlan, planDurationWeeks, planStartDate, savePlan } = useTrainingPlan(uid);
  const { workouts, getCompletedWorkoutsCount } = useFirebaseWorkouts(uid);
  const { archiveCurrentPlan, createActiveCycle, getCycleById } = usePlanCycles(uid);

  const [sourceCycle, setSourceCycle] = useState<PlanCycle | null>(null);

  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: 'strength',
    experience: 'intermediate',
    daysPerWeek: currentPlan.length || 3,
    equipment: ['barbell', 'dumbbells', 'machines', 'cable'],
    injuries: '',
  });

  // Load source cycle if fromCycle param is present
  useEffect(() => {
    if (!fromCycleId) return;
    getCycleById(fromCycleId).then(cycle => {
      if (cycle) {
        setSourceCycle(cycle);
        setAnswers(prev => ({
          ...prev,
          daysPerWeek: cycle.days.length,
        }));
      }
    });
  }, [fromCycleId, getCycleById]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewPlan, setReviewPlan] = useState<GeneratedPlan | null>(null);

  // Swap dialog
  const [swapDialog, setSwapDialog] = useState<{
    open: boolean;
    dayId: string;
    exerciseId: string;
    exerciseName: string;
    sets: string;
    category: typeof exerciseLibrary[0]['category'] | null;
  }>({ open: false, dayId: '', exerciseId: '', exerciseName: '', sets: '', category: null });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const generated = sourceCycle
        ? await generatePlanFromCycle(answers, sourceCycle)
        : await generateTrainingPlan(answers);
      setReviewPlan(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wygenerować planu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!reviewPlan) return;
    setIsSaving(true);
    setError(null);
    try {
      // Archive current plan before overwriting
      if (planStartDate && currentPlan.length > 0) {
        await archiveCurrentPlan(currentPlan, planDurationWeeks, planStartDate, workouts);
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - daysSinceMonday);
      const startDate = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;

      const result = await savePlan(reviewPlan.days, {
        durationWeeks: reviewPlan.planDurationWeeks,
        startDate,
      });
      if (!result.success) {
        setError(result.error || 'Nie udało się zapisać');
        setIsSaving(false);
        return;
      }

      // Create active cycle for the new plan
      await createActiveCycle(reviewPlan.days, reviewPlan.planDurationWeeks, startDate);

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd');
      setIsSaving(false);
    }
  };

  const handleSwapExercise = (dayId: string, exerciseId: string, exerciseName: string, sets: string) => {
    const libEx = exerciseLibrary.find(e => e.name === exerciseName);
    setSwapDialog({ open: true, dayId, exerciseId, exerciseName, sets, category: libEx?.category || null });
  };

  const handleSwapConfirm = (replacement: ExerciseReplacement) => {
    if (!reviewPlan) return;
    const newDays = reviewPlan.days.map(day => {
      if (day.id !== swapDialog.dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== swapDialog.exerciseId) return ex;
          return { ...ex, name: replacement.name, sets: replacement.sets || ex.sets, videoUrl: replacement.videoUrl, instructions: [] };
        }),
      };
    });
    setReviewPlan({ ...reviewPlan, days: newDays });
  };

  const getUsedNames = (plan: TrainingDay[]) => plan.flatMap(d => d.exercises.map(e => e.name));

  const completedCount = getCompletedWorkoutsCount();

  // Review mode
  if (reviewPlan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setReviewPlan(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Nowy plan treningowy</h1>
            <p className="text-sm text-muted-foreground">
              {reviewPlan.planDurationWeeks} tygodni • {reviewPlan.days.length} dni/tydzień
            </p>
          </div>
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
                  <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => handleSwapExercise(day.id, ex.id, ex.name, ex.sets)}>
                    <RefreshCw className="h-3 w-3 mr-1" />Zamień
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setReviewPlan(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Wróć
          </Button>
          <Button className="flex-1" onClick={handleApprove} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Zatwierdzam plan
          </Button>
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <ExerciseSwapDialog
          open={swapDialog.open}
          onOpenChange={(open) => setSwapDialog(prev => ({ ...prev, open }))}
          category={swapDialog.category}
          currentExerciseName={swapDialog.exerciseName}
          usedExerciseNames={getUsedNames(reviewPlan.days)}
          originalSets={swapDialog.sets}
          onSwap={handleSwapConfirm}
        />
      </div>
    );
  }

  // Config page
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nowy plan treningowy</h1>
          <p className="text-sm text-muted-foreground">Ukończonych treningów: {completedCount}</p>
        </div>
      </div>

      {/* Source cycle info (when generating from old cycle) */}
      {sourceCycle && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Na bazie cyklu
              <Badge variant="outline" className="text-xs">{sourceCycle.durationWeeks} tyg.</Badge>
            </CardTitle>
            <CardDescription>
              {sourceCycle.stats.totalWorkouts} treningów • {(sourceCycle.stats.totalTonnage / 1000).toFixed(1)}t • {sourceCycle.stats.completionRate}% frekwencja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {sourceCycle.days.map(day => (
                <div key={day.id} className="text-sm">
                  <span className="font-medium">{day.dayName}:</span>{' '}
                  <span className="text-muted-foreground">{day.focus}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous plan summary */}
      {!sourceCycle && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Poprzedni plan</CardTitle>
            <CardDescription>{planDurationWeeks} tygodni • {currentPlan.length} dni/tydzień</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {currentPlan.map(day => (
                <div key={day.id} className="text-sm">
                  <span className="font-medium">{day.dayName}:</span>{' '}
                  <span className="text-muted-foreground">{day.focus}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New plan options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nowy cel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {goalOptions.map(opt => (
              <Badge
                key={opt.id}
                variant={answers.goal === opt.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setAnswers(prev => ({ ...prev, goal: opt.id }))}
              >
                {opt.label}
              </Badge>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Dni w tygodniu</p>
            <div className="flex gap-2">
              {[2,3,4,5].map(n => (
                <Badge
                  key={n}
                  variant={answers.daysPerWeek === n ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setAnswers(prev => ({ ...prev, daysPerWeek: n }))}
                >
                  {n}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Kontuzje/zmiany (opcjonalne)</p>
            <textarea
              value={answers.injuries}
              onChange={e => setAnswers(prev => ({ ...prev, injuries: e.target.value }))}
              placeholder="np. chcę więcej ćwiczeń na plecy..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Dumbbell className="h-4 w-4 mr-2" />
        )}
        Wygeneruj nowy plan
      </Button>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
};

export default NewPlan;
