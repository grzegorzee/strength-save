import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Check, RefreshCw, ListChecks, Repeat, PencilRuler } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { ExerciseSwapDialog } from '@/components/ExerciseSwapDialog';
import { PlanBuilder } from '@/components/PlanBuilder';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { planTemplates, type PlanTemplate } from '@/data/planTemplates';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';

// Lekki typ podglądu planu (dawniej z ai-onboarding, AI usunięte w v6.10.0).
interface GeneratedPlan { days: TrainingDay[]; planDurationWeeks: number; }

const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 'monday', short: 'Pn', long: 'Poniedziałek' },
  { value: 'tuesday', short: 'Wt', long: 'Wtorek' },
  { value: 'wednesday', short: 'Śr', long: 'Środa' },
  { value: 'thursday', short: 'Cz', long: 'Czwartek' },
  { value: 'friday', short: 'Pt', long: 'Piątek' },
  { value: 'saturday', short: 'So', long: 'Sobota' },
  { value: 'sunday', short: 'Nd', long: 'Niedziela' },
];

const weekdayLongName = (value: Weekday): string =>
  WEEKDAYS.find((w) => w.value === value)?.long ?? value;

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Monday of the week containing the given date — plans run on a Monday-anchored weekly grid.
const weekMondayStr = (d: Date): string => {
  const dow = d.getDay();
  const since = dow === 0 ? 6 : dow - 1;
  const m = new Date(d);
  m.setDate(d.getDate() - since);
  return toDateStr(m);
};

const levelLabelKeys: Record<PlanTemplate['level'], string> = {
  beginner: 'newplan.level.beginner',
  intermediate: 'newplan.level.intermediate',
  advanced: 'newplan.level.advanced',
};
import type { ExerciseReplacement } from '@/types';
import { cn } from '@/lib/utils';
import type { PlanCycle } from '@/types/cycles';

const NewPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCycleId = searchParams.get('fromCycle');
  const { uid } = useCurrentUser();
  const { plan: currentPlan, planDurationWeeks, planStartDate, savePlan } = useTrainingPlan(uid);
  const { workouts, getCompletedWorkoutsCount, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid);
  const { archiveCurrentPlan, createActiveCycle, getCycleById } = usePlanCycles(uid);

  const [sourceCycle, setSourceCycle] = useState<PlanCycle | null>(null);

  // Load source cycle if fromCycle param is present (kopia planu starego cyklu jako baza w kreatorze)
  useEffect(() => {
    if (!fromCycleId) return;
    getCycleById(fromCycleId).then(cycle => {
      if (cycle) {
        setSourceCycle(cycle);
        setPlanSource('scratch');
      }
    });
  }, [fromCycleId, getCycleById]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewPlan, setReviewPlan] = useState<GeneratedPlan | null>(null);
  // Sposób ułożenia planu: gotowy szablon vs własny kreator (AI usunięte w v6.10.0).
  const [planSource, setPlanSource] = useState<'templates' | 'scratch'>('templates');
  // Data rozpoczęcia planu (pierwszy tydzień). Domyślnie bieżący poniedziałek, edytowalna w podglądzie.
  const [startDate, setStartDate] = useState<string>(() => weekMondayStr(new Date()));
  // Szablon wybrany, ale czekający na wybór dni tygodnia przez użytkownika.
  const [pendingTemplate, setPendingTemplate] = useState<PlanTemplate | null>(null);
  const [dayWeekdays, setDayWeekdays] = useState<Weekday[]>([]);

  const hasCurrentPlan = !sourceCycle && currentPlan.length > 0;

  const handlePickTemplate = (template: PlanTemplate) => {
    setError(null);
    setPendingTemplate(template);
    setDayWeekdays(template.days.map((d) => d.weekday));
  };

  const setDayWeekday = (index: number, weekday: Weekday) => {
    setDayWeekdays((prev) => {
      const next = [...prev];
      // Jeśli inny dzień ma już ten weekday — zamień się z nim (brak duplikatów).
      const clashIndex = next.findIndex((w, i) => i !== index && w === weekday);
      if (clashIndex >= 0) next[clashIndex] = next[index];
      next[index] = weekday;
      return next;
    });
  };

  const confirmTemplateDays = () => {
    if (!pendingTemplate) return;
    const remapped: TrainingDay[] = pendingTemplate.days.map((d, i) => ({
      ...d,
      weekday: dayWeekdays[i],
      dayName: weekdayLongName(dayWeekdays[i]),
    }));
    setReviewPlan({ days: remapped, planDurationWeeks: pendingTemplate.durationWeeks });
    setPendingTemplate(null);
  };

  const handleContinueCurrent = () => {
    setError(null);
    setReviewPlan({ days: currentPlan, planDurationWeeks });
  };

  // Swap dialog
  const [swapDialog, setSwapDialog] = useState<{
    open: boolean;
    dayId: string;
    exerciseId: string;
    exerciseName: string;
    sets: string;
    category: typeof exerciseLibrary[0]['category'] | null;
  }>({ open: false, dayId: '', exerciseId: '', exerciseName: '', sets: '', category: null });

  const handleApprove = async () => {
    if (!reviewPlan) return;
    setIsSaving(true);
    setError(null);
    try {
      // Archive current plan before overwriting
      if (planStartDate && currentPlan.length > 0) {
        const archivedCycleId = await archiveCurrentPlan(currentPlan, planDurationWeeks, planStartDate, workouts);
        // Dotaguj historyczne treningi starego planu (cycleId + snapshot nazw ćwiczeń/dnia),
        // żeby po nadpisaniu planu nie stały się osierocone. Idempotentne.
        if (archivedCycleId) {
          const archivedCycle: PlanCycle = {
            id: archivedCycleId,
            userId: uid,
            days: currentPlan,
            durationWeeks: planDurationWeeks,
            startDate: planStartDate,
            endDate: toDateStr(new Date()),
            status: 'completed',
            createdAt: new Date().toISOString(),
            stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
          };
          await backfillHistoricalWorkouts([archivedCycle]);
        }
      }

      // Snap the chosen start date to its week's Monday (weekly grid anchor).
      const newStartDate = weekMondayStr(new Date(`${startDate}T00:00:00`));

      // Give each plan instance globally-unique day ids so workouts/cycles never collide
      // across plans that reuse 'day-1'..'day-N' (e.g. templates and default plan).
      const uniqueDays: TrainingDay[] = reviewPlan.days.map((d, i) => ({
        ...d,
        id: `${newStartDate}-d${i + 1}`,
      }));

      const result = await savePlan(uniqueDays, {
        durationWeeks: reviewPlan.planDurationWeeks,
        startDate: newStartDate,
      });
      if (!result.success) {
        setError(result.error || t('newplan.error.saveFailed'));
        setIsSaving(false);
        return;
      }

      // Create active cycle for the new plan
      await createActiveCycle(uniqueDays, reviewPlan.planDurationWeeks, newStartDate);

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newplan.error.generic'));
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
            <h1 className="text-xl font-bold">{t('newplan.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('newplan.weeksDaysSummary', { weeks: reviewPlan.planDurationWeeks, days: reviewPlan.days.length })}
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
                    <RefreshCw className="h-3 w-3 mr-1" />{t('newplan.swap')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('newplan.startDate.title')}</CardTitle>
            <CardDescription>{t('newplan.startDate.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setReviewPlan(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />{t('newplan.back')}
          </Button>
          <Button className="flex-1" onClick={handleApprove} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            {t('newplan.approve')}
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

  // Weekday picker (after choosing a ready-made template)
  if (pendingTemplate) {
    const usedWeekdays = new Set(dayWeekdays);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setPendingTemplate(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('newplan.weekdays.title')}</h1>
            <p className="text-sm text-muted-foreground">{pendingTemplate.name}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('newplan.weekdays.instruction')}
        </p>

        {pendingTemplate.days.map((d, i) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t('newplan.dayN', { n: i + 1 })}</span>
                <Badge variant="outline" className="text-xs font-normal">{d.focus}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((w) => {
                  const selected = dayWeekdays[i] === w.value;
                  const takenByOther = !selected && usedWeekdays.has(w.value);
                  return (
                    <Badge
                      key={w.value}
                      variant={selected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer',
                        takenByOther && 'opacity-40',
                      )}
                      onClick={() => setDayWeekday(i, w.value)}
                    >
                      {w.short}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setPendingTemplate(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />{t('newplan.back')}
          </Button>
          <Button className="flex-1" onClick={confirmTemplateDays}>
            {t('newplan.toPreview')}
          </Button>
        </div>
      </div>
    );
  }

  // Własny plan od zera (kreator) — opcjonalnie z dniami skopiowanymi ze starego cyklu.
  if (planSource === 'scratch') {
    return (
      <PlanBuilder
        initialDays={sourceCycle?.days}
        initialDurationWeeks={sourceCycle?.durationWeeks ?? planDurationWeeks}
        onSubmit={(days, durationWeeks) => setReviewPlan({ days, planDurationWeeks: durationWeeks })}
        onCancel={() => setPlanSource('templates')}
      />
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
          <h1 className="text-xl font-bold">{t('newplan.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('newplan.completedWorkouts', { count: completedCount })}</p>
        </div>
      </div>

      {/* Source cycle info (when generating from old cycle) */}
      {sourceCycle && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {t('newplan.basedOnCycle')}
              <Badge variant="outline" className="text-xs">{t('newplan.weeksShort', { n: sourceCycle.durationWeeks })}</Badge>
            </CardTitle>
            <CardDescription>
              {t('newplan.cycleStats', { workouts: sourceCycle.stats.totalWorkouts, tonnage: (sourceCycle.stats.totalTonnage / 1000).toFixed(1), rate: sourceCycle.stats.completionRate })}
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
            <CardTitle className="text-base">{t('newplan.previousPlan')}</CardTitle>
            <CardDescription>{t('newplan.weeksDaysSummary', { weeks: planDurationWeeks, days: currentPlan.length })}</CardDescription>
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

      {/* Continue the same plan for another block (no AI, no template) */}
      {hasCurrentPlan && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              {t('newplan.continueSame')}
            </CardTitle>
            <CardDescription>
              {t('newplan.continueSameDesc', { weeks: planDurationWeeks })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={handleContinueCurrent}>
              <Repeat className="h-4 w-4 mr-2" />
              {t('newplan.continueCurrent')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Source toggle: AI vs ready-made templates */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={planSource === 'templates' ? 'default' : 'outline'}
          onClick={() => setPlanSource('templates')}
        >
          <ListChecks className="h-4 w-4 mr-2" />
          {t('newplan.readyPlans')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setPlanSource('scratch')}
        >
          <PencilRuler className="h-4 w-4 mr-2" />
          {t('newplan.customPlan')}
        </Button>
      </div>

      {(
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('newplan.templatesIntro')}
          </p>
          {planTemplates.map(template => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{t('newplan.daysPerWeek', { n: template.daysPerWeek })}</Badge>
                  <Badge variant="secondary">{t('newplan.weeks', { n: template.durationWeeks })}</Badge>
                  <Badge variant="outline">{t(levelLabelKeys[template.level])}</Badge>
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
                  {t('newplan.choosePlan')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
};

export default NewPlan;
