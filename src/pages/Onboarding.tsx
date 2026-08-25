import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import { PlanPreview } from '@/components/PlanPreview';
import { OnboardingMarketingStep } from '@/components/OnboardingMarketingStep';
import {
  buildConsentSubmissions,
  buildMarketingStepSubmission,
  shouldShowMarketingStep,
  type ConsentSelection,
} from '@/lib/consent-selection';
import { recordConsents } from '@/lib/consents-api';
import { readStoredAccentId } from '@/lib/accent-theme';
import { completeOnboardingPlan } from '@/lib/cycle-actions';
import { buildOnboardingAnswers } from '@/lib/onboarding-answers';
import { buildPlanEventEmitter } from '@/lib/user-events';
import { useRequiresPaywall } from '@/hooks/useSubscription';
import type { TrainingDay } from '@/data/trainingPlan';

// Onboarding nowego użytkownika = wspólny PlanWizard (z ekranem Welcome) + podgląd planu
// (ten sam ekran co NewPlan, Z73) + zapis planu.
const Onboarding = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { uid, profile } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);
  const { createActiveCycle } = usePlanCycles(uid);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<PlanWizardChoice | null>(null);
  const [reviewDays, setReviewDays] = useState<TrainingDay[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const requiresPaywall = useRequiresPaywall();
  // Dedykowany krok marketingowy (spec 2026-08-11): po konfiguracji planu,
  // przed podglądem. Pokazywany raz — odpowiedź (też odmowa) ląduje w mirrorze
  // zgód, więc user nigdy nie zobaczy go ponownie. E2E omija jak resztę zgód.
  const [marketingPrompt, setMarketingPrompt] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingError, setMarketingError] = useState(false);
  const [marketingAnswered, setMarketingAnswered] = useState(false);

  const handleWizardConfirm = (c: PlanWizardChoice) => {
    setChoice(c);
    setReviewDays(c.days);
    setError(null);
    if (!marketingAnswered && shouldShowMarketingStep(profile)) {
      setMarketingPrompt(true);
      return;
    }
    setShowPreview(true);
  };

  // Zapis wyboru przez ISTNIEJĄCY recordConsent (odmowa też do logu, kanał
  // onboarding-marketing-step). Awaria zapisu = komunikat + retry tym samym
  // przyciskiem (jak zgody na Welcome); onboarding się nie wywraca.
  const handleMarketingAnswer = async (granted: boolean) => {
    setMarketingSaving(true);
    setMarketingError(false);
    try {
      await recordConsents([buildMarketingStepSubmission(t, granted)], lang, 'onboarding-marketing-step');
      setMarketingAnswered(true);
      setMarketingPrompt(false);
      setShowPreview(true);
    } catch {
      setMarketingError(true);
    } finally {
      setMarketingSaving(false);
    }
  };

  // Zapis zgód z kroku Welcome do logu (Cloud Function recordConsent: IP,
  // timestamp serwerowy, wersje dokumentów). Odrzucenie zatrzymuje przejście
  // kroku — bez wpisu w logu nie ma dowodu zgody.
  const handleLegalConsent = async (selection: ConsentSelection) => {
    await recordConsents(buildConsentSubmissions(t, selection), lang);
  };

  const handleConfirm = async () => {
    if (!choice) return;
    setIsSaving(true);
    setError(null);
    const confirmed: PlanWizardChoice = { ...choice, days: reviewDays };
    const result = await completeOnboardingPlan(confirmed, {
      lang,
      savePlan,
      createActiveCycle,
      emitPlanEvent: buildPlanEventEmitter(uid),
      markOnboardingComplete: async (_choice, _days, planStartDate) => {
        // Plan I: kolor wybrany na Welcome (albo domyślna limonka) do mirroru
        // cross-device — zawsze jedno pole, czytane w momencie zapisu.
        const accentColor = readStoredAccentId();
        return updateDoc(doc(db, 'users', uid), {
          onboardingCompleted: true,
          // termsAcceptedAt: zgoda z kroku Welcome (checkbox blokuje Dalej, więc tu zawsze zaznaczona).
          // WP-O (X30): dot-paths zamiast całej mapy, żeby nie kasować przyszłych podpól.
          'onboarding.state': 'completed',
          'onboarding.version': 2,
          'onboarding.termsAcceptedAt': new Date().toISOString(),
          trainingProfile: { level: confirmed.level, objective: confirmed.objective, daysPerWeek: confirmed.daysPerWeek },
          'preferences.accentColor': accentColor,
          // WP-O (X30): trwały snapshot odpowiedzi (v2), pisany RAZ; replan go nie rusza.
          onboardingAnswers: buildOnboardingAnswers(confirmed, { accentColor, startDate: planStartDate }),
          ...(confirmed.name && confirmed.name !== profile?.displayName ? { displayName: confirmed.name } : {}),
        });
      },
    });
    if (!result.success) {
      setError(result.error || t('onboarding.error.saveFailed'));
      setIsSaving(false);
      return;
    }
    try {
      // Jawne przejście po onboardingu. Router i tak przełączy drzewo tras po aktualizacji
      // profilu, ale to gwarantuje natychmiastowy redirect bez 404. Na iOS bez PRO nowy user
      // trafia prosto na paywall (start trialu); na web na dashboard z confetti.
      navigate(requiresPaywall ? '/paywall' : '/?welcome=1', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.error.saveFailed'));
      setIsSaving(false);
    }
  };

  if (choice && marketingPrompt) {
    return (
      <OnboardingMarketingStep
        onAccept={() => handleMarketingAnswer(true)}
        onDecline={() => handleMarketingAnswer(false)}
        onBack={() => { setMarketingPrompt(false); setMarketingError(false); }}
        isSaving={marketingSaving}
        error={marketingError}
      />
    );
  }

  if (choice && showPreview) {
    return (
      <PlanPreview
        days={reviewDays}
        onDaysChange={setReviewDays}
        onBack={() => setShowPreview(false)}
        onConfirm={handleConfirm}
        confirmLabel={t('ob.precision.confirm')}
        isSaving={isSaving}
        error={error}
      />
    );
  }

  return (
    <PlanWizard
      showWelcome
      socialProof
      trialNotice={requiresPaywall}
      legalConsent
      onLegalConsent={handleLegalConsent}
      askName
      initialName={(profile?.displayName ?? '').split(' ')[0] || ''}
      avatarPhotoURL={profile?.photoURL || undefined}
      resume={choice ?? undefined}
      resumeStep={choice ? 5 : undefined}
      builderDraftKey={`ss-plan-builder-draft_${uid}`}
      confirmLabelKey="newplan.toReview"
      onConfirm={handleWizardConfirm}
      isSaving={isSaving}
      error={error}
    />
  );
};

export default Onboarding;
