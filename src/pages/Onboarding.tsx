import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight, ChevronLeft, Dumbbell, Check, RefreshCw } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { generateTrainingPlan, type OnboardingAnswers, type GeneratedPlan } from '@/lib/ai-onboarding';
import { ExerciseSwapDialog } from '@/components/ExerciseSwapDialog';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import type { TrainingDay } from '@/data/trainingPlan';
import type { ExerciseReplacement } from '@/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Jaki jest Twój cel?', key: 'goal' as const },
  { title: 'Ile masz doświadczenia?', key: 'experience' as const },
  { title: 'Ile dni w tygodniu?', key: 'daysPerWeek' as const },
  { title: 'Dostępny sprzęt?', key: 'equipment' as const },
  { title: 'Kontuzje lub ograniczenia?', key: 'injuries' as const },
];

const goalOptions = [
  { id: 'strength', label: 'Siła', desc: 'Chcę być silniejszy' },
  { id: 'muscle', label: 'Masa mięśniowa', desc: 'Chcę zbudować mięśnie' },
  { id: 'fat_loss', label: 'Redukcja', desc: 'Chcę schudnąć' },
  { id: 'health', label: 'Zdrowie', desc: 'Chcę być zdrowszy' },
];

const experienceOptions = [
  { id: 'beginner', label: 'Początkujący', desc: 'Mniej niż 6 miesięcy' },
  { id: 'intermediate', label: 'Średnio-zaawansowany', desc: '6 miesięcy – 2 lata' },
  { id: 'advanced', label: 'Zaawansowany', desc: 'Ponad 2 lata' },
];

const daysOptions = [
  { id: 2, label: '2 dni' },
  { id: 3, label: '3 dni' },
  { id: 4, label: '4 dni' },
  { id: 5, label: '5 dni' },
];

const equipmentOptions = [
  { id: 'barbell', label: 'Sztanga' },
  { id: 'dumbbells', label: 'Hantle' },
  { id: 'machines', label: 'Maszyny' },
  { id: 'cable', label: 'Wyciąg/linka' },
  { id: 'bodyweight', label: 'Tylko ciężar ciała' },
];

const Onboarding = () => {
  const { uid, profile } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: '',
    experience: '',
    daysPerWeek: 3,
    equipment: [],
    injuries: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canNext = () => {
    switch (step) {
      case 0: return answers.goal !== '';
      case 1: return answers.experience !== '';
      case 2: return answers.daysPerWeek >= 2;
      case 3: return answers.equipment.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const generated = await generateTrainingPlan(answers);
      setReviewPlan(generated);
      setIsGenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wygenerować planu');
      setIsGenerating(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!reviewPlan) return;
    setIsSaving(true);
    setError(null);

    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - daysSinceMonday);
      const startDate = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;

      const saveResult = await savePlan(reviewPlan.days, {
        durationWeeks: reviewPlan.planDurationWeeks,
        startDate,
      });

      if (!saveResult.success) {
        setError(saveResult.error || 'Nie udało się zapisać planu');
        setIsSaving(false);
        return;
      }

      await updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
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

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleGenerate();
    }
  };

  const toggleEquipment = (id: string) => {
    setAnswers(prev => ({
      ...prev,
      equipment: prev.equipment.includes(id)
        ? prev.equipment.filter(e => e !== id)
        : [...prev.equipment, id],
    }));
  };

  const displayName = profile?.displayName?.split(' ')[0] || 'Trener';

  // Used exercise names for swap dialog filtering
  const getUsedExerciseNames = (plan: TrainingDay[]) =>
    plan.flatMap(d => d.exercises.map(e => e.name));

  // Loading state — generating plan
  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-bold">Generuję Twój plan</h2>
              <p className="text-sm text-muted-foreground">
                AI dobiera ćwiczenia i schematy serii na podstawie Twoich odpowiedzi...
              </p>
              {error && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" onClick={() => { setIsGenerating(false); setError(null); }}>
                    Spróbuj ponownie
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setReviewPlan(null); setStep(STEPS.length - 1); }}
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

  // Wizard steps
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-primary">FitTracker</span>
          </div>
          {step === 0 && (
            <>
              <CardTitle className="text-xl">Cześć, {displayName}!</CardTitle>
              <CardDescription>Odpowiedz na 5 pytań, a AI stworzy Twój plan treningowy.</CardDescription>
            </>
          )}
          {step > 0 && (
            <>
              <CardTitle className="text-lg">{STEPS[step].title}</CardTitle>
              <CardDescription>Krok {step + 1} z {STEPS.length}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>

          {/* Step 0: Goal */}
          {step === 0 && (
            <div className="space-y-2">
              <p className="font-medium text-sm mb-3">{STEPS[0].title}</p>
              {goalOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAnswers(prev => ({ ...prev, goal: opt.id }))}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-colors',
                    answers.goal === opt.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'
                  )}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Experience */}
          {step === 1 && (
            <div className="space-y-2">
              {experienceOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAnswers(prev => ({ ...prev, experience: opt.id }))}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-colors',
                    answers.experience === opt.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'
                  )}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Days per week */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {daysOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAnswers(prev => ({ ...prev, daysPerWeek: opt.id }))}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-colors text-center',
                    answers.daysPerWeek === opt.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'
                  )}
                >
                  <p className="text-2xl font-bold">{opt.id}</p>
                  <p className="text-xs text-muted-foreground">{opt.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Equipment */}
          {step === 3 && (
            <div className="space-y-2">
              {equipmentOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleEquipment(opt.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-colors flex items-center justify-between',
                    answers.equipment.includes(opt.id) ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'
                  )}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  {answers.equipment.includes(opt.id) && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-2">Możesz wybrać kilka opcji</p>
            </div>
          )}

          {/* Step 4: Injuries */}
          {step === 4 && (
            <div className="space-y-3">
              <textarea
                value={answers.injuries}
                onChange={e => setAnswers(prev => ({ ...prev, injuries: e.target.value }))}
                placeholder="np. kontuzja barku, ból kolan... (opcjonalne — zostaw puste jeśli brak)"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />Wstecz
              </Button>
            )}
            <Button onClick={handleNext} disabled={!canNext()} className="flex-1">
              {step === STEPS.length - 1 ? (
                <><Dumbbell className="h-4 w-4 mr-1" />Generuj plan</>
              ) : (
                <>Dalej<ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
