import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Check, RefreshCw, Trophy, Dumbbell, Flame, Percent, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildActiveCyclePreview } from '@/lib/cycle-insights';
import { PlanWizard, type PlanWizardChoice, type WizardLevel } from '@/components/PlanWizard';
import { ExerciseSwapDialog } from '@/components/ExerciseSwapDialog';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import type { PlanObjective } from '@/data/planTemplates';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import type { ExerciseReplacement } from '@/types';
import { formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

const toDateStr = (d: Date): string => formatLocalDate(d);
const weekMonday = (dateStr: string): string => formatLocalDate(getStartOfPlanWeek(new Date(`${dateStr}T00:00:00`)));

interface ProfileHint { level: WizardLevel; objective: PlanObjective; daysPerWeek: number }

const NewPlan = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromCycleId = params.get('fromCycle');
  const { t, lang } = useTranslation();
  const { fmtTonnage } = useUnit();
  const { uid } = useCurrentUser();
  const { plan: currentPlan, planDurationWeeks, planStartDate, savePlan } = useTrainingPlan(uid);
  const { workouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid);
  const { archiveCurrentPlan, createActiveCycle, getCycleById } = usePlanCycles(uid);

  const [phase, setPhase] = useState<'loading' | 'closeout' | 'wizard' | 'preview'>(fromCycleId ? 'loading' : 'wizard');
  const [sourceCycle, setSourceCycle] = useState<PlanCycle | null>(null);
  const [profileHint, setProfileHint] = useState<ProfileHint | undefined>();
  const [chosen, setChosen] = useState<PlanWizardChoice | null>(null);
  const [reviewDays, setReviewDays] = useState<TrainingDay[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swap, setSwap] = useState<{ open: boolean; dayId: string; exerciseId: string; exerciseName: string; sets: string; category: typeof exerciseLibrary[0]['category'] | null }>(
    { open: false, dayId: '', exerciseId: '', exerciseName: '', sets: '', category: null },
  );

  // Pre-fill wizarda z zapisanego profilu treningowego (level/cel/dni z onboardingu).
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then((snap) => {
      const tp = snap.exists() ? (snap.data() as { trainingProfile?: ProfileHint }).trainingProfile : null;
      if (tp && tp.level && tp.objective) setProfileHint({ level: tp.level, objective: tp.objective, daysPerWeek: tp.daysPerWeek || 4 });
    }).catch(() => { /* brak profilu — wizard użyje domyślnych */ });
  }, [uid]);

  // Wczytaj zakończony cykl (fromCycle) do ekranu closeout.
  useEffect(() => {
    if (!fromCycleId) return;
    getCycleById(fromCycleId).then((c) => {
      if (c) { setSourceCycle(c); setPhase('closeout'); } else setPhase('wizard');
    }).catch(() => setPhase('wizard'));
  }, [fromCycleId, getCycleById]);

  const closeoutStats = sourceCycle ? (buildActiveCyclePreview(sourceCycle, workouts)?.stats ?? sourceCycle.stats) : null;

  const onWizardConfirm = (c: PlanWizardChoice) => { setChosen(c); setReviewDays(c.days); setPhase('preview'); };

  const openSwap = (dayId: string, exerciseId: string, exerciseName: string, sets: string) => {
    const lib = exerciseLibrary.find((e) => e.name === exerciseName);
    setSwap({ open: true, dayId, exerciseId, exerciseName, sets, category: lib?.category ?? null });
  };
  const confirmSwap = (rep: ExerciseReplacement) => {
    setReviewDays((days) => days.map((day) => day.id !== swap.dayId ? day : {
      ...day,
      exercises: day.exercises.map((ex) => ex.id !== swap.exerciseId ? ex : { ...ex, name: rep.name, sets: rep.sets || ex.sets, videoUrl: rep.videoUrl, instructions: [] }),
    }));
  };
  const usedNames = (days: TrainingDay[]) => days.flatMap((d) => d.exercises.map((e) => e.name));

  const handleConfirm = async () => {
    if (!chosen) return;
    setIsSaving(true);
    setError(null);
    try {
      // Archiwizuj obecny plan (jeśli istnieje) jako zakończony cykl + dotaguj historię.
      if (planStartDate && currentPlan.length > 0) {
        const archivedId = await archiveCurrentPlan(currentPlan, planDurationWeeks, planStartDate, workouts);
        if (archivedId) {
          const archivedCycle: PlanCycle = {
            id: archivedId, userId: uid, days: currentPlan, durationWeeks: planDurationWeeks,
            startDate: planStartDate, endDate: toDateStr(new Date()), status: 'completed',
            createdAt: new Date().toISOString(),
            stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
          };
          await backfillHistoricalWorkouts([archivedCycle]);
        }
      }
      const newStart = weekMonday(chosen.startDate);
      const uniqueDays: TrainingDay[] = reviewDays.map((d, i) => ({ ...d, id: `${newStart}-d${i + 1}` }));
      const result = await savePlan(uniqueDays, { durationWeeks: chosen.durationWeeks, startDate: newStart });
      if (!result.success) { setError(result.error || t('onboarding.error.saveFailed')); setIsSaving(false); return; }
      await createActiveCycle(uniqueDays, chosen.durationWeeks, newStart);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.error.saveFailed'));
      setIsSaving(false);
    }
  };

  // ── Loading ──
  if (phase === 'loading') {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // ── Wizard (pre-fill, start od rekomendacji) ──
  if (phase === 'wizard') {
    return (
      <PlanWizard
        initial={profileHint}
        startAtPrecision
        confirmLabelKey="newplan.toReview"
        onConfirm={onWizardConfirm}
        onExitBack={() => (sourceCycle ? setPhase('closeout') : navigate(-1))}
      />
    );
  }

  // ── Closeout (podsumowanie zakończonego cyklu) ──
  if (phase === 'closeout' && closeoutStats) {
    const stats = [
      { icon: Dumbbell, label: t('newplan.closeout.workouts'), value: `${closeoutStats.totalWorkouts}/${closeoutStats.expectedWorkouts || closeoutStats.totalWorkouts}` },
      { icon: Flame, label: t('newplan.closeout.tonnage'), value: fmtTonnage(closeoutStats.totalTonnage) },
      { icon: Percent, label: t('newplan.closeout.attendance'), value: `${closeoutStats.completionRate}%` },
      { icon: Trophy, label: t('newplan.closeout.prs'), value: `${closeoutStats.prs.length}` },
    ];
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
            <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
            <span />
          </div>
          <div className="mt-8 mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-fitness-cyan mb-2">{t('newplan.closeout.kicker')}</p>
            <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">{t('newplan.closeout.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('newplan.closeout.desc')}</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 content-start">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl bg-surface-low p-4">
                <s.icon className="h-5 w-5 text-fitness-cyan mb-2" />
                <p className="font-heading font-bold text-2xl tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="pt-5">
            <button onClick={() => setPhase('wizard')} className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-[#f4ffc9] to-primary flex items-center justify-center gap-2">
              {t('newplan.closeout.choose')} <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview + swap (przed zatwierdzeniem) ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase('wizard')} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
          <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
          <span />
        </div>
        <div className="mt-8 mb-5">
          <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight uppercase">{t('newplan.preview.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('newplan.preview.desc')}</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {reviewDays.map((day) => (
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
          <button onClick={handleConfirm} disabled={isSaving} className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-[#f4ffc9] to-primary disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('newplan.preview.confirm')}
          </button>
          {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}
        </div>
      </div>

      <ExerciseSwapDialog
        open={swap.open}
        onOpenChange={(open) => setSwap((prev) => ({ ...prev, open }))}
        category={swap.category}
        currentExerciseName={swap.exerciseName}
        usedExerciseNames={usedNames(reviewDays)}
        originalSets={swap.sets}
        onSwap={confirmSwap}
      />
    </div>
  );
};

export default NewPlan;
