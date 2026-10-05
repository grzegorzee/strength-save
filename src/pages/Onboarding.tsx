import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { PlanWizard, type PlanWizardChoice, type PlanWizardConfirmOptions } from '@/components/PlanWizard';
import { PlanPreview } from '@/components/PlanPreview';
import { OnboardingMarketingStep } from '@/components/OnboardingMarketingStep';
import { BootScreen } from '@/components/BootScreen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import {
  buildConsentSubmissions,
  buildMarketingStepSubmission,
  getConsentMirror,
  shouldShowMarketingStep,
  type ConsentSelection,
} from '@/lib/consent-selection';
import { hasCurrentRequiredConsents } from '@/lib/legal-versions';
import { recordConsents } from '@/lib/consents-api';
import { completeOnboardingPlan } from '@/lib/cycle-actions';
import { restDefaultsDeps } from '@/lib/rest-preferences';
import { buildOnboardingAnswers, buildTrainingProfile } from '@/lib/onboarding-answers';
import { buildPlanCycleChoice } from '@/lib/plan-cycle-choice';
import { buildPlanEventEmitter } from '@/lib/user-events';
import { useRequiresPaywall } from '@/hooks/useSubscription';
import type { TrainingDay } from '@/data/trainingPlan';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { getAccentById, readStoredAccentId } from '@/lib/accent-theme';
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  readOnboardingDraftFromWebStorage,
  writeOnboardingDraft,
  type OnboardingDraftInput,
  type OnboardingDraftV1,
} from '@/lib/onboarding-draft';

// Onboarding nowego użytkownika = wspólny PlanWizard (z ekranem Welcome) + podgląd planu
// (ten sam ekran co NewPlan, Z73) + zapis planu.
const Onboarding = ({ onExitBack, onAccountDeleted }: {
  onExitBack?: () => void | Promise<void>;
  /** B1: domknięcie sesji po usunięciu konta z dialogu wyjścia; brak = onExitBack. */
  onAccountDeleted?: () => Promise<void>;
}) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { uid, profile, avatarSrc, mergeConfirmedConsentMirror } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);
  const { createActiveCycle } = usePlanCycles(uid);
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<PlanWizardChoice | null>(null);
  const [reviewDays, setReviewDays] = useState<TrainingDay[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const requiresPaywall = useRequiresPaywall();
  // Dedykowany krok marketingowy (spec 2026-08-11, przywrócony 2026-10-05): po
  // wyborze planu na 6/6, przed podglądem albo zapisem. Pokazywany raz: odpowiedź
  // (też odmowa) ląduje w mirrorze zgód. E2E omija go jak resztę zgód.
  const [marketingPrompt, setMarketingPrompt] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingError, setMarketingError] = useState(false);
  const [marketingAnswered, setMarketingAnswered] = useState(false);
  // "Zaczynam ten plan" = zapis bez podglądu, także po kroku marketingowym.
  const [skipPreview, setSkipPreview] = useState(false);
  // X34: krok, na który wraca kreator po remoncie: 6 = ekran 6/6 (wstecz z podglądu
  // / kroku marketingowego), 5 = 5A po "Wybierz inny plan" (stan kreatora z `choice`).
  const [wizardResumeStep, setWizardResumeStep] = useState<5 | 6>(6);
  const nativePlatform = Capacitor.isNativePlatform();
  const [draft, setDraft] = useState<OnboardingDraftV1 | null>(() => (
    nativePlatform ? null : readOnboardingDraftFromWebStorage(uid)
  ));
  const [draftLoaded, setDraftLoaded] = useState(!nativePlatform);
  const latestDraftRef = useRef<OnboardingDraftInput>({ phase: 'wizard', wizardStep: 1 });
  const draftWriteQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const onboardingTelemetryStartedRef = useRef(false);
  // B7 (2026-09-29): wstecz / Android back na kroku 1 wylogowywał bez pytania.
  // Dialog potwierdzenia; szkic kreatora zostaje (per uid, TTL 7 dni).
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  // Osobny (siostrzany) dialog: zagnieżdżony w treści dialogu wyjścia byłby
  // odmontowany razem z nim w stanie open (pułapka Radix z CLAUDE.md).
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const draftSaveFailureTrackedRef = useRef(false);

  useEffect(() => {
    if (!nativePlatform) return;
    let cancelled = false;
    void readOnboardingDraft(uid).then((stored) => {
      if (!cancelled) {
        setDraft(stored);
        setDraftLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [nativePlatform, uid]);

  useEffect(() => {
    if (!draftLoaded || onboardingTelemetryStartedRef.current) return;
    onboardingTelemetryStartedRef.current = true;
    trackTelemetryEvent(uid, draft ? 'onboarding_resumed' : 'onboarding_started');
  }, [draft, draftLoaded, uid]);

  const persistDraft = useCallback((next: OnboardingDraftInput) => {
    latestDraftRef.current = next;
    draftWriteQueueRef.current = draftWriteQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const saved = await writeOnboardingDraft(uid, next);
        if (!saved && !draftSaveFailureTrackedRef.current) {
          draftSaveFailureTrackedRef.current = true;
          trackTelemetryEvent(uid, 'onboarding_save_failed');
        }
        return saved;
      });
  }, [uid]);

  // Lokalny szkic zachowuje odpowiedzi, ale nie może ominąć prawa. Tylko
  // aktualny mirror serwerowy pozwala wznowić krok 2–6.
  const legalConsentRecorded = hasCurrentRequiredConsents(getConsentMirror(profile));
  const restorableDraft = draft
    ? { ...draft, wizardStep: legalConsentRecorded ? draft.wizardStep : 1 }
    : null;

  const handleWizardConfirm = (c: PlanWizardChoice, opts?: PlanWizardConfirmOptions) => {
    if (saveInFlightRef.current) return;
    const skip = opts?.skipPreview === true;
    setChoice(c);
    setReviewDays(c.days);
    setError(null);
    persistDraft({ ...latestDraftRef.current, phase: 'wizard', wizardStep: 6, reviewDays: c.days });
    setSkipPreview(skip);
    if (!marketingAnswered && shouldShowMarketingStep(profile)) {
      setMarketingError(false);
      setMarketingPrompt(true);
      return;
    }
    if (skip) {
      void finishOnboarding(c);
      return;
    }
    setShowPreview(true);
  };

  const handleReviewDaysChange = (days: TrainingDay[]) => {
    if (saveInFlightRef.current) return;
    setReviewDays(days);
    setChoice(previous => previous ? { ...previous, days } : previous);
    persistDraft({ ...latestDraftRef.current, phase: 'preview', wizardStep: 6, reviewDays: days });
  };

  const continueAfterMarketing = () => {
    setMarketingAnswered(true);
    setMarketingPrompt(false);
    if (skipPreview && choice) {
      void finishOnboarding({ ...choice, days: reviewDays });
      return;
    }
    setShowPreview(true);
  };

  // Zapis przez ISTNIEJĄCY recordConsent (odmowa też do logu, kanał
  // onboarding-marketing-step). Zasada 6: awaria zapisu zgody = komunikat i retry,
  // a odmowa mimo awarii prowadzi dalej (brak wpisu = brak zgody, plan nie czeka).
  const handleMarketingAnswer = async (granted: boolean) => {
    if (marketingSaving) return;
    setMarketingSaving(true);
    setMarketingError(false);
    try {
      const confirmedMirror = await recordConsents(
        [buildMarketingStepSubmission(t, granted)],
        lang,
        'onboarding-marketing-step',
      );
      mergeConfirmedConsentMirror(confirmedMirror);
      continueAfterMarketing();
    } catch {
      if (granted) {
        setMarketingError(true);
      } else {
        continueAfterMarketing();
      }
    } finally {
      setMarketingSaving(false);
    }
  };

  // Zapis zgód z kroku Welcome do logu (Cloud Function recordConsent: IP,
  // timestamp serwerowy, wersje dokumentów). Odrzucenie zatrzymuje przejście
  // kroku — bez wpisu w logu nie ma dowodu zgody.
  const handleLegalConsent = async (selection: ConsentSelection) => {
    const confirmedMirror = await recordConsents(buildConsentSubmissions(t, selection), lang);
    mergeConfirmedConsentMirror(confirmedMirror);
  };

  // Jeden zapis dla obu ścieżek (podgląd -> Zatwierdź oraz "Zaczynam ten plan"):
  // ten sam completeOnboardingPlan, ten sam payload.
  const finishOnboarding = async (confirmed: PlanWizardChoice) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setIsSaving(true);
    setError(null);
    const result = await completeOnboardingPlan(confirmed, {
      lang,
      savePlan,
      createActiveCycle,
      // WP-6 (X33): te same odpowiedzi trafiają NA pierwszy cykl (entry onboarding).
      choice: buildPlanCycleChoice(confirmed, 'onboarding'),
      emitPlanEvent: buildPlanEventEmitter(uid),
      // X35b: przerwy polecane dla celu (redukcja 60 s, siła 180 s...), chyba że custom.
      restDefaults: restDefaultsDeps(uid),
      markOnboardingComplete: async (_choice, _days, planStartDate) => {
        const accentColor = getAccentById(confirmed.accentId ?? readStoredAccentId()).id;
        return updateDoc(doc(db, 'users', uid), {
          onboardingCompleted: true,
          // termsAcceptedAt: zgoda z kroku Welcome (checkbox blokuje Dalej, więc tu zawsze zaznaczona).
          // WP-O (X30): dot-paths zamiast całej mapy, żeby nie kasować przyszłych podpól.
          'onboarding.state': 'completed',
          'onboarding.version': 2,
          'onboarding.termsAcceptedAt': new Date().toISOString(),
          trainingProfile: buildTrainingProfile(confirmed),
          'preferences.accentColor': accentColor,
          // WP-O (X30): trwały snapshot odpowiedzi (v2), pisany RAZ; replan go nie rusza.
          onboardingAnswers: buildOnboardingAnswers(confirmed, { accentColor, startDate: planStartDate }),
          ...(confirmed.name && confirmed.name !== profile?.displayName ? { displayName: confirmed.name } : {}),
        });
      },
    });
    if (!result.success) {
      saveInFlightRef.current = false;
      trackTelemetryEvent(uid, 'onboarding_save_failed');
      setError(result.error || t('onboarding.error.saveFailed'));
      setIsSaving(false);
      return;
    }
    try {
      await draftWriteQueueRef.current.catch(() => undefined);
      await clearOnboardingDraft(uid);
      // PlanBuilder submit przenosi tylko na krok 6/6. Szkic ćwiczeń wolno
      // usunąć dopiero po trwałym sukcesie całej operacji onboardingu.
      try {
        localStorage.removeItem(`ss-plan-builder-draft_${uid}`);
      } catch { /* cache best-effort; zapis planu jest już trwały */ }
      trackTelemetryEvent(uid, 'onboarding_completed');
      // Jawne przejście po onboardingu. Router i tak przełączy drzewo tras po aktualizacji
      // profilu, ale to gwarantuje natychmiastowy redirect bez 404. Na iOS bez PRO nowy user
      // trafia prosto na paywall (start trialu); na web na dashboard z confetti.
      navigate(requiresPaywall ? '/paywall' : '/?welcome=1', { replace: true });
    } catch (err) {
      saveInFlightRef.current = false;
      console.error('Onboarding finish failed:', err);
      setError(t('onboarding.error.saveFailed'));
      setIsSaving(false);
    }
  };

  if (!draftLoaded) return <BootScreen />;

  if (choice && marketingPrompt) {
    return (
      <OnboardingMarketingStep
        onAccept={() => { void handleMarketingAnswer(true); }}
        onDecline={() => { void handleMarketingAnswer(false); }}
        onBack={() => {
          if (marketingSaving) return;
          setWizardResumeStep(6);
          setMarketingPrompt(false);
          setMarketingError(false);
        }}
        isSaving={marketingSaving}
        error={marketingError}
      />
    );
  }

  if (choice && showPreview) {
    return (
      <PlanPreview
        days={reviewDays}
        onDaysChange={handleReviewDaysChange}
        onBack={() => { if (!saveInFlightRef.current) { setWizardResumeStep(6); setShowPreview(false); } }}
        onChooseOther={() => { if (!saveInFlightRef.current) { setWizardResumeStep(5); setShowPreview(false); } }}
        onConfirm={() => { void finishOnboarding({ ...choice, days: reviewDays }); }}
        confirmLabel={t('ob.precision.confirm')}
        isSaving={isSaving}
        error={error}
      />
    );
  }

  return (
    <>
    <PlanWizard
      showWelcome
      trialNotice={requiresPaywall}
      legalConsent
      onLegalConsent={handleLegalConsent}
      askName
      initialName={(profile?.displayName ?? '').split(' ')[0] || ''}
      avatarPhotoURL={avatarSrc || undefined}
      accountEmail={profile?.email || undefined}
      initialDraft={restorableDraft}
      legalConsentAlreadyRecorded={legalConsentRecorded}
      onDraftChange={persistDraft}
      resume={choice ?? undefined}
      // X34: powrót z podglądu / kroku marketingowego = ekran 6/6; "Wybierz inny plan" = 5A.
      resumeStep={choice ? wizardResumeStep : undefined}
      builderDraftKey={`ss-plan-builder-draft_${uid}`}
      confirmLabelKey="newplan.toReview"
      onConfirm={handleWizardConfirm}
      isSaving={isSaving}
      error={error}
      onExitBack={onExitBack ? () => setExitConfirmOpen(true) : undefined}
    />
    {onExitBack && (
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="rounded-xl border-0 bg-surface-low">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">{t('ob.exitConfirm.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('ob.exitConfirm.desc')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExitConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              data-testid="onboarding-exit-logout"
              onClick={() => { setExitConfirmOpen(false); void onExitBack(); }}
            >
              {t('profile.logout')}
            </Button>
          </DialogFooter>
          {/* B1 (Apple 5.1.1(v)): świeży user nie ma dostępu do Profilu. */}
          <button
            type="button"
            data-testid="delete-account-link"
            onClick={() => { setExitConfirmOpen(false); setDeleteAccountOpen(true); }}
            className="min-h-11 touch-manipulation text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
          >
            {t('profile.deleteAccount')}
          </button>
        </DialogContent>
      </Dialog>
    )}
    {onExitBack && (
      <DeleteAccountDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        onDeleted={onAccountDeleted ?? (async () => { await onExitBack(); })}
      />
    )}
    </>
  );
};

export default Onboarding;
