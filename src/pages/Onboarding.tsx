import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import { formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

// Onboarding nowego użytkownika = wspólny PlanWizard (z ekranem Welcome) + zapis planu.
const Onboarding = () => {
  const { t } = useTranslation();
  const { uid } = useCurrentUser();
  const { savePlan } = useTrainingPlan(uid);
  const { createActiveCycle } = usePlanCycles(uid);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (choice: PlanWizardChoice) => {
    setIsSaving(true);
    setError(null);
    try {
      const planStartDate = formatLocalDate(getStartOfPlanWeek(new Date(`${choice.startDate}T00:00:00`)));
      const result = await savePlan(choice.days, { durationWeeks: choice.durationWeeks, startDate: planStartDate });
      if (!result.success) {
        setError(result.error || t('onboarding.error.saveFailed'));
        setIsSaving(false);
        return;
      }
      await createActiveCycle(choice.days, choice.durationWeeks, planStartDate);
      await updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
        onboarding: { state: 'completed', version: 2 },
        trainingProfile: { level: choice.level, objective: choice.objective, daysPerWeek: choice.daysPerWeek },
      });
      // onboardingCompleted w profilu przekieruje na dashboard (router).
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.error.saveFailed'));
      setIsSaving(false);
    }
  };

  return (
    <PlanWizard
      showWelcome
      socialProof
      confirmLabelKey="ob.precision.confirm"
      onConfirm={handleConfirm}
      isSaving={isSaving}
      error={error}
    />
  );
};

export default Onboarding;
