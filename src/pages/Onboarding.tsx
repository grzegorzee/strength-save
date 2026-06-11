import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import { completeOnboardingPlan } from '@/lib/cycle-actions';
import { useRequiresPaywall } from '@/hooks/useSubscription';

// Onboarding nowego użytkownika = wspólny PlanWizard (z ekranem Welcome) + zapis planu.
const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { uid } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);
  const { createActiveCycle } = usePlanCycles(uid);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiresPaywall = useRequiresPaywall();

  const handleConfirm = async (choice: PlanWizardChoice) => {
    setIsSaving(true);
    setError(null);
    const result = await completeOnboardingPlan(choice, {
      savePlan,
      createActiveCycle,
      markOnboardingComplete: async (confirmed) => updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
        onboarding: { state: 'completed', version: 2 },
        trainingProfile: { level: confirmed.level, objective: confirmed.objective, daysPerWeek: confirmed.daysPerWeek },
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

  return (
    <PlanWizard
      showWelcome
      socialProof
      builderDraftKey={`ss-plan-builder-draft_${uid}`}
      confirmLabelKey="ob.precision.confirm"
      onConfirm={handleConfirm}
      isSaving={isSaving}
      error={error}
    />
  );
};

export default Onboarding;
