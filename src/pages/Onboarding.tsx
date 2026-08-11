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
import { buildConsentSubmissions, type ConsentSelection } from '@/lib/consent-selection';
import { recordConsents } from '@/lib/consents-api';
import { completeOnboardingPlan } from '@/lib/cycle-actions';
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

  const handleWizardConfirm = (c: PlanWizardChoice) => {
    setChoice(c);
    setReviewDays(c.days);
    setShowPreview(true);
    setError(null);
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
      markOnboardingComplete: async () => updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
        // termsAcceptedAt: zgoda z kroku Welcome (checkbox blokuje Dalej, więc tu zawsze zaznaczona).
        onboarding: { state: 'completed', version: 2, termsAcceptedAt: new Date().toISOString() },
        trainingProfile: { level: confirmed.level, objective: confirmed.objective, daysPerWeek: confirmed.daysPerWeek },
        ...(confirmed.name && confirmed.name !== profile?.displayName ? { displayName: confirmed.name } : {}),
      }),
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
