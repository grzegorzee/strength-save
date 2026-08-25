import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, RefreshCw, Trophy, Dumbbell, Flame, Percent, ChevronLeft, Medal, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useRequiresPaywall } from '@/hooks/useSubscription';
import { buildActiveCyclePreview } from '@/lib/cycle-insights';
import { PlanWizard, type PlanWizardChoice, type WizardLevel } from '@/components/PlanWizard';
import { PlanPreview } from '@/components/PlanPreview';
import type { PlanObjective } from '@/data/planTemplates';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import { startCycleWithPlan } from '@/lib/cycle-actions';
import { CycleShareDialog, computeCycleTimeAtGymSec, type CycleShareData } from '@/components/CycleShareCard';
import { formatDurationHM } from '@/lib/monthly-stats';
import { buildPlanEventEmitter } from '@/lib/user-events';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { medalForCompletionRate, type SeasonMedal } from '@/lib/season-medals';
import type { TranslationKey } from '@/i18n';

const MEDAL_STYLE: Record<SeasonMedal, { labelKey: TranslationKey; tone: string }> = {
  gold: { labelKey: 'achievements.seasons.gold', tone: 'bg-yellow-400/15 text-yellow-400' },
  silver: { labelKey: 'achievements.seasons.silver', tone: 'bg-slate-300/15 text-slate-300' },
  bronze: { labelKey: 'achievements.seasons.bronze', tone: 'bg-amber-600/15 text-amber-600' },
};

interface ProfileHint { level: WizardLevel; objective: PlanObjective; daysPerWeek: number }

interface NewPlanDraft { chosen: PlanWizardChoice; reviewDays: TrainingDay[] }

const newPlanDraftKey = (uid: string) => `ss-newplan-draft_${uid}`;
const builderDraftKey = (uid: string) => `ss-plan-builder-draft_${uid}`;

const readNewPlanDraft = (uid: string): NewPlanDraft | null => {
  try {
    const raw = localStorage.getItem(newPlanDraftKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NewPlanDraft>;
    if (!parsed.chosen || !Array.isArray(parsed.reviewDays) || parsed.reviewDays.length === 0) return null;
    return parsed as NewPlanDraft;
  } catch {
    return null;
  }
};

const clearPlanDrafts = (uid: string) => {
  try {
    localStorage.removeItem(newPlanDraftKey(uid));
    localStorage.removeItem(builderDraftKey(uid));
  } catch {
    // nieistotne
  }
};

const NewPlan = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromCycleId = params.get('fromCycle');
  const { t, lang } = useTranslation();
  const { fmtTonnage } = useUnit();
  const { uid } = useCurrentUser();
  const { plan: currentPlan, planDurationWeeks, planStartDate, planName, savePlan, scheduleOverrides } = useTrainingPlan(uid);
  const { workouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid, { measurements: 'none' });
  const { archiveCurrentPlan, createActiveCycle, getCycleById } = usePlanCycles(uid);

  const [phase, setPhase] = useState<'loading' | 'closeout' | 'wizard' | 'preview'>(fromCycleId ? 'loading' : 'wizard');
  const requiresPaywall = useRequiresPaywall();
  // Hard paywall (iOS): tworzenie planu wymaga PRO; podsumowanie cyklu (closeout) zostaje do odczytu.
  useEffect(() => {
    if (requiresPaywall && phase !== 'loading' && phase !== 'closeout') {
      navigate('/paywall', { replace: true });
    }
  }, [requiresPaywall, phase, navigate]);
  const [sourceCycle, setSourceCycle] = useState<PlanCycle | null>(null);
  // X31 H2: undefined = profil jeszcze nie wczytany, null = brak profilu / awaria
  // odczytu. PlanWizard czyta `initial` TYLKO przy montowaniu (inicjalizatory
  // useState), wiec kreator nie ma prawa wystartowac przed odpowiedzia getDoc:
  // inaczej krok 5 liczy rekomendacje z domyslnych beginner/build_muscle/4 dni
  // zamiast z odpowiedzi usera (incydent na realnym koncie, replan bez fromCycle).
  const [profileHint, setProfileHint] = useState<ProfileHint | null | undefined>();
  const [chosen, setChosen] = useState<PlanWizardChoice | null>(null);
  const [reviewDays, setReviewDays] = useState<TrainingDay[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Szkic z poprzedniej sesji (refresh/crash w podglądzie) — banner "kontynuować?".
  const [savedDraft, setSavedDraft] = useState<NewPlanDraft | null>(() => (uid ? readNewPlanDraft(uid) : null));

  // Autozapis stanu podglądu: zatwierdzony wybór + swapy.
  useEffect(() => {
    if (!uid || phase !== 'preview' || !chosen) return;
    try {
      localStorage.setItem(newPlanDraftKey(uid), JSON.stringify({ chosen, reviewDays } satisfies NewPlanDraft));
    } catch {
      // brak miejsca — szkic to bonus
    }
  }, [uid, phase, chosen, reviewDays]);

  const resumeDraft = () => {
    if (!savedDraft) return;
    setChosen(savedDraft.chosen);
    setReviewDays(savedDraft.reviewDays);
    setPhase('preview');
    setSavedDraft(null);
  };

  const discardDraft = () => {
    if (uid) clearPlanDrafts(uid);
    setSavedDraft(null);
  };

  // Pre-fill wizarda z zapisanego profilu treningowego (level/cel/dni z onboardingu).
  useEffect(() => {
    if (!uid) { setProfileHint(null); return; }
    getDoc(doc(db, 'users', uid)).then((snap) => {
      const tp = snap.exists() ? (snap.data() as { trainingProfile?: ProfileHint }).trainingProfile : null;
      setProfileHint(tp && tp.level && tp.objective ? { level: tp.level, objective: tp.objective, daysPerWeek: tp.daysPerWeek || 4 } : null);
    }).catch(() => {
      // brak profilu / offline — wizard użyje domyślnych, nie czeka w nieskończoność
      setProfileHint(null);
    });
  }, [uid]);

  // Wczytaj zakończony cykl (fromCycle) do ekranu closeout.
  useEffect(() => {
    if (!fromCycleId) return;
    getCycleById(fromCycleId).then((c) => {
      if (c) { setSourceCycle(c); setPhase('closeout'); } else setPhase('wizard');
    }).catch(() => setPhase('wizard'));
  }, [fromCycleId, getCycleById]);

  // Zakończony cykl ma snapshot statystyk zapisany przy zamknięciu — to on jest źródłem prawdy.
  // buildActiveCyclePreview (przeliczenie z workouts) tylko dla starych cykli bez snapshotu;
  // liczone na żywo pokazywało zera, zanim workouts się załadowały.
  const closeoutStats = sourceCycle
    ? (sourceCycle.stats ?? buildActiveCyclePreview(sourceCycle, workouts, undefined, { scheduleOverrides })?.stats ?? null)
    : null;
  const closeoutMedal = closeoutStats ? medalForCompletionRate(closeoutStats.completionRate) : null;
  // WP-PLANS-2 (X27, Task O4): łączny czas na siłowni z workoutów cyklu (te same
  // dane co pozostałe kafle; sesje bez czasu liczą się jako 0).
  const closeoutTimeSec = useMemo(
    () => (sourceCycle ? computeCycleTimeAtGymSec(workouts, sourceCycle) : 0),
    [sourceCycle, workouts],
  );
  const [shareOpen, setShareOpen] = useState(false);

  const onWizardConfirm = (c: PlanWizardChoice) => { setChosen(c); setReviewDays(c.days); setPhase('preview'); };

  const handleConfirm = async () => {
    if (!chosen) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await startCycleWithPlan(reviewDays, chosen.durationWeeks, {
        lang,
        uid,
        currentPlan,
        planStartDate,
        planDurationWeeks,
        workouts,
        startDate: chosen.startDate,
        // WP-PLANS-2 (X27): wizard daje poniedziałek — walidowany kontrakt ma
        // pierwszeństwo (stare szkice z surową datą spadają na snap startDate).
        startDateISO: chosen.startDate,
        planName: chosen.planName,
        archiveCurrentPlan,
        savePlan,
        createActiveCycle,
        backfillHistoricalWorkouts,
        emitPlanEvent: buildPlanEventEmitter(uid),
      });
      if (!result.success) { setError(result.error || t('onboarding.error.saveFailed')); setIsSaving(false); return; }
      // WP-O (X30): replan aktualizuje profil treningowy (poziom/cel/dni), żeby
      // kolejny kreator nie podpowiadał wartości z pierwszego onboardingu.
      // Snapshot onboardingAnswers zostaje nietknięty. Best-effort: plan już
      // wystartował, awaria tego zapisu nie ma prawa go cofnąć.
      try {
        await updateDoc(doc(db, 'users', uid), {
          trainingProfile: { level: chosen.level, objective: chosen.objective, daysPerWeek: chosen.daysPerWeek },
        });
      } catch {
        // profil to tylko podpowiedź dla następnego kreatora
      }
      trackTelemetryEvent(uid, 'action_replan_completed');
      clearPlanDrafts(uid);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.error.saveFailed'));
      setIsSaving(false);
    }
  };

  // ── Loading (cykl do closeout albo profil treningowy do pre-fill kreatora) ──
  if (phase === 'loading' || (phase === 'wizard' && profileHint === undefined)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // ── Wizard (pre-fill z profilu, start od kroku 2; powrót z podglądu = krok 5) ──
  if (phase === 'wizard') {
    return (
      <>
        {savedDraft && !chosen && (
          <div className="fixed inset-x-0 top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl bg-surface-high/95 p-3 shadow-lg backdrop-blur">
              <p className="text-sm font-medium">{t('newplan.draft.resumeTitle')}</p>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" onClick={discardDraft}>{t('newplan.draft.discard')}</Button>
                <Button size="sm" className="kinetic-primary-button" onClick={resumeDraft}>{t('newplan.draft.resume')}</Button>
              </div>
            </div>
          </div>
        )}
        <PlanWizard
          initial={profileHint ?? undefined}
          resume={chosen}
          resumeStep={chosen ? 5 : undefined}
          builderDraftKey={builderDraftKey(uid)}
          confirmLabelKey="newplan.toReview"
          onConfirm={onWizardConfirm}
          onExitBack={() => (sourceCycle ? setPhase('closeout') : navigate(-1))}
        />
      </>
    );
  }

  // ── Closeout (podsumowanie zakończonego cyklu) ──
  if (phase === 'closeout' && closeoutStats) {
    const stats: Array<{ icon: typeof Dumbbell; label: string; value: string; wide?: boolean }> = [
      { icon: Dumbbell, label: t('newplan.closeout.workouts'), value: `${closeoutStats.totalWorkouts}/${closeoutStats.expectedWorkouts || closeoutStats.totalWorkouts}` },
      { icon: Flame, label: t('newplan.closeout.tonnage'), value: fmtTonnage(closeoutStats.totalTonnage) },
      { icon: Percent, label: t('newplan.closeout.attendance'), value: `${closeoutStats.completionRate}%` },
      { icon: Trophy, label: t('newplan.closeout.prs'), value: `${closeoutStats.prs.length}` },
      // WP-PLANS-2 (X27, Task O4): 5. metryka — łączny czas na siłowni.
      { icon: Clock, label: t('cycles.timeAtGym'), value: formatDurationHM(closeoutTimeSec), wide: true },
    ];
    const shareData: CycleShareData = {
      planName,
      startDate: sourceCycle?.startDate ?? '',
      endDate: sourceCycle?.endDate ?? '',
      workoutsLabel: `${closeoutStats.totalWorkouts}/${closeoutStats.expectedWorkouts || closeoutStats.totalWorkouts}`,
      tonnageLabel: fmtTonnage(closeoutStats.totalTonnage),
      attendanceLabel: `${closeoutStats.completionRate}%`,
      prCount: closeoutStats.prs.length,
      timeLabel: formatDurationHM(closeoutTimeSec),
    };
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 max-w-lg w-full mx-auto px-6 pt-10 pb-6 flex flex-col">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
            <span className="font-heading font-bold uppercase tracking-widest text-xs text-primary">{t('ob.brand')}</span>
            <span />
          </div>
          <div className="mt-8 mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-2">{t('newplan.closeout.kicker')}</p>
            <h1 className="font-heading font-bold text-4xl leading-tight tracking-tight">{t('newplan.closeout.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('newplan.closeout.desc')}</p>
            {closeoutMedal && (
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${MEDAL_STYLE[closeoutMedal].tone}`}>
                <Medal className="h-4 w-4" />
                {t(MEDAL_STYLE[closeoutMedal].labelKey)}
              </span>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 content-start">
            {stats.map((s, i) => (
              <div key={i} className={`rounded-2xl bg-surface-low p-4 ${s.wide ? 'col-span-2' : ''}`}>
                <s.icon className="h-5 w-5 text-primary mb-2" />
                <p className="font-heading font-bold text-2xl tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="pt-5 space-y-2.5">
            {/* WP-PLANS-2 (X27, Task O4): udostępnienie karty podsumowania cyklu. */}
            <button onClick={() => setShareOpen(true)} className="w-full rounded-2xl py-3 font-medium text-sm bg-surface-high flex items-center justify-center gap-2">
              <Share2 className="h-4 w-4 text-primary" /> {t('cycles.shareSummary')}
            </button>
            <button onClick={() => setPhase('wizard')} className="w-full rounded-2xl py-4 font-heading font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-br from-primary-light to-primary flex items-center justify-center gap-2">
              {t('newplan.closeout.choose')} <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <CycleShareDialog data={shareData} open={shareOpen} onOpenChange={setShareOpen} />
      </div>
    );
  }

  // ── Preview + swap (przed zatwierdzeniem) — wspólny ekran z onboardingiem (Z73) ──
  return (
    <PlanPreview
      days={reviewDays}
      onDaysChange={setReviewDays}
      onBack={() => setPhase('wizard')}
      onConfirm={handleConfirm}
      confirmLabel={t('newplan.preview.confirm')}
      isSaving={isSaving}
      error={error}
    />
  );
};

export default NewPlan;
